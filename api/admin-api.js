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
                // 1. Obtener todos los contactos y todas las sesiones para cruzar datos
                const [{ data: allLeads, error: leadsErr }, { data: allSessions, error: sErr }] = await Promise.all([
                    supabase.from('whatsapp_leads').select('*').order('created_at', { ascending: false }),
                    supabase.from('whatsapp_sessions').select('phone')
                ]);
                
                if (leadsErr) throw leadsErr;
                if (sErr) throw sErr;

                // 2. Normalización basada en últimos 8 dígitos para compatibilidad total AR/Internacional
                const getLast8 = (p) => (p || '').replace(/\D/g, '').slice(-8);

                const sessionPhones = new Set((allSessions || []).map(s => getLast8(s.phone)));
                
                const filteredLeads = (allLeads || []).filter(lead => 
                    sessionPhones.has(getLast8(lead.phone))
                );

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
                
                const { data: leadDetail, error: leadDetailErr } = await supabase
                    .from('whatsapp_leads')
                    .select('*')
                    .or(`phone.eq.${phone},phone.eq.${phone.replace('+', '')},phone.eq.+${phone}`)
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
