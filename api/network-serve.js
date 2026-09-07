// api/network-serve.js
// Servidor SSR de metadatos para /network (NexoFilm Network)
// Garantiza indexación limpia en Google, previsualizaciones en redes y canonical única.

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export default function handler(req, res) {
  try {
    const indexPath = join(process.cwd(), 'dist/index.html');
    if (!existsSync(indexPath)) {
      return res.redirect('/');
    }
    let html = readFileSync(indexPath, 'utf-8');

    const title = 'NexoFilm Network | Red de Profesionales Audiovisuales';
    const description = 'Sumate a NexoFilm Network. Conectamos fotógrafos, filmmakers, editores, pilotos de drone y creadores con IA con producciones comerciales y cinematográficas.';
    const url = 'https://nexofilm.com/network';
    const imageUrl = 'https://nexofilm.com/og-image.jpg';

    html = html
      .replace(/<title>.*?<\/title>/g, `<title>${title}</title>`)
      .replace(/<meta name="description"\s+content="[^"]*"/, `<meta name="description" content="${description}"`)
      .replace(/<meta property="og:title" content="[^"]*"/, `<meta property="og:title" content="${title}"`)
      .replace(/<meta property="og:description"\s+content="[^"]*"/, `<meta property="og:description" content="${description}"`)
      .replace(/<meta property="og:url" content="[^"]*"/, `<meta property="og:url" content="${url}"`)
      .replace(/<meta property="og:image" content="[^"]*"/, `<meta property="og:image" content="${imageUrl}"`)
      .replace(/<meta name="twitter:title" content="[^"]*"/, `<meta name="twitter:title" content="${title}"`)
      .replace(/<meta name="twitter:description"\s+content="[^"]*"/, `<meta name="twitter:description" content="${description}"`)
      .replace(/<meta name="twitter:image" content="[^"]*"/, `<meta name="twitter:image" content="${imageUrl}"`)
      // Canonical única para /network (evita heredar la de la home)
      .replace(/<link rel="canonical" href="[^"]*"[^>]*\/?>/, `<link rel="canonical" href="${url}" />`)
      // Remover hreflangs de idiomas múltiples para esta URL
      .replace(/<link rel="alternate" hreflang="[^"]*" href="[^"]*"[^>]*\/?>\s*/g, '')
      // Permitir indexación completa
      .replace(/<meta name="robots" content="[^"]*"/, `<meta name="robots" content="index, follow"`);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate');
    return res.status(200).send(html);

  } catch (err) {
    console.error('[network-serve] Error:', err.message);
    return res.redirect('/');
  }
}
