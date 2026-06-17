// Polyfills para pdf-parse en ambiente serverless sin navegador
if (typeof global.DOMMatrix === 'undefined') {
    global.DOMMatrix = class DOMMatrix {};
}
if (typeof global.ImageData === 'undefined') {
    global.ImageData = class ImageData {};
}
if (typeof global.Path2D === 'undefined') {
    global.Path2D = class Path2D {};
}

import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import Groq from 'groq-sdk';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const AdmZip = require('adm-zip');
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_KEY;
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

const resend = new Resend((process.env.RESEND_API_KEY || '').trim());
const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY.trim() }) : null;

const ADMIN_NUMBER = '541151191964';

// Helpers de encriptación para Drive
function base64url(str) {
    return Buffer.from(str)
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
}

function generateJWT(email, privateKey) {
    const header = JSON.stringify({ alg: 'RS256', typ: 'JWT' });
    const now = Math.floor(Date.now() / 1000);
    const payload = JSON.stringify({
        iss: email,
        scope: 'https://www.googleapis.com/auth/drive.readonly',
        aud: 'https://oauth2.googleapis.com/token',
        exp: now + 3600,
        iat: now
    });

    const signatureInput = `${base64url(header)}.${base64url(payload)}`;
    const formattedKey = privateKey.replace(/\\n/g, '\n');

    const sign = crypto.createSign('RSA-SHA256');
    sign.update(signatureInput);
    const signature = sign.sign(formattedKey, 'base64');
    const encodedSignature = signature.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

    return `${signatureInput}.${encodedSignature}`;
}

async function getGoogleAccessToken(email, privateKey) {
    const jwt = generateJWT(email, privateKey);
    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
    });

    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.error_description || data.error || 'Error de autenticación con Google');
    }
    return data.access_token;
}

