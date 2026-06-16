# 🎬 NexoFilm Web — Documento Maestro de Conocimiento
> **Creado:** Junio 2026 | **Propósito:** Referencia rápida de todo lo implementado, aprendido y configurado en +7 meses de desarrollo.

---

## 📌 ÍNDICE RÁPIDO

1. [Stack Tecnológico](#1-stack-tecnológico)
2. [Arquitectura del Proyecto](#2-arquitectura-del-proyecto)
3. [Identidad Visual y Marca](#3-identidad-visual-y-marca)
4. [Frontend — Componentes](#4-frontend--componentes)
5. [Backend — APIs Serverless](#5-backend--apis-serverless)
6. [CRM Comercial y Portal de Clientes](#6-crm-comercial-y-portal-de-clientes)
7. [Base de Datos (Supabase)](#7-base-de-datos-supabase)
8. [Integraciones Externas](#8-integraciones-externas)
9. [SEO y Rendimiento](#9-seo-y-rendimiento)
10. [Deploy y CI/CD](#10-deploy-y-cicd)
11. [Variables de Entorno — Referencia Completa](#11-variables-de-entorno--referencia-completa)
12. [Archivos Clave — Mapa del Proyecto](#12-archivos-clave--mapa-del-proyecto)
13. [Cómo Editar Contenido](#13-cómo-editar-contenido)
14. [Guía de Imágenes y Videos](#14-guía-de-imágenes-y-videos)
15. [Agentes IA del Proyecto](#15-agentes-ia-del-proyecto)
16. [Historial de Mejoras (Timeline)](#16-historial-de-mejoras-timeline)
17. [Problemas Conocidos y Soluciones](#17-problemas-conocidos-y-soluciones)

---

## 1. Stack Tecnológico

| Capa | Tecnología | Versión |
|---|---|---|
| **Frontend Framework** | React | ^19.2.4 |
| **Build Tool** | Vite | ^6.2.0 |
| **Lenguaje** | TypeScript | ~5.8.2 |
| **Estilos** | TailwindCSS | ^4.1.18 (vía `@tailwindcss/vite`) |
| **Tipografía** | Noto Sans JP (Google Fonts) | Pesos 100–900 |
| **3D/WebGL** | Three.js + React Three Fiber | ^0.183.1 / ^9.5.0 |
| **i18n** | i18next + react-i18next | ^25 / ^16 |
| **Backend/API** | Vercel Serverless Functions (Node.js) | — |
| **Base de Datos** | Supabase (PostgreSQL) | ^2.97.0 |
| **Email** | Resend | ^6.9.4 |
| **IA** | Groq SDK (`llama-3.3-70b-versatile`) | ^0.37.0 |
| **WhatsApp** | Meta WhatsApp Business API | v21.0 |
| **IA Google** | `@google/genai` | ^1.41.0 |
| **Hosting** | Vercel | — |
| **Repositorio** | GitHub | — |

---

## 2. Arquitectura del Proyecto

```
nexofilm---productora-audiovisual V3/
│
├── 📄 index.html              ← Entry point HTML con SEO, OG tags, gtag
├── 📄 index.tsx               ← Entry point React
├── 📄 App.tsx                 ← Router principal + layout general
├── 📄 index.css               ← Estilos globales + paleta de colores
├── 📄 vercel.json             ← Rutas, timeouts, cron jobs
├── 📄 vite.config.ts          ← Configuración de build
│
├── 📁 api/                    ← Serverless Functions (Backend en Vercel)
│   ├── whatsapp.js            ← Bot WhatsApp + Groq AI (51 KB)
│   ├── admin.js               ← Panel admin básico
│   ├── cron.js                ← Tarea diaria automática (12:00 UTC)
│   └── comercial/
│       ├── admin.js           ← CRM backend — acciones del productor (53 KB)
│       └── client.js          ← CRM backend — portal del cliente + SSR meta tags (45 KB)
│
├── 📁 components/             ← Componentes React globales (raíz)
│   ├── Hero.tsx               ← Hero animado con slides
│   ├── Navbar.tsx             ← Navegación + menú hamburguesa móvil
│   ├── Portfolio.tsx          ← Grid de proyectos con modal de video
│   ├── Clients.tsx            ← Carrusel infinito (marquee) de logos
│   ├── Testimonials.tsx       ← Sección de testimonios
│   ├── Contact.tsx            ← Formulario de contacto
│   ├── Team.tsx               ← Sección del equipo
│   ├── ValueProp.tsx          ← Propuesta de valor
│   ├── Process.tsx            ← Proceso de trabajo
│   ├── AiStudio.tsx           ← Sección AI Studio
│   ├── FloatingWhatsApp.tsx   ← Botón flotante de WhatsApp
│   ├── LanguageSwitcher.tsx   ← Selector de idioma ES/EN
│   ├── MediaBackground.tsx    ← Componente de fondo multimedia
│   ├── ProjectCard.tsx        ← Tarjeta individual de proyecto (13 KB)
│   └── Logo.tsx               ← Componente del logo
│
├── 📁 src/
│   ├── admin/
│   │   ├── CRMProjects.tsx    ← Panel CRM del productor (166 KB — el más grande)
│   │   ├── Dashboard.tsx      ← Dashboard de administración
│   │   └── AdminChat.tsx      ← Chat interno de administración
│   ├── components/
│   │   ├── ClientPortal.tsx   ← Portal de autogestión del cliente (166 KB)
│   │   ├── PortalLogin.tsx    ← Login por magic link del portal
│   │   └── WebGLHoverImage.tsx← Efecto WebGL en hover de imágenes
│   ├── i18n/                  ← Traducciones ES/EN
│   └── lib/                   ← Utilidades compartidas
│
├── 📁 data/
│   └── config.ts              ← ⚡ ARCHIVO CENTRAL DE CONTENIDO
│
├── 📁 public/
│   ├── img/
│   │   ├── hero/              ← Imágenes de portada
│   │   ├── portfolio/         ← Thumbnails de proyectos
│   │   ├── clientes/          ← Logos de clientes
│   │   ├── testimonios/       ← Fotos de testimonios
│   │   └── historia/          ← Foto de la sección Nosotros
│   ├── video/
│   │   ├── hero/              ← Videos de fondo de portada
│   │   ├── portfolio/         ← Videos de proyectos
│   │   └── historia/          ← Video institucional
│   ├── favicon.png            ← Logo NexoFilm blanco (512x512 ideal)
│   ├── robots.txt             ← Permiso de indexación a Google
│   └── sitemap.xml            ← Mapa del sitio para Google
│
└── 📁 docs/                   ← Documentación técnica de referencia
    ├── GUIA-DEPLOY.md
    ├── GUIA-CHATBOT.md
    ├── GUIA-APROBACION-META.md
    ├── GUIA-IMAGENES.md
    ├── INSTRUCCIONES_CONFIGURACION_CRM.md
    ├── COMO-SUBIR-FOTOS.md
    ├── schema_crm.sql          ← SQL para recrear la BD en Supabase
    └── contenido_para_notebooklm.md
```

> [!IMPORTANT]
> **El archivo más importante para editar contenido es `data/config.ts`**. Desde ahí se controlan textos, proyectos, clientes, testimonios, contacto y más, sin tocar código React.

---

## 3. Identidad Visual y Marca

### Paleta de Colores (Manual de Marca)
| Token | Color Hex | Uso |
|---|---|---|
| `nexo-lime` | `#bfe023` | **Acento principal** — CTAs, highlights, íconos activos |
| `black` | `#000000` | Fondo principal de la web |
| `zinc-*` | Escala de grises | Textos secundarios, bordes sutiles |
| Errores de sistema | Rojo estándar | **Solo** para mensajes de error técnico |

> [!WARNING]
> **Regla de marca crítica**: NO usar azules, rojos, ni verdes fuera de la paleta. El verde lima `#bfe023` es el único acento permitido. Cualquier desviación rompe la identidad de marca.

### Tipografía
- **Familia exclusiva**: **Noto Sans JP** (Google Fonts)
- **Pesos utilizados**: Thin (100), Light (300), Regular (400), Medium (500), Bold (700), Black (900)
- **Configuración**: Declarada en `index.html` con `<link>` de Google Fonts + configurada como `font-sans` en Tailwind
- **Antes**: Se usaba "Outfit" → **migrada a Noto Sans JP** en Feb 2026

### Logos
| Archivo | Uso | Ubicación |
|---|---|---|
| `logo.png` | Navbar y componentes React | `components/logo.png` |
| `logo.png` | Hero estático | `public/img/logo.png` |
| `favicon.png` | Pestaña del navegador | `public/favicon.png` |
- **Fuente original**: `public/Logos blanco PNG-03.png` (logo) y `public/Logo NX Favicom.png` (favicon)
- **Para actualizar**: Reemplazar los archivos directamente con el mismo nombre

---

## 4. Frontend — Componentes

### `data/config.ts` — Archivo Central de Contenido
Todo el contenido editable está aquí. Secciones principales:
- `whatsappNumber` — Número en formato internacional (ej: `5491151191964`)
- `email` — Email de contacto
- `socialLinks` — Redes sociales (Instagram, LinkedIn, Behance, YouTube)
- `heroSlides[]` — Slides del hero con `title`, `subtitle`, `image`, `gallery[]`, `video?`
- `history{}` — Textos de la sección Nosotros
- `projects[]` — Portfolio: `id`, `title`, `category`, `imageUrl`, `description`, `behanceUrl`, `embedUrl`
- `clients[]` — Logos: `id`, `name`, `logo` (ruta en `public/img/clientes/`)
- `testimonials[]` — Testimonios: nombre, cargo, empresa, texto, avatar
- `footer{}` — Textos del pie de página

### Componentes Destacados

#### `Hero.tsx`
- Slides animados con transición automática
- Soporte de imagen estática + galería de miniaturas
- Tipografía adaptable: `text-4xl` en móvil → `10rem` en desktop
- **Pendiente**: soporte nativo de `video` de fondo en los slides

#### `Navbar.tsx`
- Menú hamburguesa funcional en mobile (pantalla completa al activar)
- Fix aplicado: evita solapamiento de opciones con íconos de redes en pantallas de baja altura
- Selector de idioma integrado (`LanguageSwitcher.tsx`)

#### `Portfolio.tsx` + `ProjectCard.tsx`
- Grid de proyectos con modal de video
- Soporte de iframe para: **YouTube** (`youtube.com/embed/`), **Vimeo** (`player.vimeo.com/video/`), **Behance** (`behance.net/embed/project/`)
- Atributos ARIA completos (`role="button"`, `aria-label`, `tabIndex`, `onKeyDown`) para accesibilidad
- ⚠️ **Importante**: URLs normales de Behance (`behance.net/gallery/...`) NO funcionan en iframe por `X-Frame-Options`. Usar siempre la versión `/embed/`

#### `Clients.tsx`
- Carrusel infinito (marquee) con CSS animation
- Al hover: carrusel se pausa, logo recupera color, escala 110%, efecto glow
- Lee logos directamente de `data/config.ts`

#### `FloatingWhatsApp.tsx`
- Botón flotante siempre visible
- Número configurado en `data/config.ts`

#### `LanguageSwitcher.tsx`
- Switcher ES ↔ EN
- Usa i18next con detección automática de idioma del navegador
- Traducciones en `src/i18n/`

#### `AiStudio.tsx`
- Sección especial de NexoFilm AI Studio
- Integra `@google/genai` para demostraciones interactivas

---

## 5. Backend — APIs Serverless

Todas las APIs están en `/api/` como **Vercel Serverless Functions** (Node.js ESM). Timeout configurado a **30 segundos** en `vercel.json`.

### `api/whatsapp.js` (51 KB)
**Bot de WhatsApp conversacional con IA**
- **Webhook GET**: Verificación de Meta (`hub.mode`, `hub.verify_token`, `hub.challenge`)
- **Webhook POST**: Recibe mensajes entrantes de usuarios de WhatsApp
- **Flujo de conversación con Groq AI** (`llama-3.3-70b-versatile`):
  1. Saludo y solicitud de nombre
  2. Menú interactivo con botones (servicios disponibles)
  3. Captura de necesidades y calificación de lead
  4. Recopilación de datos de contacto
  5. Notificación al productor (Martín, número `541151191964`) con resumen del lead
- **Sistema de sesiones en memoria** (state machine por número de teléfono)
- **Anti-loop**: protección contra responder mensajes propios del bot

### `api/comercial/admin.js` (53 KB)
**Backend CRM — Acciones del Productor**
Endpoints (todos requieren autenticación con Supabase service role):
- `POST /api/comercial/admin?action=create_project` — Crea proyecto nuevo
- `POST /api/comercial/admin?action=update_project` — Edita datos del proyecto
- `POST /api/comercial/admin?action=create_budget` — Crea/actualiza presupuesto
- `POST /api/comercial/admin?action=send_budget` — Envía presupuesto al cliente (Email + WhatsApp)
- `POST /api/comercial/admin?action=analyze_brief` — Analiza PDF con Groq AI (uso interno, invisible para el cliente)
- `POST /api/comercial/admin?action=upload_invoice` — Sube factura PDF a Supabase Storage
- `GET /api/comercial/admin?action=list_projects` — Lista todos los proyectos
- `GET /api/comercial/admin?action=get_project` — Detalle de un proyecto con presupuesto

### `api/comercial/client.js` (45 KB)
**Backend CRM — Portal del Cliente**
- `GET /api/comercial/client?action=render` — SSR del portal (inyecta meta tags dinámicos por proyecto)
- `GET /api/comercial/client?action=get_data` — Datos del proyecto para el cliente (usa `x-client-token` header)
- `POST /api/comercial/client?action=update_specs` — Cliente actualiza sus especificaciones
- `POST /api/comercial/client?action=upload_brief` — Cliente sube archivo briefing
- `POST /api/comercial/client?action=approve_budget` — Cliente aprueba presupuesto
- `POST /api/comercial/client?action=request_changes` — Cliente pide ajustes
- `POST /api/comercial/client?action=client_action` — Acción genérica del cliente

### `api/cron.js`
- Se ejecuta **automáticamente todos los días a las 12:00 UTC** (configurado en `vercel.json`)
- Tareas de mantenimiento automático

### `api/admin.js`
- Panel de administración básico (acceso protegido)

---

## 6. CRM Comercial y Portal de Clientes

### Flujo Completo de Proyecto

```
1. DRAFT       → Productor crea proyecto en /admin/crm
2. SENT        → Productor envía link único al cliente (/portal?token=UUID)
3. REVIEW      → Cliente completa specs y sube briefing
4. APPROVED    → Cliente aprueba presupuesto
5. REJECTED    → Cliente pide cambios (vuelve a REVIEW)
6. PRODUCTION  → Rodaje y edición en curso
7. DELIVERED   → Material entregado, cliente lo descarga y deja NPS
```

### Panel CRM (`/admin/crm` → `src/admin/CRMProjects.tsx`)
- **Crear proyectos** con datos básicos del cliente
- **Edición rápida inline**: CBU, teléfono, moneda, tipo de factura
- **Armado de presupuesto**: ítems base + sugerencias opcionales
- **Botón `🪄 Analizar pliego`**: envía el PDF del cliente a Groq AI y extrae:
  - Locación del evento
  - Horas de cobertura estimadas
  - Cantidad de invitados
  - Sugerencias de ítems para el presupuesto
  - *(Solo visible para el productor, 100% oculto al cliente)*
- **Envío de presupuesto**: notifica por Email (Resend) y WhatsApp (Meta API)
- **Carga de factura PDF** → Supabase Storage bucket `invoices`
- **Link a Drive** para entrega de material final
- **Diseño responsive**: grid adaptable (`grid-cols-2` en mobile, full en desktop)

### Portal de Clientes (`/portal?token=UUID` → `src/components/ClientPortal.tsx`)
- **Acceso sin contraseña**: solo con token UUID único en URL
- **Barra de progreso** de estados (compacta en mobile: etiquetas cortas `Specs`, `Propuesta`, `Pago`, `Producción`, `Entrega`)
- **Secciones del portal**:
  - Carga de briefing (PDF/DOC) → Supabase Storage `briefings/`
  - Formulario de especificaciones (fecha, lugar, tipo de cobertura, invitados)
  - Visualización de presupuesto con tabla base + tabla de opcionales
  - Botones de Aprobar / Solicitar Cambios con campo de feedback
  - Datos bancarios (CBU) para transferencia
  - Descarga de factura PDF
  - Descarga de material final (desde Google Drive)
  - NPS y reseña final del cliente
- **Tablas con `overflow-x-auto`** para correcta visualización en mobile
- **`PortalLogin.tsx`**: pantalla de login por magic link de email

### Google Drive Integration
- **Cuenta de Servicio** (Service Account) de Google Cloud
- **Variables de entorno**: `GOOGLE_CLIENT_EMAIL` + `GOOGLE_PRIVATE_KEY`
- **Flujo**: Productor pone ID de carpeta Drive en el CRM → el portal muestra los archivos al cliente
- **Permisos**: La carpeta de Drive debe estar compartida con el correo de la service account (rol Lector)

---

## 7. Base de Datos (Supabase)

### Tablas Principales

#### `projects`
| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID (PK) | Auto-generado |
| `client_name` | varchar(255) | Nombre del cliente |
| `client_email` | varchar(255) | Email del cliente |
| `title` | varchar(255) | Título del proyecto |
| `status` | varchar(50) | Estado del flujo (ver §6) |
| `access_token` | UUID (UNIQUE) | Token del portal del cliente |
| `event_date` | date | Fecha del evento |
| `event_time` | time | Hora del evento |
| `location` | text | Locación |
| `coverage_types` | text[] | Tipos: foto, video, streaming |
| `coverage_hours` | integer | Horas de cobertura |
| `guests_count` | integer | Cantidad de invitados |
| `currency` | varchar(10) | Moneda (default: USD) |
| `crew_count` | integer | Tamaño del equipo |
| `drive_folder_id` | varchar(255) | ID carpeta Google Drive |
| `bank_details` | text | CBU y datos bancarios |
| `invoice_url` | text | URL pública de la factura PDF |
| `invoice_type` | varchar(50) | total / deposit_50 / custom |
| `invoice_amount` | numeric(12,2) | Monto de la factura |
| `created_at` / `updated_at` | timestamptz | Automático |

#### `budgets`
| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID (PK) | Auto-generado |
| `project_id` | UUID (FK) | Referencia a `projects` |
| `version` | integer | Número de versión del presupuesto |
| `items` | jsonb | Array de ítems `[{description, quantity, unit_price}]` |
| `total_price` | numeric(12,2) | Total calculado |
| `payment_terms` | text | Condiciones de pago |
| `client_feedback` | text | Feedback del cliente al pedir cambios |
| `is_active` | boolean | Versión activa del presupuesto |

### Storage Buckets
| Bucket | Tipo | Contenido |
|---|---|---|
| `invoices` | **Público** | Facturas PDF + briefings de clientes |
| Subcarpeta: `briefings/` | — | Archivos subidos por clientes |

### Seguridad (Row Level Security)
- **Admins** (`authenticated`): Acceso total a proyectos y presupuestos
- **Clientes** (`anon`): Acceso solo a su proyecto usando `x-client-token` header
- **Trigger automático**: `handle_updated_at()` actualiza `updated_at` en cada modificación

> [!IMPORTANT]
> Para recrear la BD desde cero, correr el script `docs/schema_crm.sql` en el SQL Editor de Supabase.

---

## 8. Integraciones Externas

### WhatsApp Business API (Meta)
- **App**: `NexoFilm Bot` en [developers.facebook.com](https://developers.facebook.com)
- **Webhook URL**: `https://nexofilm.com/api/whatsapp` (o URL de Vercel)
- **Eventos suscritos**: `messages`
- **Flujo de aprobación**: Se requirió demostración en video en inglés para Meta (2 rechazos previos, guía en `docs/GUIA-APROBACION-META.md`)
- **Limitación del token**: El token temporal dura 24hs. Producción requiere **Usuario del Sistema** en Meta Business Manager para token permanente
- **Número hard-coded del productor**: `541151191964` (Martín) — recibe todos los leads generados por el bot

### Groq AI
- **URL**: [console.groq.com](https://console.groq.com/keys)
- **Modelo**: `llama-3.3-70b-versatile`
- **Usos**:
  1. Bot de WhatsApp: genera respuestas conversacionales
  2. Análisis de briefings PDF en el CRM (extracción de datos)
- **Clave**: empieza con `gsk_...`

### Supabase
- **URL**: Panel en [supabase.com](https://supabase.com)
- **Claves**: `anon key` (frontend) + `service_role key` (backend, nunca exponer en cliente)
- **Servicios usados**: Database (PostgreSQL), Storage

### Resend (Email)
- **Propósito**: Envío automático de notificaciones de presupuesto al cliente
- **Clave**: `RESEND_API_KEY`

### Google Drive API
- **Autenticación**: Service Account (JSON con `client_email` + `private_key`)
- **API habilitada**: Google Drive API en Google Cloud Console
- **Carpetas**: Compartidas manualmente con el correo de la service account

### Google Analytics
- **Configuración**: `gtag` en `index.html`
- **Propósito doble**: Analytics + verificación indirecta de Google Search Console

---

## 9. SEO y Rendimiento

### Implementaciones SEO (Feb 2026)
- **`index.html`**: Meta tags `description`, `keywords`, `author`
- **Open Graph**: Título, descripción e imagen para WhatsApp/Facebook/LinkedIn
- **`public/robots.txt`**: Permite indexación a todos los crawlers
- **`public/sitemap.xml`**: Mapa del sitio para Google
- **Google Search Console**: Sitemap enviado, verificado vía Google Analytics

### SEO Semántico y Accesibilidad
- **`Clients.tsx`**: Atributos `alt` generados automáticamente desde el nombre del archivo (`nike.png` → `alt="Logo de Nike"`)
- **`Portfolio.tsx`**: Cards con `role="button"`, `aria-label`, `tabIndex`, `onKeyDown` (navegación por teclado)
- **Estructura de headings**: Un solo `<h1>` por página
- **HTML semántico**: Uso correcto de `<article>`, `<section>`, `<nav>`, `<main>`

### Rendimiento
- **Lazy loading**: Implementado en imágenes
- **Code splitting**: Vite maneja automáticamente
- **SSG** (Static Site Generation): `vite-ssg` disponible como dependencia

### Guía de Assets Optimizados
| Tipo | Formato | Herramienta | Peso Máximo |
|---|---|---|---|
| Imágenes hero | WebP/JPG | [Squoosh](https://squoosh.app) | 300 KB |
| Thumbnails portfolio | WebP/JPG | [Squoosh](https://squoosh.app) | 150 KB |
| Logos clientes | SVG (ideal) / PNG | [Vectorizer.io](https://vectorizer.io) | 50 KB |
| Videos hero | MP4 H.264 | [HandBrake](https://handbrake.fr) | 5 MB |
| Videos portfolio | MP4 H.264 | [HandBrake](https://handbrake.fr) | 10 MB |

---

## 10. Deploy y CI/CD

### Flujo de Publicación Automática
```
Editar archivos en PC → git add . → git commit -m "mensaje" → git push
     ↓
GitHub detecta push → Webhook a Vercel → npm run build → Deploy automático
     ↓
nexofilm.com actualizado en 30 segundos a 2 minutos
```

### Scripts Útiles
| Script | Descripción |
|---|---|
| `npm run dev` | Servidor local en `localhost:5173` |
| `npm run build` | Build de producción en `dist/` |
| `npm run preview` | Previsualización del build |
| `npm run deploy` | Deploy manual a Vercel (`npx vercel --prod --force`) |
| `PROBAR.bat` | Script Windows para levantar entorno local |
| `PUBLICAR.bat` | Script Windows para publicar a producción |

### Configuración Vercel (`vercel.json`)
```json
{
  "functions": {
    "api/whatsapp.js": { "maxDuration": 30 },
    "api/comercial/client.js": { "includeFiles": "dist/index.html", "maxDuration": 30 },
    "api/comercial/admin.js": { "maxDuration": 30 }
  },
  "rewrites": [
    { "source": "/portal/login", "destination": "/index.html" },
    { "source": "/portal", "destination": "/api/comercial/client?action=render" },
    { "source": "/api/(.*)", "destination": "/api/$1" },
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ],
  "crons": [{ "path": "/api/cron", "schedule": "0 12 * * *" }]
}
```

> [!NOTE]
> El portal del cliente (`/portal`) es una **ruta especial**: en lugar de servir el SPA de React, llama a la función serverless `api/comercial/client.js?action=render` que inyecta meta tags dinámicos según el token del cliente (para mejor SEO y previsualización en WhatsApp).

---

## 11. Variables de Entorno — Referencia Completa

Configurar en `.env.local` (local) Y en Vercel Dashboard → Settings → Environment Variables (producción).

| Variable | Descripción | Dónde obtenerla |
|---|---|---|
| `VITE_SUPABASE_URL` | URL de la API de Supabase | Panel Supabase → Settings → API |
| `VITE_SUPABASE_KEY` | Clave `anon` (solo lectura frontend) | Panel Supabase → Settings → API |
| `SUPABASE_URL` | Igual que `VITE_SUPABASE_URL` (para serverless) | Mismo |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave con permisos totales (NUNCA exponer en frontend) | Panel Supabase → Settings → API |
| `GROQ_API_KEY` | Clave de Groq AI (`gsk_...`) | [console.groq.com/keys](https://console.groq.com/keys) |
| `WHATSAPP_TOKEN` | Token de acceso de Meta WhatsApp | Meta Developers → App → WhatsApp → API Setup |
| `WHATSAPP_VERIFY_TOKEN` | Token propio de verificación del webhook | Inventado: `NexoFilmBot2024` |
| `WHATSAPP_PHONE_ID` | ID del número de teléfono de Meta | Meta Developers → App → WhatsApp → API Setup |
| `RESEND_API_KEY` | Clave para envío de emails | [resend.com](https://resend.com) → API Keys |
| `GOOGLE_CLIENT_EMAIL` | Email de la Service Account de Google | Archivo JSON de GCloud (campo `client_email`) |
| `GOOGLE_PRIVATE_KEY` | Clave privada de la Service Account | Archivo JSON de GCloud (campo `private_key`) |

> [!CAUTION]
> `SUPABASE_SERVICE_ROLE_KEY` y `GOOGLE_PRIVATE_KEY` son credenciales de alto privilegio. **NUNCA** incluirlas en código frontend ni en variables prefijadas con `VITE_`. Solo en el servidor.

---

## 12. Archivos Clave — Mapa del Proyecto

| Archivo | Propósito | Cuándo editarlo |
|---|---|---|
| `data/config.ts` | Contenido central (textos, portfolio, clientes) | Para cualquier cambio de contenido |
| `index.html` | SEO, meta tags, favicon, Google Analytics | Para cambios de SEO o título de la web |
| `index.css` | Estilos globales y tokens de diseño | Para cambios de colores o tipografía global |
| `App.tsx` | Router principal y estructura de la app | Para agregar nuevas páginas o rutas |
| `vercel.json` | Configuración de hosting y rutas | Para agregar nuevas APIs o rutas especiales |
| `api/whatsapp.js` | Lógica del bot de WhatsApp | Para cambiar el comportamiento del bot o el prompt |
| `api/comercial/admin.js` | Backend del CRM | Para agregar funciones del productor |
| `api/comercial/client.js` | Backend del portal cliente | Para agregar funciones del cliente |
| `src/admin/CRMProjects.tsx` | UI del panel de administración | Para cambios visuales en el CRM |
| `src/components/ClientPortal.tsx` | UI del portal del cliente | Para cambios en la experiencia del cliente |
| `public/favicon.png` | Ícono de la pestaña del navegador | Para cambiar el favicon |
| `components/logo.png` | Logo en el navbar | Para actualizar el logo |
| `public/img/logo.png` | Logo en el Hero | Para actualizar el logo del hero |
| `docs/schema_crm.sql` | SQL para recrear la base de datos | Si hay que recrear la BD en Supabase |

---

## 13. Cómo Editar Contenido

### Cambios de Texto, Proyectos, Clientes
Editar `data/config.ts`. Estructura:
```typescript
export const CONFIG = {
  whatsappNumber: "5491151191964",    // Sin +, sin espacios
  email: "info@nexofilm.com",
  heroSlides: [{ id, title, subtitle, image, gallery[] }],
  projects: [{ id, title, category, imageUrl, description, behanceUrl, embedUrl }],
  clients: [{ id, name, logo }],
  testimonials: [{ name, position, company, text, avatar }],
  history: { title, subtitle, description },
  footer: { copyright }
}
```

### Videos en Portfolio
URLs válidas para `embedUrl`:
- **YouTube**: `https://www.youtube.com/embed/VIDEO_ID`
- **Vimeo**: `https://player.vimeo.com/video/VIDEO_ID`
- **Behance**: `https://www.behance.net/embed/project/PROYECTO_ID`
- ❌ **No funciona**: `https://www.behance.net/gallery/...` (bloqueado por X-Frame-Options)

### Agregar Imágenes y Videos
1. Copiar el archivo a la carpeta correcta en `public/`
2. Referenciar con ruta `/img/...` o `/video/...` en `config.ts`
3. Guardar → la web se actualiza sola con hot reload

---

## 14. Guía de Imágenes y Videos

### Carpetas en `public/`
```
public/
├── img/
│   ├── hero/          ← 1920×1080 px, max 300 KB
│   ├── portfolio/     ← 800×600 px, max 150 KB
│   ├── clientes/      ← SVG ideal, max 50 KB
│   ├── testimonios/   ← 150×150 px cuadrado, max 30 KB
│   └── historia/      ← 1200×800 px, max 200 KB
└── video/
    ├── hero/          ← 1920×1080, H.264, max 5 MB, 10-20 seg
    ├── portfolio/     ← 1280×720, H.264, max 10 MB
    └── historia/      ← 1280×720, H.264, max 8 MB
```

### Herramientas Recomendadas
| Tarea | Herramienta |
|---|---|
| Comprimir imágenes | [Squoosh](https://squoosh.app) |
| Comprimir videos | [HandBrake](https://handbrake.fr) (preset Fast 1080p30 / Fast 720p30) |
| Recortar videos | CapCut Desktop |
| Crear SVG de logos | [Vectorizer.io](https://vectorizer.io) |

### Tips de Video
- **Incluir poster JPG** del primer frame (se muestra mientras carga)
- **Sin audio** en videos de fondo (ahorra 20-30% de peso)
- **Loop de 10-20 segundos** ideal para el hero

---

## 15. Agentes IA del Proyecto

El proyecto cuenta con 3 skills especializadas para el agente Antigravity (Google DeepMind):

### 🔧 Tintin — Implementaciones Técnicas
`@[.agent/skills/Tintin]`
- Full-stack React/Node.js, debugging, migraciones, performance, deploy
- Metodología: Diagnóstico → Plan → Ejecución → Verificación → Documentación

### 🎨 Jesi — Sistema de Diseño y Marca
`@[.agent/skills/Jesi]`
- Guardiá de la identidad visual: colores, tipografía, logos, imágenes
- Audita que todo siga el manual de marca NexoFilm

### 🔍 Fla — SEO y Performance
`@[.agent/skills/Fla]`
- Meta tags, Open Graph, accesibilidad, robots.txt, sitemap
- Core Web Vitals y velocidad de carga

### 📝 Documentador
`@[.agent/skills/documentador]`
- Actualiza `LEEME.md` y `docs/` con cada cambio implementado

---

## 16. Historial de Mejoras (Timeline)

| Fecha | Mejora | Responsable |
|---|---|---|
| **Feb 2026** | Integración de videos en Portfolio (embed URLs) | Tintin |
| **Feb 2026** | Optimización SEO Fase 1: meta tags, OG, robots.txt, sitemap | Fla |
| **Feb 2026** | SEO Fase 2: accesibilidad, atributos ARIA, alt en imágenes | Fla |
| **Feb 2026** | Diseño responsive: menú hamburguesa, tipografía adaptable | Tintin |
| **Feb 2026** | Actualización de identidad: Noto Sans JP, favicon oficial | Jesi |
| **Feb 2026** | Ampliación cartera de clientes (10 marcas nuevas) | Documentador |
| **Feb 2026** | Carrusel infinito (marquee) de clientes con hover effects | Tintin |
| **Feb 2026** | 🤖 Integración Chatbot WhatsApp + Groq AI | Tintin |
| **Feb 2026** | Google Search Console: sitemap enviado e indexación habilitada | Fla |
| **Mar 2026** | Actualización favicon (logo blanco oficial) | Documentador |
| **Mar 2026** | Actualización logo principal (Logos blanco PNG-03.png) | Documentador |
| **Jun 2026** | 🚀 Módulo CRM Comercial completo + Portal de Autogestión | Tintin |
| **Jun 2026** | Responsive mobile-first en CRM y Portal de Clientes | Tintin |
| **Jun 2026** | Integración Google Drive para entrega de material | Tintin |
| **Jun 2026** | Análisis IA de briefings (Groq) con ocultamiento al cliente | Tintin |

---

## 17. Problemas Conocidos y Soluciones

### 🔴 Behance no carga en iframe
**Problema**: URLs tipo `behance.net/gallery/...` dan error "refused to connect"
**Solución**: Usar `behance.net/embed/project/ID_PROYECTO` (formato embed)

### 🔴 Token de WhatsApp vence en 24hs
**Problema**: El token temporal de Meta expira después de 24 horas
**Solución**: Crear un **Usuario del Sistema** en Meta Business Manager y generar un token permanente. Actualizar `WHATSAPP_TOKEN` en Vercel.

### 🔴 `git push` pide contraseña
**Solución**: Se abre automáticamente una ventana del navegador para autenticar con GitHub.

### 🔴 Deploy falla en Vercel
**Causa más común**: Error de sintaxis en `data/config.ts` (falta una coma, comillas sin cerrar)
**Solución**: Revisar el log de errores en Dashboard de Vercel → Deployments → Build Log

### 🔴 Videos no se ven en producción
**Checklist**:
1. ¿El archivo está en `public/video/portfolio/`?
2. ¿El nombre coincide exactamente (mayúsculas/minúsculas) con el de `config.ts`?
3. ¿Formato `.mp4`?
4. ¿Se hizo `git push`?

### 🔴 Portal del cliente no abre
**Causa posible**: La variable `VITE_SUPABASE_URL` o `SUPABASE_SERVICE_ROLE_KEY` no está configurada en Vercel
**Solución**: Verificar Variables de Entorno en Vercel → Settings → Environment Variables

### 🔴 Meta rechazó la aprobación del Bot
**Historia**: Meta rechazó 2 veces la app de WhatsApp. Se requirió grabar un video en inglés mostrando el flujo completo. Ver guía detallada en `docs/GUIA-APROBACION-META.md`.

### 🟡 Cron job no ejecuta
**Verificar**: En Vercel → Cron Jobs (sección en el dashboard). El schedule es `0 12 * * *` (12:00 UTC = 09:00 ARG).

---

## 📞 Contacto y Administración

- **Productor / Admin**: Martín
- **WhatsApp de leads**: `541151191964`
- **Email de referencia**: el configurado en `data/config.ts`
- **Vercel**: [vercel.com](https://vercel.com) (cuenta conectada a GitHub)
- **Supabase**: [supabase.com](https://supabase.com) → Proyecto NexoFilm
- **Meta Developers**: [developers.facebook.com](https://developers.facebook.com) → App: NexoFilm Bot
- **Google Cloud**: [console.cloud.google.com](https://console.cloud.google.com) → Proyecto NexoFilm (Drive API)
- **Groq**: [console.groq.com](https://console.groq.com) → API Key: NexoFilmBot

---

*Última actualización: Junio 2026 — Documento generado automáticamente por el agente Antigravity a partir del análisis completo del proyecto.*
