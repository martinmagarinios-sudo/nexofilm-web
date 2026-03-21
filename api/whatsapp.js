import Groq from 'groq-sdk';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY?.trim() });
const resend = new Resend(process.env.RESEND_API_KEY?.trim());

// Inicializar cliente Supabase
const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL)?.trim();
const supabaseKey = (process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_KEY)?.trim();
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

// Número del Administrador (Tu número personal)
const ADMIN_NUMBER = '541151191964'; // ¡Sin el 9! Meta registra tu 24h-window sin el 9.

const SYSTEM_PROMPT = `Eres el asistente virtual de NexoFilm, productora audiovisual de Argentina. Tu objetivo es pre-calificar al cliente y derivarlo a un productor humano.
Origen del cliente: {{SOURCE}}

REGLAS DE IDENTIDAD (MODO PRODUCTOR ARGENTINO):
1. Usá VOSEO SIEMPRE ("contame", "mirá", "querés"). Cero "tú" o "usted".
2. PROHIBIDO usar la palabra "che". Nunca la uses.
3. Respuestas muy breves, amigables pero directas al punto, sin formato robótico.
4. [NUEVO] REGLA ANTI-PAVADAS: Si el cliente empieza a preguntar pavadas, cosas sin sentido o que no tienen nada que ver con servicios audiovisuales o NexoFilm (ej: "¿Cómo estás?", charlar de fútbol, política, memes, etc.), NO le sigas el juego. Respondé: "Disculpá, prefiero que un productor humano te ayude con esa consulta específica. Ya te paso con uno." y generá el HANDOFF ($$HANDOFF_JSON$$) de inmediato con summary: "Consulta fuera de tema".

ESTADO DE LA CONVERSACIÓN Y TUS ACCIONES:
La IA deducirá el estado según el historial:

ETAPA 1 - BIENVENIDA Y NOMBRE:
- Si no sabés el nombre del cliente, saluda y pedíselo. Ej: "¡Hola! Bienvenido a NexoFilm. ¿Con quién tengo el gusto de hablar?" (Si no sabes el nombre, NO envíes el menú).

ETAPA 2 - MENÚ DE OPCIONES:
- Cuando el cliente te dice su nombre por primera vez, saludalo y MANDALE EL MENÚ USANDO EL TAG.
- FORMATO: "Un gusto, [Nombre]. Acá te dejo nuestras opciones:" $$SHOW_MENU$$
- REGLA DE ORO: PROHIBIDO escribir la lista de opciones (Fotografía, Videografía, etc.) en texto. Solo poné la frase de bienvenida y el tag $$SHOW_MENU$$. El sistema se encarga de mostrar los botones reales.
- Regla: Usá el tag $$SHOW_MENU$$ UNA SOLA VEZ en toda la charla.

ETAPA 3 - RECOLECCIÓN DE DATOS:
- Luego del menú, hace preguntas de a UNA por vez:
  1. Preguntá qué tipo de servicio audiovisual busca (Foto, Video, Streaming, o combos).
  2. Si es un TRABAJO DE COBERTURA (feria, casamiento, evento, recital, congreso) o STREAMING, DEBES hacer preguntas clave para el presupuesto:
     - ¿Qué fecha y locación/lugar es?
     - ¿Qué cantidad aproximada de invitados o asistentes esperan?
     - ¿Cuántas horas de duración estiman?
  3. [NUEVO] ¡IMPORTANTE! Pedí siempre un **correo electrónico** de contacto para mandarle el presupuesto formal.
  4. Secuenciá estas preguntas de forma natural y amigable (una por vez).
  5. Cuando tengas toda esa info técnica Y EL MAIL, generá la derivación (HANDOFF).
  6. A partir de que generás el HANDOFF, NO agregues preguntas adicionales de seguimiento.
- PREGUNTA CORTA: Tus respuestas deben terminar en una pregunta sencilla para guiar la charla, excepto en el mensaje final.

{{VIP_RULE}}

PROTOCOLO DE CIERRE (HANDOFF):
Si ya tenés todos los datos (incluyendo el mail) O el cliente pide un humano explícitamente, terminá la charla acá.
NO HAGAS MÁS PREGUNTAS EN EL MENSAJE DE CIERRE. Despedite de forma conclusiva.
Debes incluir EXACTAMENTE este JSON oculto al principio del mensaje:
$$HANDOFF_JSON$$
{
  "handoff": true,
  "name": "Nombre de la persona",
  "email": "correo@ejemplo.com",
  "summary": "Resumen DETALLADO. Incluye: Tipo de servicio, Para qué tipo de evento, Fecha EXACTA, Locación específica, Cantidad de gente y Duración estimada. No seas escueto.",
  "score": 90,
  "is_hot": true
}
$$HANDOFF_JSON$$
Despedida: "Bárbaro [Nombre], ya le paso todo esto a producción. En breve un productor te escribe. Si querés volver a ver las opciones, escribí la palabra 'MENÚ'."`;

