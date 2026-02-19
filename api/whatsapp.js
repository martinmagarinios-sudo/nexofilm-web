import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY?.trim() });

// Número del Administrador (Tu número personal)
const ADMIN_NUMBER = '5491151191964';

const SYSTEM_PROMPT = `Eres el asistente virtual de NexoFilm. Tu tono es profesional, ágil y colaborador.
Tu objetivo es **CALIFICAR** al cliente para que el productor humano pueda presupuestar rápidamente.

REGLAS DE ORO:
1. **NO DES PRECIOS NUNCA**.
2. **SOLO HABLÁ DE PRODUCCIÓN AUDIOVISUAL**. Si el usuario cambia de tema (clima, política, chistes, etc), respondé amablemente: "Perdón, estoy programado solo para asesorarte sobre nuestros servicios audiovisuales 🎬" y retomá la conversación profesional.
3. Si preguntan por servicios: Ofrecemos Foto, Video y Streaming.

DATOS A OBTENER (en orden):
1. **Servicios**: ¿Foto, Video, Streaming o Combo?
2. **Logística**: Fecha tentativa, horario (ej. 19 a 23hs) y lugar.
3. **Escala**: Cantidad de asistentes (para calcular personal).
4. **Solo si es Streaming**: ¿Hay internet? ¿Cuántas cámaras? ¿Plataforma?

CIERRE:
Una vez tengas estos datos, despídete amablemente diciendo que "un productor analizará la info y le escribirá en breve por este mismo chat".
Y agrega el bloque HANDOFF oculto.

FORMATO HANDOFF:
$$HANDOFF_JSON$$
{
  "handoff": true,
  "summary": "Resumen (ej: Foto+Video 15/05, 200 pax, Palermo)",
  "priority": "alta"
}
$$HANDOFF_JSON$$`;

export default async function handler(req, res) {
    // --- VERIFICACIÓN DEL WEBHOOK (GET) ---
    if (req.method === 'GET') {
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];
        if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN?.trim()) {
            return res.status(200).send(challenge);
        }
        return res.status(403).json({ error: 'Token inválido' });
    }

    // --- RECIBIR MENSAJES (POST) ---
    if (req.method === 'POST') {
        try {
            const body = req.body;
            const entry = body?.entry?.[0];
            const changes = entry?.changes?.[0];
            const value = changes?.value;

            if (!value?.messages || value.messages.length === 0) {
                return res.status(200).json({ status: 'no_message' });
            }

            const message = value.messages[0];
            const from = message.from;
            const phoneNumberId = value.metadata?.phone_number_id;

            // Ignorar mensajes del Admin
            if (from === ADMIN_NUMBER) return res.status(200).json({ status: 'admin_ignored' });

            console.log(`📩 Mensaje de ${from}:`, message);

            // --- LÓGICA DE MENÚ E INTERACCIÓN ---

            // 1. Si es mensaje de TEXTO
            if (message.type === 'text') {
                const text = message.text.body.toLowerCase().trim();

                // Si saluda o empieza de cero -> MENÚ PRINCIPAL
                if (['hola', 'buen', 'info', 'empezar', 'menu'].some(w => text.includes(w))) {
                    await sendInteractiveMenu(phoneNumberId, from);
                    return res.status(200).json({ status: 'menu_sent' });
                }

                // Procesar con Groq
                await handleAIConversation(phoneNumberId, from, message.text.body);
                return res.status(200).json({ status: 'ai_reply_sent' });
            }

            // 2. Si es respuesta a un BOTÓN (interactive)
            if (message.type === 'interactive') {
                const btnId = message.interactive.button_reply.id;

                if (btnId === 'btn_presupuesto') {
                    await sendWhatsAppMessage(phoneNumberId, from, "¡Genial! Me encantaría ayudarte con eso. 🎬\n\nPara armar una propuesta a medida, contame primero: **¿Qué tipo de cobertura buscás?** (Foto, Video, Streaming o un combo).");
                }
                else if (btnId === 'btn_portfolio') {
                    await sendWhatsAppMessage(phoneNumberId, from, "¡Claro! Mirá nuestros trabajos acá:\n\n🎬 **Web:** https://nexofilm.com\n🎥 **Vimeo:** https://vimeo.com/nexofilm\n📸 **Instagram:** https://instagram.com/nexofilm\n\n¿Te gustaría pedir un presupuesto después de verlos?");
                }
                else if (btnId === 'btn_humano') {
                    await sendWhatsAppMessage(phoneNumberId, from, "Entendido. Un productor te va a contactar a la brevedad. 👤📞");
                    await sendWhatsAppMessage(phoneNumberId, ADMIN_NUMBER, `🔔 *ALERTA:* El cliente +${from} pide hablar con un humano por el Bot.`);
                }

                return res.status(200).json({ status: 'interaction_handled' });
            }

            return res.status(200).json({ status: 'unknown_type' });

        } catch (error) {
            console.error('❌ Error:', error);
            return res.status(500).json({ error: error.message });
        }
    }
    return res.status(405).json({ error: 'Método no permitido' });
}

