# 🚀 NexoFilm — WhatsApp Gateway (Multi-Device QR)

Microservicio de pasarela para enviar y recibir notificaciones de WhatsApp 100% en segundo plano con tu número de **WhatsApp Business (+54 9 11 5119 1964)** sin pagar API de Meta.

---

## 💻 1. Cómo correrlo en tu PC local:
```bash
cd whatsapp-gateway
npm install
npm start
```
El servidor arrancará en `http://localhost:3001`.

---

## ☁️ 2. Cómo desplegarlo 100% GRATIS en la Nube (Render / Koyeb / Railway):

1. **Crear repositorio o vincular esta carpeta:**
   - En Render.com (Plan Free) o Railway, creás un nuevo **Web Service**.
   - Elegís Node.js o Docker.
2. **Variables de Entorno (Environment Variables):**
   - `PORT`: `3001` (o el que asigne el host).
   - `GATEWAY_API_KEY`: `nexofilm_gw_secret_2026` (o tu clave secreta personalizada).
3. **En Vercel (Panel de NexoFilm):**
   - Agregás la variable `WHATSAPP_GATEWAY_URL` con la URL de tu servicio (ej: `https://tu-gateway.onrender.com`).
   - Agregás `WHATSAPP_GATEWAY_KEY` con tu clave secreta.

---

## 📱 3. Cómo vincular tu celular:
1. Abrís el panel de NexoFilm en el CRM (`/admin/whatsapp-gateway` o desde la ventana de WhatsApp).
2. Escaneás el Código QR desde tu celular:
   `WhatsApp Business > Ajustes > Dispositivos vinculados > Vincular un dispositivo`.
3. ¡Listo! Queda conectado permanentemente.
