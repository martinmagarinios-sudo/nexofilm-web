# 🎬 Guía: Cómo Agregar tus Imágenes y Videos a NexoFilm

## Estructura de Carpetas

Estas carpetas ya existen dentro de `public/`. Solo **arrastrá tus archivos** adentro:

```
public/
├── img/
│   ├── hero/           ← Fondos de la portada (imágenes o poster de video)
│   ├── portfolio/      ← Imágenes/thumbnails de tus proyectos
│   ├── clientes/       ← Logos de tus clientes (SVG o PNG)
│   ├── testimonios/    ← Fotos de las personas que dan testimonios
│   └── historia/       ← Foto/poster de la sección "Somos NexoFilm"
├── video/
│   ├── hero/           ← Videos de fondo para la portada
│   ├── portfolio/      ← Videos de tus proyectos
│   └── historia/       ← Video de la sección historia
├── favicon.png
├── robots.txt
└── sitemap.xml
```

---

## Cómo Funciona

Todo dentro de `public/` se accede con `/` en la URL:

| Archivo en tu PC | URL para usar en código |
|---|---|
| `public/img/hero/rodaje.jpg` | `/img/hero/rodaje.jpg` |
| `public/video/hero/showreel.mp4` | `/video/hero/showreel.mp4` |
| `public/img/clientes/copa.svg` | `/img/clientes/copa.svg` |
| `public/video/portfolio/copa.mp4` | `/video/portfolio/copa.mp4` |

---

## 🎥 Usando Videos en Vez de Fotos

Podés usar **video en lugar de imagen** en estas secciones:

### Hero (Portada) — Video de Fondo
Poné el video en `public/video/hero/`. Editá `config.ts`:

```typescript
heroSlides: [
    {
        id: 1,
        title: "Producción Audiovisual",
        subtitle: "Contamos historias a través de imágenes...",
        // Imagen estática (se muestra mientras carga el video o como fallback):
        image: "/img/hero/rodaje-poster.jpg",
        // Video de fondo (NUEVO — agregá esta propiedad):
        video: "/video/hero/showreel-produccion.mp4",
        gallery: [
            "/img/hero/detras-camaras-1.jpg",
            "/img/hero/detras-camaras-2.jpg",
            "/img/hero/equipo-set.jpg"
        ]
    },
]
```

> ⚠️ **Importante**: Para que el campo `video` funcione en el Hero, hay que pedirme que modifique el componente `Hero.tsx` para soportar video de fondo. Decime cuando tengas los videos y lo implemento.

### Portfolio — Video de Proyecto
Poné los videos en `public/video/portfolio/`. Editá `config.ts`:

```typescript
projects: [
    {
        id: "1",
        title: "Copa Airlines",
        category: "25 años operando en Argentina",
        // Thumbnail (imagen estática del proyecto):
        imageUrl: "/img/portfolio/copa-airlines-thumb.jpg",
        // Video del proyecto (NUEVO):
        videoUrl: "/video/portfolio/copa-airlines.mp4",
        description: "25 años operando en Argentina",
        behanceUrl: "https://www.behance.net/gallery/233427891/..."
    },
]
```

> ⚠️ Igual que el Hero, necesitás pedirme que modifique `Portfolio.tsx` para mostrar videos. Lo hago cuando quieras.

### Historia — Video Institucional
Poné el video en `public/video/historia/`:

```typescript
// En App.tsx, reemplazá la imagen por un video:
// ANTES:
<img src="/img/historia/equipo.jpg" ... />

// DESPUÉS:
<video autoPlay muted loop playsInline poster="/img/historia/equipo-poster.jpg">
    <source src="/video/historia/institucional.mp4" type="video/mp4" />
</video>
```

---

## Paso a Paso con Imágenes (sin video)

### 1. 🎞️ Hero (Portada)
```typescript
// En config.ts:
image: "/img/hero/rodaje-principal.jpg",
gallery: [
    "/img/hero/detras-camaras-1.jpg",
    "/img/hero/detras-camaras-2.jpg",
]
```

