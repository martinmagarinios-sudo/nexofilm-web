# 📸 Guía: Cómo Subir Galerías de Fotos al Portfolio

Ahora tu web soporta **Galerías de Fotos** que pasan solas cuando el usuario pasa el mouse por encima.

## 1. Dónde están las imágenes
Guardá tus fotos en la carpeta:
`public/img/portfolio/`

(Si no existe, creala. Podés organizarlas por carpetas, ej: `public/img/portfolio/evento_boda/foto1.jpg`)

## 2. Cómo editar el archivo
Abrí el archivo: `src/data/config.ts`

Buscá la sección `projects: [...]` y agregá un nuevo item así:

```typescript
{
    id: "6", // Asegurate que sea único (el siguiente número)
    title: "Evento Corporativo",
    category: "Fotografía",
    
    // FOTO DE PORTADA (Se ve siempre al principio)
    imageUrl: "/img/portfolio/evento1/cover.jpg",
    
    // GALERÍA (Se ve al pasar el mouse)
    gallery: [
        "/img/portfolio/evento1/foto1.jpg",
        "/img/portfolio/evento1/foto2.jpg",
        "/img/portfolio/evento1/foto3.jpg"
    ],
    
    // Links (Opcionales)
    description: "Cobertura fotográfica completa.",
    behanceUrl: "https://www.behance.net/..." 
},
```

## ⚠️ Importante
- **Video vs Galería**:
    - Si ponés `videoUrl`, el sistema **siempre prioriza el video** (se verá el video al pasar el mouse).
    - Para que funcione la galería de fotos, **NO pongas** `videoUrl` en ese item.
- **Tamaño**: Tratá de que las fotos sean livianas (JPG web, max 200-300kb) para que no tarde en cargar.
- **Proporción**: Lo ideal es que todas sean **16:9 (Horizontal)** para que encajen perfecto en el recuadro.

---
¡Listo! Guardá el archivo y los cambios se verán al instante. 🚀
