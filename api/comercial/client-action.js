import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_KEY;
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

const resend = new Resend((process.env.RESEND_API_KEY || '').trim());
const ADMIN_NUMBER = '541151191964';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const token = req.headers['x-client-token'] || req.body.token;
    const { action, client_feedback, specifications } = req.body;

    if (!token) {
        return res.status(401).json({ error: 'Token de acceso requerido' });
    }

    if (!supabase) {
        return res.status(500).json({ error: 'Supabase credentials not configured' });
    }

    try {
        // 1. Obtener el proyecto asociado a ese token
        const { data: project, error: projErr } = await supabase
            .from('projects')
            .select('*')
            .eq('access_token', token)
            .maybeSingle();

        if (projErr) throw projErr;

        if (!project) {
            return res.status(404).json({ error: 'Proyecto no encontrado' });
        }

        let updatedProject = { ...project };
        let updatedStatus = project.status;
        let notificationSubject = '';
        let notificationBody = '';

        if (action === 'update_specifications') {
            // Actualizar especificaciones en estado draft o review
            const { title, event_date, event_time, location, coverage_types, coverage_hours, client_phone, client_email, notification_preference, guests_count, client_notes } = specifications || {};
            
            const { data: updatedProj, error: updateErr } = await supabase
                .from('projects')
                .update({
                    title: title || project.title,
                    event_date: event_date || project.event_date,
                    event_time: event_time || project.event_time,
                    location: location || project.location,
                    coverage_types: coverage_types || project.coverage_types,
                    coverage_hours: coverage_hours ? parseInt(coverage_hours) : project.coverage_hours,
                    client_phone: client_phone || project.client_phone,
                    client_email: client_email || project.client_email,
                    notification_preference: notification_preference || project.notification_preference,
                    guests_count: guests_count !== undefined ? guests_count : project.guests_count,
                    client_notes: client_notes || project.client_notes,
                    status: 'review' // Pasa a revisión al completar/actualizar datos
                })
                .eq('id', project.id)
                .select()
                .single();

            if (updateErr) throw updateErr;
            updatedProject = updatedProj;
            updatedStatus = 'review';

            notificationSubject = `📝 Datos completados: ${project.client_name}`;
            notificationBody = `El cliente <strong>${project.client_name}</strong> ha actualizado las especificaciones de su proyecto "<strong>${updatedProject.title}</strong>" y pasó a estado de Revisión comercial.`;

        } else if (action === 'submit_billing_info') {
            const { billing_info } = req.body;
            const { data: updatedProj, error: updateErr } = await supabase
                .from('projects')
                .update({
                    client_billing_info: billing_info || null
                })
                .eq('id', project.id)
                .select()
                .single();

            if (updateErr) throw updateErr;
            updatedProject = updatedProj;

            notificationSubject = `🧾 Datos de Facturación: ${project.client_name}`;
            notificationBody = `El cliente <strong>${project.client_name}</strong> ha cargado sus datos de facturación para el proyecto "<strong>${project.title}</strong>":<br/><br/>
            <pre style="background:#f5f5f5; padding:10px; border-radius:4px; color:#333; font-family:monospace;">${billing_info || 'Sin datos'}</pre>`;

        } else if (action === 'submit_notes') {
            const { notes } = req.body;
            const { data: updatedProj, error: updateErr } = await supabase
                .from('projects')
                .update({
                    client_notes: notes || null
                })
                .eq('id', project.id)
                .select()
                .single();

            if (updateErr) throw updateErr;
            updatedProject = updatedProj;

            notificationSubject = `💬 Nueva consulta de ${project.client_name}`;
            notificationBody = `El cliente <strong>${project.client_name}</strong> ha enviado una nueva observación/consulta para el proyecto "<strong>${project.title}</strong>":<br/><br/>
            <em>"${notes || 'Sin comentarios'}"</em>`;

        } else if (action === 'request_new_project') {
            // Crear nuevo proyecto borrador con los mismos datos del cliente
            const { data: newProj, error: createErr } = await supabase
                .from('projects')
                .insert({
                    client_name: project.client_name,
                    client_email: project.client_email,
                    client_phone: project.client_phone,
                    notification_preference: project.notification_preference || 'both',
                    title: 'Nueva Propuesta Comercial',
                    status: 'draft'
                })
                .select()
                .single();

            if (createErr) throw createErr;
            
            return res.status(200).json({
                success: true,
                project: newProj,
                redirectToken: newProj.access_token
            });

        } else if (action === 'approve') {
            // Aprobar presupuesto
            const { data: updatedProj, error: updateErr } = await supabase
                .from('projects')
                .update({ status: 'approved' })
                .eq('id', project.id)
                .select()
                .single();

            if (updateErr) throw updateErr;

            await supabase
                .from('budgets')
                .update({ client_feedback: 'Aprobado por el cliente' })
                .eq('project_id', project.id)
                .eq('is_active', true);

            updatedProject = updatedProj;
            updatedStatus = 'approved';

            notificationSubject = `✅ Presupuesto Aprobado: ${project.client_name}`;
            notificationBody = `¡Excelente noticia! El cliente <strong>${project.client_name}</strong> ha aprobado el presupuesto para el proyecto "<strong>${project.title}</strong>".<br/><br/>
            Ya podés subir la factura PDF y cargar los datos de transferencia en su panel de administración.`;

        } else if (action === 'reject') {
            // Rechazar presupuesto
            const { data: updatedProj, error: updateErr } = await supabase
                .from('projects')
                .update({ status: 'rejected' })
                .eq('id', project.id)
                .select()
                .single();

            if (updateErr) throw updateErr;

            await supabase
                .from('budgets')
                .update({ client_feedback: client_feedback || 'Rechazado por el cliente' })
                .eq('project_id', project.id)
                .eq('is_active', true);

            updatedProject = updatedProj;
            updatedStatus = 'rejected';

            notificationSubject = `❌ Presupuesto Rechazado: ${project.client_name}`;
            notificationBody = `El cliente <strong>${project.client_name}</strong> ha rechazado el presupuesto del proyecto "<strong>${project.title}</strong>".<br/><br/>
            Motivo/Feedback: <em>"${client_feedback || 'Sin comentarios'}"</em>`;

        } else if (action === 'feedback') {
            // Solicitar cambios
            const { data: updatedProj, error: updateErr } = await supabase
                .from('projects')
                .update({ status: 'review' })
                .eq('id', project.id)
                .select()
                .single();

            if (updateErr) throw updateErr;

            await supabase
                .from('budgets')
                .update({ client_feedback: client_feedback })
                .eq('project_id', project.id)
                .eq('is_active', true);

            updatedProject = updatedProj;
            updatedStatus = 'review';

            notificationSubject = `💡 Solicitud de cambios: ${project.client_name}`;
            notificationBody = `El cliente <strong>${project.client_name}</strong> ha solicitado modificaciones en el presupuesto de "<strong>${project.title}</strong>".<br/><br/>
            Comentarios del cliente: <em>"${client_feedback}"</em>`;
        }

        // --- ENVIAR NOTIFICACIONES DUALES (EMAIL + WHATSAPP) ---
        if (notificationSubject) {
            // 1. WhatsApp Alert
            const rawText = `🔔 NEXOFILM CRM\n\n${notificationSubject}\n\nProyecto: ${project.title}\nEstado actual: ${updatedStatus.toUpperCase()}\n\nVer en Admin:\nhttps://nexofilm.com/admin`;
            await notifyMartinWhatsApp(rawText);

            // 2. Email Alert
            await notifyMartinEmail(notificationSubject, notificationBody, project.id);
        }

        return res.status(200).json({
            success: true,
            project: updatedProject
        });

    } catch (error) {
        console.error('Error en client-action API:', error);
        return res.status(500).json({ error: error.message });
    }
}

