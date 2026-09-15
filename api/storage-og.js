// api/storage-og.js
// Sirve index.html con Open Graph y Schema enriquecidos para NexoFilm Storage
// cuando se comparte por WhatsApp, Telegram, Slack o redes sociales.

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_KEY;
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

function escapeAttr(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export default async function handler(req, res) {
  const token = req.query.token;

  try {
    let filePath = join(process.cwd(), 'dist/index.html');
    if (!existsSync(filePath)) {
      filePath = join(process.cwd(), 'index.html');
    }
    let html = readFileSync(filePath, 'utf-8');

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
          const clientName = project.company_name || project.contact_name || '';
          const projName = project.title || 'Producción Audiovisual';
          title = `NexoFilm Storage — ${projName}`;
          description = clientName
            ? `Material entregado para ${clientName}. Previsualizá y descargá el contenido final en alta definición.`
            : `Material final entregado. Previsualizá y descargá el contenido en alta definición.`;
        }
      } catch (dbErr) {
        console.error('[storage-og] Error consultando proyecto:', dbErr.message);
      }
    }

    const safeTitle = escapeAttr(title);
    const safeDesc = escapeAttr(description);
    const storageUrl = `https://nexofilm.com/storage?token=${encodeURIComponent(token || '')}`;

    // 1. Título de pestaña
    html = html.replace(/<title>.*?<\/title>/, `<title>${safeTitle}</title>`);

    // 2. Meta description estándar
    html = html.replace(/<meta name="description"\s+content="[^"]*"/, `<meta name="description" content="${safeDesc}"`);

    // 3. Open Graph (Facebook / WhatsApp / iMessage)
    html = html.replace(/<meta property="og:title"\s+content="[^"]*"\s*\/?>/, `<meta property="og:title" content="${safeTitle}" />`);
    html = html.replace(/<meta property="og:description"\s+content="[^"]*"\s*\/?>/, `<meta property="og:description" content="${safeDesc}" />`);
    html = html.replace(/<meta property="og:url"\s+content="[^"]*"\s*\/?>/, `<meta property="og:url" content="${storageUrl}" />`);

    // 4. Schema / Itemprop (WhatsApp móvil y navegadores Chromium)
    html = html.replace(/<meta itemprop="name"\s+content="[^"]*"\s*\/?>/, `<meta itemprop="name" content="${safeTitle}" />`);
    html = html.replace(/<meta itemprop="description"\s+content="[^"]*"\s*\/?>/, `<meta itemprop="description" content="${safeDesc}" />`);

    // 5. Twitter / X Cards
    html = html.replace(/<meta name="twitter:title"\s+content="[^"]*"\s*\/?>/, `<meta name="twitter:title" content="${safeTitle}" />`);
    html = html.replace(/<meta name="twitter:description"\s+content="[^"]*"\s*\/?>/, `<meta name="twitter:description" content="${safeDesc}" />`);
    html = html.replace(/<meta name="twitter:url"\s+content="[^"]*"\s*\/?>/, `<meta name="twitter:url" content="${storageUrl}" />`);

    // 6. Canonical
    html = html.replace(/<link rel="canonical"\s+href="[^"]*"\s*\/?>/, `<link rel="canonical" href="${storageUrl}" />`);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.status(200).send(html);

  } catch (err) {
    console.error('[storage-og] Error general:', err.message);
    res.writeHead(302, { Location: `/storage?token=${encodeURIComponent(token || '')}` });
    return res.end();
  }
}
