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
import crypto from 'crypto';

const require = createRequire(import.meta.url);
const AdmZip = require('adm-zip');

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_KEY;
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

const resend = new Resend((process.env.RESEND_API_KEY || '').trim());
const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY.trim() }) : null;

const ADMIN_NUMBER = '5491151191964'; // +54 9 11 5119 1964 (WhatsApp móvil Argentina requiere el 9)

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
        return ''; // Retornar vacío en lugar de lanzar error
    }
}

// Helper para extraer texto de PDF
async function extractTextFromPdf(buffer) {
    try {
        const pdfParse = require('pdf-parse');
        // pdf-parse exporta una función directa (no clase)
        const fn = typeof pdfParse === 'function' ? pdfParse : (pdfParse.default || pdfParse);
        const result = await fn(buffer);
        return result.text || '';
    } catch (err) {
        console.error('Error parsing PDF:', err);
        return ''; // Retornar vacío en lugar de lanzar error
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
        client_phone,
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
                    event_end_time,
                    location, 
                    coverage_types, 
                    coverage_hours, 
                    guests_count 
                } = req.body;


                const projectTitle = title && title.trim() !== '' ? title : 'Propuesta Comercial';

                const insertPayload = {
                    contact_name,
                    client_email: client_email || '',
                    client_phone: client_phone || null,
                    company_name: company_name || null,
                    notification_preference,
                    title: projectTitle,
                    status: status || 'draft',
                    event_date: event_date || null,
                    event_time: event_time || null,
                    event_end_time: event_end_time || null,
                    location: location || null,
                    coverage_types: coverage_types || [],
                    coverage_hours: coverage_hours ? parseInt(coverage_hours) : null,
                    guests_count: guests_count ? parseInt(guests_count) : null,
                    drive_folder_id: drive_folder_id || null,
                    currency: currency || 'USD',
                    crew_count: crew_count ? parseInt(crew_count) : null,
                    admin_action_required: req.body.admin_action_required !== undefined ? req.body.admin_action_required : false
                };

                // Insertar el proyecto
                let { data: project, error: projErr } = await supabase
                    .from('projects')
                    .insert(insertPayload)
                    .select()
                    .single();

                if (projErr) {
                    // Fallback resiliente si event_end_time o admin_action_required no existe
                    if (projErr.message && (projErr.message.includes('event_end_time') || projErr.message.includes('admin_action_required'))) {
                        console.warn("event_end_time or admin_action_required column not found in projects table. Retrying createProject without them.");
                        delete insertPayload.event_end_time;
                        delete insertPayload.admin_action_required;
                        const retry = await supabase
                            .from('projects')
                            .insert(insertPayload)
                            .select()
                            .single();
                        if (retry.error) throw retry.error;
                        project = retry.data;
                    } else {
                        throw projErr;
                    }
                }

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

                const updatePayload = {
                    status: 'review',
                    invoice_sent: false,
                    admin_action_required: false,
                    updated_at: new Date().toISOString()
                };

                if (req.body.location !== undefined) {
                    updatePayload.location = req.body.location || null;
                }

                let { data: project, error: getErr } = await supabase
                    .from('projects')
                    .update(updatePayload)
                    .eq('id', project_id)
                    .select()
                    .single();

                if (getErr) {
                    // Fallback si invoice_sent o admin_action_required no existen
                    if (getErr.message && (getErr.message.includes('invoice_sent') || getErr.message.includes('admin_action_required'))) {
                        delete updatePayload.invoice_sent;
                        delete updatePayload.admin_action_required;
                        const retry = await supabase
                            .from('projects')
                            .update(updatePayload)
                            .eq('id', project_id)
                            .select()
                            .single();
                        if (retry.error) throw retry.error;
                        project = retry.data;
                    } else {
                        throw getErr;
                    }
                }

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
Tu tarea es generar la propuesta comercial técnica para un proyecto audiovisual.

En lugar de desglosar el servicio base en múltiples filas pequeñas (como rodaje, edición, etc.), debes generar UN ÚNICO ÍTEM BASE PRINCIPAL ("is_optional": false) con una descripción detallada, formateada y estructurada usando saltos de línea (\n) y viñetas (con el caracter "o " o "• ").

La descripción de este ítem base principal debe incluir obligatoriamente las siguientes secciones claramente identificadas:
1. "Detalle del Servicio" (explicando la cobertura, el objetivo del video/fotos y la atmósfera).
2. "Equipamiento Técnico Profesional" (aclarando cantidad de personas, tipo de cámaras como Sony Alpha/FX, lentes Sony G-Master, estabilizadores, micrófonos inalámbricos y luces).
3. "Entregables y Plazos de Entrega" (aclarando los plazos de entrega, por ejemplo, 48 horas en un enlace de descarga, con el material seleccionado y editado).

Si existen servicios opcionales recomendados (como Drone, Edición express en vivo, o Pantallas gigantes adicionales), agrégalos como ítems adicionales con la propiedad "is_optional": true.

Debes responder ÚNICAMENTE con un objeto JSON válido con la siguiente estructura (no agregues texto fuera del JSON ni markdown):
{
  "items": [
    {
      "description": "Detalle del Servicio\no Cobertura integral en Fotografía y Video para el evento...\\n\\nEquipamiento Técnico Profesional (N personas)\\no Cámaras: Sony Alpha...\\no Ópticas: Lentes Sony G-Master...\\n\\nEntregables y Plazos de Entrega\\no N días posteriores en link para descarga...",
      "quantity": 1,
      "unit_price": 0,
      "is_optional": false
    },
    {
      "description": "Servicio de Drone Opcional\\no Cobertura aérea profesional con operador certificado...",
      "quantity": 1,
      "unit_price": 0,
      "is_optional": true
    }
  ],
  "payment_terms": "Condiciones de pago profesionales redactadas en español rioplatense (voseo), aclarando plazos de entrega, anticipo del 50%, y datos de facturación."
}`;

                const userPrompt = `Proyecto: "${title}" para el cliente "${nameToUse || 'Particular'}".
Generame la propuesta sugerida. Debe tener 1 ítem base principal con el formato multilínea (Detalle del Servicio, Equipamiento Técnico, Entregables) y, si aplica, 1 o 2 servicios opcionales adicionales (marcados con is_optional: true). Pon todos los unit_price a 0.`;

                const chatCompletion = await groq.chat.completions.create({
                    model: 'openai/gpt-oss-120b',
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
                    invoice_fc_number,
                    bank_details
                } = req.body;

                if (!project_id) {
                    return res.status(400).json({ error: 'El ID del proyecto es requerido' });
                }

                // Leer proyecto actual para obtener historial previo
                const { data: currentProject, error: readErr } = await supabase
                    .from('projects')
                    .select('invoices_history, invoice_url, invoice_amount, invoice_type')
                    .eq('id', project_id)
                    .single();

                if (readErr) throw readErr;

                // Construir la nueva entrada del historial
                const parsedAmount = invoice_amount ? parseFloat(invoice_amount) : null;
                const newHistoryEntry = invoice_url ? {
                    fc_number: invoice_fc_number || null,
                    amount: parsedAmount,
                    type: invoice_type || null,
                    date_sent: new Date().toISOString(),
                    invoice_url: invoice_url
                } : null;

                // Obtener historial existente y agregar nueva entrada
                let currentHistory = [];
                try {
                    currentHistory = Array.isArray(currentProject?.invoices_history) 
                        ? currentProject.invoices_history 
                        : [];
                } catch(e) { currentHistory = []; }

                const updatedHistory = newHistoryEntry 
                    ? [...currentHistory, newHistoryEntry]
                    : currentHistory;

                const updatePayload = {
                    invoice_url: invoice_url || null,
                    invoice_type: invoice_type || null,
                    invoice_amount: parsedAmount,
                    invoice_fc_number: invoice_fc_number || null,
                    bank_details: bank_details || null,
                    // Si hay invoice_url, la factura queda visible para el cliente de inmediato.
                    invoice_sent: invoice_url ? true : false,
                    // Historial acumulativo de facturas emitidas
                    invoices_history: updatedHistory.length > 0 ? updatedHistory : null
                };

                let { data: updatedProject, error: updateErr } = await supabase
                    .from('projects')
                    .update(updatePayload)
                    .eq('id', project_id)
                    .select()
                    .single();

                if (updateErr) {
                    // Fallback: si columnas nuevas no existen aún, intentar sin ellas
                    const fallbackPayload = {
                        invoice_url: invoice_url || null,
                        invoice_type: invoice_type || null,
                        invoice_amount: parsedAmount,
                        bank_details: bank_details || null,
                        invoice_sent: invoice_url ? true : false,
                    };
                    const retry = await supabase
                        .from('projects')
                        .update(fallbackPayload)
                        .eq('id', project_id)
                        .select()
                        .single();
                    if (retry.error) throw retry.error;
                    updatedProject = retry.data;
                }

                return res.status(200).json({
                    success: true,
                    project: updatedProject
                });
            }

            case 'markInvoicePaid': {
                const { invoice_index, is_paid } = req.body;
                if (!project_id) {
                    return res.status(400).json({ error: 'El ID del proyecto es requerido' });
                }

                const { data: currentProject, error: readErr } = await supabase
                    .from('projects')
                    .select('invoices_history')
                    .eq('id', project_id)
                    .single();

                if (readErr) throw readErr;

                let history = currentProject.invoices_history || [];
                if (!Array.isArray(history) || history.length <= invoice_index) {
                    return res.status(400).json({ error: 'Índice de factura inválido' });
                }

                history[invoice_index].paid = is_paid;

                const { data: updatedProject, error: updateErr } = await supabase
                    .from('projects')
                    .update({ invoices_history: history })
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

                const {
                    event_date,
                    event_time,
                    event_end_time,
                    location,
                    coverage_hours,
                    guests_count,
                    coverage_types,
                    admin_notes,
                    notification_preference,
                    admin_action_required
                } = req.body;

                const updatePayload = {
                    contact_name: contact_name || '',
                    client_email: client_email || '',
                    client_phone: client_phone || null,
                    company_name: company_name || null,
                    currency: currency || 'USD',
                    crew_count: crew_count ? parseInt(crew_count) : null,
                    event_date: event_date || null,
                    event_time: event_time || null,
                    event_end_time: event_end_time || null,
                    location: location || null,
                    coverage_hours: coverage_hours ? parseInt(coverage_hours) : null,
                    guests_count: guests_count ? parseInt(guests_count) : null,
                    coverage_types: coverage_types || null,
                    admin_notes: admin_notes || null,
                    notification_preference: notification_preference || 'both',
                    admin_action_required: admin_action_required !== undefined ? admin_action_required : false
                };

                let { data: updatedProject, error: updateErr } = await supabase
                    .from('projects')
                    .update(updatePayload)
                    .eq('id', project_id)
                    .select()
                    .single();

                if (updateErr) {
                    // Fallback resiliente si event_end_time o admin_action_required no existe
                    if (updateErr.message && (updateErr.message.includes('event_end_time') || updateErr.message.includes('admin_action_required'))) {
                        console.warn("event_end_time or admin_action_required column not found in projects table. Retrying updateContact without them.");
                        delete updatePayload.event_end_time;
                        delete updatePayload.admin_action_required;
                        const retry = await supabase
                            .from('projects')
                            .update(updatePayload)
                            .eq('id', project_id)
                            .select()
                            .single();
                        if (retry.error) throw retry.error;
                        updatedProject = retry.data;
                    } else {
                        throw updateErr;
                    }
                }

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
                    model: 'openai/gpt-oss-120b',
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

            case 'analyzeStoredDocument': {
                if (!project_id) {
                    return res.status(400).json({ error: 'El ID del proyecto es requerido' });
                }

                if (!groq) {
                    return res.status(500).json({ error: 'Groq API Key is not configured' });
                }

                // Obtener el proyecto para acceder a ai_extracted_requirements
                const { data: project, error: getErr } = await supabase
                    .from('projects')
                    .select('*')
                    .eq('id', project_id)
                    .maybeSingle();

                if (getErr) throw getErr;
                if (!project) {
                    return res.status(404).json({ error: 'Proyecto no encontrado' });
                }

                const requirements = project.ai_extracted_requirements;
                if (!requirements || !requirements.text) {
                    return res.status(400).json({ error: 'No hay texto de pliego/documento almacenado para analizar.' });
                }

                const extractedText = requirements.text;
                const filename = requirements.filename || 'Archivo';

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
                    model: 'openai/gpt-oss-120b',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: `Extraé los requerimientos de este documento:\n\n${extractedText}` }
                    ],
                    temperature: 0.2,
                    response_format: { type: "json_object" }
                });

                const aiJSON = JSON.parse(chatCompletion.choices[0].message.content);
                // Adjuntar el filename para que el admin sepa qué archivo se analizó
                aiJSON.filename = filename;

                // Actualizar el proyecto en la base de datos
                // Si la IA detecta la fecha o lugar o horas de cobertura, los precargamos si están vacíos
                const updatePayload = {
                    ai_extracted_requirements: aiJSON
                };

                if (aiJSON.basic_data?.event_date && !project.event_date) {
                    updatePayload.event_date = aiJSON.basic_data.event_date;
                }
                if (aiJSON.basic_data?.location && !project.location) {
                    updatePayload.location = aiJSON.basic_data.location;
                }
                if (aiJSON.basic_data?.coverage_hours && !project.coverage_hours) {
                    updatePayload.coverage_hours = aiJSON.basic_data.coverage_hours;
                }

                const { data: updatedProject, error: updateErr } = await supabase
                    .from('projects')
                    .update(updatePayload)
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

            case 'sendBudget':
            case 'sendProactiveBudget': {
                if (!project_id || !items) {
                    return res.status(400).json({ error: 'Faltan campos project_id o items' });
                }

                const { channel } = req.body;

                const calculatedTotal = items
                    .filter(item => !item.is_optional)
                    .reduce((acc, curr) => acc + (curr.quantity * curr.unit_price), 0);

                // Desactivar presupuestos activos anteriores (evitar duplicados)
                await supabase
                    .from('budgets')
                    .update({ is_active: false })
                    .eq('project_id', project_id)
                    .eq('is_active', true);

                // Calcular versión siguiente
                const { data: existingBudgets } = await supabase
                    .from('budgets')
                    .select('version')
                    .eq('project_id', project_id)
                    .order('version', { ascending: false })
                    .limit(1);
                const nextVersion = existingBudgets?.length > 0 ? (existingBudgets[0].version + 1) : 1;

                // Insertar nuevo presupuesto activo
                const { data: newBudget, error: bErr } = await supabase
                    .from('budgets')
                    .insert({
                        project_id,
                        version: nextVersion,
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
                await notifyClient(project, items, calculatedTotal, payment_terms, req.headers.host || 'nexofilm.com', channel);

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

            case 'sendInvoiceNotification': {
                if (!project_id) {
                    return res.status(400).json({ error: 'El ID del proyecto es requerido' });
                }

                const { channel } = req.body;

                const { data: project, error: getErr } = await supabase
                    .from('projects')
                    .select('*')
                    .eq('id', project_id)
                    .single();

                if (getErr) throw getErr;

                await notifyClientInvoice(project, req.headers.host || 'nexofilm.com', channel);

                let updatedProject;
                try {
                    const { data: upProj, error: upErr } = await supabase
                        .from('projects')
                        .update({ 
                            invoice_sent: true,
                            admin_action_required: false
                        })
                        .eq('id', project_id)
                        .select()
                        .single();

                    if (upErr) throw upErr;
                    updatedProject = upProj;
                } catch (upErr) {
                    console.warn('invoice_sent or admin_action_required update failed, trying fallback:', upErr);
                    try {
                        const { data: upProj2, error: upErr2 } = await supabase
                            .from('projects')
                            .update({ invoice_sent: true })
                            .eq('id', project_id)
                            .select()
                            .single();
                        if (upErr2) throw upErr2;
                        updatedProject = upProj2;
                    } catch (e) {
                        updatedProject = project;
                    }
                }

                return res.status(200).json({
                    success: true,
                    project: updatedProject
                });
            }

            case 'getReviews': {
                // Obtener todas las reviews con datos del proyecto vinculado
                const { data: reviewsRaw, error: reviewsErr } = await supabase
                    .from('project_reviews')
                    .select('id, project_id, rating, feedback_text, recommendation_score, coverage_type, event_type, created_at, projects(contact_name, title, company_name)')
                    .order('created_at', { ascending: false });

                if (reviewsErr) {
                    // Fallback: si las columnas nuevas no existen aún, pedir sin ellas
                    if (reviewsErr.message && (reviewsErr.message.includes('coverage_type') || reviewsErr.message.includes('event_type'))) {
                        const { data: fallbackReviews, error: fallbackErr } = await supabase
                            .from('project_reviews')
                            .select('id, project_id, rating, feedback_text, recommendation_score, created_at, projects(contact_name, title, company_name)')
                            .order('created_at', { ascending: false });
                        if (fallbackErr) throw fallbackErr;
                        return res.status(200).json({ success: true, reviews: fallbackReviews || [] });
                    }
                    throw reviewsErr;
                }

                return res.status(200).json({ success: true, reviews: reviewsRaw || [] });
            }

            // ─── CREW: Listar directorio ───────────────────────────────────────────
            case 'listCrewMembers': {
                const { data: crew, error: crewErr } = await supabase
                    .from('crew_members')
                    .select('*')
                    .order('name', { ascending: true });
                if (crewErr) throw crewErr;
                return res.status(200).json({ success: true, crew: crew || [] });
            }

            // ─── CREW: Crear persona ───────────────────────────────────────────────
            case 'createCrewMember': {
                const { name, role, email, phone, notes, dni, birth_date, address, dni_url } = req.body;
                if (!name) return res.status(400).json({ error: 'El nombre es obligatorio.' });
                const { data: newCm, error: createErr } = await supabase
                    .from('crew_members')
                    .insert({ 
                        name, 
                        role: role || 'Otro', 
                        email: email || null, 
                        phone: phone || null, 
                        notes: notes || null, 
                        is_active: true,
                        dni: dni || null,
                        birth_date: birth_date || null,
                        address: address || null,
                        dni_url: dni_url || null
                    })
                    .select()
                    .single();
                if (createErr) throw createErr;
                return res.status(200).json({ success: true, crew_member: newCm });
            }

            // ─── CREW: Actualizar persona ──────────────────────────────────────────
            case 'updateCrewMember': {
                const { crew_member_id, name, role, email, phone, notes, is_active, dni, birth_date, address, dni_url } = req.body;
                if (!crew_member_id) return res.status(400).json({ error: 'crew_member_id requerido.' });
                const updatePayload = {};
                if (name !== undefined) updatePayload.name = name;
                if (role !== undefined) updatePayload.role = role;
                if (email !== undefined) updatePayload.email = email;
                if (phone !== undefined) updatePayload.phone = phone;
                if (notes !== undefined) updatePayload.notes = notes;
                if (is_active !== undefined) updatePayload.is_active = is_active;
                if (dni !== undefined) updatePayload.dni = dni;
                if (birth_date !== undefined) updatePayload.birth_date = birth_date;
                if (address !== undefined) updatePayload.address = address;
                if (dni_url !== undefined) updatePayload.dni_url = dni_url;
                
                const { error: updateErr } = await supabase
                    .from('crew_members')
                    .update(updatePayload)
                    .eq('id', crew_member_id);
                if (updateErr) throw updateErr;
                return res.status(200).json({ success: true });
            }

            // ─── CREW: Guardar asignaciones en un proyecto ────────────────────────
            case 'updateCrewAssignments': {
                const { project_id, crew_assignments, extra_expenses } = req.body;
                if (!project_id) return res.status(400).json({ error: 'project_id requerido.' });
                
                const updatePayload = {
                    crew_assignments: crew_assignments || []
                };
                
                if (extra_expenses !== undefined) {
                    updatePayload.extra_expenses = extra_expenses || [];
                }

                const { error: assignErr } = await supabase
                    .from('projects')
                    .update(updatePayload)
                    .eq('id', project_id);
                if (assignErr) throw assignErr;
                return res.status(200).json({ success: true });
            }

            // ─── CREW: Notificar a todo el crew de un proyecto ────────────────────
            case 'notifyCrewAll': {
                const { project_id, custom_note } = req.body;
                if (!project_id) return res.status(400).json({ error: 'project_id requerido.' });

                // Fetch project
                const { data: project, error: projFetchErr } = await supabase
                    .from('projects')
                    .select('*')
                    .eq('id', project_id)
                    .single();
                if (projFetchErr) throw projFetchErr;
                if (!project) return res.status(404).json({ error: 'Proyecto no encontrado.' });

                const assignments = project.crew_assignments || [];
                if (assignments.length === 0) {
                    return res.status(400).json({ error: 'No hay crew asignado a este proyecto.' });
                }

                // Build event info
                const eventDateObj = project.event_date ? new Date(project.event_date + 'T12:00:00') : null;
                const MONTHS_ES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
                const DAYS_ES = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
                const dateStr = eventDateObj
                    ? `${DAYS_ES[eventDateObj.getDay()]} ${eventDateObj.getDate()} de ${MONTHS_ES[eventDateObj.getMonth()]} ${eventDateObj.getFullYear()}`
                    : 'Fecha a confirmar';

                const timeStr = project.event_time
                    ? `${project.event_time}${project.event_end_time ? ' → ' + project.event_end_time : ''}${project.coverage_hours ? ' (' + project.coverage_hours + 'hs de cobertura)' : ''}`
                    : '';
                const locationStr = project.location || '';
                const mapsLink = locationStr ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationStr)}` : '';

                // Build Google Calendar link
                const calLink = (() => {
                    if (!project.event_date) return '';
                    const dateOnly = project.event_date.replace(/-/g, '');
                    const startTime = project.event_time ? project.event_time.replace(':', '') + '00' : '080000';
                    const endTime = project.event_end_time ? project.event_end_time.replace(':', '') + '00' : '';
                    const dates = endTime
                        ? `${dateOnly}T${startTime}/${dateOnly}T${endTime}`
                        : `${dateOnly}T${startTime}/${dateOnly}T${(Number(startTime.substring(0, 2)) + 4).toString().padStart(2,'0')}0000`;
                    return `https://calendar.google.com/calendar/r/eventedit?text=Jornada%20NexoFilm&dates=${dates}&location=${encodeURIComponent(locationStr)}`;
                })();

                const token = process.env.WHATSAPP_TOKEN?.trim();
                const phoneNumberId = process.env.WHATSAPP_PHONE_ID?.trim();

                let notifiedCount = 0;
                const updatedAssignments = [...assignments];

                for (let i = 0; i < assignments.length; i++) {
                    const assign = assignments[i];
                    const firstName = assign.name.split(' ')[0];
                    let sent = false;

                    // Fetch crew member contact info
                    const { data: crewMember } = await supabase
                        .from('crew_members')
                        .select('email, phone')
                        .eq('id', assign.crew_member_id)
                        .single();

                    const memberEmail = crewMember?.email || null;
                    const memberPhone = crewMember?.phone || null;

                    // ── EMAIL ─────────────────────────────────────────────────────────
                    if (memberEmail) {
                        const emailHtml = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Fecha Confirmada - NexoFilm</title></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#111;border-radius:16px;overflow:hidden;border:1px solid #222;">
        <!-- Header -->
        <tr><td style="background:#111;padding:32px 40px 24px;border-bottom:1px solid #1a1a1a;text-align:center;">
          <a href="https://nexofilm.com" target="_blank" style="text-decoration:none;">
            <img src="https://nexofilm.com/img/logo.png" alt="NexoFilm" style="border:0;height:45px;display:block;margin:0 auto;" />
          </a>
        </td></tr>
        <!-- Confirmed badge -->
        <tr><td style="padding:32px 40px 0;text-align:center;">
          <div style="display:inline-block;background:#ccff00;color:#000;font-weight:900;font-size:13px;letter-spacing:2px;text-transform:uppercase;padding:8px 24px;border-radius:100px;">✅ Evento Confirmado</div>
          <h1 style="color:#fff;font-size:22px;font-weight:800;margin:20px 0 8px;">¡Confirmación de Jornada!</h1>
          <p style="color:#888;font-size:14px;margin:0;">Hola <strong style="color:#e0e0e0;">${firstName}</strong>, desde <strong>NexoFilm</strong> te confirmamos el evento para el cual fuiste asignado/a:</p>
        </td></tr>
        
        <!-- Arrival warning -->
        <tr><td style="padding:20px 40px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#2a1a00;border:1px solid #d97706;border-radius:12px;">
            <tr><td style="padding:14px 20px;color:#f59e0b;font-size:12px;font-weight:700;line-height:1.5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
              ⚠️ <strong>Importante:</strong> Se solicita estar <strong>30 minutos antes</strong> de la hora de inicio acordada para la organización y armado de equipos.
            </td></tr>
          </table>
        </td></tr>

        <!-- Custom note if exists -->
        ${custom_note && custom_note.trim() ? `
        <tr><td style="padding:16px 40px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border:1px dashed #3f3f46;border-radius:12px;">
            <tr><td style="padding:14px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
              <div style="color:#a1a1aa;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">✍️ Nota Aclaratoria / Instrucciones</div>
              <div style="color:#e4e4e7;font-size:13px;line-height:1.6;white-space:pre-wrap;">${custom_note.trim()}</div>
            </td></tr>
          </table>
        </td></tr>` : ''}

        <!-- Event details -->
        <tr><td style="padding:20px 40px 16px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;border:1px solid #1e1e1e;border-radius:12px;overflow:hidden;">
            ${dateStr ? `<tr style="border-bottom:1px solid #1a1a1a;"><td style="padding:14px 20px;color:#888;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;width:120px;">📆 Fecha</td><td style="padding:14px 20px;color:#e0e0e0;font-size:14px;font-weight:600;">${dateStr}</td></tr>` : ''}
            ${timeStr ? `<tr style="border-bottom:1px solid #1a1a1a;"><td style="padding:14px 20px;color:#888;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">⏰ Horario</td><td style="padding:14px 20px;color:#e0e0e0;font-size:14px;font-weight:600;">${timeStr}</td></tr>` : ''}
            ${locationStr ? `<tr style="border-bottom:1px solid #1a1a1a;"><td style="padding:14px 20px;color:#888;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">📍 Lugar</td><td style="padding:14px 20px;font-size:14px;font-weight:600;">${mapsLink ? `<a href="${mapsLink}" style="color:#60a5fa;text-decoration:underline;">${locationStr}</a>` : `<span style="color:#e0e0e0;">${locationStr}</span>`}</td></tr>` : ''}
            ${assign.role ? `<tr><td style="padding:14px 20px;color:#888;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">🎥 Rol / Función</td><td style="padding:14px 20px;color:#e0e0e0;font-size:14px;font-weight:600;text-transform:capitalize;">${assign.role}</td></tr>` : ''}
          </table>
        </td></tr>

        <!-- Calendar button -->
        ${calLink ? `<tr><td style="padding:0 40px 24px;text-align:center;">
          <a href="${calLink}" style="display:inline-block;background:#1a1a1a;color:#ccff00;text-decoration:none;font-weight:700;font-size:13px;padding:12px 28px;border-radius:8px;border:1px solid #2a2a2a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">🗓 Agregar a tu Google Calendar</a>
        </td></tr>` : ''}
        <!-- Footer -->
        <tr><td style="padding:24px 40px;text-align:center;border-top:1px solid #1a1a1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
          <p style="color:#555;font-size:13px;margin:0 0 8px;">¡Cualquier consulta respondé este mail o escribinos por WhatsApp!</p>
          <p style="color:#333;font-size:12px;margin:0;">Con ganas de rodar juntos pronto — <strong style="color:#ccff00;">El equipo de NexoFilm 🎬</strong></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
                        try {
                            await resend.emails.send({
                                from: 'NexoFilm <hola@nexofilm.com>',
                                to: memberEmail,
                                subject: 'Confirmación de jornada - NexoFilm',
                                html: emailHtml
                            });
                            sent = true;
                        } catch (emailErr) {
                            console.error(`Error email a crew ${assign.name}:`, emailErr.message);
                        }
                    }

                    if (sent) {
                        updatedAssignments[i] = { 
                            ...assign, 
                            email_notified: true, 
                            notified: true, 
                            notified_at: new Date().toISOString() 
                        };
                        notifiedCount++;
                    }
                }

                // Update notified flags in DB
                await supabase
                    .from('projects')
                    .update({ crew_assignments: updatedAssignments })
                    .eq('id', project_id);

                return res.status(200).json({ success: true, notified: notifiedCount, total: assignments.length });
            }

            // ─── CREW: Notificar a un miembro del crew por email individualmente ───
            case 'notifyCrewSingle': {
                const { project_id, crew_member_id, custom_note } = req.body;
                if (!project_id || !crew_member_id) {
                    return res.status(400).json({ error: 'project_id y crew_member_id requeridos.' });
                }

                // Fetch project
                const { data: project, error: projFetchErr } = await supabase
                    .from('projects')
                    .select('*')
                    .eq('id', project_id)
                    .single();
                if (projFetchErr) throw projFetchErr;
                if (!project) return res.status(404).json({ error: 'Proyecto no encontrado.' });

                const assignments = project.crew_assignments || [];
                const assignIdx = assignments.findIndex(a => a.crew_member_id === crew_member_id);
                if (assignIdx === -1) {
                    return res.status(404).json({ error: 'Miembro del crew no asignado a este proyecto.' });
                }

                const assign = assignments[assignIdx];

                // Build event info
                const eventDateObj = project.event_date ? new Date(project.event_date + 'T12:00:00') : null;
                const MONTHS_ES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
                const DAYS_ES = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
                const dateStr = eventDateObj
                    ? `${DAYS_ES[eventDateObj.getDay()]} ${eventDateObj.getDate()} de ${MONTHS_ES[eventDateObj.getMonth()]} ${eventDateObj.getFullYear()}`
                    : 'Fecha a confirmar';

                const timeStr = project.event_time
                    ? `${project.event_time}${project.event_end_time ? ' → ' + project.event_end_time : ''}${project.coverage_hours ? ' (' + project.coverage_hours + 'hs de cobertura)' : ''}`
                    : '';
                const locationStr = project.location || '';
                const mapsLink = locationStr ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationStr)}` : '';

                // Build Google Calendar link
                const calLink = (() => {
                    if (!project.event_date) return '';
                    const dateOnly = project.event_date.replace(/-/g, '');
                    const startTime = project.event_time ? project.event_time.replace(':', '') + '00' : '080000';
                    const endTime = project.event_end_time ? project.event_end_time.replace(':', '') + '00' : '';
                    const dates = endTime
                        ? `${dateOnly}T${startTime}/${dateOnly}T${endTime}`
                        : `${dateOnly}T${startTime}/${dateOnly}T${(Number(startTime.substring(0, 2)) + 4).toString().padStart(2,'0')}0000`;
                    return `https://calendar.google.com/calendar/r/eventedit?text=Jornada%20NexoFilm&dates=${dates}&location=${encodeURIComponent(locationStr)}`;
                })();

                // Fetch crew member contact info
                const { data: crewMember } = await supabase
                    .from('crew_members')
                    .select('email, phone')
                    .eq('id', crew_member_id)
                    .single();

                const memberEmail = crewMember?.email || null;
                const firstName = assign.name.split(' ')[0];

                if (!memberEmail) {
                    return res.status(400).json({ error: 'El miembro no tiene un correo electrónico registrado.' });
                }

                const emailHtml = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Fecha Confirmada - NexoFilm</title></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#111;border-radius:16px;overflow:hidden;border:1px solid #222;">
        <!-- Header -->
        <tr><td style="background:#111;padding:32px 40px 24px;border-bottom:1px solid #1a1a1a;text-align:center;">
          <a href="https://nexofilm.com" target="_blank" style="text-decoration:none;">
            <img src="https://nexofilm.com/img/logo.png" alt="NexoFilm" style="border:0;height:45px;display:block;margin:0 auto;" />
          </a>
        </td></tr>
        <!-- Confirmed badge -->
        <tr><td style="padding:32px 40px 0;text-align:center;">
          <div style="display:inline-block;background:#ccff00;color:#000;font-weight:900;font-size:13px;letter-spacing:2px;text-transform:uppercase;padding:8px 24px;border-radius:100px;">✅ Evento Confirmado</div>
          <h1 style="color:#fff;font-size:22px;font-weight:800;margin:20px 0 8px;">¡Confirmación de Jornada!</h1>
          <p style="color:#888;font-size:14px;margin:0;">Hola <strong style="color:#e0e0e0;">${firstName}</strong>, desde <strong>NexoFilm</strong> te confirmamos el evento para el cual fuiste asignado/a:</p>
        </td></tr>
        
        <!-- Arrival warning -->
        <tr><td style="padding:20px 40px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#2a1a00;border:1px solid #d97706;border-radius:12px;">
            <tr><td style="padding:14px 20px;color:#f59e0b;font-size:12px;font-weight:700;line-height:1.5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
              ⚠️ <strong>Importante:</strong> Se solicita estar <strong>30 minutos antes</strong> de la hora de inicio acordada para la organización y armado de equipos.
            </td></tr>
          </table>
        </td></tr>

        <!-- Custom note if exists -->
        ${custom_note && custom_note.trim() ? `
        <tr><td style="padding:16px 40px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border:1px dashed #3f3f46;border-radius:12px;">
            <tr><td style="padding:14px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
              <div style="color:#a1a1aa;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">✍️ Nota Aclaratoria / Instrucciones</div>
              <div style="color:#e4e4e7;font-size:13px;line-height:1.6;white-space:pre-wrap;">${custom_note.trim()}</div>
            </td></tr>
          </table>
        </td></tr>` : ''}

        <!-- Event details -->
        <tr><td style="padding:20px 40px 16px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;border:1px solid #1e1e1e;border-radius:12px;overflow:hidden;">
            ${dateStr ? `<tr style="border-bottom:1px solid #1a1a1a;"><td style="padding:14px 20px;color:#888;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;width:120px;">📆 Fecha</td><td style="padding:14px 20px;color:#e0e0e0;font-size:14px;font-weight:600;">${dateStr}</td></tr>` : ''}
            ${timeStr ? `<tr style="border-bottom:1px solid #1a1a1a;"><td style="padding:14px 20px;color:#888;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">⏰ Horario</td><td style="padding:14px 20px;color:#e0e0e0;font-size:14px;font-weight:600;">${timeStr}</td></tr>` : ''}
            ${locationStr ? `<tr style="border-bottom:1px solid #1a1a1a;"><td style="padding:14px 20px;color:#888;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">📍 Lugar</td><td style="padding:14px 20px;font-size:14px;font-weight:600;">${mapsLink ? `<a href="${mapsLink}" style="color:#60a5fa;text-decoration:underline;">${locationStr}</a>` : `<span style="color:#e0e0e0;">${locationStr}</span>`}</td></tr>` : ''}
            ${assign.role ? `<tr><td style="padding:14px 20px;color:#888;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">🎥 Rol / Función</td><td style="padding:14px 20px;color:#e0e0e0;font-size:14px;font-weight:600;text-transform:capitalize;">${assign.role}</td></tr>` : ''}
          </table>
        </td></tr>

        <!-- Calendar button -->
        ${calLink ? `<tr><td style="padding:0 40px 24px;text-align:center;">
          <a href="${calLink}" style="display:inline-block;background:#1a1a1a;color:#ccff00;text-decoration:none;font-weight:700;font-size:13px;padding:12px 28px;border-radius:8px;border:1px solid #2a2a2a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">🗓 Agregar a tu Google Calendar</a>
        </td></tr>` : ''}
        <!-- Footer -->
        <tr><td style="padding:24px 40px;text-align:center;border-top:1px solid #1a1a1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
          <p style="color:#555;font-size:13px;margin:0 0 8px;">¡Cualquier consulta respondé este mail o escribinos por WhatsApp!</p>
          <p style="color:#333;font-size:12px;margin:0;">Con ganas de rodar juntos pronto — <strong style="color:#ccff00;">El equipo de NexoFilm 🎬</strong></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

                try {
                    await resend.emails.send({
                        from: 'NexoFilm <hola@nexofilm.com>',
                        to: memberEmail,
                        subject: 'Confirmación de jornada - NexoFilm',
                        html: emailHtml
                    });

                    // Update assignment status
                    const updatedAssignments = [...assignments];
                    updatedAssignments[assignIdx] = {
                        ...assign,
                        email_notified: true,
                        notified: true,
                        notified_at: new Date().toISOString()
                    };

                    const { error: updateErr } = await supabase
                        .from('projects')
                        .update({ crew_assignments: updatedAssignments })
                        .eq('id', project_id);

                    if (updateErr) throw updateErr;

                    return res.status(200).json({ success: true });
                } catch (err) {
                    console.error('Error al enviar email individual:', err);
                    return res.status(500).json({ error: err.message || 'Error al enviar email' });
                }
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
async function notifyClient(project, items, total, terms, host, forceChannel = null) {
    const preference = forceChannel || project.notification_preference || 'both';
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
            throw new Error(`Error al enviar Email: ${e.message}`);
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
                    throw new Error(`Error de WhatsApp (Meta API): ${resData.error?.message || response.statusText}`);
                } else {
                    console.log(`WhatsApp de cotización enviado con éxito al cliente +${cleanPhone}`);
                }
            } catch (err) {
                console.error('Error al enviar WhatsApp al cliente:', err.message);
                throw new Error(`Error al enviar WhatsApp: ${err.message}`);
            }
        }
    }
}