export default async function handler(req, res) {
    // --- VERIFICACIÓN DEL WEBHOOK (GET) ---
    if (req.method === 'GET') {
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];

        if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN?.trim()) {
            res.setHeader('Content-Type', 'text/plain');
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
            const messageId = message.id;
            let from = message.from;
            const phoneNumberId = value.metadata?.phone_number_id;

            // PREVENCIÓN DE DUPLICADOS
            if (supabase) {
                try {
                    const { data: alreadyProcessed } = await supabase.from('whatsapp_messages_log').select('id').eq('id', messageId).maybeSingle();
                    if (alreadyProcessed) return res.status(200).json({ status: 'already_processed' });
                    await supabase.from('whatsapp_messages_log').insert([{ id: messageId, phone: from }]);
                } catch (dupErr) { console.log("⚠️ Ignorando duplicados:", dupErr.message); }
            }

            // Parche ARG
            if (from.startsWith('549') && from.length === 13) {
                from = '54' + from.substring(3);
            }

            // Ignorar Admin
            if (message.from === ADMIN_NUMBER || from === ADMIN_NUMBER) {
                return res.status(200).json({ status: 'admin_ignored' });
            }

            if (message.type === 'text') {
                const text = message.text.body.toLowerCase().trim();

                if (text === 'reset') {
                    if (supabase) {
                        try {
                            await supabase.from('whatsapp_sessions').delete().eq('phone', from);
                            await supabase.from('whatsapp_leads').update({ created_at: '2020-01-01T00:00:00' }).eq('phone', from);
                            await supabase.from('whatsapp_leads').delete().eq('phone', from);
                        } catch (err) { console.error("Error RESET:", err); }
                    }
                    await sendWhatsAppMessage(phoneNumberId, from, "🔄 Memoria 100% borrada.");
                    return res.status(200).json({ status: 'session_reset' });
                }

                if (/^(menu|menú)$/i.test(text)) {
                    await sendInteractiveMenu(phoneNumberId, from);
                    return res.status(200).json({ status: 'menu_sent' });
                }

                if (['humano', 'asesor', 'atencion'].some(w => text.includes(w))) {
                    await sendWhatsAppMessage(phoneNumberId, from, "Entendido. Un productor humano te va a contactar. 👤📞");
                    await sendWhatsAppMessage(phoneNumberId, ADMIN_NUMBER, `🔔 *BYPASS HUMANO:* +${from}`);
                    return res.status(200).json({ status: 'human_bypassed' });
                }

                // Silencio Inteligente
                if (supabase) {
                    try {
                        const { data: recentLead } = await supabase.from('whatsapp_leads').select('created_at').eq('phone', from).order('created_at', { ascending: false }).limit(1).maybeSingle();
                        if (recentLead) {
                            const diffHours = (new Date() - new Date(recentLead.created_at)) / (1000 * 60 * 60);
                            if (diffHours < 24) {
                                // Guardar mensaje para el CRM y enviar alerta si pasaron 10 min
                                await saveToHistory(from, text);
                                return res.status(200).json({ status: 'bot_silenced' });
                            }
                        }
                    } catch (err) { console.error("Error silencio:", err); }
                }

                await handleAIConversation(phoneNumberId, from, message.text.body);
                return res.status(200).json({ status: 'ai_reply_sent' });
            }

            if (message.type === 'interactive') {
                const btnId = message.interactive.button_reply.id;
                const btnTitle = message.interactive.button_reply.title || btnId;
                await handleButtonAction(phoneNumberId, from, btnId, btnTitle);
                return res.status(200).json({ status: 'interaction_handled' });
            }

            return res.status(200).json({ status: 'unhandled_type' });

        } catch (error) {
            console.error('❌ Error POST:', error);
            return res.status(500).json({ error: error.message });
        }
    }
    return res.status(405).json({ error: 'Método no permitido' });
}

