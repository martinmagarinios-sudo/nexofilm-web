import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_KEY;
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { 
        client_name, 
        client_email, 
        client_phone,
        notification_preference = 'both',
        title, 
        items, 
        total_price, 
        payment_terms, 
        status = 'sent',
        event_date,
        event_time,
        location,
        coverage_types,
        coverage_hours,
        drive_folder_id,
        password 
    } = req.body;

    // Validación de seguridad para Admin
    if (password !== 'Nex@2023R') {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!supabase) {
        return res.status(500).json({ error: 'Supabase credentials not configured' });
    }

    if (!client_name) {
        return res.status(400).json({ error: 'Falta campo obligatorio: Nombre del cliente' });
    }

    const projectTitle = title && title.trim() !== '' ? title : 'Propuesta Comercial';

    try {
        // 1. Insertar el proyecto
        const { data: project, error: projErr } = await supabase
            .from('projects')
            .insert({
                client_name,
                client_email: client_email || '',
                client_phone: client_phone || null,
                notification_preference,
                title: projectTitle,
                status,
                event_date: event_date || null,
                event_time: event_time || null,
                location: location || null,
                coverage_types: coverage_types || [],
                coverage_hours: coverage_hours ? parseInt(coverage_hours) : null,
                guests_count: req.body.guests_count ? parseInt(req.body.guests_count) : null,
                drive_folder_id: drive_folder_id || null
            })
            .select()
            .single();

        if (projErr) throw projErr;

        // 2. Insertar el presupuesto asociado (solo si hay ítems válidos)
        let budget = null;
        const validItems = (items || []).filter(item => item.description && item.description.trim() !== '');
        
        if (validItems.length > 0) {
            const calculatedTotal = validItems.reduce((acc, curr) => acc + (curr.quantity * curr.unit_price), 0);
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

        // 3. Generar la URL del portal del cliente
        const host = req.headers.host || 'nexofilm.com';
        const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';
        const clientUrl = `${protocol}://${host}/portal?token=${project.access_token}`;

        return res.status(200).json({ 
            success: true, 
            project, 
            budget, 
            clientUrl 
        });

    } catch (error) {
        console.error('Error en create-project API:', error);
        return res.status(500).json({ error: error.message });
    }
}
