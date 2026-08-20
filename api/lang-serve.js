// api/lang-serve.js
// Sirve index.html con el lang y canonical correctos para EN y PT.
// Reemplazos robustos con strings literales en vez de regex complejos.

import { readFileSync } from 'fs';
import { join } from 'path';

export default function handler(req, res) {
  const lng = req.query.lng;

  // Seguridad: solo idiomas conocidos
  if (!['en', 'pt'].includes(lng)) {
    res.writeHead(302, { Location: '/' });
    res.end();
    return;
  }

  try {
    // Leer el dist/index.html generado por Vite (incluido via vercel.json)
    let html = readFileSync(join(process.cwd(), 'dist/index.html'), 'utf-8');

    // ---- REEMPLAZOS ROBUSTOS (strings literales, no regex complejos) ----

    // 1. Corregir el atributo lang del <html>
    //    El HTML siempre tiene <html lang="es"> — reemplazo directo
    html = html.replace('<html lang="es">', `<html lang="${lng}">`);

    // 2. Corregir la etiqueta canonical data-static
    //    Reemplazar el href de nexofilm.com/ por nexofilm.com/?lng=XX
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
    // Sin caché en CDN durante testing; luego podemos activar s-maxage
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(html);

  } catch (err) {
    console.error('[lang-serve] Error:', err.message);
    res.writeHead(302, { Location: '/' });
    res.end();
  }
}