// FUNCIONES CORE

async function handleAIConversation(phoneNumberId, to, userMessage) {
    let history = [];
    if (supabase) {
        try {
            const { data } = await supabase.from('whatsapp_sessions').select('history').eq('phone', to).maybeSingle();
            if (data?.history) history = data.history;
        } catch (e) { console.error("Error LOAD:", e); }
    }

    history.push({ role: 'user', content: userMessage });
    if (history.length > 10) history = history.slice(-10);

    // Guardado preventivo
    if (supabase) {
        await supabase.from('whatsapp_sessions').upsert({ phone: to, history, updated_at: new Date().toISOString() }, { onConflict: 'phone' }).catch(e => console.log("Error save pre-ia:", e));
    }

    const aiRawResponse = await generateAIResponse(history, "Directo", to);
    history.push({ role: 'assistant', content: aiRawResponse });

    // Resumen incremental asíncrono
    if (supabase) {
        groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            messages: [{ role: "system", content: "Resumí en una frase técnica la intención del cliente." }, ...history.slice(-4)],
            max_tokens: 50
        }).then(res => {
            const sum = res.choices[0]?.message?.content?.replace(/"/g, '') || "";
            return supabase.from('whatsapp_leads').upsert({ phone: to, summary: sum, updated_at: new Date().toISOString() }, { onConflict: 'phone' });
        }).catch(e => console.error("Error sum:", e));
    }

    let finalResponse = aiRawResponse;
    let handoffData = null;
    let showMenu = false;

    const jsonMatch = aiRawResponse.match(/\$\$HANDOFF_JSON\$\$([\s\S]*?)\$\$HANDOFF_JSON\$\$/);
    if (jsonMatch) {
        try {
            handoffData = JSON.parse(jsonMatch[1]);
            finalResponse = aiRawResponse.replace(jsonMatch[0], '').trim();
        } catch (e) { console.error("JSON error:", e); }
    }

    if (finalResponse.includes('$$SHOW_MENU$$')) {
        showMenu = true;
        finalResponse = finalResponse.replace('$$SHOW_MENU$$', '').trim();
    }

    await sendWhatsAppMessage(phoneNumberId, to, finalResponse);
    if (showMenu) await sendInteractiveMenu(phoneNumberId, to);

    if (handoffData?.handoff) {
        await triggerHandoff(phoneNumberId, to, handoffData, history);
    } else {
        if (supabase) await supabase.from('whatsapp_sessions').upsert({ phone: to, history, updated_at: new Date().toISOString() }, { onConflict: 'phone' }).catch(e => console.log("Error final save:", e));
    }
}

async function handleButtonAction(phoneNumberId, from, btnId, btnTitle) {
    let history = [];
    if (supabase) {
        const { data } = await supabase.from('whatsapp_sessions').select('history').eq('phone', from).maybeSingle();
        if (data?.history) history = data.history;
    }

    history.push({ role: 'user', content: `[Botón: ${btnTitle}]` });

    let replyMsg = "";
    if (btnId === 'btn_presupuesto') replyMsg = "¡Genial! Contame un poco: ¿Buscás Foto, Video o los dos? 📸🎥";
    else if (btnId === 'btn_portfolio') replyMsg = "🎬 Mirá nuestros trabajos en: https://nexofilm.com";
    else if (btnId === 'btn_humano') {
        replyMsg = "Entendido. Un productor te va a contactar. 👤📞";
        await sendWhatsAppMessage(phoneNumberId, ADMIN_NUMBER, `🔔 ALERTA BOTÓN HUMANO: +${from}`);
    }

    if (replyMsg) {
        await sendWhatsAppMessage(phoneNumberId, from, replyMsg);
        history.push({ role: 'assistant', content: replyMsg });
        if (supabase) await supabase.from('whatsapp_sessions').upsert({ phone: from, history, updated_at: new Date().toISOString() }, { onConflict: 'phone' }).catch(e => console.log("Error save btn:", e));
    }
}

