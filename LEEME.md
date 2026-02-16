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

