# Reglas de NexoFilm & Base de Conocimiento de Agentes

## 1. Supabase y GitHub
- **Cuenta de Supabase:** La cuenta correcta de Supabase para este proyecto está vinculada al inicio de sesión de GitHub que utiliza el correo de Gmail de Martín (`martinmagarinios@gmail.com`). Evitar iniciar sesión con otros correos o cuentas de GitHub que resulten en organizaciones vacías como `martinmagarinios-sudo's Project`.

## 2. Despliegues y Producción
- **Entorno de Producción por Defecto:** Como regla estricta, todos los despliegues de cambios deben realizarse directamente sobre el entorno de producción en `nexofilm.com` (`npx vercel --prod --force`). No desplegar únicamente a URLs de prueba/staging de forma aislada.

## 3. Integridad del Backend y CRM
- **REGLA CRÍTICA:** Nunca alterar lógica, rutas ni tipos en `src/admin/*`, `src/components/ClientPortal.tsx`, `api/comercial/*` ni `api/whatsapp.js` al realizar tareas de frontend o SEO público.
- En `robots.txt`, siempre mantener `Disallow: /api/` para proteger endpoints del CRM del rastreo de bots.

---

## 4. Lecciones Aprendidas y Patrones Comprobados

### A. Previsualización de Videos en Portfolio (`ProjectCard.tsx`)
- ❌ **Qué NO funciona:** Poner un poster de fallback genérico como `poster={project.imageUrl || "/og-image.jpg"}` cuando `imageUrl` es vacío. Provoca que el video se vea como una caja negra estática con el logo antes de hacer hover.
- ✅ **Qué SÍ funciona:** Dejar `<source src={`${project.videoUrl}#t=0.5`} type="video/mp4" />` con `preload="metadata"` y sin poster si no hay imagen real. El navegador extrae y renderiza automáticamente el frame del segundo 0.5 como thumbnail visual.

### B. SEO Internacional y Hreflang en SPA (Vercel + Vite)
- ❌ **Qué NO funciona:** 
  1. Depender solo de `useEffect` en `App.tsx` para cambiar `<html lang="...">` y canonicals (los crawlers sin JS ven siempre la versión base en español).
  2. Usar solo `rewrites` en `vercel.json` para `/` con query params (el sistema de archivos estáticos de Vercel sirve `dist/index.html` antes de evaluar los rewrites de la raíz).
- ✅ **Qué SÍ funciona:** 
  - Usar un **Vercel Edge Middleware** (`middleware.js` en raíz) que intercepta `?lng=en` y `?lng=pt` antes de la resolución de archivos estáticos.
  - Redirigir a `api/lang-serve.js` para modificar en el servidor los strings `<html lang="xx">` y canonicals hacia la URL correspondiente.

### C. Datos Estructurados (Schema.org / JSON-LD)
- ❌ **Qué NO funciona:** Usar tipos inexistentes como `@type: "VideoProductionCompany"`.
- ✅ **Qué SÍ funciona:** Usar `@type: ["LocalBusiness", "ProfessionalService"]`, acompañado de `Review` + `AggregateRating` para testimonios y `VideoObject` para los videos del portfolio. (Validado con 19 elementos ricos en Google Rich Results Test).

### D. Jerarquía Semántica H1/H2/H3
- ❌ **Qué NO funciona:** Tener un `<h1>` que cambie dinámicamente con slides de carrusel sin palabras clave de ubicación o negocio. Tener `<h3>` antes de `<h2>` en el DOM.
- ✅ **Qué SÍ funciona:** Usar un único `<h1 className="sr-only">` accesible con palabras clave geolocalizadas ("NexoFilm — Productora Audiovisual en Buenos Aires y Latam") y convertir los títulos del carrusel en `<h2>`.
