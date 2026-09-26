import Groq, { toFile } from 'groq-sdk';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const groq = new Groq({ apiKey: (process.env.GROQ_API_KEY || '').trim() });
const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const supabaseKey = (process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_KEY || '').trim();
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;
const resend = new Resend((process.env.RESEND_API_KEY || '').trim());

const ADMIN_NUMBER = '541151191964';
const ADMIN_EMAIL = 'martin@nexofilm.com';

const TELEGRAM_BOT_TOKEN = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
const TELEGRAM_CHAT_ID = (process.env.TELEGRAM_CHAT_ID || '').trim();

const SYSTEM_PROMPT = `Sos el asistente virtual de NexoFilm, una productora audiovisual profesional en Argentina (Buenos Aires y Latam).
Tu rol es atender a los clientes por WhatsApp con un tono cálido, humano, ágil, impecable y profesional.
Tu misión principal es entender la necesidad del cliente y recopilar con amabilidad los datos necesarios para que el equipo de producción arme un presupuesto a medida.

DIRECTIVAS CRÍTICAS DE LENGUAJE Y ESTILO:
- IDIOMA Y TONO: Español rioplatense natural (voseo argentino formal y educado: "querés", "contame", "pasame", "tenés", "te parece"). NUNCA uses "tú", "usted" ni modismos excesivamente informales como "che".
- EXCELENCIA GRAMATICAL: Ortografía, redacción y puntuación perfectas. NUNCA inventes palabras ni uses expresiones traducidas de forma literal o extrañas.
- CONCISIÓN: Respuestas cortas, claras y al grano (máximo 2 a 3 oraciones por mensaje). Es un chat dinámico de WhatsApp, no un correo formal.
- ADAPTACIÓN AL TIPO DE EVENTO (MUY IMPORTANTE):
  * Si el cliente organiza un evento SOCIAL (cumpleaños, fiesta, casamiento, fiesta de 15, etc.): hablá en tono acorde, celebratorio y cercano. NUNCA hables de "tu equipo de trabajo", "tu empresa" ni "correo laboral".
  * Si el cliente organiza un evento CORPORATIVO o B2B (congreso, lanzamiento, video institucional, streaming para empresas, etc.): usá un tono profesional ejecutivo.
- NO REPETIR EN BUCLE: Si el cliente duda, pregunta algo ("¿es necesario el mail?", "¿cuánto sale?", etc.) o expresa confusión, respondé directamente a su duda puntual con amabilidad, empatía y claridad. NUNCA repitas el mismo mensaje textualmente ni insistas de forma rígida.
- LÍMITES ESTRICTOS: Solo respondés sobre servicios audiovisuales de NexoFilm (fotografía, video, streaming, cobertura de eventos, edición). No inventes presupuestos ni tarifas fijas cerradas; explicá que producción prepara la cotización detallada según lo que necesita.

FLUJO DE PRESUPUESTO (Hacé UNA sola pregunta por mensaje):
{{INSTRUCCION_DE_SALUDO}}

Pasos del presupuesto:
1. SERVICIO: Preguntá qué servicio busca (Foto, Video, Streaming o una combinación).
2. TIPO DE EVENTO: Preguntá qué tipo de evento o proyecto es (ej: cumpleaños, video corporativo, lanzamiento de producto, etc.).
3. FECHA Y LUGAR: Preguntá la fecha y lugar estimado del evento.
4. CANTIDAD DE INVITADOS Y HORAS: Preguntá cantidad aproximada de personas y horario o cantidad de horas de cobertura.
5. CORREO ELECTRÓNICO:
{{CONFIRMACION_EMAIL}}
6. CIERRE FINAL Y DERIVACIÓN:
- Cuando ya tengas los datos (o si el cliente no desea dejar su mail y prefiere coordinar todo por WhatsApp), cerrá diciendo exactamente:
"¡Bárbaro! Ya le paso todo a producción y un asesor te contactará a la brevedad. 👋"

MANEJO DE DESPEDIDAS Y AGRADECIMIENTOS:
- Si el usuario dice "gracias", "muchas gracias", "genial gracias" u otro agradecimiento tras completar el flujo, respondé cálidamente:
  "¡A vos! Que tengas un excelente día 🙌. Cualquier otra duda que surja, avisanos cuando quieras."
  NO hagas más preguntas ni repitas el menú.
- Si el usuario se despide ("chau", "hasta luego", etc.), respondé: "¡Hasta pronto! Fue un gusto. En breve nos comunicamos con vos. 👋"

REGLAS EXTRA:
- Si el usuario pregunta cosas ajenas a producción audiovisual, decí amablemente: "Sobre ese tema no te puedo ayudar, pero un asesor de NexoFilm te puede orientar con tu proyecto audiovisual si lo deseás."
- REINICIO: Si el usuario dice "[SISTEMA: REINICIAR FLUJO]", empezá de cero con la pregunta de servicios.`;