async function triggerHandoff(phoneNumberId, to, handoffData, history) {
    // Alerta Admin
    try {
        await sendTemplateMessage(phoneNumberId, ADMIN_NUMBER, 'aletra_de_lead', 'es', [
            { type: 'body', parameters: [{type:'text',text:to},{type:'text',text:'WhatsApp'},{type:'text',text:handoffData.score||'--'},{type:'text',text:handoffData.summary.substring(0,800)},{type:'text',text:to}] }
        ]);
    } catch (e) {}

    // Resend Email
    try {
        await resend.emails.send({
            from: 'NexoFilm CRM <onboarding@resend.dev>',
            to: ['martinmagarinios@gmail.com'],
            subject: `🚨 NUEVO LEAD: ${handoffData.name || 'Sin nombre'}`,
            html: `<h1>Nuevo Lead 🔥</h1><p>+${to}</p><p>${handoffData.summary}</p>`
        });
    } catch (e) {}

    // Guardar Lead y Sesión final
    if (supabase) {
        await supabase.from('whatsapp_leads').upsert({ 
            phone: to, 
            name: handoffData.name || 'Sin nombre', 
            email: handoffData.email, 
            summary: handoffData.summary, 
            score: handoffData.score, 
            updated_at: new Date().toISOString() 
        }, { onConflict: 'phone' });
        await supabase.from('whatsapp_sessions').upsert({ phone: to, history, updated_at: new Date().toISOString() }, { onConflict: 'phone' });
    }
}

async function saveToHistory(phone, text) {
    if (!supabase) return;
    const { data } = await supabase.from('whatsapp_sessions').select('history').eq('phone', phone).maybeSingle();
    let hist = data?.history || [];
    hist.push({ role: 'user', content: text, timestamp: new Date().toISOString() });
    await supabase.from('whatsapp_sessions').upsert({ phone, history: hist, updated_at: new Date().toISOString() }, { onConflict: 'phone' });
}

async function generateAIResponse(historyMessages, source, phone) {
    try {
        let vip = "";
        if (historyMessages.length <= 1 && supabase) {
            const { data } = await supabase.from('whatsapp_leads').select('name').eq('phone', phone).order('created_at', { ascending: false }).limit(1).maybeSingle();
            if (data?.name && data.name !== 'Sin nombre') {
                vip = `RECONOCIMIENTO VIP (USUARIO RECURRENTE):\nEl usuario ya confió en nosotros y está en nuestra base como ${data.name}.\nDado que es su PRIMER mensaje tras mucho tiempo, saludalo EXACTAMENTE así: "¡Hola ${data.name}! Qué bueno tenerte de vuelta por NexoFilm. ¿En qué podemos ayudarte hoy?" y enviá el tag $$SHOW_MENU$$. NO preguntes su nombre de nuevo NI HAGAS OTRAS PREGUNTAS iniciales.`;
            }
        }

        const comp = await groq.chat.completions.create({
            messages: [{ role: 'system', content: SYSTEM_PROMPT.replace('{{VIP_RULE}}', vip).replace('{{SOURCE}}', source) }, ...historyMessages],
            model: 'llama-3.1-8b-instant',
            temperature: 0.5,
            max_tokens: 600,
        });
        return comp.choices[0]?.message?.content || 'Por favor reintentá.';
    } catch (e) { return 'Error técnico. Contactanos a hola@nexofilm.com'; }
}

async function sendInteractiveMenu(phoneNumberId, to) {
    const body = {
        messaging_product: 'whatsapp',
        to: to,
        type: 'interactive',
        interactive: {
            type: 'button',
            body: { text: "¿En qué podemos ayudarte hoy? Seleccioná una opción:" },
            action: {
                buttons: [
                    { type: "reply", reply: { id: "btn_presupuesto", title: "📋 Pedir Presupuesto" } },
                    { type: "reply", reply: { id: "btn_portfolio", title: "🎬 Ver Portfolio" } },
                    { type: "reply", reply: { id: "btn_humano", title: "👤 Hablar con Humano" } }
                ]
            }
        }
    };
    await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN?.trim()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
}

async function sendWhatsAppMessage(phoneNumberId, to, message) {
    await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN?.trim()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: message } })
    });
}

async function sendTemplateMessage(phoneNumberId, to, templateName, languageCode, components) {
    await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN?.trim()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'template', template: { name: templateName, language: { code: languageCode }, components } })
    });
}
