// api/lang-serve.js
// Sirve index.html con el lang y canonical correctos para EN/PT,
// y con Open Graph / Schema específicos para confirmación de jornada (Crew) en WhatsApp y redes.

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export default function handler(req, res) {
  const lng = req.query.lng;
  const ref = req.query.ref;

  // 1. Caso: Confirmación de Crew en WhatsApp / redes sociales
  if (ref === 'crew') {
    try {
      let filePath = join(process.cwd(), 'dist/index.html');
      if (!existsSync(filePath)) {
        filePath = join(process.cwd(), 'index.html');
      }
      let html = readFileSync(filePath, 'utf-8');

      const title = 'NexoFilm | Confirmación de Jornada';
      const description = 'Confirmación oficial de jornada y convocatoria de producción técnica NexoFilm. Revisá los detalles de tu asignación.';
      const url = 'https://nexofilm.com/?v=5&ref=crew';
      const imageUrl = 'https://nexofilm.com/preview_whatsapp.jpg';
      const squareImage = 'https://nexofilm.com/logo-whatsapp.jpg';

      // Reemplazo de metadatos dinámicos
      html = html
        .replace(/<title>.*?<\/title>/, `<title>${title}</title>`)
        .replace(/<meta name="description"\s+content="[^"]*"/, `<meta name="description" content="${description}"`)
        .replace(/<meta property="og:title"\s+content="[^"]*"\s*\/?>/, `<meta property="og:title" content="${title}" />`)
        .replace(/<meta property="og:description"\s+content="[^"]*"\s*\/?>/, `<meta property="og:description" content="${description}" />`)
        .replace(/<meta property="og:url"\s+content="[^"]*"\s*\/?>/, `<meta property="og:url" content="${url}" />`)
        .replace(/<meta property="og:image"\s+content="[^"]*"\s*\/?>/, `<meta property="og:image" content="${imageUrl}" />`)
        .replace(/<meta property="og:image:secure_url"\s+content="[^"]*"\s*\/?>/, `<meta property="og:image:secure_url" content="${imageUrl}" />`)
        .replace(/<meta itemprop="name"\s+content="[^"]*"\s*\/?>/, `<meta itemprop="name" content="${title}" />`)
        .replace(/<meta itemprop="description"\s+content="[^"]*"\s*\/?>/, `<meta itemprop="description" content="${description}" />`)
        .replace(/<meta itemprop="image"\s+content="[^"]*"\s*\/?>/, `<meta itemprop="image" content="${squareImage}" />`)
        .replace(/<link rel="image_src"\s+href="[^"]*"\s*\/?>/, `<link rel="image_src" href="${squareImage}" />`)
        .replace(/<meta name="twitter:title"\s+content="[^"]*"\s*\/?>/, `<meta name="twitter:title" content="${title}" />`)
        .replace(/<meta name="twitter:description"\s+content="[^"]*"\s*\/?>/, `<meta name="twitter:description" content="${description}" />`)
        .replace(/<meta name="twitter:image"\s+content="[^"]*"\s*\/?>/, `<meta name="twitter:image" content="${imageUrl}" />`)
        .replace(/<link rel="canonical"\s+href="[^"]*"[^>]*\/?>/, `<link rel="canonical" href="${url}" />`);

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400');
      return res.status(200).send(html);
    } catch (err) {
      console.error('[crew-og] Error:', err.message);
      res.writeHead(302, { Location: '/' });
      return res.end();
    }
  }

  // 2. Caso: Idiomas conocidos (EN / PT)
  if (!['en', 'pt'].includes(lng)) {
    res.writeHead(302, { Location: '/' });
    res.end();
    return;
  }

  try {
    // Leer el dist/index.html generado por Vite (incluido via vercel.json)
    let filePath = join(process.cwd(), 'dist/index.html');
    if (!existsSync(filePath)) {
      filePath = join(process.cwd(), 'index.html');
    }
    let html = readFileSync(filePath, 'utf-8');

    // ---- REEMPLAZOS ROBUSTOS (strings literales, no regex complejos) ----

    // 1. Corregir el atributo lang del <html>
    html = html.replace('<html lang="es">', `<html lang="${lng}">`);

    // 2. Corregir la etiqueta canonical data-static
    html = html.replace(
      '<link rel="canonical" href="https://nexofilm.com/" data-static="true" />',
      `<link rel="canonical" href="https://nexofilm.com/?lng=${lng}" data-static="true" />`
    );

    // 3. Corregir og:locale (si existe en el HTML estático)
    const ogLocaleMap = { en: 'en_US', pt: 'pt_BR' };
    html = html.replace(
      /(<meta\s+property="og:locale"\s+content=")[^"]*(")/,
      `$1${ogLocaleMap[lng] || 'es_AR'}$2`
    );

    // 4. Comentario debug — para verificar que la función se ejecuta
    html = html.replace(
      '<!DOCTYPE html>',
      `<!DOCTYPE html><!-- lang-served:${lng} -->`
    );

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(html);

  } catch (err) {
    console.error('[lang-serve] Error:', err.message);
    res.writeHead(302, { Location: '/' });
    res.end();
  }
}