export default async function handler(req, res) {
    if (req.method === 'GET') {
        const token = req.query['hub.verify_token'];
        if (token === process.env.WHATSAPP_VERIFY_TOKEN) return res.status(200).send(req.query['hub.challenge']);
        return res.status(403).send('Error');
    }

    if (req.method !== 'POST') return res.status(405).send('Method not allowed');

    const body = req.body;

    // --- ACCIÓN WEBHOOK DE TELEGRAM (RESPUESTAS DESDE TEMAS DE TELEGRAM A WHATSAPP) ---
    if (body?.message?.chat?.id && String(body.message.chat.id) === TELEGRAM_CHAT_ID) {
        return handleTelegramWebhook(req, res, body);
    }

    // --- ACCIONES CONSOLIDADAS DEL ADMIN / PROMOS ---
    if (body && body.action) {
        const { action, phone, message: adminMsg, password } = body;
        
        // Validación de seguridad simple
        if (password !== 'Nex@2023R') {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (!supabase) {
            return res.status(500).json({ error: 'Supabase credentials not configured' });
        }

        const token = process.env.WHATSAPP_TOKEN?.trim();
        const phoneNumberId = process.env.WHATSAPP_PHONE_ID?.trim();

        if (!token || !phoneNumberId) {
            return res.status(500).json({ error: 'Faltan credenciales de WhatsApp (Token o PhoneID) en el servidor' });
        }

        try {
            if (action === 'admin_send') {
                if (!phone || !adminMsg) {
                    return res.status(400).json({ error: 'Faltan datos requeridos (phone o message)' });
                }

                const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        messaging_product: 'whatsapp',
                        recipient_type: 'individual',
                        to: phone,
                        type: 'text',
                        text: { body: adminMsg }
                    })
                });

                const result = await response.json();
                if (result.error) {
                    console.error("Error API Meta al enviar:", result.error);
                    return res.status(500).json({ error: 'Meta rechazó el mensaje', details: result.error });
                }

                // Guardar en el historial de Supabase
                const { data: sessionInfo } = await supabase
                    .from('whatsapp_sessions')
                    .select('history')
                    .eq('phone', phone)
                    .maybeSingle();
                
                let currentHistory = sessionInfo?.history || [];
                currentHistory.push({
                    role: 'admin',
                    content: adminMsg,
                    timestamp: new Date().toISOString()
                });

                await supabase
                    .from('whatsapp_sessions')
                    .upsert({ 
                        phone: phone,
                        history: currentHistory,
                        updated_at: new Date().toISOString() 
                    });

                await sendTelegramLog(phone, null, adminMsg, 'admin', currentHistory).catch(() => {});

                return res.status(200).json({ success: true, messageId: result.messages?.[0]?.id });

            } else if (action === 'send_promo') {
                if (!phone) return res.status(400).json({ error: 'Falta el teléfono' });

                const PROMO_MESSAGE = `¡Hola! Te escribimos de NexoFilm 🎬. Vimos que consultaste por nuestros servicios hace poco. 

Te recordamos que además de coberturas, hacemos:
✅ Foto Producto
✅ Streaming Profesional
✅ Video Institucional

¡Si mencionás este mensaje tenés un 10% OFF en tu próxima reserva! 🎥✨
¿Te gustaría que te coticemos algo nuevo?`;

                const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        messaging_product: 'whatsapp',
                        to: phone,
                        type: 'text',
                        text: { body: PROMO_MESSAGE }
                    })
                });

                const result = await response.json();
                if (result.error) {
                    throw new Error(result.error.message);
                }

                // Registrar en historial
                const { data: session } = await supabase
                    .from('whatsapp_sessions')
                    .select('history')
                    .eq('phone', phone)
                    .maybeSingle();

                const history = session?.history || [];
                history.push({
                    role: 'admin',
                    content: `🚀 PROMO ENVIADA: \n${PROMO_MESSAGE}`,
                    timestamp: new Date().toISOString()
                });

                await supabase.from('whatsapp_sessions').upsert({
                    phone,
                    history,
                    updated_at: new Date().toISOString()
                });
                
                await supabase.from('whatsapp_leads').update({ etiquetas: 'promo_enviada' }).eq('phone', phone);

                return res.status(200).json({ success: true, message: 'Promo enviada' });
            } else {
                return res.status(400).json({ error: 'Acción no soportada' });
            }
        } catch (err) {
            console.error("Error en whatsapp-admin action:", err);
            return res.status(500).json({ error: err.message });
        }
    }

    const message = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!message) return res.status(200).send('OK');

    // 🛑 Filtrar eventos de reacción (emojis como 👍 o ❤️) para evitar falsas alertas o respuestas fuera de lugar
    if (message.type === 'reaction') return res.status(200).send('OK');

    const phoneNumberId = body.entry[0].changes[0].value.metadata.phone_number_id;
    const fromRaw = message.from;
    let from = fromRaw;
    if (from.startsWith('549') && from.length === 13) from = '54' + from.substring(3);

    if (from === ADMIN_NUMBER || fromRaw === ADMIN_NUMBER) return res.status(200).send('OK');

    try {
        const isInteractive = message.type === 'interactive';
        const isTextMessage = message.type === 'text';
        let rawText = message.text?.body || "";
        let userDisplayContent = "";

        if (isTextMessage) {
            userDisplayContent = rawText;
        } else if (message.type === 'audio' && message.audio?.id) {
            const audioTranscription = await transcribeAudio(message.audio.id);
            if (audioTranscription) {
                rawText = audioTranscription;
                userDisplayContent = `🎤 [Audio]: "${audioTranscription}"`;
            } else {
                userDisplayContent = "🎤 [Nota de voz / audio]";
            }
        } else if (message.type === 'image') {
            userDisplayContent = message.image?.caption ? `🖼️ [Imagen]: ${message.image.caption}` : "🖼️ [Envió una foto / imagen]";
            if (message.image?.caption) rawText = message.image.caption;
        } else if (message.type === 'video') {
            userDisplayContent = message.video?.caption ? `🎥 [Video]: ${message.video.caption}` : "🎥 [Envió un video]";
            if (message.video?.caption) rawText = message.video.caption;
        } else if (message.type === 'document') {
            const docName = message.document?.filename || 'documento';
            userDisplayContent = message.document?.caption ? `📄 [Doc ${docName}]: ${message.document.caption}` : `📄 [Envió documento: ${docName}]`;
            if (message.document?.caption) rawText = message.document.caption;
        } else if (message.type === 'sticker') {
            userDisplayContent = "🏷️ [Envió un sticker]";
        } else if (message.type === 'location') {
            const locDesc = message.location?.name || message.location?.address || `${message.location?.latitude}, ${message.location?.longitude}`;
            userDisplayContent = `📍 [Ubicación]: ${locDesc}`;
        } else if (message.type === 'contacts') {
            userDisplayContent = "👤 [Compartió un contacto]";
        } else if (isInteractive) {
            userDisplayContent = message.interactive?.button_reply?.title || "[Interacción con botón]";
        } else {
            userDisplayContent = "[Mensaje multimedia / sin texto]";
        }

        const text = rawText.toLowerCase();

        // 2. Cargar historial + Info del Lead (CRM) en PARALELO (Búsqueda Robusta)
        const normalizePhone = (p) => {
            let d = (p || '').replace(/\D/g, '');
            if (d.startsWith('549') && d.length > 10) d = '54' + d.slice(3); // Normalizar Argentina
            return d;
        };

        const [historyData, leadData] = await Promise.all([
            loadHistory(from),
            supabase ? (async () => {
                const searchStr = from.slice(-8); // Buscamos por los últimos 8 por si el prefijo varía
                const { data } = await supabase
                    .from('whatsapp_leads')
                    .select('*')
                    .like('phone', `%${searchStr}%`)
                    .order('created_at', { ascending: false });
                
                // Si hay varios, intentamos el match más cercano por normalización
                const bestMatch = data?.find(l => normalizePhone(l.phone) === normalizePhone(from));
                return bestMatch || data?.[0] || null;
            })() : Promise.resolve(null)
        ]);

        const history = historyData.history;
        const targetPhone = leadData?.phone || from; // Usamos el del CRM si existe, sino el de WhatsApp
        const now = Date.now();
        const lastInteraction = historyData.updated_at ? new Date(historyData.updated_at).getTime() : 0;

        const isWebStart = text.includes("estoy navegando en tu web") && text.includes("consulta");

        // Registrar mensaje entrante en Telegram en tiempo real
        await sendTelegramLog(from, leadData?.name, userDisplayContent, 'user', history).catch(() => {});

        // --- ALERTA TEMPRANA POR NUEVO CHAT (HISTORY VACÍO) ---
        // Si el cliente envía su primer mensaje (ya sea extraño total o alguien importado en la "agenda"),
        // lo registramos de inmediato en el panel como "En curso" y te enviamos el correo electrónico de alerta.
        if (history.length === 0 && text !== 'reset' && text !== 'hard reset') {
            const contactNameForEmail = leadData?.name && leadData.name !== 'Sin nombre' ? leadData.name : `+${from}`;
            console.log(`[ALERTA TEMPRANA] Cliente ${contactNameForEmail} inició chat.`);

            let detectedSource = 'Bot Nuevo';
            if (text.includes("instagram") || text.includes("ig")) detectedSource = '📱 Instagram';
            else if (text.includes("linkedin")) detectedSource = '💼 LinkedIn';
            else if (text.includes("youtube")) detectedSource = '▶️ YouTube';
            else if (text.includes("portfolio") || text.includes("behance")) detectedSource = '🎨 Portfolio';
            else if (text.includes("qr") || text.includes("escaneé")) detectedSource = '🔲 Código QR';
            else if (isWebStart || text.includes("vengo de la web")) detectedSource = '🌐 Web';

            if (supabase) {
                if (!leadData) {
                    await supabase.from('whatsapp_leads').insert({
                        phone: targetPhone,
                        name: 'Sin nombre',
                        source: detectedSource,
                        score: 40,
                        summary: 'Conversación en curso con NexoBot IA...',
                        updated_at: new Date().toISOString()
                    }).then(null, () => {}); // Ignoramos si choca
                } else {
                    await supabase.from('whatsapp_leads').update({
                        summary: 'Conversación en curso con NexoBot IA...',
                        updated_at: new Date().toISOString()
                    }).eq('id', leadData.id).then(null, () => {}); // Update seguro por ID
                }
            }

            const firstMessageText = userDisplayContent || "[Mensaje sin texto]";
            await sendDualEmail(
                `👀 Chat en vivo: ${contactNameForEmail}`,
                `
                    <div style="font-family: sans-serif; padding: 20px; border-top: 4px solid #ccff00;">
                        <h2 style="color: #1a1a1a;">🤖 NexoBot está atendiendo a alguien</h2>
                        <table style="border-collapse: collapse; width: 100%; margin-bottom: 16px;">
                            <tr>
                                <td style="padding: 6px 12px 6px 0; color: #555; white-space: nowrap;"><strong>Cliente:</strong></td>
                                <td style="padding: 6px 0;">${contactNameForEmail}</td>
                            </tr>
                            <tr>
                                <td style="padding: 6px 12px 6px 0; color: #555; white-space: nowrap;"><strong>WhatsApp:</strong></td>
                                <td style="padding: 6px 0;">+${from}</td>
                            </tr>
                            <tr>
                                <td style="padding: 6px 12px 6px 0; color: #555; white-space: nowrap;"><strong>Origen:</strong></td>
                                <td style="padding: 6px 0;">${detectedSource}</td>
                            </tr>
                        </table>
                        <div style="background: #f5f5f5; border-left: 4px solid #ccff00; padding: 12px 16px; border-radius: 4px; margin-bottom: 20px;">
                            <p style="margin: 0 0 4px 0; font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.5px;">💬 Su primer mensaje fue:</p>
                            <p style="margin: 0; font-size: 15px; color: #1a1a1a; font-style: italic;">"${firstMessageText}"</p>
                        </div>
                        <p style="color: #555; font-size: 13px;">Recibís este aviso para poder monitorear la venta en tiempo real y engancharlo por tu cuenta si deja de contestarle a la máquina.</p>
                        <br/>
                        <a href="https://nexofilm.com/admin/chat?phone=${from}" style="background: #000; color: #ccff00; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Espiar Chat en Vivo</a>
                    </div>
                `
            );

            // 🔒 GUARDAR SESIÓN TEMPRANA: Persistimos el primer mensaje del cliente
            // inmediatamente, antes de llamar a Groq. Así el chat aparece en el CRM
            // aunque el bot crashee después (timeout de Vercel, error de Groq, etc.)
            await persistHistory(from, [{
                role: 'user',
                content: userDisplayContent || "[Inició conversación]",
                timestamp: new Date().toISOString()
            }]).catch(() => {}); // Silencioso para no romper el flujo
        }

        // --- SESIONES ANTIGUAS (Auto-Reset) ---
        // Si pasaron más de 4 días (4 * 24 * 60 * 60 * 1000 ms) sin interactuar, vaciamos su memoria
        // para que lo trate como un VIP que vuelve a saludar y comience el flujo fresco.
        if (lastInteraction > 0 && (now - lastInteraction) > 4 * 24 * 60 * 60 * 1000) {
            console.log(`[AUTO-RESET] Sesión inactiva de +4 días borrada para ${from}`);
            history.length = 0;
            if (supabase) {
                supabase.from('whatsapp_sessions').update({ history: [] }).eq('phone', from).then(null, () => {});
            }
        }

        // --- RESET / MENU / WEB START MANUAL ---
        const isMenuCommand = text === 'menu' || text === 'menú' || text.startsWith('ver menu') || text.startsWith('ver menú');
        
        const lang = detectLanguage(text, history);

        if (isMenuCommand || text === 'reset') {
            if (supabase) {
                console.log(`[WAKE UP] Reactivando bot para ${targetPhone} por comando: ${text}`);
                // Reseteamos el updated_at para que la lógica de silencio no lo bloquee
                await supabase.from('whatsapp_leads').update({ 
                    name: 'Sin nombre',
                    summary: 'Conversación en curso con NexoBot IA...',
                    updated_at: '1970-01-01T00:00:00Z' 
                }).eq('phone', targetPhone).then(null, () => {});
                
                if (text === 'reset') {
                    await supabase.from('whatsapp_sessions').update({ history: [] }).eq('phone', from).then(null, () => {});
                }
            }

            if (text === 'reset') {
                await sendText(phoneNumberId, from, "🔄 Memoria de este chat reiniciada. Historial borrado.");
                return res.status(200).send('OK'); // No enviamos menú, solo confirmamos el reset.
            }
            
            await sendMenu(phoneNumberId, from, lang);
            return res.status(200).send('OK');
        }

        // --- SILENCIO INTELIGENTE (RESPECTO AL HUMANO) ---
        // El bot se calla SOLO si:
        // 1. Hay un mensaje de 'admin' (humano) en los últimos 30 minutos.
        const lastAdminMsg = [...history].reverse().find(m => m.role === 'admin');
        const isHumanActive = lastAdminMsg && (now - new Date(lastAdminMsg.timestamp || 0).getTime()) < 30 * 60 * 1000;
        
        // 2. O si el lead se marcó como completado (handoff) hace MUY poco (ej: 5 min) 
        // para evitar que el bot siga preguntando cosas justo después de que el cliente terminó.
        // Solo aplica si el lead ya fue efectivamente derivado/cerrado (no en plena conversación en curso).
        const isActualHandoff = leadData?.summary && !leadData.summary.includes("Conversación en curso");
        const lastHandoffDate = (isActualHandoff && leadData?.updated_at) ? new Date(leadData.updated_at).getTime() : 0;
        const isVeryRecentHandoff = lastHandoffDate > 0 && lastHandoffDate > (now - 5 * 60 * 1000);

        if ((isHumanActive || isVeryRecentHandoff) && !isMenuCommand && !isInteractive) {
            console.log(`[SILENCIO] Registrando mensaje de +${from} para el CRM (Humano activo o Handoff reciente).`);
            
            const newHistory = [...history, { 
                role: 'user', 
                content: userDisplayContent || "[Envió un archivo o medio]",
                timestamp: new Date().toISOString()
            }];
            await persistHistory(from, newHistory);

            // Alerta al admin si pasaron > 5 min de silencio total (cliente esperando a un humano libre)
            const lastInteraction = historyData.updated_at ? new Date(historyData.updated_at).getTime() : 0;
            if (now - lastInteraction > 5 * 60 * 1000) {
                await notifyAdminOfNewMessage(from, leadData?.name || "Cliente", userDisplayContent);
            }
            return res.status(200).send('OK');
        }

        // --- MANEJO DE MENÚ/IA ---
        if (isInteractive) {
            const btnId = message.interactive.button_reply.id;
            const btnTitle = message.interactive.button_reply.title || btnId;
            let qr = "";

            if (btnId === 'btn_p') {
                qr = "¡Bárbaro! ¿Qué tipo de servicio o cobertura estás buscando? (Foto, Video, Streaming, o un combo) 📸🎥";
                history.push({ role: 'user', content: "[SISTEMA: REINICIAR FLUJO]" }); // Forzar a la IA a reiniciar las preguntas
            }
            else if (btnId === 'btn_v') {
                qr = "🎬 Mirá algunos de nuestros trabajos acá: https://nexofilm.com/portfolio \n¿Te gustaría consultar por un presupuesto?";
                // Mini-handoff SILENCIOSO: solo actualiza Supabase, NO manda email
                if (supabase && leadData?.id) {
                    await supabase.from('whatsapp_leads').update({
                        summary: '👀 Explorando Portfolio...',
                        score: Math.max(leadData?.score || 0, 30),
                        updated_at: new Date().toISOString()
                    }).eq('id', leadData.id).then(null, () => {});
                }
            }
            else if (btnId === 'btn_h') {
                qr = "Entendido. Un productor te va a contactar a la brevedad. 👤📞 Cualquier cosa que necesites, escribí la palabra MENU.";
                // WhatsApp al admin
                await sendText(phoneNumberId, ADMIN_NUMBER, `🔔 ALERTA HUMANO: +${from}`).then(null, () => {});
                // Mail al admin via Resend (awaited para que no muera en Vercel)
                const contactName = leadData?.name || `+${from}`;
                await sendDualEmail(
                    `👤 Hablar con Productor: ${contactName}`,
                    `
                        <div style="font-family:sans-serif;padding:20px;border-left:4px solid #ccff00;">
                            <h2>👤 ${contactName} quiere hablar con un productor</h2>
                            <p><strong>Teléfono:</strong> ${targetPhone.startsWith('+') ? targetPhone : `+${targetPhone}`}</p>
                            <br/>
                            <a href="https://nexofilm.com/admin/chat?phone=${from}" 
                               style="background:#000;color:#fff;padding:12px 24px;text-decoration:none;border-radius:5px;font-weight:bold;">
                               Ir al Chat del CRM
                            </a>
                        </div>
                    `
                );
                // Mini-handoff: guardar en Supabase para que aparezca el panel de resumen en el CRM
                await handleHandoff(targetPhone, leadData?.id, {
                    handoff: true,
                    name: leadData?.name || from,
                    email: leadData?.email || null,
                    summary: "Solicitó hablar con productor directo.",
                    is_hot: false,
                    source: 'Atención Directa', // Opcional, para saber que vino directamente (sin completar el flujo de presupuesto).
                    score: 70
                }, history);
            }

            if (qr) {
                history.push({ role: 'user', content: `[Seleccionó: ${btnTitle}]` });
                history.push({ role: 'assistant', content: qr });
                await persistHistory(from, history);
                await sendText(phoneNumberId, from, qr);
                await sendTelegramLog(from, leadData?.name, `🔘 Seleccionó: "${btnTitle}"`, 'user', history).catch(() => {});
                await sendTelegramLog(from, leadData?.name, qr, 'assistant', history).catch(() => {});
            }
            return res.status(200).send('OK');
        }

        // Verificación robusta: ¿ya hubo algún mensaje del bot en este historial?
        const botAlreadyGreeted = history.some(m => m.role === 'assistant');
        console.log(`[FLOW] from=+${from} | histLen=${history.length} | botGreeted=${botAlreadyGreeted} | name="${leadData?.name || 'null'}"`);

        // --- 1. PRIMER CONTACTO SIN NOMBRE (no hay mensajes del bot previos y no tiene nombre) ---
        if (!botAlreadyGreeted && (!leadData?.name || leadData.name === 'Sin nombre')) {
            console.log(`[BIENVENIDA NUEVA] Enviando saludo inicial a +${from}`);
            const welcomeText = {
                es: `¡Hola! Muchas gracias por contactar a NexoFilm 🎬. Es un placer saludarte. ¿Me podrías decir tu nombre, por favor?`,
                en: `Hello! Thank you for contacting NexoFilm 🎬. It's a pleasure to connect with you. May I have your name, please?`,
                pt: `Olá! Muito obrigado por entrar em contato com a NexoFilm 🎬. É um prazer falar com você. Poderia me dizer seu nome, por favor?`
            }[lang] || `¡Hola! Muchas gracias por contactar a NexoFilm 🎬. Es un placer saludarte. ¿Me podrías decir tu nombre, por favor?`;

            await sendText(phoneNumberId, from, welcomeText);
            const newHistory = [
                { role: 'user', content: userDisplayContent || text, timestamp: new Date().toISOString() },
                { role: 'assistant', content: welcomeText, timestamp: new Date().toISOString() }
            ];
            await persistHistory(from, newHistory);
            await sendTelegramLog(from, null, welcomeText, 'assistant', newHistory).catch(() => {});
            return res.status(200).send('OK');
        }

        // --- 2. CLIENTE RECONOCIDO DEL CRM (no hay mensajes del bot previos pero SÍ tiene nombre) ---
        if (!botAlreadyGreeted && leadData?.name && leadData.name !== 'Sin nombre') {
            const firstName = leadData.name.trim().split(/[\s,.-]+/)[0];
            console.log(`[BIENVENIDA VIP] Enviando saludo a ${firstName} (+${from})`);
            const hasRecentSummary = leadData.summary && !leadData.summary.includes("Conversación en curso");
            const daysSinceUpdate = leadData.updated_at ? Math.floor((Date.now() - new Date(leadData.updated_at).getTime()) / (1000 * 60 * 60 * 24)) : 999;

            let vipGreeting;
            if (hasRecentSummary && daysSinceUpdate < 60) {
                vipGreeting = {
                    es: `¡Qué bueno tenerte nuevamente por acá, ${firstName}! 🎬 Vi que tu consulta anterior fue sobre: "${leadData.summary}". ¿Seguimos con eso o tenés algo nuevo en mente?`,
                    en: `Great to have you back, ${firstName}! 🎬 I see your previous inquiry was about: "${leadData.summary}". Shall we continue or do you have something new in mind?`,
                    pt: `Que bom ter você de volta, ${firstName}! 🎬 Vi que sua consulta anterior foi sobre: "${leadData.summary}". Continuamos ou tem algo novo em mente?`
                }[lang] || `¡Qué bueno tenerte nuevamente por acá, ${firstName}! 🎬 Vi que tu consulta anterior fue sobre: "${leadData.summary}". ¿Seguimos con eso o tenés algo nuevo en mente?`;
            } else {
                vipGreeting = {
                    es: `¡Qué bueno tenerte nuevamente por acá, ${firstName}! 🎬 ¿En qué te podemos ayudar hoy?`,
                    en: `Great to have you back, ${firstName}! 🎬 How can we help you today?`,
                    pt: `Que bom ter você de volta, ${firstName}! 🎬 Como podemos te ajudar hoje?`
                }[lang] || `¡Qué bueno tenerte nuevamente por acá, ${firstName}! 🎬 ¿En qué te podemos ayudar hoy?`;
            }

            await sendText(phoneNumberId, from, vipGreeting);
            await sendMenu(phoneNumberId, from, lang);
            const newHistory = [
                { role: 'user', content: userDisplayContent || text, timestamp: new Date().toISOString() },
                { role: 'assistant', content: vipGreeting, timestamp: new Date().toISOString() }
            ];
            await persistHistory(from, newHistory);
            await sendTelegramLog(from, firstName, vipGreeting, 'assistant', newHistory).catch(() => {});
            await sendTelegramLog(from, firstName, '👇 Opciones de menú enviadas al cliente VIP', 'system', newHistory).catch(() => {});
            return res.status(200).send('OK');
        }        // --- 3. DETECCIÓN TEMPRANA DE DESPEDIDA / AGRADECIMIENTO (sin Groq, sin menú, sin capturar como nombre) ---
        const isFarewellUser = /^(mil gracias|much[ií]simas gracias|muchas gracias|ok gracias|genial gracias|perfecto gracias|buen[ií]simo|buenisimo|joya gracias|dale gracias|gracias|thank you|thanks|obrigado|obrigada|chau|adi[oó]s|adios|hasta luego|hasta pronto|bye|saludos|un abrazo|ok todo bien|todo bien)[\w\s.!]*$/i.test(text.trim());
        const knownName = (leadData?.name && leadData.name !== 'Sin nombre') ? leadData.name.trim().split(/[\s,.-]+/)[0] : "";
        if (isFarewellUser) {
            const farewellMsg = {
                es: knownName
                    ? `¡A vos, ${knownName}! Fue un gusto atenderte. 🙌 Que tengas una excelente semana. Cualquier duda o consulta que surja, ¡volvé a escribirnos cuando quieras!`
                    : `¡A vos! Fue un gusto atenderte. 🙌 Que tengas una excelente semana. Cualquier duda o consulta que surja, ¡volvé a escribirnos cuando quieras!`,
                en: `You're welcome! Have a great week. 🙌 Feel free to reach out anytime!`,
                pt: `De nada! Tenha uma ótima semana. 🙌 Qualquer dúvida, é só nos escrever!`
            }[lang] || `¡A vos! Que tengas una excelente semana. 🙌 Cualquier duda o consulta que surja, ¡volvé a escribirnos cuando quieras!`;

            await sendText(phoneNumberId, from, farewellMsg);
            const fareHist = [
                ...history,
                { role: 'user', content: text, timestamp: new Date().toISOString() },
                { role: 'assistant', content: farewellMsg, timestamp: new Date().toISOString() }
            ];
            await persistHistory(from, fareHist);
            await sendTelegramLog(from, knownName || leadData?.name, farewellMsg, 'assistant', fareHist).catch(() => {});
            return res.status(200).send('OK');
        }

        // --- 4. EL BOT LE PIDIÓ EL NOMBRE Y EL CLIENTE ESTÁ RESPONDIENDO ---
        const lastAssistantMsg = [...history].reverse().find(m => m.role === 'assistant');
        const askedNameRecently = lastAssistantMsg && (
            lastAssistantMsg.content.includes('¿Me podrías decir tu nombre') ||
            lastAssistantMsg.content.includes('May I have your name') ||
            lastAssistantMsg.content.includes('Poderia me dizer seu nome') ||
            lastAssistantMsg.content.includes('tu nombre')
        );

        // Lista de palabras que NO pueden ser nombres propios
        const nonNameWords = ['gracias', 'hola', 'menu', 'menú', 'si', 'sí', 'no', 'chau', 'presupuesto', 'portfolio', 'info', 'consulta', 'buenas', 'buen dia', 'buenas tardes', 'buenas noches', 'video', 'foto', 'streaming', 'precio', 'costo'];
        const isNotAName = nonNameWords.some(w => text.trim().toLowerCase() === w || text.trim().toLowerCase().startsWith(w + ' '));

        if (askedNameRecently && !isNotAName && (!leadData?.name || leadData.name === 'Sin nombre')) {
            console.log(`[CAPTURA NOMBRE] Procesando nombre de +${from}: "${text}"`);
            let rawName = text.replace(/^(hola|buen dia|buenas|me llamo|soy|mi nombre es|mi nombre)\s+/i, '').trim();
            rawName = rawName.replace(/[.,!?;:]/g, '').trim();
            let cleanName = rawName.split(' ')
                .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                .slice(0, 3)
                .join(' ');
            if (!cleanName || cleanName.length < 2) cleanName = 'Cliente';

            if (supabase) {
                const searchStr = (targetPhone || '').replace(/\D/g, '').slice(-8);
                const { data: freshLeads } = await supabase
                    .from('whatsapp_leads').select('id')
                    .like('phone', `%${searchStr}%`)
                    .order('created_at', { ascending: false });
                if (freshLeads && freshLeads.length > 0) {
                    for (const fl of freshLeads) {
                        await supabase.from('whatsapp_leads').update({
                            name: cleanName,
                            updated_at: new Date().toISOString()
                        }).eq('id', fl.id);
                    }
                }
            }

            const greetingWithName = {
                es: `¡Un gusto, ${cleanName}! ¿En qué te podemos ayudar hoy?`,
                en: `Nice to meet you, ${cleanName}! How can we help you today?`,
                pt: `Prazer em conhecê-lo, ${cleanName}! Como podemos te ajudar hoje?`
            }[lang] || `¡Un gusto, ${cleanName}! ¿En qué te podemos ayudar hoy?`;

            await sendText(phoneNumberId, from, greetingWithName);
            await sendMenu(phoneNumberId, from, lang);

            const newHistory = [
                ...history,
                { role: 'user', content: userDisplayContent || text, timestamp: new Date().toISOString() },
                { role: 'assistant', content: greetingWithName, timestamp: new Date().toISOString() }
            ];
            await persistHistory(from, newHistory);
            await sendTelegramLog(from, cleanName, greetingWithName, 'assistant', newHistory).catch(() => {});
            await sendTelegramLog(from, cleanName, '👇 Opciones de menú enviadas al cliente', 'system', newHistory).catch(() => {});
            return res.status(200).send('OK');
        }

    // --- CONTINUACIÓN DE CONVERSACIÓN CON GROQ IA ---
    console.log(`[GROQ] Procesando con IA: +${from} | histLen=${history.length}`);
    let instruccionSaludo = `1. **CONTINUACIÓN**: Estás hablando con ${knownName || "el cliente"}. Si ya seleccionó una opción o están en medio del flujo de presupuesto, validá con calidez su respuesta y avanzá con la siguiente pregunta. NO repitas su nombre en cada mensaje.`;

    let confirmacionEmail = `      - Pedido de email: Preguntá con amabilidad: "¿Nos compartís un correo electrónico para enviarte la propuesta formal en PDF con el desglose de costos?"
      - Si el cliente pregunta si es necesario o tiene dudas (ej: "¿es necesario el mail?", "¿por qué el mail?", "no tengo mail"): Explicá con amabilidad: "Te lo pedimos para poder enviarte el presupuesto formal en PDF con el detalle técnico y los costos desglosados."
      - Si el cliente rechaza dar el correo o no tiene: Decí con amabilidad: "¡No te preocupes! Un productor se va a comunicar directamente por acá para asesorarte." y emití la frase de CIERRE FINAL para derivar a producción.`;

    if (leadData?.name && leadData.name !== 'Sin nombre') {
        const firstName = leadData.name.trim().split(/[\s,.-]+/)[0];

        if (leadData.email && leadData.email.includes('@')) {
            const emailQs = {
                es: `${firstName}, en nuestros registros tenemos este correo: ${leadData.email}. ¿Te enviamos la propuesta ahí o preferís otro?`,
                en: `${firstName}, checking our records I see this email: ${leadData.email}. Is it still the same or would you prefer us to send the proposal to another one?`,
                pt: `${firstName}, em nossos registros temos este e-mail: ${leadData.email}. Continua sendo esse ou prefere que enviemos a proposta para outro?`
            };
            confirmacionEmail = `      - YA TIENES SU EMAIL: En base de datos figura: ${leadData.email}. Preguntale: "${emailQs[lang] || emailQs.es}". Si confirma o da uno nuevo, avanzá al CIERRE FINAL. Si prefiere no usar email, avanzá al CIERRE FINAL.`;
        }
    }

    const finalSystemPrompt = SYSTEM_PROMPT
        .replace('{{INSTRUCCION_DE_SALUDO}}', instruccionSaludo)
        .replace('{{CONFIRMACION_EMAIL}}', confirmacionEmail);

        // 🛡️ GUARDIA ANTI-CRASH: si no hay texto procesable (ej: imagen sin texto, sticker, o audio inaudible)
        if (!rawText && !isInteractive) {
            const fallbackReply = "¡Hola! Por el momento solo puedo leer mensajes de texto o escuchar notas de voz. Si querés consultarme algo, escribime 😊";
            await sendText(phoneNumberId, from, fallbackReply);

            // Guardar en el historial para que en el CRM aparezca el diálogo completo
            const currentHist = history.length > 0 ? history : [{
                role: 'user',
                content: userDisplayContent || "[Mensaje sin texto]",
                timestamp: new Date().toISOString()
            }];
            currentHist.push({
                role: 'assistant',
                content: fallbackReply,
                timestamp: new Date().toISOString()
            });
            await persistHistory(from, currentHist);
            return res.status(200).send('OK');
        }

        // 3. El mensaje actual del usuario DEBE entrar al historial ANTES de llamar a Groq
        history.push({ role: 'user', content: userDisplayContent });

        // Llamada a Groq — Solo enviar role + content (Groq rechaza campos extra como 'timestamp')
        const groqHistory = history
            .filter(m => m.role === 'user' || m.role === 'assistant')
            .map(m => ({ role: m.role, content: m.content }));

        let comp;
        try {
            comp = await groq.chat.completions.create({
                model: 'llama-3.3-70b-versatile',
                messages: [{ role: 'system', content: finalSystemPrompt }, ...groqHistory],
                temperature: 0.3,
                max_tokens: 400
            });
        } catch (groqPrimaryErr) {
            console.warn('[GROQ PRIMARY FAIL] Intentando con llama-3.1-8b-instant:', groqPrimaryErr.message);
            comp = await groq.chat.completions.create({
                model: 'llama-3.1-8b-instant',
                messages: [{ role: 'system', content: finalSystemPrompt }, ...groqHistory],
                temperature: 0.3,
                max_tokens: 400
            });
        }

        const aiRes = comp.choices[0].message.content;
        history.push({ role: 'assistant', content: aiRes });
        
        if (history.length > 20) history.splice(0, history.length - 20);
        persistHistory(from, history).then(null, () => {});

        // ============================================================
        // EXTRACCION DE NOMBRE DESDE MENSAJE DEL USUARIO
        // Detectamos cuando el bot pidio el nombre y el usuario acaba
        // de responder - extraemos del mensaje del usuario directamente.
        // ============================================================
        let capturedName = (leadData?.name && leadData.name !== 'Sin nombre') ? leadData.name : null;

        if (!capturedName && supabase) {
            // Buscar si el penultimo asistente preguntaba el nombre
            const histSinActual = history.slice(0, -2);
            const prevAssistant = [...histSinActual].reverse().find(m => m.role === 'assistant');
            const botAskedName = prevAssistant && (
                prevAssistant.content.includes('nombre') ||
                prevAssistant.content.includes('llamás') ||
                prevAssistant.content.includes('llamas') ||
                prevAssistant.content.includes('name')
            );
            const userMsg = text.trim();
            const looksLikeName = /^[A-Za-záéíóúÁÉÍÓÚñÑüÜ]+(\s[A-Za-záéíóúÁÉÍÓÚñÑüÜ]+){0,3}$/.test(userMsg) &&
                userMsg.length >= 2 && userMsg.length <= 40;

            if (botAskedName && looksLikeName) {
                capturedName = userMsg.split(' ')
                    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
                console.log(`[NAME FROM USER] Nombre del mensaje: ${capturedName}`);
            } else {
                // Fallback: buscar en la respuesta de la IA
                const nm = aiRes.match(/(?:bienvenido|bienvenida|hola|encantado|gusto)\s+([A-Za-záéíóúÁÉÍÓÚñÑüÜ][a-záéíóúñü]{1,20})(?:[,!. ]|$)/i);
                if (nm?.[1]) capturedName = nm[1].charAt(0).toUpperCase() + nm[1].slice(1).toLowerCase();
            }

            if (capturedName) {
                const searchStr = (targetPhone || '').replace(/\D/g, '').slice(-8);
                // Usamos limit(1) en vez de maybeSingle() para evitar crash si hay múltiples filas (datos de test)
                const { data: freshLeads } = await supabase
                    .from('whatsapp_leads').select('id, name')
                    .like('phone', `%${searchStr}%`)
                    .order('created_at', { ascending: false })
                    .limit(1);
                const freshLead = freshLeads?.[0];
                if (freshLead && (!freshLead.name || freshLead.name === 'Sin nombre')) {
                    const { error: nameErr } = await supabase.from('whatsapp_leads')
                        .update({ name: capturedName, updated_at: new Date().toISOString() })
                        .eq('id', freshLead.id);
                    if (nameErr) console.error('[NAME SAVE ERROR]', nameErr.message);
                    else {
                        console.log(`[NAME SAVED] ${capturedName}`);
                        await updateTelegramTopicName(from, capturedName, history).catch(() => {});
                    }
                }
            }
        }

        // ============================================================
        // HANDOFF BACKEND-DRIVEN: detectado por frase de despedida.
        // No dependemos de que la IA genere JSON perfecto.
        // Cuando la IA dice la despedida, extraemos datos del historial.
        // ============================================================
        const isFarewell = /paso (todo|los datos|el detalle) a producci[oó]n|asesor te (va a contactar|contactar[aá])|equipo (de producci[oó]n )?te (va a contactar|contactar[aá])/i.test(aiRes);
        let hf = null;

        if (isFarewell) {
            const emailMsg = [...history].reverse().find(m => m.role === 'user' && m.content.includes('@'));
            const emailFound = emailMsg
                ? emailMsg.content.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/)?.[0]
                : null;

            // FALLBACK DE NOMBRE: si no lo tenemos en DB ni en esta vuelta,
            // escaneamos el historial buscando el mensaje que el usuario respondió al pedido de nombre.
            let finalName = capturedName || (leadData?.name !== 'Sin nombre' ? leadData?.name : null) || null;
            if (!finalName) {
                for (let i = 1; i < history.length; i++) {
                    const prev = history[i - 1];
                    const curr = history[i];
                    const prevBotAskedName = prev.role === 'assistant' && (
                        prev.content.includes('nombre') || prev.content.includes('llamás') ||
                        prev.content.includes('llamas') || prev.content.includes('name')
                    );
                    const looksLikeName = curr.role === 'user' &&
                        /^[A-Za-záéíóúÁÉÍÓÚñÑüÜ]+(\s[A-Za-záéíóúÁÉÍÓÚñÑüÜ]+){0,3}$/.test(curr.content.trim()) &&
                        curr.content.trim().length >= 2 && curr.content.trim().length <= 40;
                    if (prevBotAskedName && looksLikeName) {
                        finalName = curr.content.trim().split(' ')
                            .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
                        break;
                    }
                }
            }
            finalName = finalName || 'Sin nombre';

            // RESUMEN ESTRUCTURADO: etiquetamos cada dato de la conversación.
            const labeledPairs = [];
            const botQuestions = history.filter(m => m.role === 'assistant');
            const userAnswers = history.filter(m => m.role === 'user' && !m.content.startsWith('['));
            // Mapeo simple: preguntas del bot → respuestas del usuario
            const labels = [
                { key: 'servicio', keywords: ['servicio', 'cobertura', 'foto', 'video', 'streaming'] },
                { key: 'tipo de evento', keywords: ['tipo de evento', 'qué tipo', 'what type', 'que tipo'] },
                { key: 'fecha y lugar', keywords: ['fecha', 'lugar', 'cuándo', 'date', 'location'] },
                { key: 'personas y horas', keywords: ['personas', 'horas', 'people', 'hours'] },
            ];
            for (const label of labels) {
                const botQ = botQuestions.find(m => label.keywords.some(k => m.content.toLowerCase().includes(k)));
                if (botQ) {
                    const botIdx = history.indexOf(botQ);
                    const userReply = history.slice(botIdx + 1).find(m => m.role === 'user' && !m.content.startsWith('['));
                    if (userReply) labeledPairs.push(`${label.key}: "${userReply.content}"`);
                }
            }
            const summaryText = labeledPairs.length > 0
                ? labeledPairs.join(' | ')
                : userAnswers.slice(-5).map(m => m.content).join(' | ');


            hf = {
                handoff: true,
                name: finalName,
                email: emailFound || leadData?.email || null,
                summary: summaryText || 'Presupuesto solicitado',
                is_hot: true,
                score: 85
            };
            console.log('[HANDOFF BACKEND]', hf.name, '|', hf.email, '|', hf.summary.substring(0, 80));
        }

        // Limpiar cualquier rastro de JSON/tags en el mensaje al cliente
        let final = aiRes;
        let showMenu = false;
        final = final.replace(/\${0,3}HANDOFF_JSON\${0,3}[\s\S]*?\${0,3}HANDOFF_JSON\${0,3}/gi, '').trim();
        final = final.replace(/```json[\s\S]*?```/gi, '').trim();
        final = final.replace(/\{[\s\S]*?"handoff"[\s\S]*?\}/gi, '').trim();
        final = final.replace(/\${0,3}HANDOFF_JSON\${0,3}/gi, '').trim();

        // Deteccion de tag SHOW_MENU
        if (/\${1,2}SHOW_MENU\${1,2}/i.test(final)) {
            showMenu = true;
            final = final.replace(/\${1,2}SHOW_MENU\${1,2}/gi, '').trim();
        }

        // Fail-safe menu por palabras clave
        const keywords = ["opciones", "acá te dejo", "nuestras alternativas", "menú"];
        if (!showMenu && keywords.some(k => final.toLowerCase().includes(k))) {
            showMenu = true;
            console.log("[FAIL-SAFE] Menú activado por palabras clave.");
        }

        if (final && final.trim().length > 0) {
            await sendText(phoneNumberId, from, final);
            await sendTelegramLog(from, capturedName || leadData?.name, final, 'assistant', history).catch(() => {});
        }
        if (showMenu) {
            await sendMenu(phoneNumberId, from, lang);
            await sendTelegramLog(from, capturedName || leadData?.name, '👇 Opciones de menú enviadas al cliente', 'system', history).catch(() => {});
        }
        if (hf?.handoff) {
            await sendTelegramLog(from, hf.name, `🎉 *PRESUPUESTO SOLICITADO / HANDOFF CRM*\n👤 ${hf.name}\n📧 ${hf.email || 'No proporcionado'}\n📝 Resumen: ${hf.summary}`, 'system', history).catch(() => {});
            await handleHandoff(targetPhone, leadData?.id, hf, history);
        }

    } catch (err) {
        console.error("BOT ERROR:", err.message);
        try {
            await sendText(phoneNumberId, from, "¡Disculpas! Tuve una pequeña demora en el sistema. ¿Me podrías repetir tu mensaje o escribir MENU para volver a ver las opciones? 😊");
        } catch (_) {}
    }

    return res.status(200).send('OK');
}