// Helpers para documentos
function extractTextFromDocx(buffer) {
    try {
        const zip = new AdmZip(buffer);
        const docXml = zip.readAsText('word/document.xml');
        const cleanedText = docXml
            .replace(/<w:p[^>]*>/g, '\n')
            .replace(/<[^>]+>/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        return cleanedText;
    } catch (err) {
        console.error('Error parsing DOCX:', err);
        return ''; // Retornar vacío en lugar de lanzar error
    }
}

async function extractTextFromPdf(buffer) {
    let parser;
    try {
        const pdfParseModule = require('pdf-parse');
        const PDFParse = pdfParseModule.PDFParse;
        parser = new PDFParse({ data: buffer });
        const result = await parser.getText();
        return result.text || '';
    } catch (err) {
        console.error('Error parsing PDF:', err);
        return ''; // Retornar vacío en lugar de tirar error, el archivo se respalda en storage
    } finally {
        if (parser && typeof parser.destroy === 'function') {
            try {
                await parser.destroy();
            } catch (destroyErr) {
                console.error('Error destroying PDF parser:', destroyErr);
            }
        }
    }
}

export default async function handler(req, res) {
    const method = req.method;
    const token = req.headers['x-client-token'] || req.query.token || req.body.token;

    if (!supabase) {
        return res.status(500).json({ error: 'Supabase credentials not configured' });
    }

    // --- ACCIÓN DE LOGIN CON MAGIC LINK (POST, NO REQUIERE TOKEN EXTRÍNSECO PREVIO) ---
    if (method === 'POST' && req.body.action === 'request_magic_link') {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'El email es requerido' });
        }

        try {
            // Buscar proyectos asociados al mail
            const { data: projects, error: pErr } = await supabase
                .from('projects')
                .select('id, title, access_token, last_magic_link_at')
                .eq('client_email', email.trim().toLowerCase());

            if (pErr) throw pErr;

            if (!projects || projects.length === 0) {
                return res.status(404).json({ error: 'El email ingresado no coincide con ningún proyecto registrado.' });
            }

            // Verificar rate limit de 5 minutos
            const now = new Date();
            const cooldownTime = 5 * 60 * 1000;
            const recentRequest = projects.some(p => {
                if (!p.last_magic_link_at) return false;
                const lastRequest = new Date(p.last_magic_link_at);
                return (now.getTime() - lastRequest.getTime()) < cooldownTime;
            });

            if (recentRequest) {
                return res.status(429).json({ error: 'Ya enviamos un enlace recientemente. Por favor, revisá tu correo o esperá unos minutos.' });
            }

            // Actualizar last_magic_link_at en Supabase
            const projectIds = projects.map(p => p.id);
            const { error: upErr } = await supabase
                .from('projects')
                .update({ last_magic_link_at: now.toISOString() })
                .in('id', projectIds);

            if (upErr) throw upErr;

            // Enviar email
            const host = req.headers.host || 'nexofilm.com';
            const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';

            let linksHtml = '';
            projects.forEach(p => {
                const link = `${protocol}://${host}/portal?token=${p.access_token}`;
                linksHtml += `<li style="margin-bottom: 12px; list-style: none; background: #222; padding: 12px; border-radius: 4px; border: 1px solid #333;">
                    <span style="color: #888; font-size: 11px; text-transform: uppercase;">Proyecto</span><br/>
                    <strong style="color: #ffffff; font-size: 15px;">${p.title}</strong><br/>
                    <a href="${link}" style="color: #ccff00; font-weight: bold; text-decoration: none; font-size: 13px; display: inline-block; margin-top: 6px;">Ingresar al Portal Seguro →</a>
                </li>`;
            });

            const emailSubject = `🔐 Enlace de Acceso al Portal - NexoFilm`;
            const emailBody = `
                <div style="font-family: sans-serif; padding: 24px; border-top: 4px solid #ccff00; background-color: #0d0d0d; color: #ffffff; max-width: 600px; margin: 0 auto; border-radius: 8px;">
                    <div style="text-align: center; margin-bottom: 24px;">
                        <img src="https://nexofilm.com/favicon.png" alt="NexoFilm" style="height: 40px; filter: brightness(0) invert(1);" />
                        <h1 style="color: #ccff00; font-size: 22px; margin: 15px 0 0 0; text-transform: uppercase; letter-spacing: 1px;">Acceso Seguro</h1>
                    </div>
                    <div style="background-color: #1a1a1a; padding: 20px; border-radius: 6px; border: 1px solid #333; line-height: 1.6;">
                        <p style="font-size: 15px; margin: 0 0 10px 0; color: #ffffff;">Hola,</p>
                        <p style="font-size: 13px; margin: 0 0 20px 0; color: #e0e0e0;">
                            Hiciste clic en ingresar desde el Portal de Autogestión. Aquí están tus enlaces seguros:
                        </p>
                        <ul style="padding: 0; margin: 0;">
                            ${linksHtml}
                        </ul>
                        <p style="font-size: 11px; color: #666; margin-top: 20px; border-top: 1px dashed #333; padding-top: 15px;">
                            Si no solicitaste este enlace, ignoralo tranquilamente. Los links son únicos y confidenciales.
                        </p>
                    </div>
                    <p style="font-size: 10px; color: #666; text-align: center; margin-top: 24px;">
                        NexoFilm Productora Audiovisual · Buenos Aires, Argentina.
                    </p>
                </div>
            `;

            await resend.emails.send({
                from: 'NexoFilm <hola@nexofilm.com>',
                to: [email],
                subject: emailSubject,
                html: emailBody
            });

            return res.status(200).json({ success: true, message: 'Magic link enviado correctamente' });
        } catch (error) {
            console.error('Error enviando Magic Link:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    // --- ACCIÓN DE CREAR LEAD PÚBLICO (POST, NO REQUIERE TOKEN PREVIO) ---
    if (method === 'POST' && req.body.action === 'create_public_lead') {
        const { specifications } = req.body;
        if (!specifications || !specifications.title || !specifications.contact_name || !specifications.client_email) {
            return res.status(400).json({ error: 'Faltan datos obligatorios (Título, Nombre, Email)' });
        }

        try {
            const newToken = crypto.randomBytes(32).toString('hex');
            let newLeadData = {
                title: specifications.title,
                contact_name: specifications.contact_name,
                client_email: specifications.client_email,
                client_phone: specifications.client_phone || null,
                location: specifications.location || null,
                event_date: specifications.event_date || null,
                event_time: specifications.event_time || null,
                coverage_types: specifications.coverage_types || [],
                coverage_hours: specifications.coverage_hours || null,
                guests_count: specifications.guests_count || null,
                client_notes: specifications.client_notes || null,
                access_token: newToken,
                status: 'review',
                admin_action_required: true,
                currency: 'ARS'
            };

            let newLead;
            const { data: lead1, error: insertErr } = await supabase
                .from('projects')
                .insert([newLeadData])
                .select('*')
                .single();

            if (insertErr) {
                console.warn('Fallo el insert principal, intentando con fallback seguro:', insertErr.message || insertErr);
                const safeData = { ...newLeadData };
                const newColumns = ['admin_action_required', 'client_notes', 'client_phone', 'guests_count', 'contact_name'];
                newColumns.forEach(col => delete safeData[col]);
                
                if (newLeadData.contact_name) {
                    safeData.client_name = newLeadData.contact_name;
                }

                const { data: lead2, error: fallbackErr } = await supabase
                    .from('projects')
                    .insert([safeData])
                    .select('*')
                    .single();

                if (fallbackErr) throw fallbackErr;
                newLead = lead2;
            } else {
                newLead = lead1;
            }

            return res.status(200).json({ success: true, project: newLead });
        } catch (error) {
            console.error('Error creando Public Lead:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    // --- CUALQUIER OTRA ACCIÓN REQUIERE UN TOKEN VÁLIDO ---
    if (!token) {
        return res.status(401).json({ error: 'Token de acceso requerido' });
    }

    try {
        // Cargar el proyecto asociado al token
        const { data: project, error: projErr } = await supabase
            .from('projects')
            .select('*')
            .eq('access_token', token)
            .maybeSingle();

        if (projErr) throw projErr;

        if (!project) {
            return res.status(404).json({ error: 'Proyecto no encontrado o token inválido' });
        }

        // --- MANEJO DE GET ---
        if (method === 'GET') {
            const { action } = req.query;

            // GET Acción: Listar archivos de Drive (Mock fallback si faltan credenciales)
            if (action === 'drive') {
                if (project.status !== 'delivered') {
                    return res.status(403).json({ error: 'El material final aún no está disponible' });
                }

                const driveFolderId = project.drive_folder_id;
                const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
                const privateKey = process.env.GOOGLE_PRIVATE_KEY;

                if (!driveFolderId || !clientEmail || !privateKey) {
                    // MOCK Fallback
                    const mockFiles = [
                        {
                            id: 'mock-1',
                            name: '01_Video_Principal_Final_1080p.mp4',
                            mimeType: 'video/mp4',
                            webViewLink: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                            thumbnailLink: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=400&q=80',
                            webContentLink: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                            size: '245678900'
                        },
                        {
                            id: 'mock-2',
                            name: '02_Teaser_Redes_9x16.mp4',
                            mimeType: 'video/mp4',
                            webViewLink: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                            thumbnailLink: 'https://images.unsplash.com/photo-1542204172-e7052809a8a7?auto=format&fit=crop&w=400&q=80',
                            webContentLink: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                            size: '89123450'
                        },
                        {
                            id: 'mock-3',
                            name: 'Selección_Fotografías_Editadas.zip',
                            mimeType: 'application/zip',
                            webViewLink: '#',
                            thumbnailLink: 'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?auto=format&fit=crop&w=400&q=80',
                            webContentLink: '#',
                            size: '1256789000'
                        }
                    ];

                    return res.status(200).json({
                        success: true,
                        isMock: true,
                        files: mockFiles
                    });
                }

                try {
                    const googleAccessToken = await getGoogleAccessToken(clientEmail, privateKey);
                    const q = `'${driveFolderId}' in parents and trashed = false`;
                    const fields = 'files(id,name,mimeType,webViewLink,thumbnailLink,webContentLink,size)';
                    const driveUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=${encodeURIComponent(fields)}`;

                    const driveRes = await fetch(driveUrl, {
                        headers: { 'Authorization': `Bearer ${googleAccessToken}` }
                    });

                    const driveData = await driveRes.json();
                    if (!driveRes.ok) throw new Error(driveData.error?.message || 'Error con la API de Google Drive');

                    return res.status(200).json({
                        success: true,
                        isMock: false,
                        files: driveData.files || []
                    });
                } catch (gErr) {
                    console.error('Error conectando con Google Drive:', gErr);
                    return res.status(500).json({ error: gErr.message });
                }
            }

            // GET Acción: Render HTML con OG Tags Dinámicos
            if (action === 'render') {
                let title = "Portal de Clientes - NexoFilm";
                let description = "Accedé al portal para gestionar tu propuesta comercial.";

                if (project) {
                    if (project.title) {
                        title = `${project.title} - NexoFilm`;
                    }
                    const contactName = project.contact_name || '';
                    if (contactName) {
                        description = `¡Hola ${contactName}! Ingresá a tu portal para revisar el presupuesto, ver el estado o solicitar cambios.`;
                    }
                }

                try {
                    // Buscar index.html de forma robusta en ambientes serverless
                    const searchPaths = [
                        path.join(process.cwd(), 'dist', 'index.html'),
                        path.join(process.cwd(), 'index.html'),
                        path.join(__dirname, '..', '..', 'dist', 'index.html'),
                        path.join(__dirname, '..', 'dist', 'index.html'),
                        path.join(__dirname, 'dist', 'index.html')
                    ];
                    let filePath = searchPaths[0];
                    for (const p of searchPaths) {
                        if (fs.existsSync(p)) {
                            filePath = p;
                            break;
                        }
                    }

                    let html = fs.readFileSync(filePath, 'utf8');

                    // Definir URLs absolutas dinámicas para la imagen OG y la URL de la página
                    const host = req.headers.host || 'nexofilm.com';
                    const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';
                    const imageUrl = `${protocol}://${host}/logo-whatsapp.jpg`;
                    const portalUrl = `${protocol}://${host}/portal?token=${token}`;

                    // Reemplazos de SEO/OG Tags soportando saltos de línea con [\s\r\n]+
                    html = html.replace(/<title>[^<]*<\/title>/g, `<title>${title}</title>`);
                    html = html.replace(/<meta[\s\r\n]+name="description"[\s\r\n]+content="[^"]*"/g, `<meta name="description" content="${description}"`);
                    html = html.replace(/<meta[\s\r\n]+property="og:title"[\s\r\n]+content="[^"]*"/g, `<meta property="og:title" content="${title}"`);
                    html = html.replace(/<meta[\s\r\n]+property="og:description"[\s\r\n]+content="[^"]*"/g, `<meta property="og:description" content="${description}"`);
                    html = html.replace(/<meta[\s\r\n]+property="og:image"[\s\r\n]+content="[^"]*"/g, `<meta property="og:image" content="${imageUrl}"`);
                    html = html.replace(/<meta[\s\r\n]+property="og:url"[\s\r\n]+content="[^"]*"/g, `<meta property="og:url" content="${portalUrl}"`);
                    html = html.replace(/<meta[\s\r\n]+property="twitter:title"[\s\r\n]+content="[^"]*"/g, `<meta property="twitter:title" content="${title}"`);
                    html = html.replace(/<meta[\s\r\n]+property="twitter:description"[\s\r\n]+content="[^"]*"/g, `<meta property="twitter:description" content="${description}"`);
                    html = html.replace(/<meta[\s\r\n]+property="twitter:image"[\s\r\n]+content="[^"]*"/g, `<meta property="twitter:image" content="${imageUrl}"`);

                    res.setHeader('Content-Type', 'text/html; charset=utf-8');
                    return res.status(200).send(html);
                } catch (htmlErr) {
                    console.error('Error renderizando index.html:', htmlErr);
                    return res.status(500).send('Error loading page');
                }
            }

            // GET por defecto: Obtener Proyecto y Presupuesto
            const { data: budget, error: budgErr } = await supabase
                .from('budgets')
                .select('*')
                .eq('project_id', project.id)
                .eq('is_active', true)
                .maybeSingle();

            if (budgErr) throw budgErr;

            // Verificar si ya existe review (para mostrar banner de feedback o no en el front)
            let hasReviewed = false;
            try {
                const { data: review } = await supabase
                    .from('project_reviews')
                    .select('id')
                    .eq('project_id', project.id)
                    .maybeSingle();
                if (review) hasReviewed = true;
            } catch (_) {}

            // Obtener otros proyectos asociados al mismo mail del cliente (si está seteado)
            let otherProjects = [];
            if (project.client_email) {
                const { data: others } = await supabase
                    .from('projects')
                    .select('id, title, access_token, status, event_date, location, company_name, created_at')
                    .eq('client_email', project.client_email)
                    .neq('id', project.id)
                    .order('created_at', { ascending: false });
                otherProjects = others || [];
            }

            return res.status(200).json({
                success: true,
                project,
                budget,
                hasReviewed,
                otherProjects
            });
        }

        // --- MANEJO DE POST ---
        if (method === 'POST') {
            const { action, client_feedback, specifications, rating, feedback_text, recommendation_score, fileBase64, filename } = req.body;

            let updatedProject = { ...project };
            let updatedStatus = project.status;
            let notificationSubject = '';
            let notificationBody = '';

            if (action === 'update_specifications') {
                const { title, contact_name, event_date, event_time, event_end_time, location, coverage_types, coverage_hours, client_phone, client_email, notification_preference, guests_count, client_notes } = specifications || {};

                const updateData = {
                    title: (title && title.trim() !== '') ? title.trim() : project.title,
                    contact_name: (contact_name && contact_name.trim() !== '') ? contact_name.trim() : project.contact_name,
                    event_date: (event_date && event_date.trim() !== '') ? event_date : project.event_date,
                    event_time: (event_time && event_time.trim() !== '') ? event_time : project.event_time,
                    location: (location !== undefined && location !== null) ? location : project.location,
                    coverage_types: coverage_types ?? project.coverage_types,
                    coverage_hours: coverage_hours ? parseInt(coverage_hours) : project.coverage_hours,
                    client_phone: (client_phone && client_phone.trim() !== '') ? client_phone : project.client_phone,
                    client_email: (client_email && client_email.trim() !== '') ? client_email.trim() : project.client_email,
                    notification_preference: notification_preference || project.notification_preference,
                    guests_count: guests_count !== undefined ? guests_count : project.guests_count,
                    client_notes: client_notes ?? project.client_notes,
                    status: 'review',
                    admin_action_required: true
                };

                if (event_end_time !== undefined) {
                    updateData.event_end_time = event_end_time;
                }

                let { data: updatedProj, error: updateErr } = await supabase
                    .from('projects')
                    .update(updateData)
                    .eq('id', project.id)
                    .select()
                    .single();

                if (updateErr) {
                    // Fallback: si falla la actualización, probablemente es porque faltan columnas nuevas en la base de datos.
                    // Eliminamos todas las columnas que no estaban en el schema original y volvemos a intentar.
                    console.warn("Fallo el update principal, intentando con fallback seguro:", updateErr.message || updateErr);
                    
                    const safeData = { ...updateData };
                    const newColumns = ['admin_action_required', 'event_end_time', 'client_notes', 'notification_preference', 'client_phone', 'guests_count', 'contact_name'];
                    newColumns.forEach(col => delete safeData[col]);
                    
                    // Asegurarnos de usar client_name si eliminamos contact_name
                    if (updateData.contact_name) {
                        safeData.client_name = updateData.contact_name;
                    }

                    const { data: fallbackProj, error: fallbackErr } = await supabase
                        .from('projects')
                        .update(safeData)
                        .eq('id', project.id)
                        .select()
                        .single();
                        
                    if (fallbackErr) throw fallbackErr;
                    updatedProj = fallbackProj;
                }

                updatedProject = updatedProj;
                updatedStatus = 'review';

                notificationSubject = `📝 Especificaciones actualizadas: ${updatedProject.contact_name || project.contact_name}`;
                notificationBody = `El cliente <strong>${updatedProject.contact_name || project.contact_name}</strong> ha completado/actualizado las especificaciones de su proyecto "<strong>${updatedProject.title}</strong>".<br/><br/>
                <strong>Título:</strong> ${updatedProject.title}<br/>
                <strong>Locación:</strong> ${updatedProject.location || 'No especificada'}<br/>
                <strong>Fecha:</strong> ${updatedProject.event_date || 'No especificada'}<br/>
                <strong>Estado:</strong> En Revisión comercial`;

                // Enviar notificación inmediatamente para esta acción
                try {
                    const rawText = `🔔 NEXOFILM CRM\n\n${notificationSubject}\n\nProyecto: ${updatedProject.title}\nLocación: ${updatedProject.location || 'Sin especificar'}\nFecha: ${updatedProject.event_date || 'Sin especificar'}\nEstado: REVISIÓN\n\nVer en Admin:\nhttps://nexofilm.com/admin`;
                    await notifyMartinWhatsApp(rawText);
                    await notifyMartinEmail(notificationSubject, notificationBody);
                } catch (notifErr) {
                    console.warn('Error enviando notificación de update_specifications:', notifErr.message);
                }

                return res.status(200).json({
                    success: true,
                    project: updatedProject
                });

            } else if (action === 'submit_billing_info') {
                const { billing_info } = req.body;
                
                let updatedProj;
                let dataToUpdate = { client_billing_info: billing_info || null };

                while (true) {
                    const { data: resultProj, error: updateErr } = await supabase
                        .from('projects')
                        .update(dataToUpdate)
                        .eq('id', project.id)
                        .select()
                        .single();

                    if (updateErr) {
                        const match1 = updateErr.message && updateErr.message.match(/Could not find the '([^']+)' column/i);
                        const match2 = updateErr.message && updateErr.message.match(/column "([^"]+)" of relation/i);
                        const missingColumn = (match1 && match1[1]) || (match2 && match2[1]);

                        if (missingColumn && dataToUpdate[missingColumn] !== undefined) {
                            console.warn(`Columna '${missingColumn}' no existe en la BD para billing_info. Usando bank_details.`);
                            delete dataToUpdate[missingColumn];
                            if (missingColumn === 'client_billing_info') {
                                dataToUpdate.bank_details = billing_info; // Fallback al schema original
                            }
                            continue;
                        } else {
                            throw updateErr;
                        }
                    }
                    updatedProj = resultProj;
                    break;
                }

                updatedProject = updatedProj;

                notificationSubject = `🧾 Datos de Facturación: ${project.contact_name}`;
                notificationBody = `El cliente <strong>${project.contact_name}</strong> ha cargado sus datos de facturación para el proyecto "<strong>${project.title}</strong>":<br/><br/>
                <pre style="background:#111; padding:10px; border-radius:4px; color:#fff; font-family:monospace; border:1px solid #222;">${billing_info || 'Sin datos'}</pre>`;

            } else if (action === 'submit_notes') {
                const { notes } = req.body;
                
                const updateData = {
                    client_notes: notes || null,
                    admin_action_required: true
                };

                let { data: updatedProj, error: updateErr } = await supabase
                    .from('projects')
                    .update(updateData)
                    .eq('id', project.id)
                    .select()
                    .single();

                if (updateErr) {
                    if (updateErr.message && updateErr.message.includes('admin_action_required')) {
                        delete updateData.admin_action_required;
                        const retry = await supabase
                            .from('projects')
                            .update(updateData)
                            .eq('id', project.id)
                            .select()
                            .single();
                        if (retry.error) throw retry.error;
                        updatedProj = retry.data;
                    } else {
                        throw updateErr;
                    }
                }

                updatedProject = updatedProj;

                notificationSubject = `💬 Nueva consulta de ${project.contact_name}`;
                notificationBody = `El cliente <strong>${project.contact_name}</strong> ha enviado una nueva observación/consulta para el proyecto "<strong>${project.title}</strong>":<br/><br/>
                <em>"${notes || 'Sin comentarios'}"</em>`;

            } else if (action === 'request_new_project') {
                const { data: newProj, error: createErr } = await supabase
                    .from('projects')
                    .insert({
                        contact_name: project.contact_name,
                        client_email: project.client_email,
                        client_phone: project.client_phone,
                        company_name: project.company_name,
                        notification_preference: project.notification_preference || 'both',
                        title: 'Nueva Propuesta Comercial',
                        status: 'draft',
                        currency: 'ARS'
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
                const { selected_optional_indices, billing_info, tax_certificate_url } = req.body;

                // 1. Obtener presupuesto activo
                const { data: activeBudget, error: getBudgErr } = await supabase
                    .from('budgets')
                    .select('*')
                    .eq('project_id', project.id)
                    .eq('is_active', true)
                    .maybeSingle();

                if (getBudgErr) throw getBudgErr;
                if (!activeBudget) {
                    return res.status(404).json({ error: 'No se encontró una propuesta activa para aprobar' });
                }

                // 2. Procesar ítems y calcular total
                const finalItems = [];
                let calculatedTotal = 0;
                let optionalIndexCounter = 0;
                let approvedOptionalCount = 0;

                for (const item of activeBudget.items) {
                    if (!item.is_optional) {
                        finalItems.push(item);
                        calculatedTotal += item.quantity * item.unit_price;
                    } else {
                        const isSelected = Array.isArray(selected_optional_indices) && selected_optional_indices.includes(optionalIndexCounter);
                        if (isSelected) {
                            const cleanedItem = { ...item, is_optional: false };
                            finalItems.push(cleanedItem);
                            calculatedTotal += item.quantity * item.unit_price;
                            approvedOptionalCount++;
                        }
                        optionalIndexCounter++;
                    }
                }

                // 3. Guardar el presupuesto limpio final
                const { error: saveBudgErr } = await supabase
                    .from('budgets')
                    .update({
                        items: finalItems,
                        total_price: calculatedTotal,
                        client_feedback: 'Aprobado por el cliente'
                    })
                    .eq('id', activeBudget.id);

                if (saveBudgErr) throw saveBudgErr;

                // 4. Actualizar el proyecto (estado, facturación, constancia)
                const projectUpdateData = {
                    status: 'approved',
                    client_billing_info: billing_info || project.client_billing_info
                };

                if (tax_certificate_url) {
                    projectUpdateData.client_tax_certificate_url = tax_certificate_url;
                }

                let { data: updatedProj, error: updateErr } = await supabase
                    .from('projects')
                    .update(projectUpdateData)
                    .eq('id', project.id)
                    .select()
                    .single();

                if (updateErr) {
                    if (updateErr.message && updateErr.message.includes('client_tax_certificate_url')) {
                        delete projectUpdateData.client_tax_certificate_url;
                        if (tax_certificate_url) {
                            projectUpdateData.client_billing_info = (projectUpdateData.client_billing_info || '') + `\n[Constancia CUIT/CUIL: ${tax_certificate_url}]`;
                        }
                        const { data: fallbackProj, error: fallbackErr } = await supabase
                            .from('projects')
                            .update(projectUpdateData)
                            .eq('id', project.id)
                            .select()
                            .single();
                        if (fallbackErr) throw fallbackErr;
                        updatedProj = fallbackProj;
                    } else {
                        throw updateErr;
                    }
                }

                updatedProject = updatedProj;
                updatedStatus = 'approved';

                let itemsListHtml = '';
                finalItems.forEach(it => {
                    itemsListHtml += `<li><strong>${it.description}</strong> (Cant: ${it.quantity}) - ${project.currency || 'USD'} ${(it.quantity * it.unit_price).toLocaleString()}</li>`;
                });

                notificationSubject = `✅ Presupuesto Aprobado: ${project.contact_name}`;
                notificationBody = `¡Excelente noticia! El cliente <strong>${project.contact_name}</strong> ha aprobado el presupuesto para el proyecto "<strong>${project.title}</strong>".<br/><br/>
                <strong>Total Final Aprobado:</strong> ${project.currency || 'USD'} ${calculatedTotal.toLocaleString()} (incluye ${approvedOptionalCount} opcionales aprobados).<br/>
                <strong>Detalle de ítems acordados:</strong>
                <ul>${itemsListHtml}</ul>
                <strong>Datos de facturación:</strong><br/>
                <pre style="background:#111; padding:10px; border-radius:4px; color:#fff; font-family:monospace; border:1px solid #222;">${projectUpdateData.client_billing_info || 'No completó datos de facturación'}</pre>`;

            } else if (action === 'reject') {
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

                notificationSubject = `❌ Presupuesto Rechazado: ${project.contact_name}`;
                notificationBody = `El cliente <strong>${project.contact_name}</strong> ha rechazado el presupuesto del proyecto "<strong>${project.title}</strong>".<br/><br/>
                Motivo/Feedback: <em>"${client_feedback || 'Sin comentarios'}"</em>`;

            } else if (action === 'feedback') {
                const updateData = { 
                    status: 'review',
                    admin_action_required: true
                };
                
                let { data: updatedProj, error: updateErr } = await supabase
                    .from('projects')
                    .update(updateData)
                    .eq('id', project.id)
                    .select()
                    .single();

                if (updateErr) {
                    if (updateErr.message && updateErr.message.includes('admin_action_required')) {
                        delete updateData.admin_action_required;
                        const retry = await supabase
                            .from('projects')
                            .update(updateData)
                            .eq('id', project.id)
                            .select()
                            .single();
                        if (retry.error) throw retry.error;
                        updatedProj = retry.data;
                    } else {
                        throw updateErr;
                    }
                }

                await supabase
                    .from('budgets')
                    .update({ client_feedback: client_feedback })
                    .eq('project_id', project.id)
                    .eq('is_active', true);

                updatedProject = updatedProj;
                updatedStatus = 'review';

                notificationSubject = `💡 Solicitud de cambios: ${project.contact_name}`;
                notificationBody = `El cliente <strong>${project.contact_name}</strong> ha solicitado modificaciones en el presupuesto de "<strong>${project.title}</strong>".<br/><br/>
                Comentarios del cliente: <em>"${client_feedback}"</em>`;
                
            } else if (action === 'submit_review') {
                if (!rating) return res.status(400).json({ error: 'La calificación es requerida.' });

                const { data: review, error: rErr } = await supabase
                    .from('project_reviews')
                    .insert({
                        project_id: project.id,
                        rating: parseInt(rating),
                        feedback_text: feedback_text || '',
                        recommendation_score: recommendation_score !== undefined ? parseInt(recommendation_score) : null
                    })
                    .select()
                    .single();

                if (rErr) throw rErr;

                notificationSubject = `⭐ Nueva reseña de ${project.contact_name}`;
                notificationBody = `El cliente <strong>${project.contact_name}</strong> ha dejado su feedback para el proyecto "<strong>${project.title}</strong>":<br/><br/>
                Calificación: <strong>${rating} / 5 estrellas</strong><br/>
                Recomendación NPS: <strong>${recommendation_score} / 10</strong><br/>
                Comentarios: <em>"${feedback_text || 'Sin comentarios'}"</em>`;

            } else if (action === 'upload_document') {
                if (!fileBase64 || !filename) {
                    return res.status(400).json({ error: 'Faltan parámetros: fileBase64 o filename' });
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
                    return res.status(400).json({ error: 'Formato no soportado. Subir PDF o Word (.docx).' });
                }

                // Subir archivo original a Supabase Storage (en el bucket 'invoices')
                let fileUrl = null;
                const fileExt = filename.split('.').pop() || '';
                const storagePath = `briefings/project_${project.id}_${Date.now()}.${fileExt}`;
                let mimeType = 'application/octet-stream';
                if (filename.toLowerCase().endsWith('.pdf')) {
                    mimeType = 'application/pdf';
                } else if (filename.toLowerCase().endsWith('.docx')) {
                    mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                } else if (filename.toLowerCase().endsWith('.doc')) {
                    mimeType = 'application/msword';
                }

                try {
                    const { data: uploadData, error: uploadErr } = await supabase.storage
                        .from('invoices')
                        .upload(storagePath, fileBuffer, {
                            contentType: mimeType,
                            upsert: true
                        });

                    if (uploadErr) {
                        console.error('Error uploading briefing to storage:', uploadErr);
                    } else {
                        const { data: { publicUrl } } = supabase.storage
                            .from('invoices')
                            .getPublicUrl(storagePath);
                        fileUrl = publicUrl;
                    }
                } catch (storeErr) {
                    console.error('Exception during storage upload:', storeErr);
                }

                const { data: updatedProj, error: updateErr } = await supabase
                    .from('projects')
                    .update({ 
                        ai_extracted_requirements: {
                            filename: filename,
                            text: extractedText,
                            file_url: fileUrl,
                            raw_uploaded: true
                        }
                    })
                    .eq('id', project.id)
                    .select()
                    .single();

                if (updateErr) throw updateErr;
                updatedProject = updatedProj;

                return res.status(200).json({
                    success: true,
                    project: updatedProject
                });
            } else if (action === 'upload_tax_certificate') {
                if (!fileBase64 || !filename) {
                    return res.status(400).json({ error: 'Faltan parámetros: fileBase64 o filename' });
                }

                const fileBuffer = Buffer.from(fileBase64, 'base64');
                const fileExt = filename.split('.').pop() || '';
                const storagePath = `cuit_certificates/project_${project.id}_${Date.now()}.${fileExt}`;
                let mimeType = 'application/octet-stream';
                if (filename.toLowerCase().endsWith('.pdf')) {
                    mimeType = 'application/pdf';
                } else if (filename.toLowerCase().endsWith('.jpg') || filename.toLowerCase().endsWith('.jpeg')) {
                    mimeType = 'image/jpeg';
                } else if (filename.toLowerCase().endsWith('.png')) {
                    mimeType = 'image/png';
                }

                let publicUrl = null;
                try {
                    const { data: uploadData, error: uploadErr } = await supabase.storage
                        .from('invoices')
                        .upload(storagePath, fileBuffer, {
                            contentType: mimeType,
                            upsert: true
                        });

                    if (uploadErr) throw uploadErr;

                    const { data: { publicUrl: fetchedUrl } } = supabase.storage
                        .from('invoices')
                        .getPublicUrl(storagePath);
                    publicUrl = fetchedUrl;
                } catch (storeErr) {
                    console.error('Error uploading certificate to storage:', storeErr);
                    return res.status(500).json({ error: 'Error al subir la constancia a Supabase Storage: ' + storeErr.message });
                }

                let updatedProj;
                try {
                    const { data, error: upErr } = await supabase
                        .from('projects')
                        .update({ client_tax_certificate_url: publicUrl })
                        .eq('id', project.id)
                        .select()
                        .single();

                    if (upErr) throw upErr;
                    updatedProj = data;
                } catch (upErr) {
                    console.warn('client_tax_certificate_url update failed, using fallback:', upErr);
                    const fallbackBilling = (project.client_billing_info || '') + `\n[Constancia CUIT/CUIL: ${publicUrl}]`;
                    const { data: fallbackProj, error: fallbackErr } = await supabase
                        .from('projects')
                        .update({ client_billing_info: fallbackBilling })
                        .eq('id', project.id)
                        .select()
                        .single();

                    if (fallbackErr) throw fallbackErr;
                    updatedProj = fallbackProj;
                }

                return res.status(200).json({
                    success: true,
                    project: updatedProj
                });
            } else {
                return res.status(400).json({ error: 'Acción no soportada.' });
            }

            // Notificaciones duales para Martín
            if (notificationSubject) {
                const rawText = `🔔 NEXOFILM CRM\n\n${notificationSubject}\n\nProyecto: ${project.title}\nEstado actual: ${updatedStatus.toUpperCase()}\n\nVer en Admin:\nhttps://nexofilm.com/admin`;
                await notifyMartinWhatsApp(rawText);
                await notifyMartinEmail(notificationSubject, notificationBody);
            }

            return res.status(200).json({
                success: true,
                project: updatedProject
            });
        }
    } catch (error) {
        console.error('Error en client API:', error);
        return res.status(500).json({ error: error.message });
    }
}

// Helpers para notificar al administrador
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
        console.error('Error enviando WhatsApp de alerta:', err.message);
    }
}

async function notifyMartinEmail(subject, body) {
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
            console.error(`Error enviando email a ${email}:`, e.message);
        }
    }
}
