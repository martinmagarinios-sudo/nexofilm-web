# 🤖 Guía: Configurar el Chatbot WhatsApp con IA

## El chatbot ya está programado y desplegado. Solo falta conectarlo con WhatsApp.

Para que el bot responda mensajes de WhatsApp, **sí necesitás Meta Developer** (es gratis). Es la única forma de que WhatsApp envíe los mensajes a tu servidor.

---

## Paso 1: Crear cuenta en Meta Developer (10 min)

1. Andá a **[developers.facebook.com](https://developers.facebook.com)**
2. Logueate con tu cuenta de Facebook
3. Click en **"Crear app"**
4. Seleccioná tipo **"Empresa"** (Business)
5. Poné un nombre (ej: "NexoFilm Bot")
6. Seleccioná tu cuenta de Meta Business (si no tenés, te pide crear una)

---

## Paso 2: Agregar producto WhatsApp (5 min)

1. En tu app, andá a **"Agregar productos"**
2. Buscá **"WhatsApp"** y click en **"Configurar"**
3. Te va a mostrar un **número de teléfono de prueba** y un **token temporal**
4. Anotá estos datos:
   - **Phone Number ID**: número tipo `1234567890` que aparece en el panel
   - **Access Token**: click en "Generate" para obtener un token temporal

---

## Paso 3: Configurar el Webhook (5 min)

1. En la sección WhatsApp de tu app, andá a **"Configuración"** → **"Webhooks"**
2. Click en **"Editar"** y completá:
   - **URL de callback**: `https://nexofilm.com/api/whatsapp`
   - **Token de verificación**: `nexofilm_whatsapp_verify_2024` (elegí el que quieras)
3. Click en **"Verificar y guardar"**
4. Suscribite al campo **"messages"** (tildar la casilla)

---

## Paso 4: Configurar variables en Vercel (2 min)

Necesito que me pases estos 3 datos y yo los configuro en Vercel:

1. **WHATSAPP_TOKEN** — El Access Token que generaste
2. **WHATSAPP_VERIFY_TOKEN** — El token que elegiste en el paso 3 (ej: `nexofilm_whatsapp_verify_2024`)
3. **WHATSAPP_PHONE_ID** — El Phone Number ID

---

## Paso 5: Probar el bot

1. En Meta Developer, en la sección WhatsApp → "Empezar"
2. Hay una opción **"Enviar mensaje de prueba"** con un número de prueba
3. También podés agregar tu número personal como "número de prueba" para testear
4. Mandá un mensaje y verificá que el bot responda

---

## Paso 6: Conectar tu número real de WhatsApp Business

Una vez que todo funcione con el número de prueba:

1. En Meta Developer → WhatsApp → **"Números de teléfono"**
2. Click en **"Agregar número de teléfono"**
3. Seguí los pasos para verificar tu número de WhatsApp Business
4. Meta te va a pedir verificar el negocio (puede tardar 24-48hs)

> **IMPORTANTE**: Tu número actual de WhatsApp Business se va a desconectar de la app WhatsApp Business y pasará a funcionar via API. Esto significa que los mensajes los manejará el bot. Podés seguir teniendo acceso manual configurándolo desde Meta.

---

## ¿Qué hace el bot?

El bot "Nexo" está programado para:

- ✅ Saludar profesionalmente en la primera interacción
- ✅ Recopilar datos para presupuestos de forma natural:
  - Tipo de servicio (Video, Foto, Streaming)
  - Descripción del proyecto
  - Fecha y hora tentativa
  - Duración estimada
  - Cantidad de personas
  - Ubicación
- ✅ Derivar a hola@nexofilm.com para briefs detallados
- ✅ Mencionar clientes destacados (Copa Airlines, Bahía Príncipe, etc.)
- ✅ Derivar a un humano si el cliente lo pide
- ❌ NUNCA da precios (siempre sugiere propuesta personalizada)

---

## Arquitectura

```
Cliente WhatsApp → Meta Cloud API → nexofilm.com/api/whatsapp → Groq AI → Respuesta → WhatsApp
```

- **Groq API Key**: Ya configurada ✅
- **Endpoint Health**: https://nexofilm.com/api/health ✅
- **Webhook**: https://nexofilm.com/api/whatsapp ✅
