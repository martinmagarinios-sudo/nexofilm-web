import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_KEY;

const stagingUrl = process.env.STAGING_SUPABASE_URL || 'https://bprjsdkhvqobrommxfnk.supabase.co';
const stagingKey = process.env.STAGING_SUPABASE_KEY;

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;
const supabaseStaging = stagingUrl && stagingKey ? createClient(stagingUrl, stagingKey) : null;

export default async function handler(req, res) {
  // Opcional: Proteger el endpoint para que solo lo llame Vercel Cron
  // si el entorno está configurado con CRON_SECRET en Vercel
  if (process.env.CRON_SECRET) {
      const authHeader = req.headers.authorization;
      if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
          return res.status(401).json({ error: 'Unauthorized' });
      }
  }

  const results = { status: 'HEALTHY', pings: [] };

  if (!supabase && !supabaseStaging) {
    return res.status(500).json({ error: 'Ningún Supabase (Prod/Staging) está configurado', status: 'PAUSED' });
  }

  // Ping a Producción
  if (supabase) {
    try {
      console.log("Iniciando ping a Supabase Producción...");
      const { error } = await supabase.from('whatsapp_sessions').select('phone').limit(1);
      if (error && error.code !== '42P01' && !error.message?.includes('schema cache')) throw error; // Ignoramos si la tabla no existe aún, el ping cuenta igual
      console.log("¡Ping a Producción exitoso!");
      results.pings.push('Production: OK');
    } catch (err) {
      console.error("Error ping Producción:", err);
      results.pings.push(`Production: ERROR (${err.message})`);
      results.status = 'DEGRADED';
    }
  }

  // Ping a Staging
  if (supabaseStaging) {
    try {
      console.log("Iniciando ping a Supabase Staging...");
      const { error } = await supabaseStaging.from('whatsapp_sessions').select('phone').limit(1);
      if (error && error.code !== '42P01' && !error.message?.includes('schema cache')) throw error;
      console.log("¡Ping a Staging exitoso!");
      results.pings.push('Staging: OK');
    } catch (err) {
      console.error("Error ping Staging:", err);
      results.pings.push(`Staging: ERROR (${err.message})`);
      results.status = 'DEGRADED';
    }
  } else {
    results.pings.push('Staging: SKIPPED (No STAGING_SUPABASE_KEY found)');
  }

  const statusCode = results.status === 'HEALTHY' ? 200 : 207;
  results.timestamp = new Date().toISOString();

  return res.status(statusCode).json(results);
}
