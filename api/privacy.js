// api/privacy.js
// Sirve /politica-de-privacidad con canonical, title y description correctos.
// Evita que esta página herede la canonical de la home en el HTML estático.

import { readFileSync } from 'fs';
import { join } from 'path';

export default function handler(req, res) {
  try {
    let html = readFileSync(join(process.cwd(), 'dist/index.html'), 'utf-8');

    const title = 'Política de Privacidad | NexoFilm';
    const description = 'Política de privacidad de NexoFilm. Cómo recopilamos, usamos y protegemos tu información personal.';
    const url = 'https://nexofilm.com/politica-de-privacidad';

    html = html
      .replace(/<title>.*?<\/title>/g, `<title>${title}</title>`)
      .replace(/<meta name="description"\s+content="[^"]*"/, `<meta name="description" content="${description}"`)
      // FIX: Canonical propia para /politica-de-privacidad
      .replace(/<link rel="canonical" href="[^"]*"[^>]*\/?>/, `<link rel="canonical" href="${url}" />`)
      // Remover hreflangs (esta página no tiene versiones en otros idiomas)
      .replace(/<link rel="alternate" hreflang="[^"]*" href="[^"]*"[^>]*\/?>\s*/g, '')
      // Actualizar robots para indexar
      .replace(/<meta name="robots" content="[^"]*"/, `<meta name="robots" content="index, follow"`);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate');
    res.status(200).send(html);

  } catch (err) {
    console.error('[privacy] Error:', err.message);
    res.writeHead(302, { Location: '/' });
    res.end();
  }
}
