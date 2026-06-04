import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_KEY;
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

const resend = new Resend((process.env.RESEND_API_KEY || '').trim());

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { action, password, project_id, status, drive_folder_id, items, total_price, payment_terms } = req.body;

    // Validación de seguridad para Admin
    if (password !== 'Nex@2023R') {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!supabase) {
        return res.status(500).json({ error: 'Supabase credentials not configured' });
    }

    try {
        switch (action) {
            case 'listProjects': {
                // Obtener todos los proyectos
                const { data: projects, error: projErr } = await supabase
                    .from('projects')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (projErr) throw projErr;

                // Obtener presupuestos asociados
                const { data: budgets, error: budgErr } = await supabase
                    .from('budgets')
                    .select('*')
                    .eq('is_active', true);

                if (budgErr) throw budgErr;

                return res.status(200).json({ 
                    success: true, 
                    projects, 
                    budgets 
                });
            }

            case 'updateStatus': {
                if (!project_id || !status) {
                    return res.status(400).json({ error: 'Faltan campos project_id o status' });
                }

                const { data: project, error: updateErr } = await supabase
                    .from('projects')
                    .update({ status })
                    .eq('id', project_id)
                    .select()
                    .single();

                if (updateErr) throw updateErr;

                return res.status(200).json({ 
                    success: true, 
                    project 
                });
            }

            case 'updateDriveFolder': {
                if (!project_id) {
                    return res.status(400).json({ error: 'Falta project_id' });
                }

                const { data: project, error: updateErr } = await supabase
                    .from('projects')
                    .update({ drive_folder_id: drive_folder_id || null })
                    .eq('id', project_id)
                    .select()
                    .single();

                if (updateErr) throw updateErr;

                return res.status(200).json({ 
                    success: true, 
                    project 
                });
            }

            case 'updateBudget': {
                if (!project_id || !items) {
                    return res.status(400).json({ error: 'Faltan campos project_id o items' });
                }

                // Buscar si ya existe un presupuesto activo
                const { data: existingBudget } = await supabase
                    .from('budgets')
                    .select('*')
                    .eq('project_id', project_id)
                    .eq('is_active', true)
                    .maybeSingle();

                if (existingBudget) {
                    // Actualizar presupuesto existente
                    const { error: bErr } = await supabase
                        .from('budgets')
                        .update({
                            items,
                            total_price: total_price || 0,
                            payment_terms: payment_terms || '',
                            version: (existingBudget.version || 1) + 1,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', existingBudget.id);

                    if (bErr) throw bErr;
                } else {
                    // Crear nuevo presupuesto
                    const { error: bErr } = await supabase
                        .from('budgets')
                        .insert({
                            project_id,
                            version: 1,
                            items,
                            total_price: total_price || 0,
                            payment_terms: payment_terms || '',
                            is_active: true
                        });

                    if (bErr) throw bErr;
                }

                // Cambiar estado del proyecto a 'sent' (Enviado al cliente)
                const { data: project, error: updateErr } = await supabase
                    .from('projects')
                    .update({ status: 'sent', updated_at: new Date().toISOString() })
                    .eq('id', project_id)
                    .select()
                    .single();

                if (updateErr) throw updateErr;

                // --- NOTIFICAR AL CLIENTE ---
                await notifyClient(project, req.headers.host || 'nexofilm.com');

                return res.status(200).json({ 
                    success: true, 
                    project 
                });
            }

            default:
                return res.status(400).json({ error: 'Acción inválida' });
        }

    } catch (error) {
        console.error('Error en admin-crm API:', error);
        return res.status(500).json({ error: error.message });
    }
}

// Helper para notificar al cliente
async function notifyClient(project, host) {
    const preference = project.notification_preference || 'both';
    const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';
    const portalUrl = `${protocol}://${host}/portal?token=${project.access_token}`;

    const subject = `💸 Presupuesto listo para revisar: ${project.title} - NexoFilm`;
    
    // 1. Enviar Email
    if ((preference === 'email' || preference === 'both') && process.env.RESEND_API_KEY) {
        try {
            await resend.emails.send({
                from: 'NexoFilm <hola@nexofilm.com>',
                to: [project.client_email],
                subject: subject,
                html: `
                    <div style="font-family: sans-serif; padding: 24px; border-top: 4px solid #ccff00; background-color: #0d0d0d; color: #ffffff; max-width: 600px; margin: 0 auto; border-radius: 8px;">
                        <div style="text-align: center; margin-bottom: 24px;">
                            <img src="https://nexofilm.com/favicon.png" alt="NexoFilm" style="height: 40px; filter: brightness(0) invert(1);" />
                            <h1 style="color: #ccff00; font-size: 22px; margin: 15px 0 0 0; text-transform: uppercase; letter-spacing: 1px;">Presupuesto de Proyecto</h1>
                        </div>
                        <div style="background-color: #1a1a1a; padding: 20px; border-radius: 6px; border: 1px solid #333; line-height: 1.6;">
                            <p style="font-size: 16px; margin: 0 0 10px 0; color: #ffffff;">Hola <strong>${project.client_name}</strong>,</p>
                            <p style="font-size: 14px; margin: 0 0 20px 0; color: #e0e0e0;">
                                Ya preparamos la propuesta comercial detallada para tu proyecto "<strong>${project.title}</strong>".
                            </p>
                            <p style="font-size: 14px; margin: 0 0 20px 0; color: #e0e0e0;">
                                Podés ver el desglose de precios, condiciones de pago, y **aprobar, rechazar o solicitar cambios** directamente desde tu portal interactivo seguro.
                            </p>
                            <div style="text-align: center; margin-top: 30px; margin-bottom: 10px;">
                                <a href="${portalUrl}" style="background-color: #ccff00; color: #000000; padding: 14px 28px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 13px; text-transform: uppercase; display: inline-block; box-shadow: 0 4px 10px rgba(204,255,0,0.2);">
                                    Revisar Presupuesto Comercial
                                </a>
                            </div>
                        </div>
                        <p style="font-size: 10px; color: #666; text-align: center; margin-top: 24px; line-height: 1.4;">
                            Este enlace es único y seguro para tu proyecto. No lo compartas con terceros.<br/>
                            NexoFilm Productora Audiovisual · Buenos Aires, Argentina.
                        </p>
                    </div>
                `
            });
            console.log(`Email enviado con éxito al cliente: ${project.client_email}`);
        } catch (e) {
            console.error(`Error enviando email al cliente ${project.client_email}:`, e.message);
        }
    }

    // 2. Enviar WhatsApp
    if ((preference === 'whatsapp' || preference === 'both') && project.client_phone) {
        const token = process.env.WHATSAPP_TOKEN?.trim();
        const phoneNumberId = process.env.WHATSAPP_PHONE_ID?.trim();
        
        if (token && phoneNumberId) {
            let cleanPhone = project.client_phone.replace(/\D/g, '');
            // Si no tiene código de país, asumir Argentina (54)
            if (!cleanPhone.startsWith('54') && cleanPhone.length === 10) {
                cleanPhone = '54' + cleanPhone;
            }
            
            const messageText = `🎥 *NexoFilm - Propuesta Comercial*\n\n¡Hola ${project.client_name}! Ya preparamos la cotización detallada para tu proyecto "${project.title}".\n\nPodés verla, solicitar modificaciones o aprobarla directamente desde tu portal seguro haciendo clic en el siguiente enlace:\n👉 ${portalUrl}`;

            try {
                const response = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        messaging_product: 'whatsapp',
                        to: cleanPhone,
                        type: 'text',
                        text: { body: messageText }
                    })
                });
                const resData = await response.json();
                if (!response.ok) {
                    console.error('Error Meta API al notificar al cliente:', resData.error);
                } else {
                    console.log(`WhatsApp de alerta enviado con éxito al cliente +${cleanPhone}`);
                }
            } catch (err) {
                console.error('Error al enviar WhatsApp al cliente:', err.message);
            }
        }
    }
}
