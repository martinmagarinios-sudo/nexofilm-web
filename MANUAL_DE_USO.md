# Manual de Uso y Mantenimiento - NexoFilm Web

Este documento explica cómo administrar y modificar la web de NexoFilm.

## 1. Configuración General (Textos y Enlaces)

Toda la información principal de la web se encuentra centralizada en un único archivo.
**Archivo:** `data/config.ts`

Aquí puedes editar:
-   **Datos de Contacto**: Número de WhatsApp (formato internacional), Correo, Redes Sociales.
-   **Textos de Portada (Hero)**: Títulos (`title`), subtítulos (`subtitle`) e imágenes de fondo.
-   **Historia**: Títulos y textos de la sección "Nuestra Esencia" / "Nosotros".
-   **Footer**: Texto del pie de página.
-   **Opiniones (Testimonios)**: Lista de testimonios. Copia los datos tal cual aparecen en LinkedIn.

### Cómo editar `config.ts`:
Abre el archivo con cualquier editor de texto (Notepad, VSCode). Verás una estructura como esta:

```typescript
export const CONFIG = {
  whatsappNumber: "5491112345678", 
  // ...
  history: {
      title: "Somos NexoFilm,",
      // ...
  }
}
```
Simplemente cambia el texto entre comillas.

## 2. Portfolio y Videos

El portfolio se gestiona desde `data/config.ts` en la sección `projects`.

### Agregar un nuevo proyecto:
Copia y pega un bloque de proyecto existente y edita sus campos:

```typescript
{
    id: "4", // Asegúrate de que el ID sea único
    title: "Nombre del Proyecto",
    category: "Cine / Foto / Streaming",
    imageUrl: "URL de la imagen de portada",
    description: "Breve descripción...",
    behanceUrl: "https://behance.net/tu-proyecto",
    embedUrl: "https://www.youtube.com/embed/VIDEO_ID" // Opcional: Para abrir el video en la web
},
```

-   **`behanceUrl`**: Enlace al proyecto completo en Behance (ej: `https://www.behance.net/gallery/...`).
-   **`embedUrl`** (IMPORTANTE): Para que el video se reproduzca dentro de la web sin salir.
    -   **YouTube**: `https://www.youtube.com/embed/VIDEO_ID`
    -   **Vimeo**: `https://player.vimeo.com/video/VIDEO_ID`
    -   **Behance**: `https://www.behance.net/embed/project/PROYECTO_ID`
    -   *Nota*: No confundir con el enlace normal del video. Debe ser el enlace "Embed" o "Insertar".

## 3. Clientes (Logos)

La sección de Clientes es **automática**.
**Carpeta:** `src/assets/clients`

-   **Para agregar un cliente**: Simplemente guarda la imagen del logo (JPG, PNG, SVG) dentro de esta carpeta. La web lo detectará y mostrará automáticamente.
-   **Para borrar un cliente**: Borra el archivo de la imagen de la carpeta.

## 4. Logo Principal

El logo de la web es el archivo `logo.png` ubicado en `components/`.
Si deseas cambiarlo, simplemente reemplaza este archivo por uno nuevo con el mismo nombre (`logo.png`), preferiblemente con fondo transparente.

## 5. Despliegue (Publicar en Internet)

### Opción A: Vercel (Recomendado)
1.  Crea una cuenta en [Vercel](https://vercel.com).
2.  Importa tu proyecto desde GitHub (o sube la carpeta).
3.  Vercel detectará que es un proyecto "Vite" y lo configurará automáticamente.
4.  Dale a "Deploy".

### Opción B: DonWeb / Hosting Tradicional
1.  En tu computadora, abre una terminal en la carpeta del proyecto.
2.  Ejecuta el comando: `npm run build`
3.  Esto creará una carpeta llamada `dist`.
4.  Sube el **contenido** de la carpeta `dist` al directorio `public_html` de tu hosting (usando FileZilla o el administrador de archivos de cPanel).
