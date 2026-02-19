# 🤖 Guía Maestra: Integración WhatsApp Business + Groq AI

Esta guía contiene los **pasos detallados** para conectar el "cerebro" (Groq AI) con "la boca" (WhatsApp Business) de tu productora.

> **Estado Actual**: El código del bot ya está listo en el proyecto (`api/whatsapp.js`). Ahora falta configurar los servicios externos (Meta y Vercel).

---

## 📋 Pre-requisitos (Antes de empezar)

1.  **Cuenta en Vercel**: Para alojar el bot.
2.  **Cuenta en Facebook/Meta**: Para configurar WhatsApp.
3.  **Cuenta en Groq**: Para la inteligencia artificial.

---

## 🚀 PASO 1: Obtener la API Key de Groq (La "Mente")

1.  Ingresá a **[console.groq.com](https://console.groq.com/keys)**.
2.  Create una cuenta si no tenés.
3.  Hacé click en **"Create API Key"**.
4.  Ponle de nombre: `NexoFilmBot`.
5.  **Copiá la clave** (empieza con `gsk_...`). 
    > ⚠️ **Guardala bien**, no se vuelve a mostrar.

---

## ☁️ PASO 2: Desplegar en Vercel (El "Cuerpo")

Para que Facebook pueda "hablar" con tu bot, el bot tiene que estar en internet.

1.  Subí tu proyecto a GitHub (si no lo hiciste).
2.  Entrá a **[Vercel](https://vercel.com)** e importá el proyecto.
3.  Vercel te dará una **URL de Dominio** (ej: `nexofilm-v3.vercel.app`).
    - *Anotá esta URL, la usaremos en el Paso 4.*

---

## 💬 PASO 3: Configurar Meta Developers (El "Canal")

### 3.1 Crear la App
1.  Andá a **[developers.facebook.com](https://developers.facebook.com)** > Mis Apps.
2.  **Crear app** > Seleccioná **"Otro"** (o "Empresa").
3.  Tipo de app: **"Negocios"** (Business).
4.  Nombre: `NexoFilm Bot`.
5.  Vinculá tu cuenta comercial de Meta Business.

### 3.2 Agregar WhatsApp
1.  En el panel de la app, buscá **"WhatsApp"** (abajo) y dale a **"Configurar"**.
2.  Quedate en la pestaña **"Inicio rápido" (Quickstart)**.
3.  Verás:
    - **ID del número de teléfono** (Phone Number ID).
    - **Token de acceso temporal** (Access Token).
    > ⚠️ El token temporal dura 24hs. Para producción necesitarás generar uno permanente (Sistema de Usuarios) luego, pero para probar usá este.

---

## 🔗 PASO 4: Conectar Todo en Vercel

Ahora vamos a decirle a Vercel todos los secretos.

1.  Andá a tu proyecto en **Vercel** > **Settings** > **Environment Variables**.
2.  Agregá estas 4 variables (copiá y pegá los valores que obtuviste):

| Nombre de Variable | Valor / De dónde sacarlo |
| :--- | :--- |
| `GROQ_API_KEY` | La clave que copiaste en el **Paso 1** (`gsk_...`). |
| `WHATSAPP_TOKEN` | El "Token de acceso temporal" del **Paso 3.2**. |
| `WHATSAPP_VERIFY_TOKEN` | Inventá una clave segura. Ej: `nexofilm_secreto_2024`. |
| `WHATSAPP_PHONE_ID` | El "ID del número de teléfono" del **Paso 3.2**. |

3.  **Redesplegá el proyecto** (Deployments > Redeploy) para que tome los cambios.

---

## 🪝 PASO 5: Configurar el Webhook (El "Oído")

Ahora le decimos a Facebook dónde mandar los mensajes.

1.  Volvé a **Meta Developers** > WhatsApp > **Configuración (Configuration)**.
2.  Buscá "Webhook" y dale a **"Editar"**.
3.  **URL de devolución de llamada (Callback URL)**:
    - Escribí tu URL de Vercel + `/api/whatsapp`.
    - Ejemplo: `https://tu-proyecto.vercel.app/api/whatsapp`
    - (Si ya tenés dominio real: `https://nexofilm.com/api/whatsapp`)
4.  **Token de verificación**:
    - Escribí el mismo que pusiste en Vercel (`nexofilm_secreto_2024`).
5.  Click en **"Verificar y guardar"**.
    - *Si da error, revisá que hayas redesplegado Vercel en el Paso 4.*
6.  Abajo en "Campos de Webhook", dale a **"Administrar"**.
7.  Suscribite a **`messages`** (tildá la casilla en la columna Versión v21.0 o la que esté actual).

---

## 🧪 PASO 6: Probar

1.  En Meta Developers > WhatsApp > **Inicio rápido**.
2.  Bajá a "Enviar y recibir mensajes".
3.  **Paso 1**: Seleccioná el número de prueba (ya debería estar).
4.  **Paso 2**: En "Para", agregá **tu número real de WhatsApp** para recibir los mensajes de prueba. Te llegará un código a tu cel para confirmar.
5.  ¡Listo! Abrí WhatsApp en tu cel, mandale un "Hola" al número de prueba.
    - El bot debería contestar usando la IA de Groq.

---

## 🌍 PASO 7: Pasar a Producción (Número Real)

Cuando todo funcione con el número de prueba:

1.  En Meta Developers > WhatsApp > "Configuración de la API".
2.  Hacé click en **"Agregar número de teléfono"**.
3.  Seguí los pasos para verificar tu número de WhatsApp Business real (te llegará un SMS/Llamada).
4.  Actualizá la variable `WHATSAPP_PHONE_ID` en Vercel con el ID del nuevo número real.
5.  **Importante**: Para que el token no venza en 24hs, necesitás crear un "Usuario del Sistema" en el Business Manager de Meta y generar un token permanente.

### ¿Problemas comunes?
- **El bot no responde**: Revisá los logs en Vercel > Logs. Ahí verás si Groq está fallando o si el mensaje llega.
- **Error de verificación de Webhook**: Asegurate que la URL sea pública (https) y que el token de verificación coincida exactamente.
