import Groq from 'groq-sdk';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const groq = new Groq({ apiKey: (process.env.GROQ_API_KEY || '').trim() });
const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const supabaseKey = (process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_KEY || '').trim();
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;
const resend = new Resend((process.env.RESEND_API_KEY || '').trim());

const ADMIN_NUMBER = '541151191964';
const ADMIN_EMAIL = 'martin@nexofilm.com';

const SYSTEM_PROMPT = `Eres el asistente virtual de NexoFilm (Argentina). Sos cálido, empático, concreto y profesional.

REGLAS DE TONO Y ESTILO:
- Sé cordial y empático. Si te cuentan sobre su evento o proyecto, validá su idea con frases cortas (ej: "Suena muy bien el video corporativo", "Me parece genial una presentación de producto").
- Mantené respuestas concretas y al grano. No te extiendas en monólogos.
- NO repitas el nombre del cliente constantemente. Usalo solo al saludar.
- Respondé en el mismo idioma del usuario (Español, Inglés o Portugués).
- Usá voseo argentino natural (ej: querés, mirá, decime). NO tutees ni uses "usted". NUNCA uses "che".

FLUJO DE CONVERSACIÓN:
{{INSTRUCCION_DE_SALUDO}}

3. Al elegir "Pedir Presupuesto", hace las preguntas UNA por UNA (esperá la respuesta):
   a) "¡Perfecto! ¿Qué servicio buscás? (Foto, Video, Streaming, o una combinación de varios)"
   b) TIPO DE EVENTO: Preguntá de forma cálida: "¡Genial! ¿Qué tipo de evento es? Por ejemplo: un evento corporativo, una presentación de producto, una campaña publicitaria, una feria o congreso, una fiesta de fin de año, un evento social, una cobertura deportiva... o lo que sea que tenés en mente. 🎬"
   c) "¿Fecha y lugar estimado?"
   d) "¿Cantidad de personas y horas de cobertura?"
   e) SOLICITUD DE EMAIL:
{{CONFIRMACION_EMAIL}}
   f) DESPEDIDA FINAL (ÚLTIMO PASO, cuando ya tenés todos los datos):
      - Decí EXACTAMENTE esta frase y nada más: "¡Bárbaro! Ya le paso todo a producción y un asesor te contactará a la brevedad. 👋"

REGLAS EXTRA:
- ANTI-PAVADAS: Si habla de temas ajenos a producción, decí: "Sobre eso no te puedo ayudar, pero podemos conectarte con el equipo." y usá la despedida final.
- REINICIO: Si el usuario dice "[SISTEMA: REINICIAR FLUJO]", empezá de cero con la pregunta de "Pedir Presupuesto".`;