async function handleHandoff(phone, leadId, hf, history = []) {
    let createdProjectId = null;

    if (supabase) {
        let finalLeadId = leadId;

        // Si no pasaron leadId, buscamos por ultimos 8 digitos por si acaso
        if (!finalLeadId) {
            const searchStr = (phone || '').replace(/\D/g, '').slice(-8);
            if (searchStr.length >= 8) {
                // Usamos limit(1) para no fallar si hay múltiples filas (ej: datos de test)
                const { data: existingLeads } = await supabase
                    .from('whatsapp_leads')
                    .select('id')
                    .like('phone', `%${searchStr}%`)
                    .order('created_at', { ascending: false })
                    .limit(1);
                if (existingLeads?.[0]) finalLeadId = existingLeads[0].id;
            }
        }

        if (finalLeadId) {
            const { error: updateErr } = await supabase.from('whatsapp_leads').update({
                name: hf.name,
                email: hf.email,
                summary: hf.summary,
                is_hot: hf.is_hot !== undefined ? hf.is_hot : true,
                score: hf.score || 90,
                updated_at: new Date().toISOString()
            }).eq('id', finalLeadId);
            if (updateErr) console.error('[HANDOFF UPDATE ERROR]', updateErr.message);
            else console.log(`[HANDOFF OK] Lead ${finalLeadId} → ${hf.name} | ${hf.summary?.substring(0, 60)}`);
        } else {
            await supabase.from('whatsapp_leads').insert({
                phone,
                name: hf.name,
                email: hf.email,
                summary: hf.summary,
                is_hot: hf.is_hot !== undefined ? hf.is_hot : true,
                score: hf.score || 90,
                updated_at: new Date().toISOString()
            }).then(null, () => {});
        }

        // --- AUTOMATIC CRM PROJECT & BUDGET CREATION ---
        // Se ejecuta solo si es una consulta calificada (is_hot es true) y tenemos historial
        if (hf.is_hot && history && history.length > 0) {
            try {
                console.log(`[AUTO-CRM] Iniciando extracción para crear proyecto de ${hf.name}`);
                
                const extractionPrompt = `Analizá la siguiente conversación de WhatsApp entre un asistente virtual y un cliente que solicita un presupuesto audiovisual para la productora NexoFilm.
Tu objetivo es extraer los datos clave del evento y formular una propuesta de ítems para el presupuesto en formato JSON.

Debes responder ÚNICAMENTE con un objeto JSON válido con la siguiente estructura (no agregues texto fuera del JSON, markdown, ni explicaciones):
{
  "event_date": "YYYY-MM-DD o null si no se especifica la fecha exacta",
  "event_time": "HH:MM:SS o null si no se especifica",
  "location": "Lugar / dirección del evento o null",
  "coverage_hours": 4, 
  "guests_count": 100, 
  "coverage_types": ["foto", "video", "streaming"], 
  "title": "Proyecto [Tipo de evento] - [Nombre del cliente]",
  "admin_notes": "Notas/Resumen detallado de la conversación",
  "suggested_items": [
    {
      "description": "Detalle técnico profesional sugerido para el servicio (ej: Cobertura de fotografía profesional con cámaras full-frame, edición y entrega digital)",
      "quantity": 1,
      "unit_price": 0
    }
  ]
}`;

                let groqComp;
                try {
                    groqComp = await groq.chat.completions.create({
                        model: 'llama-3.3-70b-versatile',
                        messages: [
                            { role: 'system', content: extractionPrompt },
                            { role: 'user', content: `Conversación:\n${JSON.stringify(history)}` }
                        ],
                        temperature: 0.1,
                        response_format: { type: "json_object" }
                    });
                } catch (crmPrimaryErr) {
                    console.warn('[AUTO-CRM GROQ FAIL] Fallback a llama-3.1-8b-instant:', crmPrimaryErr.message);
                    groqComp = await groq.chat.completions.create({
                        model: 'llama-3.1-8b-instant',
                        messages: [
                            { role: 'system', content: extractionPrompt },
                            { role: 'user', content: `Conversación:\n${JSON.stringify(history)}` }
                        ],
                        temperature: 0.1,
                        response_format: { type: "json_object" }
                    });
                }

                const extracted = JSON.parse(groqComp.choices[0].message.content);
                console.log(`[AUTO-CRM] Datos extraídos:`, JSON.stringify(extracted));

                if (extracted) {
                    const projectTitle = extracted.title || `Proyecto WhatsApp - ${hf.name}`;
                    
                    // 1. Insertar Proyecto
                    const { data: project, error: projErr } = await supabase
                        .from('projects')
                        .insert({
                            contact_name: hf.name || 'Sin nombre',
                            client_email: hf.email || '',
                            client_phone: phone || null,
                            title: projectTitle,
                            status: 'draft',
                            event_date: extracted.event_date || null,
                            event_time: extracted.event_time || null,
                            location: extracted.location || null,
                            coverage_types: extracted.coverage_types || [],
                            coverage_hours: extracted.coverage_hours ? parseInt(extracted.coverage_hours) : null,
                            guests_count: extracted.guests_count ? parseInt(extracted.guests_count) : null,
                            currency: 'USD',
                            admin_notes: extracted.admin_notes || `Presupuesto solicitado vía WhatsApp.\nResumen original: ${hf.summary}`
                        })
                        .select()
                        .single();

                    if (projErr) {
                        console.error('[AUTO-CRM] Error al insertar proyecto:', projErr.message);
                    } else if (project) {
                        createdProjectId = project.id;
                        console.log(`[AUTO-CRM] Proyecto creado con ID: ${project.id}`);

                        // 2. Insertar Presupuesto con precio 0 para ser completado por el administrador
                        const itemsToInsert = (extracted.suggested_items || []).map(item => ({
                            description: item.description,
                            quantity: item.quantity || 1,
                            unit_price: 0
                        }));

                        if (itemsToInsert.length > 0) {
                            const { error: budgetErr } = await supabase
                                .from('budgets')
                                .insert({
                                    project_id: project.id,
                                    version: 1,
                                    items: itemsToInsert,
                                    total_price: 0,
                                    payment_terms: '50% de seña para reservar fecha, 50% contra entrega.',
                                    is_active: true
                                });
                            
                            if (budgetErr) {
                                console.error('[AUTO-CRM] Error al insertar presupuesto:', budgetErr.message);
                            } else {
                                console.log('[AUTO-CRM] Presupuesto creado con éxito.');
                            }
                        }
                    }
                }
            } catch (e) {
                console.error("[AUTO-CRM] Error en flujo de auto-creación:", e.message);
            }
        }
    }

    const emailSubject = `🔥 DERIVACIÓN CRM: ${hf.name} (+${phone})`;
    const chatUrl = `https://nexofilm.com/admin/chat?phone=${phone}`;
    
    let emailHtml = `
        <div style="font-family: sans-serif; padding: 20px; border-top: 4px solid #ccff00; background-color: #fcfcfc;">
            <h2 style="color: #1a1a1a; margin-top: 0;">🚀 Nuevo Lead para NexoFilm</h2>
            <p style="font-size: 14px; color: #333;"><strong>Cliente:</strong> ${hf.name}</p>
            <p style="font-size: 14px; color: #333;"><strong>Teléfono:</strong> +${phone}</p>
            <p style="font-size: 14px; color: #333;"><strong>Email:</strong> ${hf.email || 'No proporcionado'}</p>
            <p style="font-size: 14px; color: #333;"><strong>Resumen IA:</strong> ${hf.summary}</p>
            <br/>
            <div style="margin-top: 20px;">
                <a href="${chatUrl}" style="background-color: #000000; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; margin-right: 12px; margin-bottom: 10px;">Chatear en Vivo</a>
    `;

    if (createdProjectId) {
        const searchUrl = `https://nexofilm.com/admin/crm?project_id=${createdProjectId}`;
        emailHtml += `
                <a href="${searchUrl}" style="background-color: #ccff00; color: #000000; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; border: 1px solid #000000; margin-bottom: 10px;">Ver Presupuesto en CRM</a>
        `;
    }

    emailHtml += `
            </div>
    `;

    if (createdProjectId) {
        emailHtml += `
            <p style="font-size: 11px; color: #888; margin-top: 25px;">
                El presupuesto se guardó automáticamente como Borrador en tu CRM comercial. Hacé clic en "Ver Presupuesto en CRM" para editar los precios y enviárselo al cliente en un clic.
            </p>
        `;
    }

    emailHtml += `
        </div>
    `;

    await sendDualEmail(emailSubject, emailHtml);
}