// --- FUNCIONES AUXILIARES ---

async function handleAIConversation(phoneNumberId, to, userMessage) {
    const aiRawResponse = await generateAIResponse(userMessage);

    let finalResponse = aiRawResponse;
    let handoffData = null;
    const jsonMatch = aiRawResponse.match(/\$\$HANDOFF_JSON\$\$([\s\S]*?)\$\$HANDOFF_JSON\$\$/);

    if (jsonMatch && jsonMatch[1]) {
        try {
            handoffData = JSON.parse(jsonMatch[1]);
            finalResponse = aiRawResponse.replace(jsonMatch[0], '').trim();
        } catch (e) {
            console.error('Error JSON:', e);
        }
    }

    await sendWhatsAppMessage(phoneNumberId, to, finalResponse);

    if (handoffData?.handoff) {
        const adminMsg = `🔔 *NUEVO LEAD - NEXO FILM*\n\n👤 *Cliente:* \`+${to}\`\n📝 *Resumen:* ${handoffData.summary}\n👉 https://wa.me/${to}`;
        await sendWhatsAppMessage(phoneNumberId, ADMIN_NUMBER, adminMsg);
    }
}

async function generateAIResponse(userMessage) {
    try {
        const completion = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: userMessage }
            ],
            model: 'llama-3.1-70b-versatile',
            temperature: 0.5, // Bajamos temp para que sea más obediente con las reglas de negocio
            max_tokens: 600,
        });
        return completion.choices[0]?.message?.content || 'Disculpá, no entendí bien.';
    } catch (error) {
        console.error('Error Groq:', error);
        return 'Tuve un error técnico. Escribinos a hola@nexofilm.com';
    }
}

async function sendInteractiveMenu(phoneNumberId, to) {
    const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
    const body = {
        messaging_product: 'whatsapp',
        to: to,
        type: 'interactive',
        interactive: {
            type: 'button',
            body: {
                text: "¡Hola! Bienvenido a Nexo Film. 🎥✨\nGracias por contactarnos. ¿En qué podemos ayudarte hoy? Seleccioná una opción:"
            },
            action: {
                buttons: [
                    { type: "reply", reply: { id: "btn_presupuesto", title: "📋 Pedir Presupuesto" } },
                    { type: "reply", reply: { id: "btn_portfolio", title: "🎬 Ver Portfolio" } },
                    { type: "reply", reply: { id: "btn_humano", title: "👤 Hablar con Humano" } }
                ]
            }
        }
    };

    await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN?.trim()}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
    });
}

async function sendWhatsAppMessage(phoneNumberId, to, message) {
    const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
    await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN?.trim()}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: to,
            type: 'text',
            text: { body: message, preview_url: true }
        }),
    });
}
