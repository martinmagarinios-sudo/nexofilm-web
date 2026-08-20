// middleware.js
// Vercel Edge Middleware que se ejecuta ANTES del sistema de archivos estático.
// Intercepta las solicitudes con ?lng=en o ?lng=pt para servir el HTML con
// los atributos lang y canonical correctos directamente desde el servidor.

export default async function middleware(request) {
  const url = new URL(request.url);
  const lng = url.searchParams.get('lng');

  if ((url.pathname === '/' || url.pathname === '/index.html') && (lng === 'en' || lng === 'pt')) {
    const apiUrl = new URL(`/api/lang-serve?lng=${lng}`, request.url);
    return fetch(apiUrl);
  }
}