// HELPERS
async function loadHistory(phone) {
    if (!supabase || !phone || phone.startsWith('__')) return { history: [], updated_at: null };
    const { data } = await supabase.from('whatsapp_sessions').select('history, updated_at').eq('phone', phone).maybeSingle();
    return { 
        history: Array.isArray(data?.history) ? data.history : [], 
        updated_at: data?.updated_at 
    };
}

async function persistHistory(phone, history) {
    if (!supabase || !phone || phone.startsWith('__')) return;
    await supabase.from('whatsapp_sessions').upsert({ phone, history, updated_at: new Date().toISOString() }, { onConflict: 'phone' });
}

async function transcribeAudio(audioId) {
    const token = process.env.WHATSAPP_TOKEN?.trim();
    if (!token || !audioId) return null;
    try {
        console.log(`[WHISPER] Descargando audio ID ${audioId} de Meta...`);
        const metaRes = await fetch(`https://graph.facebook.com/v21.0/${audioId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const metaData = await metaRes.json();
        if (!metaData.url) {
            console.error("[WHISPER] No se obtuvo URL de audio de Meta:", metaData);
            return null;
        }

        const audioRes = await fetch(metaData.url, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!audioRes.ok) {
            console.error("[WHISPER] Error al descargar binario del audio:", audioRes.status);
            return null;
        }

        const arrayBuf = await audioRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuf);
        const file = await toFile(buffer, 'audio.ogg', { type: metaData.mime_type || 'audio/ogg' });

        const transcription = await groq.audio.transcriptions.create({
            file: file,
            model: 'whisper-large-v3-turbo',
            response_format: 'json',
            temperature: 0.2
        });

        const text = transcription.text?.trim();
        if (text) {
            console.log(`[WHISPER OK] Audio transcrito: "${text}"`);
            return text;
        }
        return null;
    } catch (err) {
        console.error("[WHISPER ERROR]", err);
        return null;
    }
}

async function sendText(pid, to, msg) {
    if (!msg) return;
    return fetch(`https://graph.facebook.com/v21.0/${pid}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: msg, preview_url: true } })
    });
}

