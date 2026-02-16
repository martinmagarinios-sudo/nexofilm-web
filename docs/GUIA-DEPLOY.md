# 🚀 Guía: Cómo Modificar la Web y que los Cambios se Publiquen Automáticamente

## Resumen

Una vez que la web está conectada a un servicio de hosting como **Vercel** o **Netlify**, cualquier cambio que subas a GitHub se publicará **automáticamente** en el sitio web. Este proceso se llama **Deploy Continuo (CI/CD)**.

---

## Paso 1: Conectar GitHub con Vercel (una sola vez)

1. Entrá a [vercel.com](https://vercel.com) y creá una cuenta con tu GitHub
2. Click en **"Add New Project"**
3. Seleccioná el repositorio **Nexofilm-web**
4. Vercel detecta automáticamente que es un proyecto Vite. Verificá:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Click en **"Deploy"**
6. ¡Listo! Tu web estará disponible en `nexofilm-web.vercel.app`

> **Dominio personalizado**: En Vercel → Settings → Domains, podés agregar `nexofilm.com` configurando los DNS de tu dominio.

---

## Paso 2: Hacer Cambios en la Web

### ¿Qué archivos modifico?

| Lo que querés cambiar | Archivo a editar |
|---|---|
| Textos, links, datos de contacto | `data/config.ts` |
| Agregar un proyecto al portfolio | `data/config.ts` → sección `projects` |
| Agregar un cliente | `data/config.ts` → sección `clients` |
| Agregar un testimonio | `data/config.ts` → sección `testimonials` |
| Cambiar textos del Hero | `data/config.ts` → sección `heroSlides` |
| Cambiar textos de "Nosotros" | `data/config.ts` → sección `history` |
| SEO y metadatos | `index.html` |
| Estilos y colores | `index.css` |

### ¿Dónde pongo archivos nuevos?

| Tipo de archivo | Carpeta |
|---|---|
| Videos de portfolio | `public/video/portfolio/` |
| Videos del hero | `public/video/hero/` |
| Logos de clientes | `public/img/clientes/` |
| Favicon / Logo | `public/` |

---

## Paso 3: Subir los Cambios a GitHub

Después de editar los archivos, abrí una terminal en la carpeta del proyecto y ejecutá:

```bash
# 1. Ver qué archivos cambiaron
git status

# 2. Agregar todos los cambios
git add .

# 3. Crear un commit con una descripción
git commit -m "Descripción de lo que cambiaste"

# 4. Subir a GitHub
git push
```

### Ejemplos prácticos:

```bash
# Ejemplo: Agregaste un cliente nuevo
git add .
git commit -m "Agregar cliente Pacific Ocean a la web"
git push

# Ejemplo: Cambiaste un video del portfolio
git add .
git commit -m "Actualizar video de Copa Airlines"
git push

# Ejemplo: Cambiaste textos de la portada
git add .
git commit -m "Actualizar textos del Hero"
git push
```

---

## ¿Qué pasa después del `git push`?

```
Tu PC → git push → GitHub → Vercel detecta el cambio → Build automático → Web actualizada
```

**Tiempo estimado**: 30 segundos a 2 minutos después del push.

Podés ver el estado del deploy en el **Dashboard de Vercel** en tiempo real.

---

## Flujo Visual Completo

```
┌────────────────┐    ┌──────────┐    ┌────────────┐    ┌──────────────┐
│  Tu PC         │───▶│  GitHub  │───▶│   Vercel   │───▶│  nexofilm.com│
│  Editás        │    │  Guarda  │    │  Compila   │    │  Se publica  │
│  config.ts     │    │  código  │    │  automático│    │  solo        │
└────────────────┘    └──────────┘    └────────────┘    └──────────────┘
     git push           Webhook         npm run build      Deploy listo
```

---

## Resolución de Problemas

### "git push" me pide contraseña
Si te pide credenciales, se abrirá automáticamente una ventana del navegador para autenticarte con GitHub (como la primera vez).

### El deploy falló en Vercel
1. Entrá al Dashboard de Vercel
2. Revisá el log de errores del build
3. Lo más común: un error de tipeo en `config.ts` (falta una coma, comillas sin cerrar)

### Los videos no se ven en la web
- Verificá que el archivo está en `public/video/portfolio/`
- Verificá que el nombre coincide exactamente con el de `config.ts`
- Formato soportado: `.mp4` (recomendado)

### Los cambios no aparecen
- ¿Hiciste `git push`? Sin push, los cambios quedan solo en tu PC
- Esperá 1-2 minutos a que Vercel termine el build

---

## Comandos Git de Referencia Rápida

| Acción | Comando |
|---|---|
| Ver estado de cambios | `git status` |
| Agregar todos los cambios | `git add .` |
| Hacer commit | `git commit -m "mensaje"` |
| Subir cambios | `git push` |
| Descargar cambios de otros | `git pull` |
| Ver historial de cambios | `git log --oneline -10` |
| Deshacer cambios no guardados | `git checkout -- .` |