export default async function handler(req, res) {
    if (req.method === 'GET') {
        const token = req.query['hub.verify_token'];
        if (token === process.env.WHATSAPP_VERIFY_TOKEN) return res.status(200).send(req.query['hub.challenge']);
        return res.status(403).send('Error');
    }

    if (req.method !== 'POST') return res.status(405).send('Method not allowed');

    const body = req.body;
    const message = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!message) return res.status(200).send('OK');

    const phoneNumberId = body.entry[0].changes[0].value.metadata.phone_number_id;
    const fromRaw = message.from;
    let from = fromRaw;
    if (from.startsWith('549') && from.length === 13) from = '54' + from.substring(3);

    if (from === ADMIN_NUMBER || fromRaw === ADMIN_NUMBER) return res.status(200).send('OK');

    try {
        const text = message.text?.body?.toLowerCase() || "";
        const isInteractive = message.type === 'interactive';

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

            await sendDualEmail(
                `👀 Chat en vivo: ${contactNameForEmail}`,
                `
                    <div style="font-family: sans-serif; padding: 20px; border-top: 4px solid #ccff00;">
                        <h2 style="color: #1a1a1a;">🤖 NexoBot está atendiendo a alguien</h2>
                        <p><strong>Cliente:</strong> ${contactNameForEmail}</p>
                        <p><strong>WhatsApp:</strong> +${from}</p>
                        <p>Esta persona acaba de iniciar una conversación de cero con la IA de NexoFilm.</p>
                        <p>Recibís este aviso para poder monitorear la venta en tiempo real y engancharlo por tu cuenta si deja de contestarle a la máquina.</p>
                        <br/>
                        <a href="https://nexofilm.com/admin/chat?phone=${from}" style="background: #000; color: #ccff00; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Espiar Chat en Vivo</a>
                    </div>
                `
            );
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
                await supabase.from('whatsapp_leads').update({ updated_at: '1970-01-01T00:00:00Z' }).eq('phone', targetPhone).then(null, () => {});
                
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
        const lastHandoffDate = leadData?.updated_at ? new Date(leadData.updated_at).getTime() : 0;
        const isVeryRecentHandoff = lastHandoffDate > (now - 5 * 60 * 1000);

        if ((isHumanActive || isVeryRecentHandoff) && !isMenuCommand && !isInteractive) {
            console.log(`[SILENCIO] Registrando mensaje de +${from} para el CRM (Humano activo o Handoff reciente).`);
            
            const newHistory = [...history, { 
                role: 'user', 
                content: message.text?.body || "[Envió un archivo o medio]",
                timestamp: new Date().toISOString()
            }];
            await persistHistory(from, newHistory);

            // Alerta al admin si pasaron > 5 min de silencio total (cliente esperando a un humano libre)
            const lastInteraction = historyData.updated_at ? new Date(historyData.updated_at).getTime() : 0;
            if (now - lastInteraction > 5 * 60 * 1000) {
                await notifyAdminOfNewMessage(from, leadData?.name || "Cliente", message.text?.body);
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
                });
            }

            if (qr) {
                history.push({ role: 'user', content: `[Seleccionó: ${btnTitle}]` });
                history.push({ role: 'assistant', content: qr });
                await persistHistory(from, history);
                await sendText(phoneNumberId, from, qr);
            }
            return res.status(200).send('OK');
        }

        // (El comando MENU ya fue manejado al inicio del handler - no duplicar)

    // --- LÓGICA VIP (Reconocimiento del CRM) DADA 100% DIGERIDA POR JS ---
    const isFirstMessage = history.length === 0;
    let instruccionSaludo = "";
    if (isFirstMessage) {
        if (leadData?.name && leadData.name !== 'Sin nombre') {
            const firstName = leadData.name.trim().split(/[\s,.-]+/)[0];
            const greetings = {
                es: `¡Bienvenido ${firstName} a NexoFilm, un placer atenderte!`,
                en: `Welcome ${firstName} to NexoFilm, great to have you here!`,
                pt: `Bem-vindo ${firstName} à NexoFilm, é um prazer atendê-lo!`
            };
            const currentGreeting = greetings[lang] || greetings.es;
            
            const hasRecentBudget = leadData.summary && !leadData.summary.includes("Conversación en curso");
            const daysSinceUpdate = leadData.updated_at ? Math.floor((Date.now() - new Date(leadData.updated_at).getTime()) / (1000 * 60 * 60 * 24)) : 0;
            
            if (hasRecentBudget && daysSinceUpdate < 60) {
                 instruccionSaludo = `1. **CLIENTE RECONOCIDO CON HISTORIAL**: Ya sabes que es ${firstName}. Su última consulta fue sobre: "${leadData.summary}".\n2. **PRESENTACIÓN**: Saludalo cálidamente y mencioná su consulta anterior. Ej: "¡Bienvenido ${firstName} a NexoFilm! Vi que tu consulta anterior fue sobre [proyecto]. ¿Seguímos con eso o tenés algo nuevo en mente?" e incluí el tag $$SHOW_MENU$$. NO le preguntes su nombre. NO termines con '¿en qué te puedo ayudar?' porque el menú ya lo ofrece.`;
            } else {
                 instruccionSaludo = `1. **CLIENTE RECONOCIDO**: Ya sabes que es ${firstName}.\n2. **PRESENTACIÓN**: Saludalo EXACTAMENTE con esta frase: "${currentGreeting}" e incluye inmediatamente el tag $$SHOW_MENU$$. NO agregues '¿en qué te puedo ayudar?' porque el menú con botones ya se lo ofrece automáticamente.`;
            }
        } else {
            instruccionSaludo = `1. **NUEVO CONTACTO**: No sabes su nombre. En el primer mensaje EXACTAMENTE decí esto: "¡Bienvenido a NexoFilm, un placer atenderte! ¿Me podrías decir tu nombre por favor?".\n2. IMPORTANTE: NO MANDES EL MENU TODAVÍA. Esperá a que te diga su nombre.`;
        }
    } else {
        const knownName = (leadData?.name && leadData.name !== 'Sin nombre') ? leadData.name.trim().split(/[\s,.-]+/)[0] : "";
        instruccionSaludo = `1. **CONTINUACIÓN**: Estás hablando con ${knownName || "el cliente"}. Si te acaba de decir su nombre por primera vez, saludalo cálidamente por su nombre e INCLUYE el tag $$SHOW_MENU$$ (sin agregar '¿en qué te puedo ayudar?' porque el menú ya lo tiene). Si ya le habías dado el menú, respondé cálidamente a sus respuestas valorando su idea, pero avanzá con la siguiente pregunta. NO repitas su nombre en cada mensaje.`;
    }

    let confirmacionEmail = `      - Pedile el correo de forma cálida y natural. Ejemplo: "Para prepararte la propuesta, ¿me pasás tu mail?".\n      - Si el cliente no quiere dar el mail o dice que lo tiene lleno, NO insistás. En cambio, respondé algo como: "No hay problema, un asesor te va a contactar directamente por acá o por teléfono." y a continuación emite el HANDOFF_JSON igual, poniendo email como null.\n      - NUNCA presiones ni repitás la misma frase varias veces. Siempre hay una salida amable.`;

    if (leadData?.name && leadData.name !== 'Sin nombre') {
        const firstName = leadData.name.trim().split(/[\s,.-]+/)[0];

        if (leadData.email && leadData.email.includes('@')) {
            const emailQs = {
                es: `${firstName}, chequeando mis registros veo este mail: ${leadData.email}. ¿Sigue siendo ese o querés que te envíe la propuesta a otro?`,
                en: `${firstName}, checking my records I see this email: ${leadData.email}. Is it still the same or do you want me to send the proposal to another one?`,
                pt: `${firstName}, verificando meus registros, vejo este e-mail: ${leadData.email}. Continua sendo esse ou quer que eu envie a proposta para outro?`
            };
            confirmacionEmail = `      - YA TIENES SU MAIL: Está en base de datos. Debés preguntarle EXACTAMENTE esto: "${emailQs[lang] || emailQs.es}".\n      - NO AVANCES HASTA QUE LO CONFIRME O TE DÉ OTRO.`;
        }
    }

    const finalSystemPrompt = SYSTEM_PROMPT
        .replace('{{INSTRUCCION_DE_SALUDO}}', instruccionSaludo)
        .replace('{{CONFIRMACION_EMAIL}}', confirmacionEmail);

        // 3. El mensaje actual del usuario DEBE entrar al historial ANTES de llamar a Groq
        history.push({ role: 'user', content: message.text.body || "[Mensaje sin texto]" });

        // Llamada a Groq (Modelo 70B para máxima inteligencia)
        const comp = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'system', content: finalSystemPrompt }, ...history],
            temperature: 0.5,
            max_tokens: 500
        });

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
                const { data: freshLead } = await supabase
                    .from('whatsapp_leads').select('id, name')
                    .like('phone', `%${searchStr}%`).maybeSingle();
                if (freshLead && (!freshLead.name || freshLead.name === 'Sin nombre')) {
                    await supabase.from('whatsapp_leads')
                        .update({ name: capturedName, updated_at: new Date().toISOString() })
                        .eq('id', freshLead.id).then(null, () => {});
                    console.log(`[NAME SAVED] ${capturedName}`);
                }
            }
        }

        // ============================================================
        // HANDOFF BACKEND-DRIVEN: detectado por frase de despedida.
        // No dependemos de que la IA genere JSON perfecto.
        // Cuando la IA dice la despedida, extraemos datos del historial.
        // ============================================================
        const isFarewell = aiRes.includes('paso todo a producci') || aiRes.includes('asesor te contactar');
        let hf = null;

        if (isFarewell) {
            const emailMsg = [...history].reverse().find(m => m.role === 'user' && m.content.includes('@'));
            const emailFound = emailMsg
                ? emailMsg.content.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/)?.[0]
                : null;

            const userMessages = history.filter(m => m.role === 'user' && !m.content.startsWith('['));
            const summaryText = userMessages.slice(-6).map(m => m.content).join(' | ').substring(0, 250);
            const finalName = capturedName || leadData?.name || 'Sin nombre';

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

        if (final && final.trim().length > 0) await sendText(phoneNumberId, from, final);
        if (showMenu) await sendMenu(phoneNumberId, from, lang);
        if (hf?.handoff) await handleHandoff(targetPhone, leadData?.id, hf);

    } catch (err) {
        console.error("BOT ERROR:", err.message);
    }

    return res.status(200).send('OK');
}