async function sendMenu(pid, to, lang = 'es') {
    const translations = {
        es: {
            body: "Seleccioná una opción 👇",
            btns: ["Pedir Presupuesto", "Ver Portfolio", "Hablar con Productor"]
        },
        en: {
            body: "Choose an option 👇",
            btns: ["Request Quote", "See Portfolio", "Talk to Producer"]
        },
        pt: {
            body: "Escolha uma opção 👇",
            btns: ["Pedir Orçamento", "Ver Portfólio", "Falar com Produtor"]
        }
    };

    const t = translations[lang] || translations.es;

    const payload = {
        messaging_product: 'whatsapp', to, type: 'interactive',
        interactive: {
            type: 'button',
            body: { text: t.body },
            action: {
                buttons: [
                    { type: 'reply', reply: { id: 'btn_p', title: t.btns[0] } },
                    { type: 'reply', reply: { id: 'btn_v', title: t.btns[1] } },
                    { type: 'reply', reply: { id: 'btn_h', title: t.btns[2] } }
                ]
            }
        }
    };
    
    const resp = await fetch(`https://graph.facebook.com/v21.0/${pid}/messages`, {
        method: 'POST',
        headers: { 
            Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, 
            'Content-Type': 'application/json' 
        },
        body: JSON.stringify(payload)
    });
    
    const respData = await resp.json();
    if (!resp.ok || respData.error) {
        console.error(`[MENU ERROR] Status ${resp.status}:`, JSON.stringify(respData));
    } else {
        console.log(`[MENU OK] Menú (${lang}) enviado a +${to}`);
    }
    return respData;
}

