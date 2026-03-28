import Groq from 'groq-sdk';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const groq = new Groq({ apiKey: (process.env.GROQ_API_KEY || '').trim() });
const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const supabaseKey = (process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_KEY || '').trim();
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;
const resend = new Resend((process.env.RESEND_API_KEY || '').trim());

const ADMIN_NUMBER = '541151191964';
const ADMIN_EMAIL = 'martinmagarinios@gmail.com';

const SYSTEM_PROMPT = `Eres el asistente virtual de élite de NexoFilm (Argentina). Sos cálido, extremadamente inteligente, cercano y profesional. 

IDIOMA Y TONO:
- Respondé SIEMPRE en el mismo idioma que te hable el usuario (Español, Inglés o Portugués).
- Si hablás en Español, usá VOSEO SIEMPRE ("me decís", "mirá", "querés"). Prohibido "tú" o "usted".
- NUNCA uses la palabra "che".
- Sos un productor experto. Si el cliente tiene dudas técnicas sobre Foto/Video/Streaming, asesoralo con criterio.
- Respuestas breves, una cosa a la vez.

FLUJO DE CONVERSACIÓN (IMPORTANTE: SEGUÍ ESTE ORDEN PASO A PASO):
1. **NUEVO CONTACTO**: Si no te pasaron un VIP_RULE con el nombre, lo primero que haces es saludar: "¡Hola! Bienvenido a NexoFilm. ¿Me decís tu nombre por favor?"

2. **PRESENTACIÓN**: Una vez que sepas el nombre (o si lo traes por VIP_RULE): "Un gusto, [Nombre]. Acá te dejo nuestras opciones: $$SHOW_MENU$$"
   (REGLA CRÍTICA: NUNCA escribas las opciones en texto. Solo debes incluir el tag $$SHOW_MENU$$. No escribas nada después del tag).

3. Al elegir "Pedir Presupuesto", hace las preguntas UNA por UNA (no avances sin que contesten la anterior).
   a) "¡Qué bueno, [Nombre]! ¿Qué tipo de servicio o cobertura estás buscando? (Foto, Video, Streaming, o un combo)"
   b) "¿Me contás qué tipo de evento es? (Social, corporativo, feria, comercial, etc.)"
   c) "¿Me decís la fecha y el lugar estimado?"
   d) "¿Cantidad de personas y horas de cobertura?"
   e) SOLICITUD DE EMAIL (CRÍTICO):
      - Si en VIP_RULE ya te viene un email del CRM, preguntá explícitamente: "Chequeando mis registros, [Nombre], veo que tu correo es [email]. ¿Sigue siendo ese o querés que te envíe la propuesta a otro distinto?"
      - Si no tienes email, pídeselo de cero: "¿Me podrías pasar tu correo electrónico para enviarte la propuesta formal?"
      - *NO CUMPLES ESTE PASO HASTA RECIBIR UN EMAIL VÁLIDO O UNA CONFIRMACIÓN CLARA.*
   f) DESPEDIDA Y HANDOFF FINAL (ÚLTIMO PASO, EL MÁS IMPORTANTE):
      - Despídete cálidamente: "¡Bárbaro [Nombre]! Tomé nota de todo. Ya le paso los detalles a producción y en breve te contactan. 👋 Si necesitás algo más, escribí MENU."
      - **Y OBLIGATORIAMENTE EN ESE MISMO MENSAJE (AL FINAL) HAS EL BLOQUE $$HANDOFF_JSON$$ CON UN RESUMEN DETALLADO:**

$$HANDOFF_JSON$$
{
  "handoff": true,
  "name": "Nombre Real del Cliente",
  "email": "correo@oficial.com",
  "summary": "Resumen detalladísimo: Necesita video y streaming para un evento corporativo de 150 personas, fecha estimada X, pide 3 cámaras. Cliente muy interesado.",
  "score": 90
}
$$HANDOFF_JSON$$

{{VIP_RULE}}

REGLA ANTI-PAVADAS: Si el cliente habla de temas ajenos a la producción, respondé: "Mirá, sobre ese tema no estoy capacitado para asesorarte, pero te voy a derivar con alguien de nuestro equipo. Si querés hacer una nueva consulta técnica, escribí MENU." Generá handoff con summary "Consulta fuera de tema".`;

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

        // 2. Cargar historial + Info del Lead (CRM) en PARALELO (Búsqueda Exacta y Segura por Últimos 8 dígitos)
        const [historyData, leadData] = await Promise.all([
            loadHistory(from),
            supabase ? (async () => {
                const searchStr = from.slice(-8); 
                const { data } = await supabase
                    .from('whatsapp_leads')
                    .select('*')
                    .like('phone', `%${searchStr}%`)
                    .order('created_at', { ascending: false })
                    .limit(1);
                return data?.[0] || null;
            })() : Promise.resolve(null)
        ]);

        const history = historyData.history;
        const targetPhone = leadData?.phone || from; // Usamos el del CRM si existe, sino el de WhatsApp
        const now = Date.now();

        // --- RESET / MENU / WEB START MANUAL ---
        const isWebStart = text.includes("estoy navegando en tu web") && text.includes("consulta");
        const isMenuCommand = text === 'menu' || text === 'menú' || text.startsWith('ver menu') || text.startsWith('ver menú');
        
        const lang = detectLanguage(text, history);

        if (isMenuCommand || text === 'reset' || isWebStart) {
            if (supabase) {
                console.log(`[WAKE UP] Reactivando bot para ${targetPhone} por comando: ${text}`);
                // Reseteamos el updated_at para que la lógica de silencio no lo bloquee
                await supabase.from('whatsapp_leads').update({ updated_at: '1970-01-01T00:00:00Z' }).eq('phone', targetPhone).then(null, () => {});
            }
            if (text === 'reset') await sendText(phoneNumberId, from, "🔄 Memoria de este chat reiniciada.");
            
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
            if (btnId === 'btn_p') qr = "¡Bárbaro! ¿Qué tipo de servicio o cobertura estás buscando? (Foto, Video, Streaming, o un combo) 📸🎥";
            else if (btnId === 'btn_v') qr = "🎬 Mirá algunos de nuestros trabajos en: https://nexofilm.com \n¿Te gustaría consultar por un presupuesto?";
            else if (btnId === 'btn_h') {
                qr = "Entendido. Un productor te va a contactar a la brevedad. 👤📞";
                // WhatsApp al admin
                sendText(phoneNumberId, ADMIN_NUMBER, `🔔 ALERTA HUMANO: +${from}`).then(null, () => {});
                // Mail al admin via Resend
                const contactName = leadData?.name || `+${from}`;
                resend.emails.send({
                    from: 'NexoBot Alerta <onboarding@resend.dev>',
                    to: [ADMIN_EMAIL],
                    subject: `👤 Hablar con Productor: ${contactName}`,
                    html: `
                        <div style="font-family:sans-serif;padding:20px;border-left:4px solid #ccff00;">
                            <h2>👤 ${contactName} quiere hablar con un productor</h2>
                            <p><strong>Teléfono:</strong> +${from}</p>
                            <br/>
                            <a href="https://nexofilm.com/admin/chat?phone=${from}" 
                               style="background:#000;color:#fff;padding:12px 24px;text-decoration:none;border-radius:5px;font-weight:bold;">
                               Ir al Chat del CRM
                            </a>
                        </div>
                    `
                }).catch(e => console.error("Resend btn_h error:", e.message));
                // Mini-handoff: guardar en Supabase para que aparezca el panel de resumen en el CRM
                handleHandoff(from, {
                    handoff: true,
                    name: leadData?.name || from,
                    email: leadData?.email || null,
                    summary: `Solicitó hablar con un productor directamente (sin completar el flujo de presupuesto).`,
                    score: 70
                }).catch(() => {});
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

    // --- LÓGICA VIP (Reconocimiento del CRM) ---
    let vipRule = "";
    const isFirstMessage = history.length === 0;

    if (leadData?.name && leadData.name !== 'Sin nombre') {
        const firstName = leadData.name.trim().split(/[\s,.-]+/)[0];
        
        const greetings = {
            es: `¡Hola ${firstName}! Qué bueno tenerte de vuelta. ¿En qué podemos ayudarte hoy?`,
            en: `Hi ${firstName}! Great to have you back. How can we help you today?`,
            pt: `Olá ${firstName}! Que bom ter você de volta. Como podemos ajudar hoje?`
        };
        const currentGreeting = greetings[lang] || greetings.es;

        vipRule = `
VIP RECOGNITION (ACTIVATE NOW) - LEY DE CUMPLIMIENTO OBLIGATORIO:
- Es un cliente de nuestro CRM. Su nombre es: ${firstName}.
- NUNCA LE PREGUNTES EL NOMBRE. YA LO SABES.
- SALUDALO ASÍ EN EL PRIMER MENSAJE: "${currentGreeting}" \n\n Y LUEGO INCLUYE EL TAG $$SHOW_MENU$$.
- RECOGNITION STATUS: ${isFirstMessage ? 'PRIMER MENSAJE. OBLIGATORIO SALUDAR Y MOSTRAR MENU.' : 'SESIÓN EN CURSO. CONTINÚA.'}.
`;
        
        if (leadData.email && leadData.email.includes('@')) {
            const emailQs = {
                es: `${firstName}, chequeando mis registros veo este mail: ${leadData.email}. ¿Sigue siendo ese o querés que te envíe la propuesta a otro?`,
                en: `${firstName}, checking my records I see this email: ${leadData.email}. Is it still the same or do you want me to send the proposal to another one?`,
                pt: `${firstName}, verificando meus registros, vejo este e-mail: ${leadData.email}. Continua sendo esse ou quer que eu envie a proposta para outro?`
            };
            vipRule += `- CONFIRMACIÓN DE EMAIL: El cliente tiene registrado este mail en la base de datos: ${leadData.email}. Cuando llegues al paso 3e (Solicitud de Email), DEBES preguntarle esta frase exacta: "${emailQs[lang] || emailQs.es}".\n`;
        }
    }

        // 3. El mensaje actual del usuario DEBE entrar al historial ANTES de llamar a Groq
        history.push({ role: 'user', content: message.text.body || "[Mensaje sin texto]" });

        // Llamada a Groq (Modelo 70B para máxima inteligencia)
        const comp = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'system', content: SYSTEM_PROMPT.replace('{{VIP_RULE}}', vipRule) }, ...history],
            temperature: 0.5,
            max_tokens: 500
        });

        const aiRes = comp.choices[0].message.content;
        history.push({ role: 'assistant', content: aiRes });
        
        if (history.length > 20) history.splice(0, history.length - 20);
        persistHistory(from, history).then(null, () => {});

        // Procesar tags
        let final = aiRes;
        let showMenu = false;
        let hf = null;

        const m = aiRes.match(/\$\$HANDOFF_JSON\$\$([\s\S]*?)\$\$HANDOFF_JSON\$\$/);
        if (m) {
            try { hf = JSON.parse(m[1]); final = aiRes.replace(m[0], '').trim(); } catch(e) {}
        }
        // Detección robusta de tags (insensible a mayúsculas/minúsculas)
        if (/\$\$SHOW_MENU\$\$/i.test(final)) {
            showMenu = true;
            final = final.replace(/\$\$SHOW_MENU\$\$/gi, '').trim();
        }

        // Fail-safe: Si el bot menciona opciones pero olvidó el tag (o usó una variante)
        const keywords = ["opciones", "acá te dejo", "nuestras alternativas", "menú"];
        if (!showMenu && keywords.some(k => final.toLowerCase().includes(k))) {
            showMenu = true;
            console.log("[FAIL-SAFE] Menú activado por palabras clave en el texto.");
        }

        // Solo enviar texto si hay contenido (WhatsApp rechaza mensajes vacios silenciosamente)
        if (final && final.trim().length > 0) {
            await sendText(phoneNumberId, from, final);
        }
        // El menu siempre despues del texto
        if (showMenu) {
            await sendMenu(phoneNumberId, from, lang);
        }

        if (hf?.handoff) {
            await handleHandoff(targetPhone, hf);
        }

    } catch (err) {
        console.error("BOT ERROR:", err.message);
    }

    return res.status(200).send('OK');
}

