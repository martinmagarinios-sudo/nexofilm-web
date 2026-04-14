import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_KEY;
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

export default async function handler(req, res) {
    // Solo permitir POST para mayor seguridad al enviar la contraseña
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { action, password, phone } = req.body;

    // Validación de seguridad (Misma contraseña que el front)
    if (password !== 'Nex@2023R') {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!supabase) {
        return res.status(500).json({ error: 'Supabase credentials not configured on server' });
    }

    try {
        switch (action) {
            case 'getLeads': {
                // 1. Obtener todas las sesiones activas
                const { data: allSessions, error: sErr } = await supabase.from('whatsapp_sessions').select('phone');
                if (sErr) throw sErr;

                // 2. Por cada sesión, traer su registro de CRM (evitando el límite de 1000 rows de Supabase)
                const leadsPromises = (allSessions || []).map(async (session) => {
                    const searchStr = (session.phone || '').replace(/\D/g, '').slice(-8);
                    if (!searchStr) return null;
                    const { data } = await supabase
                        .from('whatsapp_leads')
                        .select('*')
                        .like('phone', `%${searchStr}%`)
                        .maybeSingle();
                    return data;
                });
                
                const leadsData = await Promise.all(leadsPromises);
                let filteredLeads = leadsData.filter(lead => lead !== null);
                
                // Sort leads descending by updated_at or created_at
                filteredLeads.sort((a, b) => {
                    const dateA = new Date(a.updated_at || a.created_at).getTime();
                    const dateB = new Date(b.updated_at || b.created_at).getTime();
                    return dateB - dateA;
                });

                // 3. Obtener conteo total para la tarjeta superior
                const { count, error: countErr } = await supabase
                    .from('whatsapp_leads')
                    .select('*', { count: 'exact', head: true });
                
                if (countErr) throw countErr;

                return res.status(200).json({ leads: filteredLeads, totalCount: count });
            }

            case 'getSessions': {
                // 1. Traer sesiones
                const { data: sessData, error: sessErr } = await supabase
                    .from('whatsapp_sessions')
                    .select('*')
                    .order('updated_at', { ascending: false });
                if (sessErr) throw sessErr;

                // 2. Traer nombres de leads para cruzar en el cliente
                const { data: leadNames, error: leadNamesErr } = await supabase
                    .from('whatsapp_leads')
                    .select('phone, name');
                if (leadNamesErr) throw leadNamesErr;

                return res.status(200).json({ sessions: sessData, leadNames });
            }

            case 'getLeadDetail': {
                if (!phone) return res.status(400).json({ error: 'Falta el teléfono' });
                
                const searchStr = phone.replace(/\D/g, '').slice(-8);

                const { data: leadDetail, error: leadDetailErr } = await supabase
                    .from('whatsapp_leads')
                    .select('*')
                    .like('phone', `%${searchStr}%`)
                    .maybeSingle();
                
                if (leadDetailErr) throw leadDetailErr;
                return res.status(200).json({ lead: leadDetail });
            }

            default:
                return res.status(400).json({ error: 'Acción no válida' });
        }
    } catch (error) {
        console.error(`Error en admin-api (${action}):`, error);
        return res.status(500).json({ error: error.message });
    }
}
