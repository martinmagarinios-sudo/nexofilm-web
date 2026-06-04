import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_KEY;
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const token = req.headers['x-client-token'] || req.query.token;

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
            return res.status(404).json({ error: 'Proyecto no encontrado o token inválido' });
        }

        // 2. Obtener el presupuesto activo para ese proyecto
        const { data: budget, error: budgErr } = await supabase
            .from('budgets')
            .select('*')
            .eq('project_id', project.id)
            .eq('is_active', true)
            .maybeSingle();

        if (budgErr) throw budgErr;

        return res.status(200).json({
            success: true,
            project,
            budget
        });

    } catch (error) {
        console.error('Error en client-portal API:', error);
        return res.status(500).json({ error: error.message });
    }
}