async function handleHandoff(phone, hf) {
    if (supabase) {
        await supabase.from('whatsapp_leads').upsert({
            phone,
            name: hf.name,
            email: hf.email,
            summary: hf.summary,
            updated_at: new Date().toISOString()
        }, { onConflict: 'phone' });
    }

    try {
        await resend.emails.send({
            from: 'NexoFilm CRM <onboarding@resend.dev>',
            to: [ADMIN_EMAIL],
            subject: `🔥 DERIVACIÓN CRM: ${hf.name} (+${phone})`,
            html: `
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
        });
    } catch(e) { console.error("Resend Error:", e); }
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
            body: "¿En qué te puedo ayudar?",
            btns: ["Pedir Presupuesto", "Ver Portfolio", "Hablar con Productor"]
        },
        en: {
            body: "How can I help you?",
            btns: ["Request Quote", "See Portfolio", "Talk to Producer"]
        },
        pt: {
            body: "Como posso ajudar?",
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
    try {
        await resend.emails.send({
            from: 'NexoBot Alerta <onboarding@resend.dev>',
            to: [ADMIN_EMAIL],
            subject: `🔔 Mensaje nuevo de ${name} (+${phone})`,
            html: `
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
        });
    } catch (e) {
        console.error("Error enviando notificación Resend:", e.message);
    }
}
