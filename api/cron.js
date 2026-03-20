import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_KEY;

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export default async function handler(req, res) {
  // Opcional: Proteger el endpoint para que solo lo llame Vercel Cron
  // si el entorno está configurado con CRON_SECRET en Vercel
  if (process.env.CRON_SECRET) {
      const authHeader = req.headers.authorization;
      if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
          return res.status(401).json({ error: 'Unauthorized' });
      }
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Supabase no está configurado', status: 'PAUSED' });
  }

  try {
    console.log("Iniciando ping a Supabase para prevenir inactividad...");
    
    // Hacemos una lectura muy ligera a la tabla para registrar actividad en la BD
    const { data, error } = await supabase
      .from('whatsapp_sessions')
      .select('phone')
      .limit(1);

    if (error) throw error;

    console.log("¡Ping exitoso! Supabase se mantiene activo.");
    return res.status(200).json({ 
        message: 'Ping a Supabase exitoso. Proyecto activo.', 
        status: 'HEALTHY',
        timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error("Error al hacer el ping a Supabase:", err);
    return res.status(500).json({ 
        error: 'Error al contactar a la base de datos', 
        details: err.message 
    });
  }
}
