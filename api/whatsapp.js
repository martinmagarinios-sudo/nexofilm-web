import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `Eres "Nexo", el asistente virtual de NexoFilm, una productora audiovisual profesional con sede en Argentina. Tu rol es atender consultas de potenciales clientes de manera cálida, profesional y eficiente.

PERSONALIDAD:
- Profesional pero cercano, como un productor ejecutivo amigable
- Usás emojis con moderación (🎬📸🎥✅)
- Respondés siempre en español rioplatense (vos, sos, podés)
- Respuestas concisas y claras (máximo 3-4 párrafos por mensaje de WhatsApp)

SERVICIOS QUE OFRECÉS:
1. 🎬 Video Corporativo / Publicitario (spots, institucionales, documentales)
2. 📸 Fotografía Profesional (producto, eventos, retratos corporativos)
3. 🎥 Streaming en Vivo (transmisiones HD multi-cámara)
4. 🎞️ Cine Publicitario (alta producción cinematográfica)

OBJETIVO PRINCIPAL:
Tu objetivo es recopilar la información necesaria para que el equipo de NexoFilm pueda armar un presupuesto. Debés obtener estos datos de forma natural (NO como formulario, sino conversando):

DATOS A RECOPILAR (en orden de prioridad):
1. Tipo de servicio: Video, Foto, Streaming o combinación
2. Descripción del proyecto: ¿Qué necesitan? ¿Para qué es?
3. Fecha tentativa del evento/producción
4. Duración estimada (horas de rodaje / cobertura)
5. Cantidad de personas involucradas (equipo del cliente en cámara)
6. Ubicación / Lugar donde se realiza
7. Si necesitan edición, postproducción, gráficas animadas
8. Presupuesto orientativo (si lo mencionan)

REGLAS ESTRICTAS:
- NUNCA inventes precios ni des presupuestos. Siempre decí que el equipo va a preparar una propuesta personalizada.
- Si el cliente pregunta precios, decí: "Cada proyecto es único. Con los datos que me des, nuestro equipo te prepara una propuesta a medida en 24-48hs 📋"
- Cuando tengas suficiente información (mínimo: tipo de servicio + fecha + descripción), ofrecé agendar una reunión o videollamada.
- Si preguntan algo NO relacionado con producción audiovisual, redirigí amablemente al tema.
- Si piden hablar con una persona real, decí que vas a derivar al equipo y que se van a comunicar a la brevedad.
- Mencioná el email hola@nexofilm.com si necesitan enviar documentación o briefs detallados.
- Mencioná el portfolio en nexofilm.com para que vean trabajos anteriores.

CLIENTES DESTACADOS (para dar confianza):
Copa Airlines, Bahía Príncipe, Cerámica San Lorenzo, Droguería del Sud, GEA, Vista Sol, Iberostar, Eseade.

PRIMER MENSAJE:
Si es el primer mensaje del usuario, presentate brevemente: "¡Hola! 👋 Soy Nexo, el asistente de NexoFilm 🎬 ¿En qué puedo ayudarte? Contame qué tipo de producción audiovisual estás buscando y te asesoro."

FORMATO DE RESPUESTA:
- Usá saltos de línea para separar ideas
- No uses markdown (WhatsApp no lo renderiza bien)
- Usá *asteriscos* solo para negritas (WhatsApp sí soporta esto)
- Mantené las respuestas en 2-4 párrafos máximo`;

export default async function handler(req, res) {
    // --- VERIFICACIÓN DEL WEBHOOK (GET) ---
    if (req.method === 'GET') {
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];

        if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
            console.log('✅ Webhook verificado correctamente');
            return res.status(200).send(challenge);
        }
        return res.status(403).json({ error: 'Token de verificación inválido' });
    }

    // --- RECIBIR MENSAJES (POST) ---
    if (req.method === 'POST') {
        try {
            const body = req.body;

            // Verificar que es un mensaje de WhatsApp válido
            const entry = body?.entry?.[0];
            const changes = entry?.changes?.[0];
            const value = changes?.value;

            // Ignorar notificaciones de estado (delivered, read, etc.)
            if (!value?.messages || value.messages.length === 0) {
                return res.status(200).json({ status: 'no_message' });
            }

            const message = value.messages[0];
            const from = message.from; // Número del remitente
            const phoneNumberId = value.metadata?.phone_number_id;

            // Solo procesar mensajes de texto
            if (message.type !== 'text') {
                await sendWhatsAppMessage(
                    phoneNumberId,
                    from,
                    '¡Hola! 👋 Por el momento solo puedo procesar mensajes de texto. ¿Podés escribirme tu consulta? 😊'
                );
                return res.status(200).json({ status: 'non_text_handled' });
            }

            const userMessage = message.text.body;
            console.log(`📩 Mensaje de ${from}: ${userMessage}`);

            // Generar respuesta con Groq
            const aiResponse = await generateAIResponse(userMessage);
            console.log(`🤖 Respuesta IA: ${aiResponse.substring(0, 100)}...`);

            // Enviar respuesta por WhatsApp
            await sendWhatsAppMessage(phoneNumberId, from, aiResponse);

            return res.status(200).json({ status: 'message_processed' });
        } catch (error) {
            console.error('❌ Error procesando mensaje:', error);
            return res.status(200).json({ status: 'error', error: error.message });
        }
    }

    return res.status(405).json({ error: 'Método no permitido' });
}

async function generateAIResponse(userMessage) {
    try {
        const completion = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: userMessage }
            ],
            model: 'llama-3.1-70b-versatile',
            temperature: 0.7,
            max_tokens: 500,
            top_p: 0.9,
        });

        return completion.choices[0]?.message?.content ||
            '¡Hola! Disculpá, tuve un problema técnico. ¿Podés repetirme tu consulta? 😊';
    } catch (error) {
        console.error('❌ Error con Groq:', error);
        return '¡Hola! En este momento estoy teniendo dificultades técnicas. Por favor escribí a hola@nexofilm.com o intentá de nuevo en unos minutos. 🙏';
    }
}

async function sendWhatsAppMessage(phoneNumberId, to, message) {
    const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: to,
            type: 'text',
            text: { body: message }
        }),
    });

    if (!response.ok) {
        const errorData = await response.text();
        console.error('❌ Error enviando WhatsApp:', errorData);
        throw new Error(`WhatsApp API error: ${response.status}`);
    }

    return response.json();
}
