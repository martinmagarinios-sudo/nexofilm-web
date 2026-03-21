import Groq from 'groq-sdk';
import { createClient } from '@supabase/supabase-js';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY?.trim() });

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

ESTADO DE LA CONVERSACIÓN Y TUS ACCIONES:
La IA deducirá el estado según el historial:

ETAPA 1 - BIENVENIDA Y NOMBRE:
- Si no sabés el nombre del cliente, saluda y pedíselo. Ej: "¡Hola! Bienvenido a NexoFilm. ¿Con quién tengo el gusto de hablar?" (Si no sabes el nombre, NO envíes el menú).

ETAPA 2 - MENÚ DE OPCIONES:
- Cuando el cliente te dice su nombre por primera vez, saludalo, y MANDALES EL MENÚ. 
- FORMATO: "Un gusto, [Nombre]. Acá te dejo nuestras opciones:" $$SHOW_MENU$$
- Regla: Usá $$SHOW_MENU$$ UNA SOLA VEZ en toda la charla.

ETAPA 3 - RECOLECCIÓN DE DATOS:
- Luego del menú, hace preguntas de a UNA por vez:
  1. Preguntá qué tipo de servicio audiovisual busca (Foto, Video, Streaming, o combos).
  2. Si es un TRABAJO DE COBERTURA (feria, casamiento, evento, recital, congreso), DEBES hacer 2 preguntas clave para el presupuesto:
     - ¿Qué fecha y locación/lugar es?
     - ¿Qué cantidad aproximada de invitados o asistentes esperan? (vital para calcular tamaño del equipo).
  3. Secuenciá estas preguntas de forma natural y amigable.
  4. Cuando tengas toda esa info técnica principal, generá la derivación (HANDOFF).
  5. A partir de que generás el HANDOFF, NO agregues preguntas adicionales de seguimiento.
- PREGUNTA CORTA: Tus respuestas deben terminar en una pregunta sencilla para guiar la charla, excepto en el mensaje final.

{{VIP_RULE}}