### 2. 📁 Portfolio
```typescript
imageUrl: "/img/portfolio/copa-airlines-evento.jpg",
```

### 3. 🏢 Clientes (Logos)
```typescript
{ id: "c1", name: "Copa Airlines", logo: "/img/clientes/copa-airlines.svg" },
{ id: "c2", name: "Movistar", logo: "/img/clientes/movistar.png" },
```

### 4. 💬 Testimonios
```typescript
avatar: "/img/testimonios/martin-rodriguez.jpg",
```

### 5. 📸 Historia
En `App.tsx` línea ~53:
```typescript
src="/img/historia/equipo-nexofilm.jpg"
```

---

## Especificaciones Técnicas

### 📷 Imágenes

| Sección | Formato | Dimensiones | Peso máximo |
|---|---|---|---|
| Hero fondo | `.webp` o `.jpg` | 1920×1080 px | 300 KB |
| Hero galería | `.webp` o `.jpg` | 400×400 px | 80 KB |
| Portfolio thumb | `.webp` o `.jpg` | 800×600 px | 150 KB |
| Logos clientes | `.svg` (ideal) o `.png` | Libre (SVG es vectorial) | 50 KB |
| Testimonios | `.webp` o `.jpg` | 150×150 px (cuadrado) | 30 KB |
| Historia | `.webp` o `.jpg` | 1200×800 px | 200 KB |

### 🎥 Videos

| Sección | Formato | Codec | Dimensiones | Duración | Peso máximo | FPS |
|---|---|---|---|---|---|---|
| Hero fondo | `.mp4` | H.264 | 1920×1080 | 10-20 seg | **5 MB** | 24-30 |
| Portfolio | `.mp4` | H.264 | 1280×720 | 30-60 seg | **10 MB** | 24-30 |
| Historia | `.mp4` | H.264 | 1280×720 | 15-30 seg | **8 MB** | 24-30 |
| Showreel general | `.mp4` | H.264 | 1920×1080 | 60-90 seg | **15 MB** | 24-30 |

### Tips para Videos

1. **Siempre incluí un poster** (imagen JPG del primer frame) — se muestra mientras carga
2. **Comprimí con HandBrake** (gratis): [handbrake.fr](https://handbrake.fr/)
   - Preset: `Fast 1080p30` para hero, `Fast 720p30` para portfolio
   - Bitrate: 2-4 Mbps (hero), 1.5-3 Mbps (portfolio)
3. **Sin audio** para videos de fondo (reduce peso un 20-30%)
   - En HandBrake: pestaña Audio → eliminar todas las pistas
4. **Loop corto** para hero: 10-20 segundos es ideal, se repite automáticamente
5. **WebM como alternativa**: mejor compresión que MP4, pero no todos los navegadores lo soportan

### Herramientas Recomendadas

| Tarea | Herramienta | Link |
|---|---|---|
| Comprimir imágenes | Squoosh | [squoosh.app](https://squoosh.app/) |
| Convertir a WebP | Squoosh | [squoosh.app](https://squoosh.app/) |
| Comprimir videos | HandBrake | [handbrake.fr](https://handbrake.fr/) |
| Recortar videos | CapCut (escritorio) | [capcut.com](https://www.capcut.com/) |
| Crear SVG de logos | Vectorizer | [vectorizer.io](https://www.vectorizer.io/) |

---

## Resumen Rápido

1. **Arrastrá** tus archivos a la carpeta correspondiente en `public/img/` o `public/video/`
2. **Abrí** `data/config.ts` (o `App.tsx` para la sección Historia)
3. **Reemplazá** la URL vieja por la ruta local (ej: `/img/hero/mi-foto.jpg` o `/video/hero/mi-video.mp4`)
4. **Guardá** y la web se actualiza sola (hot reload)
5. **Para activar videos** en Hero o Portfolio, pedile a Tintin que modifique los componentes