// Helper para notificar factura al cliente por Email / WhatsApp
async function notifyClientInvoice(project, host, forceChannel = null) {
    const preference = forceChannel || project.notification_preference || 'both';
    const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';
    const portalUrl = `${protocol}://${host}/portal?token=${project.access_token}`;

    const subject = `🧾 Factura disponible / Datos de Pago: ${project.title} - NexoFilm`;
    const currencySymbol = project.currency || 'USD';
    const amountStr = project.invoice_amount ? `${currencySymbol} ${project.invoice_amount.toLocaleString()}` : 'a confirmar';
    const concept = project.invoice_type === 'deposit_50' ? '50% Seña' : project.invoice_type === 'total' ? '100% Total' : 'Concepto Asignado';

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
                            <h1 style="color: #ccff00; font-size: 22px; margin: 15px 0 0 0; text-transform: uppercase; letter-spacing: 1px;">Facturación y Pago</h1>
                        </div>
                        <div style="background-color: #1a1a1a; padding: 20px; border-radius: 6px; border: 1px solid #333; line-height: 1.6;">
                            <p style="font-size: 16px; margin: 0 0 10px 0; color: #ffffff;">Hola <strong>${project.contact_name}</strong>,</p>
                            <p style="font-size: 14px; margin: 0 0 20px 0; color: #e0e0e0;">
                                Ya se encuentra disponible la información de facturación para tu proyecto "<strong>${project.title}</strong>".
                            </p>
                            
                            <div style="background-color: #0d0d0d; border: 1px solid #ccff00; border-radius: 6px; padding: 16px; margin-bottom: 20px;">
                                <p style="margin: 0; font-size: 12px; color: #888; text-transform: uppercase;">Monto solicitado:</p>
                                <p style="margin: 4px 0 0 0; font-size: 24px; font-weight: 900; color: #ccff00;">${amountStr} <span style="font-size: 11px; font-weight: normal; color: #a0a0a0; margin-left: 6px;">(${concept})</span></p>
                            </div>

                            ${project.bank_details ? `
                            <h3 style="color: #ffffff; font-size: 14px; margin: 20px 0 10px 0; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #333; padding-bottom: 5px;">Datos de Transferencia Galicia:</h3>
                            <pre style="background:#0d0d0d; padding:12px; border-radius:4px; color:#e0e0e0; font-family:monospace; font-size:12px; border:1px solid #222; margin-bottom: 20px; white-space: pre-wrap; line-height: 1.5;">${project.bank_details}</pre>
                            ` : ''}

                            ${project.invoice_url ? `
                            <p style="font-size: 14px; margin: 20px 0 20px 0; color: #e0e0e0;">
                                Podés descargar la factura oficial desde aquí:
                            </p>
                            <div style="margin-bottom: 20px;">
                                <a href="${project.invoice_url}" target="_blank" style="background-color: #ffffff; color: #000000; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 12px; text-transform: uppercase; display: inline-block;">
                                    Descargar Factura PDF 🧾
                                </a>
                            </div>
                            ` : ''}

                            <p style="font-size: 14px; margin: 20px 0 20px 0; color: #e0e0e0;">
                                Para ver los detalles completos de tu presupuesto, adjuntar constancias o seguir el progreso, ingresá a tu portal seguro:
                            </p>
                            <div style="text-align: center; margin-top: 20px; margin-bottom: 10px;">
                                <a href="${portalUrl}" style="background-color: #ccff00; color: #000000; padding: 14px 28px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 13px; text-transform: uppercase; display: inline-block; box-shadow: 0 4px 10px rgba(204,255,0,0.2);">
                                    Ingresar al Portal de Clientes
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
            console.log(`Email de factura enviado con éxito a: ${project.client_email}`);
        } catch (e) {
            console.error(`Error enviando email de factura al cliente:`, e.message);
            throw new Error(`Error al enviar Email de Factura: ${e.message}`);
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
            
            const messageText = `🧾 *NexoFilm - Facturación y Pago*\n\n¡Hola ${project.contact_name}! Ya registramos tu pago o preparamos tu factura para el proyecto "${project.title}".\n\nMonto solicitado: ${amountStr} (${concept})\n\nPodés ver los datos de transferencia Galicia, descargar tu factura y seguir el estado desde tu portal seguro:\n👉 ${portalUrl}`;

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
                    console.error('Error Meta API en WhatsApp de factura:', resData.error);
                    throw new Error(`Error de WhatsApp (Meta API): ${resData.error?.message || response.statusText}`);
                } else {
                    console.log(`WhatsApp de factura enviado con éxito al cliente +${cleanPhone}`);
                }
            } catch (err) {
                console.error('Error al enviar WhatsApp de factura al cliente:', err.message);
                throw new Error(`Error al enviar WhatsApp de Factura: ${err.message}`);
            }
        }
    }
}
