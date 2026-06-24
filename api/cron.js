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

  const results = { status: 'HEALTHY', pings: [], autoTransitions: [] };

  if (!supabase && !supabaseStaging) {
    return res.status(500).json({ error: 'Ningún Supabase (Prod/Staging) está configurado', status: 'PAUSED' });
  }

  // ─── AUTO-TRANSICIÓN: approved → production ──────────────────────────────
  // Busca proyectos aprobados cuya fecha de evento ya llegó y los pasa a producción.
  // Se ejecuta todos los días a las 12hs (configurado en vercel.json).
  if (supabase) {
    try {
      const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

      const { data: toTransition, error: fetchErr } = await supabase
        .from('projects')
        .select('id, title, contact_name, event_date')
        .eq('status', 'approved')
        .lte('event_date', todayStr); // event_date <= hoy

      if (fetchErr) throw fetchErr;

      if (toTransition && toTransition.length > 0) {
        const ids = toTransition.map(p => p.id);

        const { error: updateErr } = await supabase
          .from('projects')
          .update({ status: 'production' })
          .in('id', ids);

        if (updateErr) throw updateErr;

        const transitioned = toTransition.map(p => `${p.contact_name} — "${p.title}" (${p.event_date})`);
        console.log(`✅ Auto-transición a producción: ${transitioned.join(', ')}`);
        results.autoTransitions = transitioned;
      } else {
        console.log('ℹ️ No hay proyectos para pasar a producción hoy.');
        results.autoTransitions = [];
      }
    } catch (err) {
      console.error('Error en auto-transición approved→production:', err);
      results.autoTransitions = [`ERROR: ${err.message}`];
      results.status = 'DEGRADED';
    }
  }

  // ─── PING SALUD ──────────────────────────────────────────────────────────

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
