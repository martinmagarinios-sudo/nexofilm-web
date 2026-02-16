---
description: Workflow para realizar una auditoría completa de SEO y Accesibilidad en el sitio.
---

# Auditoría SEO y Accesibilidad (Fla)

Este workflow guía el proceso de revisión y mejora del posicionamiento web y accesibilidad.

## 1. Verificación de Metadatos Básicos
Revisar `index.html` para asegurar la presencia de:
- [ ] `<title>` único y descriptivo.
- [ ] `<meta name="description">`.
- [ ] Open Graph Tags (`og:title`, `og:image`, `og:description`).
- [ ] Favicon.

## 2. Archivos de Indexación
Verificar existencia en la carpeta `public/`:
- [ ] `robots.txt` (debe permitir acceso a `User-agent: *`).
- [ ] `sitemap.xml`.

## 3. Auditoría Semántica y de Imágenes
- [ ] **Clientes**: Verificar en `components/Clients.tsx` que los logos tengan `alt` descriptivo (idealmente dinámico basado en el nombre del archivo).
- [ ] **Imágenes Generales**: Buscar etiquetas `<img>` sin atributo `alt` o con alt vacío incorrecto.
- [ ] **Encabezados**: Verificar jerarquía (`h1` único, seguido de `h2`, etc.).

## 4. Accesibilidad (A11y)
- [ ] **Elementos Interactivos**: Asegurar que `div` o `span` con `onClick` tengan también:
    - `role="button"`
    - `tabIndex="0"`
    - `onKeyDown` (para Enter/Space)
    - `aria-label` si no tienen texto visible.
- [ ] **Contraste**: Verificar que los colores de texto y fondo tengan suficiente contraste.

## 5. Performance (Core Web Vitals)
- [ ] Verificar que las imágenes grandes tengan `loading="lazy"` (excepto las del Hero/LCP).
- [ ] Verificar tamaño de archivos de imagen (usar formatos modernos como WebP si es posible).

## Comandos Útiles
Para buscar imágenes sin alt:
```bash
grep -r "<img" . | grep -v "alt="
```