function detectLanguage(text, history) {
    const t = text.toLowerCase();
    
    // 1. Prefilled messages de la web
    if (t.includes("budget for my next") || t.includes("i'm browsing your web")) return 'en';
    if (t.includes("solicitar um orçamento") || t.includes("estou navegando")) return 'pt';
    if (t.includes("presupuesto para mi próximo") || t.includes("estoy navegando")) return 'es';

    // 2. Palabras clave comunes
    const enWords = ["hello", "hi", "price", "budget", "quote", "work"];
    const ptWords = ["olá", "oi", "preço", "orçamento", "trabalho"];
    
    if (enWords.some(w => t.includes(w))) return 'en';
    if (ptWords.some(w => t.includes(w))) return 'pt';

    // 3. Fallback al historial si existe
    const lastAssistantMsg = [...history].reverse().find(m => m.role === 'assistant');
    if (lastAssistantMsg) {
        if (lastAssistantMsg.content.includes("How can I")) return 'en';
        if (lastAssistantMsg.content.includes("Como posso")) return 'pt';
    }

    return 'es'; // Default
}

async function notifyAdminOfNewMessage(phone, name, content) {
    await sendDualEmail(
        `🔔 Mensaje nuevo de ${name} (+${phone})`,
        `
            <div style="font-family: sans-serif; padding: 20px; border-left: 4px solid #ccff00;">
                <h2 style="color: #1a1a1a;">📩 Tu cliente está esperando...</h2>
                <p><strong>De:</strong> ${name} (+${phone})</p>
                <p><strong>Mensaje:</strong> "${content || "[Archivo o Multimedia]"}"</p>
                <br/>
                <a href="https://nexofilm.com/admin/chat?phone=${phone}" 
                   style="background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                   Ir a contestarle ahora
                </a>
                <p style="font-size: 11px; color: #888; margin-top: 20px;">
                    Esta alerta se disparó porque pasaron más de 10 minutos desde que el cliente escribió y la IA está en silencio.
                </p>
            </div>
        `
    );
}

