# Documentación del Proyecto NexoFilm

## Registro de Cambios y Mejoras

### Integración de Videos en Portfolio (13/02/2026)

**Objetivo**: Permitir la reproducción correcta de videos de Behance, YouTube o Vimeo dentro del modal del portfolio, solucionando errores de conexión ("refused to connect").

**Detalles Técnicos**:
- Se identificó que las URLs de proyectos completos de Behance (`https://www.behance.net/gallery/...`) no pueden ser incrustadas en un `iframe` debido a políticas de seguridad (`X-Frame-Options`).
- Se corrigió el formato de las URLs en la configuración para usar versiones "embed" o enlaces directos de reproductores de video.

**Configuración**:
El usuario puede gestionar los videos desde `src/data/config.ts`.
- **Campo `embedUrl`**: 
    - **Para Behance**: Usar `https://www.behance.net/embed/project/ID_PROYECTO`.
    - **Para YouTube**: Usar `https://www.youtube.com/embed/ID_VIDEO`.
    - **Para Vimeo**: Usar `https://player.vimeo.com/video/ID_VIDEO`.
- **Campo `imageUrl`**: Debe ser una URL directa a una imagen (`.jpg`, `.png`), no a una página web.

**Archivos Afectados**:
- `src/data/config.ts`: Actualización de ejemplos y corrección de sintaxis.
- `src/components/Portfolio.tsx`: Lógica de renderizado del modal de video (sin cambios estructurales, pero validado).

### Optimización SEO (14/02/2026) -> Por Skill Fla

**Objetivo**: Mejorar la visibilidad en buscadores y la apariencia al compartir en redes sociales.

**Cambios Realizados**:
- **Meta Etiquetas**: Se añadieron `description`, `keywords` y `author` en `index.html`.
- **Open Graph**: Se configuraron títulos e imágenes para WhatsApp, Facebook y LinkedIn.
- **Archivos de Indexación**: Se crearon `public/robots.txt` y `public/sitemap.xml` para guiar a Google.

**Nota**: El favicon por defecto (`vite.svg`) se mantuvo, pero se configuró explícitamente. Se recomienda reemplazarlo por el logo de NexoFilm en formato `.svg` o `.ico` en el futuro.

### Mejoras SEO Fase 2: Accesibilidad y Semántica (14/02/2026) -> Por Skill Fla

**Objetivo**: Mejorar la interpretación de imágenes por parte de Google y la accesibilidad para usuarios que usan teclado.

**Cambios Realizados**:
- **Clientes (`Clients.tsx`)**: Se implementó lógica para generar automáticamente el texto `alt` de los logos basándose en el nombre del archivo (ej: `nike.png` -> `alt="Logo de Nike"`).
- **Portfolio (`Portfolio.tsx`)**: Se añadieron atributos ARIA (`role="button"`, `aria-label`) y soporte de teclado (`tabIndex`, `onKeyDown`) a las tarjetas de proyecto para hacerlas accesibles.
- **Workflow**: Se creó `.agent/workflows/auditoria_seo.md` para estandarizar futuras revisiones.

### Diseño Responsivo (14/02/2026)

**Objetivo**: Asegurar una visualización perfecta en dispositivos móviles.

**Cambios Realizados**:
- **Navegación Móvil**: Se agregó un botón de "hamburguesa" funcional en `Navbar.tsx` que despliega un menú en pantalla completa al tocarlo.
- **Tipografía Adaptable**: Se ajustaron los tamaños de títulos gigantes en `Hero.tsx` para que no corten la pantalla en celulares (`text-4xl` en móvil vs `text-10rem` en PC).
- **Espaciados**: Se optimizaron los márgenes (`padding`) de las secciones Historia y Portfolio para aprovechar mejor el espacio en pantallas pequeñas (`py-20` en lugar de `py-32`).
- **Fix Menú Móvil**: Se corrigió un error visual donde las opciones del menú se superponían con los iconos de redes sociales en pantallas de baja altura, utilizando un diseño Flexbox más robusto.

