// middleware.js
// Vercel Edge Middleware que se ejecuta ANTES del sistema de archivos estático.
// 1. Redirige 301 www.nexofilm.com a nexofilm.com para unificar autoridad y evitar duplicidad.
// 2. Intercepta las solicitudes con ?lng=en o ?lng=pt para servir el HTML con
//    los atributos lang y canonical correctos directamente desde el servidor.

export default async function middleware(request) {
  const url = new URL(request.url);

  // 1. Redirección 301 de www a no-www
  if (url.hostname === 'www.nexofilm.com') {
    url.hostname = 'nexofilm.com';
    return Response.redirect(url.toString(), 301);
  }

  // 2. Intercepción de idiomas para crawlers y SEO internacional
  const lng = url.searchParams.get('lng');
  if ((url.pathname === '/' || url.pathname === '/index.html') && (lng === 'en' || lng === 'pt')) {
    const apiUrl = new URL(`/api/lang-serve?lng=${lng}`, request.url);
    return fetch(apiUrl);
  }
}
