// api/storage-og.js
// Sirve index.html con Open Graph personalizado para NexoFilm Storage cuando se comparte por WhatsApp o redes.

import { readFileSync } from 'fs';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_KEY;
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

export default async function handler(req, res) {
  const token = req.query.token;

  try {
    let html = readFileSync(join(process.cwd(), 'dist/index.html'), 'utf-8');

    let title = 'NexoFilm Storage | Entrega Oficial de Materiales';
    let description = 'Centro exclusivo de previsualización y descarga en alta definición de NexoFilm.';

    if (token && supabase) {
      try {
        const { data: project } = await supabase
          .from('projects')
          .select('title, contact_name, company_name')
          .eq('access_token', token)
          .maybeSingle();

        if (project) {
          const clientOrCompany = project.company_name || project.contact_name || '';
          const projName = project.title || 'Producción Audiovisual';
          title = `NexoFilm Storage — ${projName}${clientOrCompany ? ` (${clientOrCompany})` : ''}`;
          description = `Entrega oficial de materiales terminados de ${projName}. Previsualizá y descargá masters en alta definición.`;
        }
      } catch (dbErr) {
        console.error('[storage-og] Error consultando proyecto:', dbErr.message);
      }
    }

    // Reemplazos de Open Graph para WhatsApp y Telegram
    html = html.replace(/<title>.*?<\/title>/, `<title>${title}</title>`);
    html = html.replace(/<meta property="og:title" content=".*?"\s*\/?>/, `<meta property="og:title" content="${title}" />`);
    html = html.replace(/<meta property="og:description" content=".*?"\s*\/?>/, `<meta property="og:description" content="${description}" />`);
    html = html.replace(/<meta name="twitter:title" content=".*?"\s*\/?>/, `<meta name="twitter:title" content="${title}" />`);
    html = html.replace(/<meta name="twitter:description" content=".*?"\s*\/?>/, `<meta name="twitter:description" content="${description}" />`);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(html);

  } catch (err) {
    console.error('[storage-og] Error general:', err.message);
    // Fallback: redirigir a la URL normal si falla la lectura del archivo
    res.writeHead(302, { Location: `/storage?token=${encodeURIComponent(token || '')}` });
    return res.end();
  }
}
