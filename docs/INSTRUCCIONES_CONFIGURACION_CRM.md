# Guía de Configuración e Infraestructura: CRM Comercial NexoFilm

Para completar la puesta en marcha de tu nuevo sistema comercial, debés configurar dos servicios esenciales en tus cuentas de **Supabase** y **Vercel**. Esto te permitirá almacenar facturas y sincronizar tus entregas finales de Google Drive de manera automática.

---

## 1. Configuración de Supabase: Bucket de Almacenamiento para Facturas

Para que puedas subir las facturas PDF desde el panel de administración, debés crear un contenedor de almacenamiento (Bucket) público en Supabase:

1. Ingresá a tu panel de **[Supabase](https://supabase.com)** y seleccioná el proyecto de NexoFilm.
2. En la barra lateral izquierda, hacé clic en **"Storage"** (icono de cubo/caja).
3. Hacé clic en el botón **"New Bucket"** (Nuevo Contenedor).
4. Asignale el nombre exacto: **`invoices`**.
5. Asegurate de activar la opción **"Public bucket"** (Contenedor Público) para que tus clientes puedan descargar el PDF mediante enlaces directos seguros.
6. Hacé clic en **"Save"** (Guardar).

---

## 2. Configuración de Vercel: Integración con Google Drive (Service Account)

Para que tus clientes puedan visualizar y descargar los archivos terminados directamente desde su portal, el backend debe conectarse de forma segura a Google Drive usando una **Cuenta de Servicio** (Service Account).

### Paso A: Crear la Cuenta de Servicio en Google Cloud (Una sola vez)
1. Ingresá a **[Google Cloud Console](https://console.cloud.google.com/)**.
2. Creá un proyecto (o seleccioná uno existente).
3. Dirigite a **API y Servicios > Biblioteca** y buscá **"Google Drive API"**. Hacé clic en **Habilitar**.
4. Dirigite a **IAM y administración > Cuentas de servicio**.
5. Creá una cuenta de servicio (ej: `nexofilm-drive-bridge@...`).
6. Una vez creada, entrá a la cuenta de servicio, ve a la pestaña **Claves** (Keys), hacé clic en **Agregar clave > Crear clave nueva** y seleccioná el formato **JSON**. Esto descargará un archivo a tu computadora.
7. Abrí el archivo JSON descargado. Vas a necesitar dos campos: `client_email` y `private_key`.

### Paso B: Compartir tus carpetas de Google Drive
Para cada proyecto nuevo en el que quieras entregar material finalizado:
1. Creá una carpeta en tu Google Drive personal o empresarial.
2. Compartí esa carpeta con el correo de la Cuenta de Servicio (el que termina en `.iam.gserviceaccount.com`) dándole permisos de **Lector**.
3. Copiá el ID de la carpeta (es el código largo que aparece al final de la URL en la barra de direcciones del navegador al estar dentro de la carpeta). Este ID es el que pegarás en tu panel de CRM en el input "ID de Carpeta Google Drive".

### Paso C: Cargar Variables de Entorno en Vercel
Para que tu backend pueda autenticarse de forma segura sin exponer contraseñas en el código, cargá estas variables en el panel de control de Vercel:

1. Ingresá a **[Vercel](https://vercel.com/)** y seleccioná el proyecto de NexoFilm.
2. Hacé clic en **Settings** (Configuración) > **Environment Variables** (Variables de Entorno).
3. Agregá las siguientes variables:

| Nombre de Variable | Valor | Nota |
|---|---|---|
| `GOOGLE_CLIENT_EMAIL` | El valor de `client_email` de tu archivo JSON | Correo de la cuenta de servicio |
| `GOOGLE_PRIVATE_KEY` | El valor de `private_key` de tu archivo JSON | Clave privada (incluyendo las líneas de `-----BEGIN PRIVATE KEY-----` hasta `-----END PRIVATE KEY-----`) |

4. Hacé clic en **Save** (Guardar) y realiza un nuevo deploy del proyecto para que las variables tengan efecto.

---

## 3. Notificaciones y Webhooks (Opcional - Automatización Supabase)

Cuando tus clientes aprueban o solicitan cambios, el portal ya les envía automáticamente alertas inmediatas a tu correo y WhatsApp a través de los endpoints de Vercel. 

Si en el futuro deseas que cambios directos hechos manualmente en tu base de datos también notifiquen, podés configurar un Database Webhook en Supabase apuntando a `/api/comercial/client-action` con el evento `UPDATE` sobre la tabla `projects`.
