const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'dist', 'index.html');
if (!fs.existsSync(filePath)) {
  console.log('dist/index.html does not exist');
  process.exit(1);
}

let html = fs.readFileSync(filePath, 'utf8');

const title = "Portal de Autogestión | NexoFilm";
const description = "Hola Martin, ingresá aquí para completar los datos de tu solicitud.";

console.log('Original index.html length:', html.length);

const titleMatch = html.match(/<title>[^<]*<\/title>/g);
console.log('titleMatch:', titleMatch);

const descMatch = html.match(/<meta\s+name="description"\s+content="[^"]*"/g);
console.log('descMatch:', descMatch);

const ogTitleMatch = html.match(/<meta\s+property="og:title"\s+content="[^"]*"/g);
console.log('ogTitleMatch:', ogTitleMatch);

const ogDescMatch = html.match(/<meta\s+property="og:description"\s+content="[^"]*"/g);
console.log('ogDescMatch:', ogDescMatch);

html = html.replace(/<title>[^<]*<\/title>/g, `<title>${title}</title>`);
html = html.replace(/<meta\s+name="description"\s+content="[^"]*"/g, `<meta name="description" content="${description}"`);
html = html.replace(/<meta\s+property="og:title"\s+content="[^"]*"/g, `<meta property="og:title" content="${title}"`);
html = html.replace(/<meta\s+property="og:description"\s+content="[^"]*"/g, `<meta property="og:description" content="${description}"`);

console.log('Replaced title in html:', html.includes(`<title>${title}</title>`));
console.log('Replaced description in html:', html.includes(`<meta name="description" content="${description}"`));
console.log('Replaced og:title in html:', html.includes(`<meta property="og:title" content="${title}"`));
console.log('Replaced og:description in html:', html.includes(`<meta property="og:description" content="${description}"`));