async function sendDualEmail(subject, htmlContent) {
    const emails = ['martinmagarinios@gmail.com', 'martin@nexofilm.com'];
    for (const email of emails) {
        try {
            await resend.emails.send({
                from: 'NexoBot <martin@nexofilm.com>',
                to: [email],
                subject: subject,
                html: htmlContent
            });
        } catch (e) {
            console.error(`Resend fail for ${email}:`, e.message);
        }
    }
}

// --- TELEGRAM INTEGRATION HELPERS & TOPIC REGISTRY ---
let cachedTopicsMap = null;
let lastTopicsFetch = 0;
const topicCreationLocks = new Map();

async function getTelegramTopicsMap() {
    const now = Date.now();
    if (cachedTopicsMap && (now - lastTopicsFetch < 60000)) {
        return cachedTopicsMap;
    }
    if (!supabase) return cachedTopicsMap || {};
    try {
        const { data } = await supabase.from('whatsapp_sessions').select('history').eq('phone', '__telegram_topics__').maybeSingle();
        if (data && typeof data.history === 'object' && !Array.isArray(data.history)) {
            cachedTopicsMap = data.history || {};
        } else {
            cachedTopicsMap = {};
        }
        lastTopicsFetch = now;
        return cachedTopicsMap;
    } catch (e) {
        console.error('[TELEGRAM] Error leyendo topics map:', e.message);
        return cachedTopicsMap || {};
    }
}