### Actualización de Identidad (14/02/2026) -> Por Skill Jesi

**Objetivo**: Alinear la web estrictamente con el Manual de Marca.

**Cambios Realizados**:
- **Tipografía**: Se reemplazó la fuente "Outfit" por **"Noto Sans JP"** (Google Fonts), configurando todos los pesos desde Thin (100) hasta Black (900) para su uso en títulos y textos.
- **Configuración Tailwind**: Se actualizó el tema base para que `font-sans` aplique automáticamente la nueva tipografía en todo el sitio.
- **Favicon**: Se reemplazó el icono genérico de Vite por el logo oficial `Logo NX Favicom.png` (configurado como `favicon.png` en la carpeta pública).

### Ampliación de Cartera de Clientes (14/02/2026) -> Por Skill Documentador

**Objetivo**: Mostrar una cartera de clientes más robusta en la sección de "Clientes".

**Cambios Realizados**:
- **Nuevos Clientes**: Se agregaron 10 marcas reconocidas (Coca-Cola, Pepsi, Adidas, Samsung, Apple, Google, Amazon, Microsoft, Toyota, McDonald's) a `data/config.ts`.
- **Configuración**: Los logos se cargan desde Wikimedia Commons para asegurar alta calidad y transparencia. Para editar o eliminar, modificar el array `clients` en `src/data/config.ts`.

### Restauración Visual de Clientes (14/02/2026) -> Por Skill Documentador

**Objetivo**: Recuperar la sección de clientes con animación dinámica y efectos visuales.

**Cambios Realizados**:
- **Carrusel Infinito (Marquee)**: Se implementó un desplazamiento continuo automático para mostrar todas las marcas.
- **Efectos Hover**: 
    - Al pasar el mouse, el carrusel se detiene.
    - El logo seleccionado recupera su color original (grayscale 0), aumenta su brillo y escala ligeramente (`scale-110`).
    - Se añade un resplandor sutil (glow) detrás del logo.
- **Integración**: El componente ahora lee directamente de `src/data/config.ts`, solucionando el error de "carpeta vacía".

### Integración Chatbot WhatsApp Meta API (21/02/2026) -> Por Skill Documentador

**Objetivo**: Habilitar un bot conversacional inteligente para pre-calificar clientes usando la API oficial de WhatsApp (Meta) y Groq (IA).

**Configuración**: 
Las credenciales necesarias se han configurado como Variables de Entorno en el archivo `.env.local` y deberán replicarse en Vercel al publicar:
- `WHATSAPP_TOKEN`: Token de acceso de Meta.
- `WHATSAPP_VERIFY_TOKEN`: Palabra clave para el Webhook (`NexoFilmBot2024`).
- `GROQ_API_KEY`: Clave para la inteligencia artificial.

**Archivos Afectados**:
- `api/whatsapp.js` (Lógica del Webhook y Bot).
- `.env.local` (Tokens de seguridad locales).

**Instrucciones de Mantenimiento**:
Para modificar el comportamiento del bot (ej. Prompt) o el número administrador que recibe los leads finales, editar el archivo `api/whatsapp.js`. Para actualizar los tokens de conexión, modificar `.env.local` en tu PC o las Variables de Entorno en Vercel. Finalmente, vincular el Webhook en `developers.facebook.com` apuntando a la URL de producción (`https://[TU-DOMINIO]/api/whatsapp`).

### Indexación en Google Search Console (25/02/2026) -> Por Skill Documentador

**Objetivo**: Asegurar que Google descubra y muestre la web completa en sus resultados de búsqueda de forma rápida.

**Pasos para el Administrador (Única Vez)**:
1. Ir a **[Google Search Console](https://search.google.com/search-console)** e iniciar sesión con la cuenta de Google de NexoFilm.
2. Hacer clic en **"Añadir propiedad"** (Add property).
3. Elegir la opción **"Prefijo de la URL"** (URL prefix) e ingresar la URL exacta de la web en producción: `https://nexofilm.com` (o el dominio final). Click en *Continuar*.
4. **Verificar propiedad**: Como la web ya tiene Google Analytics (gtag) configurado, elegir el método de verificación "Google Analytics" y hacer clic en verificar (suele ser instantáneo si es la misma cuenta de Google).
5. En el menú lateral izquierdo, ir a la sección **"Sitemaps"**.
6. En "Añadir un sitemap nuevo", escribir `sitemap.xml` y hacer clic en **"Enviar"** (Submit).

**Archivos Afectados / Relacionados**:
- `public/sitemap.xml`: Contiene el mapa de la web para Google.
- `public/robots.txt`: Da permiso a Google para rastrear.
- `index.html`: Contiene la etiqueta de verificación indirecta a través de Google Analytics.

### Actualización de Favicon (14/03/2026) -> Por Skill Documentador

**Objetivo**: Reemplazar el favicon anterior por el nuevo diseño oficial de la marca (logo blanco).

**Configuración**:
El nuevo favicon se ha establecido reemplazando el archivo `public/favicon.png` original. El archivo fuente utilizado fue `public/Logos blanco PNG-05.png`.
- **Ubicación**: El archivo activo que lee el navegador es `public/favicon.png`.
- **Referencias**: Está enlazado en `index.html` mediante la etiqueta `<link rel="icon" type="image/png" href="/favicon.png" />`.

**Archivos Afectados**:
- `public/favicon.png` (reemplazado).
- `LEEME.md` (registro de cambios).

**Instrucciones de Mantenimiento**:
Para volver a cambiar el favicon en el futuro, simplemente reemplaza el archivo `public/favicon.png` por la nueva imagen (recomendado en formato PNG o ICO cuadrado, tamaño ideal 512x512px o 192x192px). No es necesario modificar `index.html` a menos que se cambie el nombre o extensión del archivo.

### Actualización de Logo Principal (14/03/2026) -> Por Skill Documentador

**Objetivo**: Reemplazar el logo anterior de NexoFilm por su versión final en alta calidad ("Logos blanco PNG-03.png").

**Configuración**:
Se optó por sobreescribir los archivos físicos del logo original para evitar cambios innecesarios y redundantes de rutas dentro del código de los componentes.
- **Archivos fuente**: El nuevo logo blanco de alta resolución se copió en dos ubicaciones donde se alojaban las referencias anteriores.

**Archivos Afectados**:
- `public/img/logo.png` (reemplazado). Usado de forma estática en la sección `Hero.tsx`.
- `components/logo.png` (reemplazado). Importado dinámicamente en el componente `Logo.tsx` principal.
- `LEEME.md` (registro de cambios).

**Instrucciones de Mantenimiento**:
Si necesitas actualizar el logo principal nuevamente, lo más sencillo es reemplazar directamente los archivos `public/img/logo.png` y `components/logo.png` con el nuevo diseño asegurándote de usar el mismo nombre exacto `logo.png` para mantener intactas todas sus referencias.

### Módulo CRM Comercial y Portal de Autogestión de Clientes (06/06/2026) -> Por Skill Documentador

**Objetivo**: Centralizar la gestión comercial de proyectos (creación, edición rápida, análisis inteligente de especificaciones) y habilitar un Portal de Autogestión seguro para los clientes donde puedan cargar briefings, revisar y aprobar cotizaciones base u opcionales, cargar datos de facturación y descargar el material final de manera 100% responsiva y optimizada para móviles.

**Características y Lógica de Negocio**:
1. **Flujo de Cotización y Seguimiento**:
   - **Creación**: El productor crea el proyecto en `/admin/crm` con datos básicos y envía un link seguro único (`/portal?token=[access_token]`).
   - **Autogestión de Especificaciones**: El cliente accede al portal (sin requerir contraseñas complejas, solo usando su token único o pidiendo un enlace mágico por email) para completar requerimientos y subir pliegos técnicos (briefings).
   - **Análisis Opcional**: El productor cuenta con un botón en el CRM comercial para ejecutar un análisis automático con la IA de Groq sobre el archivo subido, extrayendo locación, horas de cobertura, cantidad de invitados y sugerencias de ítems para el presupuesto de forma interna.
   - **Cotización y Notificación**: El productor confecciona el presupuesto distinguiendo entre ítems principales y sugerencias opcionales de extras. Al pulsar "Enviar", el sistema notifica al cliente por Email (Resend) y WhatsApp (Meta API).
   - **Aprobación o Feedback**: El cliente aprueba o solicita ajustes de forma interactiva en su portal.
   - **Facturación y Pago**: Tras la aprobación, el productor carga el CBU y factura PDF, y el cliente realiza la transferencia bancaria.
   - **Producción y Entrega**: El proyecto pasa a estado de rodaje/edición y finalmente entrega de material, donde el cliente descarga sus entregables y deja una reseña final y puntuación NPS.

2. **Ocultamiento de Inteligencia Artificial (Confidencialidad)**:
   - Todo rastro visual de análisis robótico o "IA" se mantiene 100% oculto de cara al cliente. El cliente simplemente sube su archivo briefing. El botón interactivo `"🪄 Analizar pliego"` es visible únicamente para el productor dentro del CRM comercial de administración.

3. **Mejoras de Responsividad (Mobile-First)**:
   - **CRM de Administración**: Las filas de armado de presupuestos se apilan verticalmente en pantallas móviles y se ensanchan a horizontal en desktop. Los controles de edición rápida (CBU, Teléfono, Moneda, etc.) están ordenados en una grilla responsiva compacta. Las acciones principales del proyecto ahora se agrupan en una cuadrícula (`grid-cols-2` en móvil) con botones centrados y legibles.
   - **Portal de Autogestión**: La barra superior de estados se compacta en celulares usando etiquetas cortas virtuales (`Specs`, `Propuesta`, `Pago`, `Producción`, `Entrega`) para prevenir solapamientos. Las tablas de presupuestos (base y opcionales) cuentan con desplazamiento horizontal dinámico (`overflow-x-auto`) para no salirse del ancho de pantalla.

**Configuración (Variables de Entorno)**:
El backend comercial (`api/comercial/admin.js` y `api/comercial/client.js`) utiliza las siguientes variables que deben estar definidas en tu entorno local (`.env.local`) y en el panel de Vercel:
- `VITE_SUPABASE_URL` / `SUPABASE_URL`: Dirección de la API de Supabase.
- `VITE_SUPABASE_KEY` / `SUPABASE_SERVICE_ROLE_KEY`: Clave de acceso con permisos administrativos para guardar datos del CRM y acceder al almacenamiento seguro.
- `RESEND_API_KEY`: Clave de integración de correo electrónico para el envío automático de notificaciones de presupuestos.
- `GROQ_API_KEY`: Clave API de Groq utilizada para procesar briefings de proyectos técnicos mediante IA de forma interna en el CRM.
- `WHATSAPP_TOKEN` y `WHATSAPP_PHONE_ID`: Credenciales oficiales de Meta para el envío de notificaciones automáticas vía WhatsApp al cliente.
- **Parámetro Hardcoded de Administración**: El número de destino para alertas comerciales dirigidas al productor está fijado de manera definitiva a tu WhatsApp Business personal: `541151191964` (Martín).
- **Almacenamiento de Briefings**: Los archivos se suben al bucket de Supabase Storage llamado `invoices` bajo la carpeta `briefings/`.

**Archivos Afectados**:
- `api/comercial/admin.js` (Serverless API para acciones administrativas).
- `api/comercial/client.js` (Serverless API para acciones del cliente y renderizado dinámico de títulos/meta tags).
- `src/admin/CRMProjects.tsx` (Vistas e interfaces de administración comercial, creación y presupuesto).
- `src/components/ClientPortal.tsx` (Componente visual del portal de autogestión para clientes).
- `vercel.json` (Reglas de ruteo para el portal `/portal` e incrementos de timeouts de funciones).
