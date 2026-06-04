import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_KEY;
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { 
        project_id, 
        invoice_url, 
        invoice_type, 
        invoice_amount, 
        bank_details, 
        password 
    } = req.body;

    // Validación de seguridad para el administrador
    if (password !== 'Nex@2023R') {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!supabase) {
        return res.status(500).json({ error: 'Supabase credentials not configured' });
    }

    if (!project_id) {
        return res.status(400).json({ error: 'El ID del proyecto es requerido' });
    }

    try {
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

    } catch (error) {
        console.error('Error en send-invoice API:', error);
        return res.status(500).json({ error: error.message });
    }
}
