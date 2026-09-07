// api/network.js
// Controlador integral para NexoFilm Network
// Unificado en 1 sola Serverless Function para cumplir el límite estricto de 12 funciones de Vercel Hobby.
// - GET: Servidor SSR de metadatos (title, canonical, OG) para /network
// - POST (apply): Postulaciones públicas (Groq IA, parseo PDF, Supabase y WhatsApp alert)
// - POST (admin): Panel de control (listCandidates, updateCandidate, matchProject, promoteCandidateToCrew)

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

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';

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
    // ════════════════════════════════════════════════════════════════════════════
    // 1. GET: SSR METADATA & CANONICAL PARA /network (Cero errores en Google)
    // ════════════════════════════════════════════════════════════════════════════
    if (req.method === 'GET' || req.method === 'HEAD') {
        try {
            const indexPath = join(process.cwd(), 'dist/index.html');
            if (!existsSync(indexPath)) {
                return res.redirect('/');
            }
            let html = readFileSync(indexPath, 'utf-8');

            const title = 'NexoFilm Network | Red de Profesionales Audiovisuales';
            const description = 'Sumate a NexoFilm Network. Conectamos fotógrafos, filmmakers, editores, pilotos de drone y creadores con IA con producciones comerciales y cinematográficas.';
            const url = 'https://nexofilm.com/network';
            const imageUrl = 'https://nexofilm.com/og-image.jpg';

            html = html
                .replace(/<title>.*?<\/title>/g, `<title>${title}</title>`)
                .replace(/<meta name="description"\s+content="[^"]*"/, `<meta name="description" content="${description}"`)
                .replace(/<meta property="og:title" content="[^"]*"/, `<meta property="og:title" content="${title}"`)
                .replace(/<meta property="og:description"\s+content="[^"]*"/, `<meta property="og:description" content="${description}"`)
                .replace(/<meta property="og:url" content="[^"]*"/, `<meta property="og:url" content="${url}"`)
                .replace(/<meta property="og:image" content="[^"]*"/, `<meta property="og:image" content="${imageUrl}"`)
                .replace(/<meta name="twitter:title" content="[^"]*"/, `<meta name="twitter:title" content="${title}"`)
                .replace(/<meta name="twitter:description"\s+content="[^"]*"/, `<meta name="twitter:description" content="${description}"`)
                .replace(/<meta name="twitter:image" content="[^"]*"/, `<meta name="twitter:image" content="${imageUrl}"`)
                .replace(/<link rel="canonical" href="[^"]*"[^>]*\/?>/, `<link rel="canonical" href="${url}" />`)
                .replace(/<link rel="alternate" hreflang="[^"]*" href="[^"]*"[^>]*\/?>\s*/g, '')
                .replace(/<meta name="robots" content="[^"]*"/, `<meta name="robots" content="index, follow"`);

            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate');
            return res.status(200).send(html);
        } catch (err) {
            console.error('[network SSR] Error:', err.message);
            return res.redirect('/');
        }
    }

    // ════════════════════════════════════════════════════════════════════════════
    // 2. POST: GESTIÓN DE ACCIONES (ADMIN & POSTULACIONES)
    // ════════════════════════════════════════════════════════════════════════════
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    const body = req.body || {};
    const action = body.action || req.query.action || 'apply';

    // ─── ACCIONES ADMINISTRATIVAS DEL CRM ─────────────────────────────────────
    if (action !== 'apply') {
        if (body.password !== 'Nex@2023R') {
            return res.status(401).json({ error: 'No autorizado' });
        }
        if (!supabase) {
            return res.status(500).json({ error: 'Base de datos Supabase no configurada' });
        }

        try {
            switch (action) {
                case 'listCandidates': {
                    const { data, error } = await supabase
                        .from('network_candidates')
                        .select('*')
                        .order('created_at', { ascending: false });
                    if (error) throw error;
                    return res.status(200).json({ success: true, candidates: data || [] });
                }

                case 'updateCandidate': {
                    const { candidate_id, status, internal_notes } = body;
                    if (!candidate_id) return res.status(400).json({ error: 'candidate_id requerido' });
                    const updatePayload = {};
                    if (status !== undefined) updatePayload.status = status;
                    if (internal_notes !== undefined) updatePayload.internal_notes = internal_notes;

                    const { error } = await supabase
                        .from('network_candidates')
                        .update(updatePayload)
                        .eq('id', candidate_id);
                    if (error) throw error;
                    return res.status(200).json({ success: true });
                }

                case 'promoteCandidateToCrew': {
                    const { candidate_id } = body;
                    if (!candidate_id) return res.status(400).json({ error: 'candidate_id requerido' });

                    const { data: cand, error: fetchErr } = await supabase
                        .from('network_candidates')
                        .select('*')
                        .eq('id', candidate_id)
                        .single();
                    if (fetchErr || !cand) throw new Error('Candidato no encontrado');

                    const allRoles = Array.from(new Set([cand.primary_role, ...(cand.roles || [])])).filter(Boolean);
                    const roleString = allRoles.join(', ') || 'Otro';

                    const notesSummary = `[NexoFilm Network — Score: ${cand.ai_overall_score || 0}/100]
${cand.ai_executive_summary || ''}
📍 Ubicación: ${cand.city}, ${cand.country}
🎥 Equipos: ${cand.camera_gear || 'No detallado'} | Drone: ${cand.drone_gear || 'No'}
💻 Software/IA: ${(cand.software_tools || []).concat(cand.ai_tools || []).join(', ')}
📄 Facturación: ${cand.invoicing_status || 'A convenir'} | Viajes: ${cand.willing_to_travel || 'No'}
🔗 Portfolio: ${cand.best_project_url || cand.reel_url || cand.portfolio_url || cand.instagram_url || 'N/A'}
${cand.cv_url ? `📎 CV: ${cand.cv_url}` : ''}`.trim();

                    const { data: newCrew, error: crewErr } = await supabase
                        .from('crew_members')
                        .insert({
                            name: cand.full_name,
                            role: roleString,
                            email: cand.email,
                            phone: cand.phone,
                            notes: notesSummary,
                            is_active: true
                        })
                        .select('id')
                        .single();
                    if (crewErr) throw crewErr;

                    const { error: markErr } = await supabase
                        .from('network_candidates')
                        .update({
                            is_promoted_to_crew: true,
                            promoted_crew_id: newCrew.id,
                            status: 'aprobado'
                        })
                        .eq('id', candidate_id);
                    if (markErr) throw markErr;

                    return res.status(200).json({ success: true, crew_id: newCrew.id });
                }

                case 'matchProject': {
                    const { project_description } = body;
                    if (!project_description) return res.status(400).json({ error: 'project_description requerido' });

                    const { data: candidates, error: candErr } = await supabase
                        .from('network_candidates')
                        .select('id, full_name, primary_role, roles, city, country, camera_gear, drone_gear, software_tools, ai_tools, years_experience, ai_overall_score, ai_executive_summary, invoicing_status, willing_to_travel')
                        .neq('status', 'descartado')
                        .limit(100);
                    if (candErr) throw candErr;

                    if (!groq) return res.status(200).json({ success: true, matches: [] });

                    const prompt = `Sos el Director de Producción de NexoFilm. El usuario necesita encontrar los mejores candidatos de su red para un proyecto específico.

DESCRIPCIÓN DEL PROYECTO:
"${project_description}"

LISTA DE PROFESIONALES EN LA BASE:
${JSON.stringify(candidates, null, 2)}

Devuelve ÚNICAMENTE un JSON con:
{
  "matches": [
    {
      "candidate_id": "<id>",
      "match_percentage": <0-100>,
      "match_reason": "<1 oracion clara>"
    }
  ]
}
Ordena de mayor a menor porcentaje.`;

                    const completion = await groq.chat.completions.create({
                        model: 'llama-3.3-70b-versatile',
                        messages: [{ role: 'user', content: prompt }],
                        response_format: { type: 'json_object' },
                        temperature: 0.2
                    });

                    const parsed = JSON.parse(completion.choices[0]?.message?.content || '{"matches":[]}');
                    return res.status(200).json({ success: true, matches: parsed.matches || [] });
                }

                case 'deleteCandidate': {
                    const { candidate_id } = body;
                    if (!candidate_id) return res.status(400).json({ error: 'candidate_id requerido' });
                    const { error: delErr } = await supabase
                        .from('network_candidates')
                        .delete()
                        .eq('id', candidate_id);
                    if (delErr) throw delErr;
                    return res.status(200).json({ success: true });
                }

                default:
                    return res.status(400).json({ error: `Acción desconocida: ${action}` });
            }
        } catch (adminErr) {
            console.error('Error en admin network:', adminErr);
            return res.status(500).json({ error: adminErr.message });
        }
    }

    // ─── ACCIÓN: POSTULACIÓN PÚBLICA (action === 'apply') ─────────────────────
    try {
        // Honeypot anti-spam
        if (body.website_url_hp || body.extra_comment_hp) {
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
            return res.status(400).json({ error: 'Faltan campos obligatorios requeridos.' });
        }

        // Extraer texto del CV si fue adjuntado
        let cvExtractedText = '';
        if (cv_url) {
            try {
                const cvRes = await fetch(cv_url);
                if (cvRes.ok) {
                    const arrayBuffer = await cvRes.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);
                    const { PDFParse } = await import('pdf-parse');
                    const parser = new PDFParse({ data: buffer });
                    const parsed = await parser.getText();
                    cvExtractedText = (parsed && parsed.text) ? parsed.text.slice(0, 15000) : '';
                }
            } catch (pdfErr) {
                console.warn('Advertencia al parsear PDF:', pdfErr.message);
            }
        }

        // Groq Scoring
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
                const systemPrompt = `Sos el Director Técnico de Producción de NexoFilm. Evaluás perfiles profesionales de postulantes a "NexoFilm Network".
Responde ÚNICAMENTE un JSON con este formato:
{
  "profile_score": <1-100>,
  "experience_score": <1-100>,
  "technical_score": <1-100>,
  "overall_score": <1-100>,
  "executive_summary": "<exactamente 2 oraciones concisas describiendo perfil y fuerte principal>",
  "inconsistencies": ["<inconsistencias entre CV y formulario, o vacio>"],
  "extracted_tags": ["<palabras clave normalizadas: equipos, software, ciudades, generos>"]
}`;

                const userPrompt = `DATOS FORMULARIO:
- Nombre: ${full_name} (${artistic_name || ''})
- Rol: ${primary_role} | Otros: ${roles.join(', ')}
- Ubicación: ${city}, ${state_province || ''}, ${country}
- Años Exp: ${years_experience || 'N/A'}
- Proyectos: ${project_types.join(', ')}
- Clientes: ${notable_clients || 'N/A'}
- Equipos: ${camera_gear || 'N/A'} | Drone: ${drone_gear || 'N/A'}
- Software: ${software_tools.join(', ')} | IA: ${ai_tools.join(', ')}
- Muestras: Web: ${portfolio_url || 'N/A'}, IG: ${instagram_url || 'N/A'}, Vimeo/YT: ${vimeo_youtube_url || 'N/A'}, Behance: ${behance_url || 'N/A'}, Reel: ${reel_url || 'N/A'}
- Muestra destacada: ${best_link_type || 'N/A'} -> ${best_project_url || 'N/A'}
- Modalidad: ${modalities.join(', ')} | Factura: ${invoicing_status || 'A convenir'} | Viajes: ${willing_to_travel || 'No'}
- Bio: ${bio_notes || 'N/A'}

${cvExtractedText ? `TEXTO DEL CV EN PDF:\n${cvExtractedText}` : 'NO ADJUNTÓ CV'}`;

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
                console.error('Error Groq apply:', aiErr.message);
            }
        }

        // Insertar en Supabase
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

            if (insertErr) throw insertErr;
            candidateId = inserted?.id;
        }

        // WhatsApp Alert si score >= 80
        if (aiOverallScore >= 80) {
            const bestLink = best_project_url || reel_url || portfolio_url || instagram_url || vimeo_youtube_url || 'Sin enlace';
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
            candidate_id: candidateId,
            score: aiOverallScore
        });

    } catch (error) {
        console.error('Error general en apply network:', error);
        return res.status(500).json({ error: error.message || 'Error al procesar postulación' });
    }
}
