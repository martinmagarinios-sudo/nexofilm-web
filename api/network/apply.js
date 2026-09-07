// api/network/apply.js
// Endpoint para recibir postulaciones a NexoFilm Network
// Procesa datos, parsea CV en PDF si fue adjuntado, evalúa y califica con Groq, guarda en Supabase
// y notifica por WhatsApp a Martín si el perfil es calificado (score >= 80).

import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';
import { PDFParse } from 'pdf-parse';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_KEY;
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY.trim() }) : null;

const ADMIN_NUMBER = '5491151191964';

async function sendWhatsAppAlert(text) {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const token = process.env.WHATSAPP_TOKEN;
    if (!phoneNumberId || !token) return;

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
        console.error('Error enviando WhatsApp de alerta Network:', err.message);
    }
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    try {
        const body = req.body || {};

        // 1. Honeypot Anti-Spam (campo trampa para bots)
        if (body.website_url_hp || body.extra_comment_hp) {
            // Responder éxito silencioso a bots
            return res.status(200).json({ success: true, message: 'Recibido' });
        }

        const {
            full_name,
            artistic_name,
            email,
            phone,
            city,
            state_province,
            country = 'Argentina',
            birth_year,
            roles = [],
            primary_role,
            years_experience,
            project_types = [],
            notable_clients,
            camera_gear,
            drone_gear,
            software_tools = [],
            ai_tools = [],
            portfolio_url,
            instagram_url,
            vimeo_youtube_url,
            behance_url,
            reel_url,
            best_link_type,
            best_project_url,
            cv_url,
            cv_filename,
            modalities = [],
            invoicing_status,
            willing_to_travel,
            bio_notes
        } = body;

        if (!full_name || !email || !phone || !primary_role || !city) {
            return res.status(400).json({ error: 'Faltan campos obligatorios requeridos (Nombre, Email, Teléfono, Rol Principal y Ciudad).' });
        }

        // 2. Extraer texto del CV si fue adjuntado
        let cvExtractedText = '';
        if (cv_url) {
            try {
                const cvRes = await fetch(cv_url);
                if (cvRes.ok) {
                    const arrayBuffer = await cvRes.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);
                    const parser = new PDFParse({ data: buffer });
                    const parsed = await parser.getText();
                    cvExtractedText = (parsed && parsed.text) ? parsed.text.slice(0, 15000) : '';
                }
            } catch (pdfErr) {
                console.warn('Advertencia al parsear PDF:', pdfErr.message);
            }
        }

        // 3. Procesar y Calificar con Groq IA
        let aiOverallScore = 75;
        let aiProfileScore = 75;
        let aiExperienceScore = 75;
        let aiTechnicalScore = 75;
        let aiExecutiveSummary = `Profesional audiovisual especializado en ${primary_role}, radicado en ${city}, ${country}.`;
        let aiInconsistencies = [];
        let aiExtractedTags = [primary_role, city, country, ...(roles || [])].filter(Boolean);
        let aiRawAnalysis = {};

        if (groq) {
            try {
                const systemPrompt = `Sos el Director Técnico de Producción de NexoFilm, una productora audiovisual de alto nivel (cine publicitario, eventos corporativos, video institucional, streaming y producciones con IA).
Tu tarea es evaluar objetivamente la postulación de un profesional audiovisual a "NexoFilm Network".

Debes responder ÚNICAMENTE un JSON válido con este formato:
{
  "profile_score": <número entero 1-100 evaluando la completitud, prolijidad y coherencia del perfil>,
  "experience_score": <número entero 1-100 evaluando años de trayectoria, marcas/clientes destacados y tipos de proyectos>,
  "technical_score": <número entero 1-100 evaluando calidad de equipamiento, software y herramientas de IA>,
  "overall_score": <número entero 1-100 ponderación general del candidato como colaborador>,
  "executive_summary": "<exactamente 2 oraciones concisas y profesionales describiendo su perfil y fuerte principal>",
  "inconsistencies": ["<array de strings con inconsistencias detectadas entre el CV y el formulario, o vacío si no hay inconsistencias>"],
  "extracted_tags": ["<array de strings con palabras clave normalizadas: ej: 'Sony FX3', 'Premiere Pro', 'DaVinci Resolve', 'Runway', 'Eventos Corporativos', 'Drone', 'Buenos Aires'>"]
}`;

                const userPrompt = `DATOS DECLARADOS EN EL FORMULARIO:
- Nombre: ${full_name} (${artistic_name || 'Sin nombre artístico'})
- Rol Principal: ${primary_role}
- Otros Roles: ${roles.join(', ')}
- Ubicación: ${city}, ${state_province || ''}, ${country}
- Años de Experiencia: ${years_experience || 'No especificado'}
- Tipos de Proyectos: ${project_types.join(', ')}
- Clientes / Marcas destacadas: ${notable_clients || 'No especificado'}
- Cámaras / Equipos: ${camera_gear || 'No especificado'}
- Drone: ${drone_gear || 'No especificado'}
- Software: ${software_tools.join(', ')}
- Herramientas IA: ${ai_tools.join(', ')}
- Links a Trabajos:
  * Portfolio/Web: ${portfolio_url || 'N/A'}
  * Instagram: ${instagram_url || 'N/A'}
  * Vimeo/YouTube: ${vimeo_youtube_url || 'N/A'}
  * Behance: ${behance_url || 'N/A'}
  * Reel: ${reel_url || 'N/A'}
  * Enlace más representativo: ${best_link_type || 'N/A'} -> ${best_project_url || 'N/A'}
- Modalidad y Facturación: ${modalities.join(', ')} | Facturación: ${invoicing_status || 'A convenir'} | Viajes: ${willing_to_travel || 'No'}
- Bio / Presentación: ${bio_notes || 'N/A'}

${cvExtractedText ? `TEXTO EXTRAÍDO DEL CV EN PDF ADJUNTO:\n${cvExtractedText}` : 'NO ADJUNTÓ CV EN PDF (Evaluar con los datos del formulario).'}`;

                const completion = await groq.chat.completions.create({
                    model: 'llama-3.3-70b-versatile',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    response_format: { type: 'json_object' },
                    temperature: 0.2,
                    max_tokens: 1000
                });

                const parsedAi = JSON.parse(completion.choices[0]?.message?.content || '{}');
                aiProfileScore = parseInt(parsedAi.profile_score, 10) || 75;
                aiExperienceScore = parseInt(parsedAi.experience_score, 10) || 75;
                aiTechnicalScore = parseInt(parsedAi.technical_score, 10) || 75;
                aiOverallScore = parseInt(parsedAi.overall_score, 10) || Math.round((aiProfileScore + aiExperienceScore + aiTechnicalScore) / 3);
                aiExecutiveSummary = parsedAi.executive_summary || aiExecutiveSummary;
                aiInconsistencies = Array.isArray(parsedAi.inconsistencies) ? parsedAi.inconsistencies : [];
                aiExtractedTags = Array.isArray(parsedAi.extracted_tags) ? parsedAi.extracted_tags : aiExtractedTags;
                aiRawAnalysis = parsedAi;

            } catch (aiErr) {
                console.error('Error procesando evaluación con Groq:', aiErr.message);
            }
        }

        // 4. Guardar en Supabase (tabla network_candidates)
        let candidateId = null;
        if (supabase) {
            const { data: inserted, error: insertErr } = await supabase
                .from('network_candidates')
                .insert({
                    full_name,
                    artistic_name: artistic_name || null,
                    email,
                    phone,
                    city,
                    state_province: state_province || null,
                    country,
                    birth_year: birth_year ? parseInt(birth_year, 10) : null,
                    roles: roles || [],
                    primary_role,
                    years_experience: years_experience || null,
                    project_types: project_types || [],
                    notable_clients: notable_clients || null,
                    camera_gear: camera_gear || null,
                    drone_gear: drone_gear || null,
                    software_tools: software_tools || [],
                    ai_tools: ai_tools || [],
                    portfolio_url: portfolio_url || null,
                    instagram_url: instagram_url || null,
                    vimeo_youtube_url: vimeo_youtube_url || null,
                    behance_url: behance_url || null,
                    reel_url: reel_url || null,
                    best_link_type: best_link_type || null,
                    best_project_url: best_project_url || null,
                    cv_url: cv_url || null,
                    cv_filename: cv_filename || null,
                    modalities: modalities || [],
                    invoicing_status: invoicing_status || null,
                    willing_to_travel: willing_to_travel || null,
                    bio_notes: bio_notes || null,
                    ai_overall_score: aiOverallScore,
                    ai_profile_score: aiProfileScore,
                    ai_experience_score: aiExperienceScore,
                    ai_technical_score: aiTechnicalScore,
                    ai_executive_summary: aiExecutiveSummary,
                    ai_inconsistencies: aiInconsistencies,
                    ai_extracted_tags: aiExtractedTags,
                    ai_raw_analysis: aiRawAnalysis,
                    status: 'nuevo'
                })
                .select('id')
                .single();

            if (insertErr) {
                console.error('Error insertando en network_candidates:', insertErr);
                throw insertErr;
            }
            candidateId = inserted?.id;
        }

        // 5. Notificación automática por WhatsApp a Martín si el candidato califica (Score >= 80)
        if (aiOverallScore >= 80) {
            const bestLink = best_project_url || reel_url || portfolio_url || instagram_url || vimeo_youtube_url || 'Sin enlace cargado';
            const alertMsg = `🌟 *NEXOFILM NETWORK — Candidato Calificado!*
👤 *${full_name}*
🎯 *Rol:* ${primary_role}
📍 *Ubicación:* ${city}, ${country}
⭐ *Score IA:* ${aiOverallScore}/100
📄 *Facturación:* ${invoicing_status || 'A convenir'}

📝 *Resumen Ejecutivo:*
${aiExecutiveSummary}

🔗 *Muestra Destacada:* ${bestLink}
${cv_url ? `📎 *CV en PDF:* ${cv_url}` : '📎 *CV:* No adjuntó PDF'}

👉 *Ver en CRM:* https://nexofilm.com/admin/crm`;

            await sendWhatsAppAlert(alertMsg);
        }

        return res.status(200).json({
            success: true,
            message: 'Postulación registrada con éxito en NexoFilm Network',
            candidate_id: candidateId,
            score: aiOverallScore
        });

    } catch (error) {
        console.error('Error general en apply.js:', error);
        return res.status(500).json({ error: error.message || 'Error interno del servidor al procesar postulación' });
    }
}