PROTOCOLO DE CIERRE (HANDOFF):
Si ya tenés todos los datos O el cliente pide un humano explícitamente, terminá la charla acá.
NO HAGAS MÁS PREGUNTAS EN EL MENSAJE DE CIERRE. Despedite de forma conclusiva.
Debes incluir EXACTAMENTE este JSON oculto al principio del mensaje:
$$HANDOFF_JSON$$
{
  "handoff": true,
  "name": "Nombre de la persona",
  "summary": "Resumen rápido (ej: Streaming evento, 10 de Mayo, CABA)",
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

        console.log(`[VERIFY WEBHOOK] Recibido mode=${mode}, token=${token}, challenge=${challenge}`);

        if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN?.trim()) {
            console.log('[VERIFY WEBHOOK] Token válido. Respondiendo challenge.');
            res.setHeader('Content-Type', 'text/plain');
            return res.status(200).send(challenge);
        }
        console.warn(`[VERIFY WEBHOOK] Token inválido o nulo. Se esperaba ${process.env.WHATSAPP_VERIFY_TOKEN?.trim()} y llegó ${token}`);
        return res.status(403).json({ error: 'Token inválido' });
    }

    // --- RECIBIR MENSAJES (POST) ---
    if (req.method === 'POST') {
        try {
            console.log("=== INCOMING POST ===", JSON.stringify(req.body));
            const body = req.body;
            const entry = body?.entry?.[0];
            const changes = entry?.changes?.[0];
            const value = changes?.value;

            if (!value?.messages || value.messages.length === 0) {
                return res.status(200).json({ status: 'no_message' });
            }

            const message = value.messages[0];
            let from = message.from;
            const phoneNumberId = value.metadata?.phone_number_id;

            // Parche específico para Argentina: Meta Cloud y WhatsApp desalinean el prefijo interno '9'
            // Los mensajes llegan con '54911...' pero la Sandbox de Facebook Cloud los cataloga como '5411...'
            if (from.startsWith('549') && from.length === 13) {
                from = '54' + from.substring(3);
                console.log("🐛 Parcheando número ARG para Sandbox de Meta:", from);
            }

            // Ignorar mensajes del Admin (usando el formato crudo que ingresa de WhatsApp)
            if (message.from === ADMIN_NUMBER) return res.status(200).json({ status: 'admin_ignored' });

            console.log(`📩 Mensaje de ${from}:`, message);

            // --- LÓGICA DE MENÚ E INTERACCIÓN ---

            // 1. Si es mensaje de TEXTO
            if (message.type === 'text') {
                const text = message.text.body.toLowerCase().trim();

                // Para forzar el menú principal manualmente mediante un comando
                const isMenuTrigger = /^(menu|menú)$/i.test(text);

                if (isMenuTrigger) {
                    await sendInteractiveMenu(phoneNumberId, from);
                    return res.status(200).json({ status: 'menu_sent' });
                }

                // BYPASS INMEDIATO PARA HABLAR CON HUMANO (Para no dar mil vueltas en la IA)
                if (['humano', 'asesor', 'persona', 'hablar con', 'put', 'mierd', 'contact'].some(w => text.includes(w))) {
                    await sendWhatsAppMessage(phoneNumberId, from, "Entendido. Un productor humano te va a contactar a la brevedad por este medio. 👤📞");
                    await sendWhatsAppMessage(phoneNumberId, ADMIN_NUMBER, `🔔 *ALERTA URGENTE:* El cliente +${from} pide hablar con un humano por mensaje (Bypass AI).`);
                    return res.status(200).json({ status: 'human_bypassed' });
                }

                // VERIFICACIÓN DE SILENCIO (Si ya es un lead activo, el bot se calla)
                if (supabase && !isMenuTrigger) {
                    try {
                        const { data: recentLead } = await supabase
                            .from('whatsapp_leads')
                            .select('created_at')
                            .eq('phone', from)
                            .order('created_at', { ascending: false })
                            .limit(1)
                            .maybeSingle();

                        if (recentLead) {
                            const lastContact = new Date(recentLead.created_at);
                            const now = new Date();
                            const diffHours = (now - lastContact) / (1000 * 60 * 60);

                            if (diffHours < 24) {
                                console.log(`🤫 Bot silenciado para ${from} (Lead activo hace ${diffHours.toFixed(1)}h)`);
                                return res.status(200).json({ status: 'bot_silenced_active_lead' });
                            }
                        }
                    } catch (err) {
                        console.error("Error verificando silencio:", err);
                    }
                }

                // Procesar con Groq
                await handleAIConversation(phoneNumberId, from, message.text.body);
                return res.status(200).json({ status: 'ai_reply_sent' });
            }

            // 2. Si es respuesta a un BOTÓN (interactive)
            if (message.type === 'interactive') {
                const btnId = message.interactive.button_reply.id;
                const btnTitle = message.interactive.button_reply.title || btnId;

                // PERSISTENCIA: Cargar historial de Supabase
                let history = [];
                if (supabase) {
                    const { data } = await supabase.from('whatsapp_sessions').select('history').eq('phone', from).maybeSingle();
                    if (data?.history) history = data.history;
                }

                // Guardamos DENTRO del historial la accion que hizo el usuario para que la IA no se pierda
                history.push({ role: 'user', content: `[Seleccionó botón de menú: ${btnTitle}]` });

                let replyMsg = "";
                if (btnId === 'btn_presupuesto') {
                    replyMsg = "¡Genial! Para armarte la propuesta a medida, contame un poco más: ¿Estás buscando servicio de Foto, de Video, o los dos? 📸🎥";
                }
                else if (btnId === 'btn_portfolio') {
                    replyMsg = "¡Claro! Mirá algunos de nuestros trabajos acá:\n\n🎬 **Web:** https://nexofilm.com\n\n¿Te gustaría pedir un presupuesto después de verlos?";
                }
                else if (btnId === 'btn_humano') {
                    replyMsg = "Entendido. Un productor te va a contactar a la brevedad. 👤📞";
                    await sendWhatsAppMessage(phoneNumberId, ADMIN_NUMBER, `🔔 *ALERTA:* El cliente +${from} pide hablar con un humano por el Bot.`);
                }

                if (replyMsg) {
                    await sendWhatsAppMessage(phoneNumberId, from, replyMsg);
                    history.push({ role: 'assistant', content: replyMsg });
                    // PERSISTENCIA: Guardar historial
                    if (supabase) {
                        try {
                            await supabase.from('whatsapp_sessions').upsert({ phone: from, history, updated_at: new Date().toISOString() });
                        } catch (e) {
                            console.error("Error guardando sesion tras boton", e);
                        }
                    }
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

// Mapa para guardar el historial de conversaciones temporalmente en RAM
// Nota: en producción en Vercel (serveless) esta memoria se borra si el bot no se usa por un rato,
// pero sirve perfectamente para mantener el hilo de una conversación fluida en el momento.
const chatHistory = new Map();
const chatSources = new Map();

async function handleAIConversation(phoneNumberId, to, userMessage) {
    // Mapeo sugerido por el usuario para detectar origen segun la frase
    let currentSource = "Orgánico / Directo";
    const msgLower = userMessage.toLowerCase().trim();

    if (msgLower.includes("navegando en tu web")) {
        currentSource = "Web";
    } else if (msgLower.includes("contenido en instagram")) {
        currentSource = "Instagram";
    } else if (msgLower.includes("contacto desde linkedin")) {
        currentSource = "LinkedIn";
    } else if (msgLower.includes("vi tu anuncio")) {
        currentSource = "MetaAds";
    } else {
        // Mantener compatibilidad con el tag técnico [Ref: ...] si se usara internamente
        const refMatch = userMessage.match(/\[Ref:\s*(.*?)\]/i);
        if (refMatch) {
            currentSource = refMatch[1].trim();
            userMessage = userMessage.replace(refMatch[0], '').trim() || 'Hola';
        }
    }

    // Guardar o actualizar origen
    if (!chatSources.has(to) || currentSource !== "Orgánico / Directo") {
        chatSources.set(to, currentSource);
    }

    // Recuperar historial previo (Prioridad Supabase > RAM fallback)
    let history = [];
    if (supabase) {
        try {
            const { data } = await supabase.from('whatsapp_sessions').select('history').eq('phone', to).maybeSingle();
            if (data?.history) history = data.history;
        } catch (e) { console.error("Error cargando sesión:", e); }
    }

    // Agregar mensaje del usuario al historial
    history.push({ role: 'user', content: userMessage });

    // Mantener solo los últimos 12 mensajes para no agotar la memoria de Groq pero tener buen contexto
    if (history.length > 12) {
        history = history.slice(-12);
    }

    const aiRawResponse = await generateAIResponse(history, chatSources.get(to) || "Orgánico / Directo", to);

    // Agregar la respuesta de la IA al historial
    history.push({ role: 'assistant', content: aiRawResponse });

    let finalResponse = aiRawResponse;
    let handoffData = null;
    let showMenu = false;

    const jsonMatch = aiRawResponse.match(/\$\$HANDOFF_JSON\$\$([\s\S]*?)\$\$HANDOFF_JSON\$\$/);
    if (jsonMatch && jsonMatch[1]) {
        try {
            handoffData = JSON.parse(jsonMatch[1]);
            finalResponse = aiRawResponse.replace(jsonMatch[0], '').trim();
        } catch (e) {
            console.error('Error JSON:', e);
        }
    }

    if (finalResponse.includes('$$SHOW_MENU$$')) {
        showMenu = true;
        finalResponse = finalResponse.replace('$$SHOW_MENU$$', '').trim();
    }

    await sendWhatsAppMessage(phoneNumberId, to, finalResponse);

    if (showMenu) {
        await sendInteractiveMenu(phoneNumberId, to);
    }

    if (handoffData?.handoff) {
        let scoreEmoji = '';
        if (handoffData.is_hot) scoreEmoji = '🔥 ';
        else if (handoffData.score > 70) scoreEmoji = '🟢 ';
        else if (handoffData.score > 40) scoreEmoji = '🟡 ';
        else if (handoffData.score) scoreEmoji = '🔴 ';

        const savedSource = chatSources.get(to) || "Orgánico / Directo";

        const adminMsg = `🔔 *NUEVO LEAD - NEXO FILM*\n\n👤 *Cliente:* \`+${to}\`\n🌐 *Origen:* ${savedSource}\n📈 *Score:* ${scoreEmoji}${handoffData.score || 'N/A'}/100\n📝 *Resumen:* ${handoffData.summary}\n👉 https://wa.me/${to}`;
        await sendWhatsAppMessage(phoneNumberId, ADMIN_NUMBER, adminMsg);

        // Guardar en Supabase
        if (supabase) {
            try {
                // Preparamos el payload validando que existan los datos para no romper insert viejo si Groq se olvida
                const leadPayload = {
                    phone: to,
                    name: handoffData.name || 'Sin nombre',
                    summary: handoffData.summary || 'Derivado sin resumen (Bypass)',
                    source: savedSource
                };

                if (handoffData.score !== undefined) leadPayload.score = handoffData.score;
                if (handoffData.is_hot !== undefined) leadPayload.is_hot = handoffData.is_hot;

                const { error } = await supabase
                    .from('whatsapp_leads')
                    .insert([leadPayload]);

                if (error) {
                    console.error('❌ Error insertando lead en Supabase:', error);
                } else {
                    console.log('✅ Lead guardado exitosamente en Supabase:', to);
                }
            } catch (dbError) {
                console.error('❌ Error de conexión con Supabase:', dbError);
            }
        } else {
            console.warn('⚠️ Credenciales de Supabase no configuradas. El lead no se guardó en la DB.');
        }

        // PERSISTENCIA: Guardar historial actualizado en Supabase
        if (supabase) {
            try {
                await supabase.from('whatsapp_sessions').upsert({
                    phone: to,
                    history,
                    updated_at: new Date().toISOString()
                });
            } catch (e) { console.error("Error guardando sesión:", e); }
        }

        // Limpiamos el historial si ya se derivó a un humano (Cerrar sesión)
        if (supabase) await supabase.from('whatsapp_sessions').delete().eq('phone', to);
        chatSources.delete(to);
    } else {
        // Si NO hubo handoff, guardamos el historial normalmente para la próxima vez
        if (supabase) {
            try {
                await supabase.from('whatsapp_sessions').upsert({
                    phone: to,
                    history,
                    updated_at: new Date().toISOString()
                });
            } catch (e) { console.error("Error guardando sesión activa:", e); }
        }
    }
}

async function generateAIResponse(historyMessages, currentSource, phone) {
    try {
        let dynamicPrompt = SYSTEM_PROMPT.replace('{{SOURCE}}', currentSource);
        let vipRule = "";

        if (supabase && historyMessages.length <= 1) { // Solo si arrancamos la charla (0 o 1 mensaje previo)
            const { data } = await supabase.from('whatsapp_leads').select('name').eq('phone', phone).order('created_at', { ascending: false }).limit(1).maybeSingle();
            if (data?.name && data.name !== 'Sin nombre') {
                vipRule = `RECONOCIMIENTO VIP (USUARIO RECURRENTE):\nEl usuario ya confió en nosotros o dejó un lead antes. Su nombre es: ${data.name}.\nDado que es su PRIMER mensaje, saludalo EXACTAMENTE así: "¡Hola ${data.name}! Qué bueno tenerte de vuelta por NexoFilm. ¿En qué podemos ayudarte hoy?" y activá el tag $$SHOW_MENU$$. NO preguntes su nombre de nuevo NI HAGAS OTRAS PREGUNTAS.`;
            }
        }

        dynamicPrompt = dynamicPrompt.replace('{{VIP_RULE}}', vipRule);

        const completion = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: dynamicPrompt },
                ...historyMessages
            ],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.5, // Bajamos temp para que sea más obediente con las reglas de negocio
            max_tokens: 600,
        });
        return completion.choices[0]?.message?.content || 'Disculpá, no entendí bien.';
    } catch (error) {
        console.error('❌ Error detallado Groq:', error?.response ? error.response : error);
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
                text: "¿En qué podemos ayudarte hoy? Seleccioná una opción:"
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

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN?.trim()}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
    });

    const result = await response.json();
    console.log("=== SEND MENU RESULT ===", JSON.stringify(result));
}

async function sendWhatsAppMessage(phoneNumberId, to, message) {
    const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
    const response = await fetch(url, {
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

    const result = await response.json();
    console.log("=== SEND MESSAGE RESULT ===", JSON.stringify(result));
}