// Helper para WhatsApp
async function notifyMartinWhatsApp(text) {
    const token = process.env.WHATSAPP_TOKEN?.trim();
    const phoneNumberId = process.env.WHATSAPP_PHONE_ID?.trim();
    if (!token || !phoneNumberId) return;

    try {
        await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`, 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({ 
                messaging_product: 'whatsapp', 
                to: ADMIN_NUMBER, 
                type: 'text', 
                text: { body: text } 
            })
        });
    } catch (err) {
        console.error('Error enviando whatsapp de alerta comercial:', err.message);
    }
}

// Helper para Email (Resend)
async function notifyMartinEmail(subject, body, projectId) {
    if (!process.env.RESEND_API_KEY) return;
    const emails = ['martinmagarinios@gmail.com', 'martin@nexofilm.com'];
    
    const htmlContent = `
        <div style="font-family: sans-serif; padding: 24px; border-top: 4px solid #ccff00; background-color: #0d0d0d; color: #ffffff; max-width: 600px; margin: 0 auto; border-radius: 8px;">
            <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #ccff00; font-size: 24px; margin: 0; text-transform: uppercase; letter-spacing: 1px;">NexoFilm CRM</h1>
            </div>
            <div style="background-color: #1a1a1a; padding: 20px; border-radius: 6px; border: 1px solid #333;">
                <p style="font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; color: #e0e0e0;">
                    ${body}
                </p>
                <div style="text-align: center; margin-top: 30px;">
                    <a href="https://nexofilm.com/admin" style="background-color: #ccff00; color: #000000; padding: 14px 28px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 14px; text-transform: uppercase; display: inline-block;">
                        Ir al Panel de Administración
                    </a>
                </div>
            </div>
            <p style="font-size: 11px; color: #666; text-align: center; margin-top: 24px;">
                Mensaje automático del sistema comercial de NexoFilm.
            </p>
        </div>
    `;

    for (const email of emails) {
        try {
            await resend.emails.send({
                from: 'NexoCRM <martin@nexofilm.com>',
                to: [email],
                subject: subject,
                html: htmlContent
            });
        } catch (e) {
            console.error(`Error en envío de email a ${email}:`, e.message);
        }
    }
}
