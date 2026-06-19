const fs = require('fs');
let html = fs.readFileSync('dist/index.html', 'utf8');
const title = 'Cotizá tu Producción Audiovisual | NexoFilm';
const description = 'Completá esta breve información y nosotros armamos un presupuesto detallado para tu próximo evento.';
const imageUrl = 'https://nexofilm.com/logo-whatsapp.jpg';
const url = 'https://nexofilm.com/presupuesto';

html = html
    .replace(/<title>.*?<\/title>/g, `<title>${title}</title>`)
    .replace(/<meta name="description"\s+content="[^"]*"/g, `<meta name="description" content="${description}"`)
    .replace(/<meta property="og:title" content="[^"]*"/g, `<meta property="og:title" content="${title}"`)
    .replace(/<meta property="og:description"\s+content="[^"]*"/g, `<meta property="og:description" content="${description}"`)
    .replace(/<meta property="og:image" content="[^"]*"/g, `<meta property="og:image" content="${imageUrl}"`)
    .replace(/<meta property="og:url" content="[^"]*"/g, `<meta property="og:url" content="${url}"`)
    .replace(/<meta name="twitter:title" content="[^"]*"/g, `<meta name="twitter:title" content="${title}"`)
    .replace(/<meta name="twitter:description"\s+content="[^"]*"/g, `<meta name="twitter:description" content="${description}"`)
    .replace(/<meta name="twitter:image" content="[^"]*"/g, `<meta name="twitter:image" content="${imageUrl}"`);

console.log(html);
