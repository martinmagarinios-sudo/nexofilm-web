import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import Groq from 'groq-sdk';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
const AdmZip = require('adm-zip');

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_KEY;
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

const resend = new Resend((process.env.RESEND_API_KEY || '').trim());
const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY.trim() }) : null;

const ADMIN_NUMBER = '541151191964';

// Helper para extraer texto de DOCX
function extractTextFromDocx(buffer) {
    try {
        const zip = new AdmZip(buffer);
        const docXml = zip.readAsText('word/document.xml');
        // Limpiar XML para obtener texto plano
        const cleanedText = docXml
            .replace(/<w:p[^>]*>/g, '\n')
            .replace(/<[^>]+>/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        return cleanedText;
    } catch (err) {
        console.error('Error parsing DOCX:', err);
        throw new Error('No se pudo extraer el texto del archivo Word (.docx)');
    }
}

// Helper para extraer texto de PDF
async function extractTextFromPdf(buffer) {
    try {
        const data = await pdfParse(buffer);
        return data.text;
    } catch (err) {
        console.error('Error parsing PDF:', err);
        throw new Error('No se pudo extraer el texto del archivo PDF');
    }
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { 
        action, 
        password, 
        project_id, 
        status, 
        drive_folder_id, 
        items, 
        total_price, 
        payment_terms,
        contact_name,
        client_email,
        company_name,
        currency,
        crew_count,
        fileBase64,
        filename
    } = req.body;

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
                const { data: projects, error: projErr } = await supabase
                    .from('projects')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (projErr) throw projErr;

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

            case 'createProject': {
                const { 
                    client_phone, 
                    notification_preference = 'both', 
                    title, 
                    event_date, 
                    event_time, 
                    location, 
                    coverage_types, 
                    coverage_hours, 
                    guests_count 
                } = req.body;

                if (!contact_name) {
                    return res.status(400).json({ error: 'Falta campo obligatorio: Nombre de contacto' });
                }

                const projectTitle = title && title.trim() !== '' ? title : 'Propuesta Comercial';

                // Insertar el proyecto
                const { data: project, error: projErr } = await supabase
                    .from('projects')
                    .insert({
                        contact_name,
                        client_email: client_email || '',
                        client_phone: client_phone || null,
                        company_name: company_name || null,
                        notification_preference,
                        title: projectTitle,
                        status: status || 'draft',
                        event_date: event_date || null,
                        event_time: event_time || null,
                        location: location || null,
                        coverage_types: coverage_types || [],
                        coverage_hours: coverage_hours ? parseInt(coverage_hours) : null,
                        guests_count: guests_count ? parseInt(guests_count) : null,
                        drive_folder_id: drive_folder_id || null,
                        currency: currency || 'USD',
                        crew_count: crew_count ? parseInt(crew_count) : null
                    })
                    .select()
                    .single();

                if (projErr) throw projErr;

                // Insertar presupuesto si se pasaron ítems iniciales
                let budget = null;
                const validItems = (items || []).filter(item => item.description && item.description.trim() !== '');
                
                if (validItems.length > 0) {
                    const calculatedTotal = validItems
                        .filter(item => !item.is_optional)
                        .reduce((acc, curr) => acc + (curr.quantity * curr.unit_price), 0);

                    const { data: bData, error: bErr } = await supabase
                        .from('budgets')
                        .insert({
                            project_id: project.id,
                            version: 1,
                            items: validItems,
                            total_price: calculatedTotal,
                            payment_terms: payment_terms || '',
                            is_active: true
                        })
                        .select()
                        .single();

                    if (bErr) throw bErr;
                    budget = bData;
                }

                const host = req.headers.host || 'nexofilm.com';
                const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';
                const clientUrl = `${protocol}://${host}/portal?token=${project.access_token}`;

                return res.status(200).json({ 
                    success: true, 
                    project, 
                    budget, 
                    clientUrl 
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

                // Calcular total sumando sólo los ítems que NO son opcionales
                const calculatedTotal = items
                    .filter(item => !item.is_optional)
                    .reduce((acc, curr) => acc + (curr.quantity * curr.unit_price), 0);

                const { data: existingBudget } = await supabase
                    .from('budgets')
                    .select('*')
                    .eq('project_id', project_id)
                    .eq('is_active', true)
                    .maybeSingle();

                if (existingBudget) {
                    const { error: bErr } = await supabase
                        .from('budgets')
                        .update({
                            items,
                            total_price: calculatedTotal,
                            payment_terms: payment_terms || '',
                            version: (existingBudget.version || 1) + 1,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', existingBudget.id);

                    if (bErr) throw bErr;
                } else {
                    const { error: bErr } = await supabase
                        .from('budgets')
                        .insert({
                            project_id,
                            version: 1,
                            items,
                            total_price: calculatedTotal,
                            payment_terms: payment_terms || '',
                            is_active: true
                        });

                    if (bErr) throw bErr;
                }

                const { data: project, error: updateErr } = await supabase
                    .from('projects')
                    .update({ status: 'sent', updated_at: new Date().toISOString() })
                    .eq('id', project_id)
                    .select()
                    .single();

                if (updateErr) throw updateErr;

                // Notificar al cliente por Email / WhatsApp
                await notifyClient(project, items, calculatedTotal, payment_terms, req.headers.host || 'nexofilm.com');

                return res.status(200).json({ 
                    success: true, 
                    project 
                });
            }

            case 'generateBudgetIA': {
                const { title, client_name: nameToUse } = req.body;
                if (!title) {
                    return res.status(400).json({ error: 'El título del proyecto es requerido' });
                }

                if (!groq) {
                    return res.status(500).json({ error: 'Groq API Key is not configured' });
                }

                const systemPrompt = `Eres un experto productor audiovisual y consultor comercial de la productora NexoFilm (Argentina).
Tu tarea es generar el desglose de ítems comerciales y las condiciones de pago ideales para un proyecto audiovisual.

Genera una propuesta estética, profesional y sumamente detallada (describiendo equipamiento de gama alta, cámaras Sony FX3/FX6, jornadas de edición, colorización, etc.).
Identifica si algún servicio es típicamente un "Extra" (por ejemplo: edición en vivo, drone, operador adicional, luces de fiesta avanzadas) y colócale la propiedad "is_optional": true en el JSON de ese ítem.

Debes responder ÚNICAMENTE con un objeto JSON válido con la siguiente estructura (no agregues texto fuera del JSON ni markdown):
{
  "items": [
    {
      "description": "Descripción muy profesional y técnica del servicio base (ej: Jornada de rodaje de 8hs con 2 cámaras Sony FX3, ópticas de cine, micrófonos corbateros e iluminación LED Aputure)",
      "quantity": 1,
      "unit_price": 0,
      "is_optional": false
    },
    {
      "description": "Edición en vivo / Entrega express de un resumen de 1 min durante el evento (Servicio Opcional)",
      "quantity": 1,
      "unit_price": 0,
      "is_optional": true
    }
  ],
  "payment_terms": "Condiciones de pago profesionales redactadas en español rioplatense (voseo), aclarando plazos de entrega, anticipo del 50%, y datos de facturación."
}`;

                const userPrompt = `Proyecto: "${title}" para el cliente "${nameToUse || contact_name || 'Particular'}".
Generame entre 2 y 4 ítems de presupuesto detallando los servicios específicos requeridos y las condiciones de pago. Si hay algún servicio complementario o adicional (ej. Drone, edición rápida en vivo), marcalo como "is_optional": true. Ajusta todos los unit_price a 0 (el productor los ingresará manualmente).`;

                const chatCompletion = await groq.chat.completions.create({
                    model: 'llama-3.3-70b-versatile',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    temperature: 0.6,
                    response_format: { type: "json_object" }
                });

                const responseText = chatCompletion.choices[0].message.content;
                const generatedData = JSON.parse(responseText);

                return res.status(200).json({
                    success: true,
                    items: generatedData.items || [],
                    payment_terms: generatedData.payment_terms || ''
                });
            }

            case 'sendInvoice': {
                const { 
                    invoice_url, 
                    invoice_type, 
                    invoice_amount, 
                    bank_details
                } = req.body;

                if (!project_id) {
                    return res.status(400).json({ error: 'El ID del proyecto es requerido' });
                }

                const { data: updatedProject, error: updateErr } = await supabase
                    .from('projects')
                    .update({
                        invoice_url: invoice_url || null,
                        invoice_type: invoice_type || null,
                        invoice_amount: invoice_amount ? parseFloat(invoice_amount) : null,
                        bank_details: bank_details || null
                    })
                    .eq('id', project_id)
                    .select()
                    .single();

                if (updateErr) throw updateErr;

                return res.status(200).json({
                    success: true,
                    project: updatedProject
                });
            }

            case 'deleteProject': {
                if (!project_id) {
                    return res.status(400).json({ error: 'El ID del proyecto es requerido' });
                }

                const { data, error: delErr } = await supabase
                    .from('projects')
                    .delete()
                    .eq('id', project_id)
                    .select()
                    .single();

                if (delErr) throw delErr;

                return res.status(200).json({
                    success: true,
                    project: data
                });
            }

            case 'rotateToken': {
                if (!project_id) {
                    return res.status(400).json({ error: 'El ID del proyecto es requerido' });
                }

                const { crypto } = await import('crypto');
                const newToken = crypto.randomUUID();

                const { data: updatedProject, error: updateErr } = await supabase
                    .from('projects')
                    .update({ access_token: newToken })
                    .eq('id', project_id)
                    .select()
                    .single();

                if (updateErr) throw updateErr;

                return res.status(200).json({
                    success: true,
                    project: updatedProject
                });
            }

            case 'updateContact': {
                if (!project_id) {
                    return res.status(400).json({ error: 'El ID del proyecto es requerido' });
                }

                const { data: updatedProject, error: updateErr } = await supabase
                    .from('projects')
                    .update({
                        contact_name: contact_name || '',
                        client_email: client_email || '',
                        company_name: company_name || null,
                        currency: currency || 'USD',
                        crew_count: crew_count ? parseInt(crew_count) : null
                    })
                    .eq('id', project_id)
                    .select()
                    .single();

                if (updateErr) throw updateErr;

                return res.status(200).json({
                    success: true,
                    project: updatedProject
                });
            }

            case 'processDocument': {
                if (!project_id || !fileBase64 || !filename) {
                    return res.status(400).json({ error: 'Faltan parámetros (project_id, fileBase64 o filename)' });
                }

                if (!groq) {
                    return res.status(500).json({ error: 'Groq API Key is not configured' });
                }

                const fileBuffer = Buffer.from(fileBase64, 'base64');
                let extractedText = '';

                if (filename.toLowerCase().endsWith('.pdf')) {
                    extractedText = await extractTextFromPdf(fileBuffer);
                } else if (filename.toLowerCase().endsWith('.docx') || filename.toLowerCase().endsWith('.doc')) {
                    extractedText = extractTextFromDocx(fileBuffer);
                } else {
                    return res.status(400).json({ error: 'Formato de archivo no soportado. Subir PDF o Word (.docx).' });
                }

                const systemPrompt = `Sos un asistente de NexoFilm, productora audiovisual argentina.
Analizá el siguiente texto que es un pliego de requerimientos de un cliente.
Respondé EXCLUSIVAMENTE con un JSON con esta estructura exacta (no agregues explicaciones ni markdown, responde con el objeto JSON puro):
{
  "basic_data": { 
    "event_date": "YYYY-MM-DD o null",
    "location": "string o null",
    "coverage_hours": "number o null"
  },
  "deliverables": { 
    "videos_to_deliver": "string o null",
    "photos_required": "boolean",
    "live_streaming": "boolean"
  },
  "special_services": { 
    "live_editing_recap": "boolean",
    "lighting_setup": "string o null",
    "notes": "string o null"
  }
}`;

                const chatCompletion = await groq.chat.completions.create({
                    model: 'llama-3.3-70b-versatile',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: `Extraé los requerimientos de este documento:\n\n${extractedText}` }
                    ],
                    temperature: 0.2,
                    response_format: { type: "json_object" }
                });

                const aiJSON = JSON.parse(chatCompletion.choices[0].message.content);

                // Guardar en la base de datos
                const { data: updatedProject, error: updateErr } = await supabase
                    .from('projects')
                    .update({ 
                        ai_extracted_requirements: aiJSON,
                        // Si la IA detecta la fecha o lugar, los precargamos si están vacíos
                        event_date: aiJSON.basic_data?.event_date || null,
                        location: aiJSON.basic_data?.location || null,
                        coverage_hours: aiJSON.basic_data?.coverage_hours || null
                    })
                    .eq('id', project_id)
                    .select()
                    .single();

                if (updateErr) throw updateErr;

                return res.status(200).json({
                    success: true,
                    ai_extracted_requirements: aiJSON,
                    project: updatedProject
                });
            }

            case 'sendProactiveBudget': {
                if (!project_id || !items) {
                    return res.status(400).json({ error: 'Faltan campos project_id o items' });
                }

                const calculatedTotal = items
                    .filter(item => !item.is_optional)
                    .reduce((acc, curr) => acc + (curr.quantity * curr.unit_price), 0);

                // Insertar presupuesto
                const { data: newBudget, error: bErr } = await supabase
                    .from('budgets')
                    .insert({
                        project_id,
                        version: 1,
                        items,
                        total_price: calculatedTotal,
                        payment_terms: payment_terms || '',
                        is_active: true
                    })
                    .select()
                    .single();

                if (bErr) throw bErr;

                // Actualizar estado a 'sent'
                const { data: project, error: updateErr } = await supabase
                    .from('projects')
                    .update({ status: 'sent', updated_at: new Date().toISOString() })
                    .eq('id', project_id)
                    .select()
                    .single();

                if (updateErr) throw updateErr;

                // Notificar al cliente
                await notifyClient(project, items, calculatedTotal, payment_terms, req.headers.host || 'nexofilm.com');

                const host = req.headers.host || 'nexofilm.com';
                const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';
                const portalUrl = `${protocol}://${host}/portal?token=${project.access_token}`;
                const cleanPhone = (project.client_phone || '').replace(/\D/g, '');
                
                let waLink = '';
                if (cleanPhone) {
                    const messageText = `🎥 *NexoFilm - Propuesta Comercial*\n\n¡Hola ${project.contact_name}! Ya preparamos la cotización detallada para tu proyecto "${project.title}".\n\nPodés verla, solicitar modificaciones o aprobarla en tu portal seguro:\n👉 ${portalUrl}`;
                    waLink = `https://wa.me/${cleanPhone.startsWith('54') || cleanPhone.length > 10 ? cleanPhone : '54' + cleanPhone}?text=${encodeURIComponent(messageText)}`;
                }

                return res.status(200).json({ 
                    success: true, 
                    project,
                    budget: newBudget,
                    portalUrl,
                    waLink
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

// Helper para notificar al cliente por Email / WhatsApp
async function notifyClient(project, items, total, terms, host) {
    const preference = project.notification_preference || 'both';
    const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';
    const portalUrl = `${protocol}://${host}/portal?token=${project.access_token}`;

    const subject = `💸 Presupuesto listo para revisar: ${project.title} - NexoFilm`;

    // Separar ítems base de opcionales para el formato del email
    const baseItems = (items || []).filter(item => !item.is_optional);
    const optionalItems = (items || []).filter(item => item.is_optional);
    const currencySymbol = project.currency || 'USD';

    let itemsHtml = '';
    baseItems.forEach(item => {
        itemsHtml += `<tr style="border-bottom: 1px solid #222;">
            <td style="padding: 10px 0; color: #e0e0e0;">${item.description}</td>
            <td style="padding: 10px 0; text-align: center; color: #a0a0a0;">${item.quantity}</td>
            <td style="padding: 10px 0; text-align: right; color: #ccff00; font-weight: bold;">${currencySymbol} ${(item.quantity * item.unit_price).toLocaleString()}</td>
        </tr>`;
    });

    let optionalsHtml = '';
    if (optionalItems.length > 0) {
        optionalsHtml += `<h3 style="color: #ffffff; font-size: 14px; margin: 20px 0 10px 0; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #333; padding-bottom: 5px;">Servicios Adicionales Sugeridos (Opcionales)</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">`;
        optionalItems.forEach(item => {
            optionalsHtml += `<tr style="border-bottom: 1px solid #222;">
                <td style="padding: 8px 0; color: #a0a0a0;">➕ ${item.description}</td>
                <td style="padding: 8px 0; text-align: center; color: #888;">${item.quantity}</td>
                <td style="padding: 8px 0; text-align: right; color: #00e5ff; font-weight: bold;">+ ${currencySymbol} ${(item.quantity * item.unit_price).toLocaleString()}</td>
            </tr>`;
        });
        optionalsHtml += `</table>`;
    }
    
    // 1. Enviar Email
    if ((preference === 'email' || preference === 'both') && project.client_email && process.env.RESEND_API_KEY) {
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
                            <p style="font-size: 16px; margin: 0 0 10px 0; color: #ffffff;">Hola <strong>${project.contact_name}</strong>,</p>
                            <p style="font-size: 14px; margin: 0 0 20px 0; color: #e0e0e0;">
                                Ya preparamos la propuesta comercial detallada para tu proyecto "<strong>${project.title}</strong>".
                            </p>
                            
                            <h3 style="color: #ffffff; font-size: 14px; margin: 20px 0 10px 0; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #333; padding-bottom: 5px;">Servicios Principales</h3>
                            <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px;">
                                <thead>
                                    <tr style="border-bottom: 2px solid #333; text-align: left; color: #888;">
                                        <th style="padding-bottom: 8px;">Descripción</th>
                                        <th style="padding-bottom: 8px; text-align: center;">Cant</th>
                                        <th style="padding-bottom: 8px; text-align: right;">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${itemsHtml}
                                </tbody>
                            </table>

                            <div style="text-align: right; font-size: 16px; font-weight: bold; margin-bottom: 20px; color: #ffffff;">
                                Total Presupuesto Base: <span style="color: #ccff00; font-size: 18px;">${currencySymbol} ${total.toLocaleString()}</span>
                            </div>

                            ${optionalsHtml}

                            <p style="font-size: 13px; color: #a0a0a0; margin-top: 20px; border-top: 1px dashed #333; padding-top: 15px;">
                                <strong>Condiciones de Pago:</strong><br/>
                                ${terms ? terms.replace(/\n/g, '<br/>') : '50% de seña para reservar fecha, 50% contra entrega.'}
                            </p>

                            <p style="font-size: 14px; margin: 20px 0 20px 0; color: #e0e0e0;">
                                Podés aprobar, rechazar o sugerir modificaciones en este presupuesto desde tu portal seguro:
                            </p>
                            <div style="text-align: center; margin-top: 20px; margin-bottom: 10px;">
                                <a href="${portalUrl}" style="background-color: #ccff00; color: #000000; padding: 14px 28px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 13px; text-transform: uppercase; display: inline-block; box-shadow: 0 4px 10px rgba(204,255,0,0.2);">
                                    Revisar y Autogestionar Presupuesto
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
            console.log(`Email de cotización enviado con éxito a: ${project.client_email}`);
        } catch (e) {
            console.error(`Error enviando email al cliente:`, e.message);
        }
    }

    // 2. Enviar WhatsApp
    if ((preference === 'whatsapp' || preference === 'both') && project.client_phone) {
        const token = process.env.WHATSAPP_TOKEN?.trim();
        const phoneNumberId = process.env.WHATSAPP_PHONE_ID?.trim();
        
        if (token && phoneNumberId) {
            let cleanPhone = project.client_phone.replace(/\D/g, '');
            if (!cleanPhone.startsWith('54') && cleanPhone.length === 10) {
                cleanPhone = '54' + cleanPhone;
            }
            
            const messageText = `🎥 *NexoFilm - Propuesta Comercial*\n\n¡Hola ${project.contact_name}! Ya está listo tu presupuesto para "${project.title}".\n\nPresupuesto base: ${project.currency || 'USD'} ${total.toLocaleString()}\n${optionalItems.length > 0 ? `(También incluimos algunos adicionales opcionales)\n` : ''}\nIngresá al portal para ver el desglose completo, pedir ajustes o confirmarlo:\n👉 ${portalUrl}`;

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
                    console.error('Error Meta API en WhatsApp de cotización:', resData.error);
                } else {
                    console.log(`WhatsApp de cotización enviado con éxito al cliente +${cleanPhone}`);
                }
            } catch (err) {
                console.error('Error al enviar WhatsApp al cliente:', err.message);
            }
        }
    }
}