async function handleHandoff(phone, leadId, hf) {
    if (supabase) {
        let finalLeadId = leadId;

        // Si no pasaron leadId, buscamos por ultimos 8 digitos por si acaso
        if (!finalLeadId) {
            const searchStr = (phone || '').replace(/\D/g, '').slice(-8);
            if (searchStr.length >= 8) {
                const { data: existingLead } = await supabase
                    .from('whatsapp_leads')
                    .select('id')
                    .like('phone', `%${searchStr}%`)
                    .maybeSingle();
                if (existingLead) finalLeadId = existingLead.id;
            }
        }

        if (finalLeadId) {
            await supabase.from('whatsapp_leads').update({
                name: hf.name,
                email: hf.email,
                summary: hf.summary,
                is_hot: hf.is_hot !== undefined ? hf.is_hot : true,
                score: hf.score || 90,
                updated_at: new Date().toISOString()
            }).eq('id', finalLeadId).then(null, () => {});
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
    }

    await sendDualEmail(
        `🔥 DERIVACIÓN CRM: ${hf.name} (+${phone})`,
        `
            <div style="font-family: sans-serif; padding: 20px;">
                <h2 style="color: #1a1a1a;">🚀 Nuevo Lead para NexoFilm</h2>
                <p><strong>Cliente:</strong> ${hf.name}</p>
                <p><strong>Teléfono:</strong> +${phone}</p>
                <p><strong>Email:</strong> ${hf.email}</p>
                <p><strong>Resumen IA:</strong> ${hf.summary}</p>
                <br/>
                <a href="https://nexofilm.com/admin/chat?phone=${phone}" style="background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Abri el Chat en el CRM</a>
            </div>
        `
    );
}

// HELPERS
async function loadHistory(phone) {
    if (!supabase) return { history: [], updated_at: null };
    const { data } = await supabase.from('whatsapp_sessions').select('history, updated_at').eq('phone', phone).maybeSingle();
    return { 
        history: Array.isArray(data?.history) ? data.history : [], 
        updated_at: data?.updated_at 
    };
}

async function persistHistory(phone, history) {
    if (!supabase) return;
    await supabase.from('whatsapp_sessions').upsert({ phone, history, updated_at: new Date().toISOString() }, { onConflict: 'phone' });
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
                from: 'NexoBot <onboarding@resend.dev>',
                to: [email],
                subject: subject,
                html: htmlContent
            });
        } catch (e) {
            console.error(`Resend fail for ${email}:`, e.message);
        }
    }
}
