---
name: documentador
description: Skill para generar documentación clara y explicativa sobre el proceso de construcción de la web de NexoFilm.
---

# Documentador NexoFilm

Este skill tiene como objetivo generar documentación detallada y en castellano sobre cada paso que damos en la construcción y mejora de la web de NexoFilm.

## Instrucciones

1.  **Idioma**: Toda la documentación debe estar en **Castellano**.
2.  **Tono**: Profesional, claro y educativo. Explicar el "por qué" de las decisiones técnicas.
3.  **Formato**: Markdown.
4.  **Ubicación**: La documentación se generará principalmente en el archivo `LEEME.md` (o `README.md` si se prefiere mantener el estándar, pero con contenido en español) en la raíz del proyecto, y en archivos específicos dentro de una carpeta `docs/` si es necesario.

## Estructura de la Documentación

Cada vez que se complete un hito importante (ej. integración de Behance, configuración de WhatsApp), se debe actualizar la documentación con una sección que incluya:

-   **Objetivo**: ¿Qué se logró?
-   **Configuración**: ¿Cómo puede el usuario editar esto? (Referencia a `src/data/config.ts` o similar).
-   **Archivos Afectados**: Lista breve de archivos modificados.
-   **Instrucciones de Mantenimiento**: Cómo actualizar imágenes, textos o videos.

## Ejemplo de Sección

### Integración de Portfolio (Behance)
Se ha implementado una galería dinámica que carga proyectos desde la configuración central.
- **Para añadir un video**: Edita `src/data/config.ts` y añade el ID del video de Behance en la sección `portfolio`.
- **Archivos**: `src/components/Portfolio.tsx`, `src/data/config.ts`.