async function saveTelegramTopic(rawPhone, threadId) {
    const phone = normalizePhone(rawPhone);
    if (!phone || !threadId) return;
    try {
        const currentMap = await getTelegramTopicsMap();
        currentMap[phone] = Number(threadId);
        cachedTopicsMap = { ...currentMap };
        lastTopicsFetch = Date.now();
        if (supabase) {
            await supabase.from('whatsapp_sessions').upsert({
                phone: '__telegram_topics__',
                history: currentMap,
                updated_at: new Date().toISOString()
            }, { onConflict: 'phone' });
        }
    } catch (e) {
        console.error('[TELEGRAM] Error guardando topic en map:', e.message);
    }
}

async function deleteTelegramTopicFromMap(rawPhone) {
    const phone = normalizePhone(rawPhone);
    if (!phone) return;
    try {
        const currentMap = await getTelegramTopicsMap();
        delete currentMap[phone];
        cachedTopicsMap = { ...currentMap };
        if (supabase) {
            await supabase.from('whatsapp_sessions').upsert({
                phone: '__telegram_topics__',
                history: currentMap,
                updated_at: new Date().toISOString()
            }, { onConflict: 'phone' });
        }
    } catch (e) {}
}

async function findPhoneByTelegramThreadId(threadId) {
    if (!threadId) return null;
    const numThreadId = Number(threadId);
    const topicsMap = await getTelegramTopicsMap();
    for (const [phone, tid] of Object.entries(topicsMap)) {
        if (Number(tid) === numThreadId) {
            return phone;
        }
    }
    return null;
}

async function getOrCreateTelegramTopic(rawPhone, name, history = []) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID || !rawPhone) return null;
    const phone = normalizePhone(rawPhone);
    if (!phone) return null;

    if (topicCreationLocks.has(phone)) {
        return await topicCreationLocks.get(phone);
    }

    const creationPromise = (async () => {
        try {
            const topicsMap = await getTelegramTopicsMap();
            let threadId = topicsMap[phone];

            if (!threadId && Array.isArray(history)) {
                const foundInHist = history.find(m => m.type === 'telegram_topic' && m.thread_id);
                if (foundInHist) {
                    threadId = Number(foundInHist.thread_id);
                    await saveTelegramTopic(phone, threadId);
                }
            }

            if (threadId) {
                if (name && name !== 'Sin nombre' && !name.includes('+')) {
                    updateTelegramTopicName(phone, name, threadId).catch(() => {});
                }
                return threadId;
            }

            // Crear nuevo tema único en el grupo de Telegram
            const displayName = (name && name !== 'Sin nombre') ? `${name} (+${phone})` : `Cliente (+${phone})`;
            console.log(`[TELEGRAM] Creando tema único para ${displayName}`);
            const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/createForumTopic`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: TELEGRAM_CHAT_ID,
                    name: `👤 ${displayName}`
                })
            });
            const data = await res.json();
            if (data.ok && data.result?.message_thread_id) {
                const newThreadId = Number(data.result.message_thread_id);
                await saveTelegramTopic(phone, newThreadId);
                return newThreadId;
            } else {
                console.error('[TELEGRAM CREATE TOPIC ERROR]', data);
            }
        } catch (e) {
            console.error('[TELEGRAM GET/CREATE TOPIC ERROR]', e.message);
        } finally {
            topicCreationLocks.delete(phone);
        }
        return null;
    })();

    topicCreationLocks.set(phone, creationPromise);
    return await creationPromise;
}

async function updateTelegramTopicName(rawPhone, newName, threadId) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID || !newName || !threadId) return;
    const phone = normalizePhone(rawPhone);
    try {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editForumTopic`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                message_thread_id: Number(threadId),
                name: `👤 ${newName} (+${phone})`
            })
        });
    } catch (e) {}
}

async function sendTelegramLog(rawPhone, name, text, role = 'user', history = []) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID || !text || !rawPhone) return;
    const phone = normalizePhone(rawPhone);
    try {
        const threadId = await getOrCreateTelegramTopic(phone, name, history);
        if (!threadId) return;

        let prefix = '';
        if (role === 'user') prefix = `👤 *${name && name !== 'Sin nombre' ? name : 'Cliente'}*: `;
        else if (role === 'assistant') prefix = `🤖 *NexoBot*: `;
        else if (role === 'admin') prefix = `👨‍💼 *Martín (Humano)*: `;
        else if (role === 'system') prefix = `🔔 `;

        const sendRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                message_thread_id: Number(threadId),
                text: `${prefix}${text}`
            })
        });

        const sendData = await sendRes.json();
        if (!sendData.ok && (sendData.description?.includes('thread not found') || sendData.description?.includes('TOPIC_CLOSED') || sendData.description?.includes('message thread not found'))) {
            console.warn(`[TELEGRAM] Tema ${threadId} inválido para +${phone}. Recreando...`);
            await deleteTelegramTopicFromMap(phone);
            const freshThreadId = await getOrCreateTelegramTopic(phone, name, history);
            if (freshThreadId) {
                await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: TELEGRAM_CHAT_ID,
                        message_thread_id: Number(freshThreadId),
                        text: `${prefix}${text}`
                    })
                });
            }
        }
    } catch (e) {
        console.error("[TELEGRAM SEND ERROR]", e.message);
    }
}

async function handleTelegramWebhook(req, res, body) {
    const message = body?.message;
    if (!message || !message.text || message.from?.is_bot) {
        return res.status(200).send('OK');
    }

    const threadId = message.message_thread_id;
    if (!threadId) return res.status(200).send('OK');

    const textToSend = message.text.trim();
    if (!textToSend || !supabase) return res.status(200).send('OK');

    try {
        let phone = await findPhoneByTelegramThreadId(threadId);

        if (!phone) {
            const { data: sessions } = await supabase.from('whatsapp_sessions').select('phone, history');
            const matchedSession = sessions?.find(s => 
                !s.phone.startsWith('__') && Array.isArray(s.history) && s.history.some(m => m.type === 'telegram_topic' && Number(m.thread_id) === Number(threadId))
            );
            phone = matchedSession?.phone;
            if (phone) {
                await saveTelegramTopic(phone, threadId);
            }
        }

        if (!phone) {
            console.log(`[TELEGRAM] No se encontró cliente de WhatsApp asociado al tema ${threadId}`);
            return res.status(200).send('OK');
        }

        const token = process.env.WHATSAPP_TOKEN?.trim();
        const phoneNumberId = process.env.WHATSAPP_PHONE_ID?.trim();

        if (!token || !phoneNumberId) {
            console.error('[TELEGRAM] Faltan credenciales de WhatsApp');
            return res.status(200).send('OK');
        }

        const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: phone,
                type: 'text',
                text: { body: textToSend }
            })
        });

        const result = await response.json();
        if (result.error) {
            console.error('[TELEGRAM] Error Meta API:', result.error);
            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: TELEGRAM_CHAT_ID,
                    message_thread_id: Number(threadId),
                    text: `⚠️ *No se pudo enviar a WhatsApp:*\nMeta respondió: "${result.error.message || 'Error desconocido'}".\nRecordá que deben haber pasado menos de 24hs desde el último mensaje del cliente.`
                })
            });
            return res.status(200).send('OK');
        }

        let { data: sessionInfo } = await supabase.from('whatsapp_sessions').select('history').eq('phone', phone).maybeSingle();
        let currentHistory = Array.isArray(sessionInfo?.history) ? sessionInfo.history : [];
        currentHistory.push({
            role: 'admin',
            content: textToSend,
            timestamp: new Date().toISOString()
        });

        await supabase
            .from('whatsapp_sessions')
            .upsert({ 
                phone: phone,
                history: currentHistory,
                updated_at: new Date().toISOString() 
            });

        // Actualizar updated_at en whatsapp_leads para que el CRM lo suba arriba
        const searchStr = phone.slice(-8);
        await supabase.from('whatsapp_leads')
            .update({ updated_at: new Date().toISOString() })
            .like('phone', `%${searchStr}%`);

        console.log(`[TELEGRAM] Mensaje enviado exitosamente a WhatsApp +${phone}`);
    } catch (err) {
        console.error('[TELEGRAM] Error en handleTelegramWebhook:', err.message);
    }

    return res.status(200).send('OK');
}

