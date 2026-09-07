// api/network/admin.js
// Endpoint administrativo para gestionar postulantes de NexoFilm Network
// Búsqueda, filtrado, actualización de estados, match por proyecto con Groq y promoción a Crew Activo.

import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_KEY;
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY.trim() }) : null;

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    const { action, password } = req.body || {};

    // Verificación de credenciales de administrador
    if (password !== 'Nex@2023R') {
        return res.status(401).json({ error: 'No autorizado' });
    }

    if (!supabase) {
        return res.status(500).json({ error: 'Base de datos Supabase no configurada' });
    }

    try {
        switch (action) {
            // ─── LISTAR CANDIDATOS ───────────────────────────────────────────────
            case 'listCandidates': {
                const { data, error } = await supabase
                    .from('network_candidates')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) throw error;
                return res.status(200).json({ success: true, candidates: data || [] });
            }

            // ─── ACTUALIZAR ESTADO / NOTAS INTERNAS ──────────────────────────────
            case 'updateCandidate': {
                const { candidate_id, status, internal_notes } = req.body;
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

            // ─── PROMOVER CANDIDATO A CREW ACTIVO ────────────────────────────────
            case 'promoteCandidateToCrew': {
                const { candidate_id } = req.body;
                if (!candidate_id) return res.status(400).json({ error: 'candidate_id requerido' });

                // 1. Obtener datos del candidato
                const { data: cand, error: fetchErr } = await supabase
                    .from('network_candidates')
                    .select('*')
                    .eq('id', candidate_id)
                    .single();

                if (fetchErr || !cand) throw new Error('Candidato no encontrado');

                // 2. Formatear roles para el campo de crew_members (string separado por comas)
                const allRoles = Array.from(new Set([cand.primary_role, ...(cand.roles || [])])).filter(Boolean);
                const roleString = allRoles.join(', ') || 'Otro';

                // 3. Formatear notas con el dossier de Network
                const notesSummary = `[NexoFilm Network — Score: ${cand.ai_overall_score || 0}/100]
${cand.ai_executive_summary || ''}
📍 Ubicación: ${cand.city}, ${cand.country}
🎥 Equipos: ${cand.camera_gear || 'No detallado'} | Drone: ${cand.drone_gear || 'No'}
💻 Software/IA: ${(cand.software_tools || []).concat(cand.ai_tools || []).join(', ')}
📄 Facturación: ${cand.invoicing_status || 'A convenir'} | Viajes: ${cand.willing_to_travel || 'No'}
🔗 Portfolio: ${cand.best_project_url || cand.reel_url || cand.portfolio_url || cand.instagram_url || 'N/A'}
${cand.cv_url ? `📎 CV: ${cand.cv_url}` : ''}`.trim();

                // 4. Insertar en crew_members
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

                // 5. Marcar candidato como promovido
                const { error: markErr } = await supabase
                    .from('network_candidates')
                    .update({
                        is_promoted_to_crew: true,
                        promoted_crew_id: newCrew.id,
                        status: 'aprobado'
                    })
                    .eq('id', candidate_id);

                if (markErr) throw markErr;

                return res.status(200).json({ 
                    success: true, 
                    message: 'Candidato promovido exitosamente a Crew Activo',
                    crew_id: newCrew.id 
                });
            }

            // ─── AI PROJECT MATCHER (BÚSQUEDA SEMÁNTICA CON GROQ) ────────────────
            case 'matchProject': {
                const { project_description } = req.body;
                if (!project_description) return res.status(400).json({ error: 'project_description requerido' });

                // Traer todos los candidatos activos/revisados
                const { data: candidates, error: candErr } = await supabase
                    .from('network_candidates')
                    .select('id, full_name, primary_role, roles, city, country, camera_gear, drone_gear, software_tools, ai_tools, years_experience, ai_overall_score, ai_executive_summary, invoicing_status, willing_to_travel')
                    .neq('status', 'descartado')
                    .limit(100);

                if (candErr) throw candErr;

                if (!groq) {
                    return res.status(200).json({ success: true, matches: [] });
                }

                const prompt = `Sos el Director de Producción de NexoFilm. El usuario necesita encontrar los mejores candidatos de su red para un proyecto específico.

DESCRIPCIÓN DEL PROYECTO O BÚSQUEDA:
"${project_description}"

LISTA DE PROFESIONALES DISPONIBLES EN LA BASE:
${JSON.stringify(candidates, null, 2)}

Devuelve ÚNICAMENTE un JSON con este formato:
{
  "matches": [
    {
      "candidate_id": "<id del candidato>",
      "match_percentage": <número entero 0-100>,
      "match_reason": "<1 oración clara explicando por qué encaja para esta necesidad puntual>"
    }
  ]
}
Ordena los matches de mayor a menor porcentaje. Incluye solo candidatos con al menos 40% de afinidad.`;

                const completion = await groq.chat.completions.create({
                    model: 'llama-3.3-70b-versatile',
                    messages: [{ role: 'user', content: prompt }],
                    response_format: { type: 'json_object' },
                    temperature: 0.2
                });

                const parsed = JSON.parse(completion.choices[0]?.message?.content || '{"matches":[]}');
                return res.status(200).json({ success: true, matches: parsed.matches || [] });
            }

            // ─── ELIMINAR CANDIDATO ──────────────────────────────────────────────
            case 'deleteCandidate': {
                const { candidate_id } = req.body;
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
    } catch (err) {
        console.error('Error en api/network/admin.js:', err);
        return res.status(500).json({ error: err.message || 'Error en el servidor' });
    }
}
