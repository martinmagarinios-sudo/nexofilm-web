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

IDENTIDAD Y TONO:
- Usá VOSEO SIEMPRE ("me decís", "mirá", "querés"). Prohibido "tú" o "usted".
- NUNCA uses la palabra "che".
- Sos un productor experto. Si el cliente tiene dudas técnicas sobre Foto/Video/Streaming, asesoralo con criterio.
- Respuestas breves, una cosa a la vez.

FLUJO DE CONVERSACIÓN:
1. Si no sabés el nombre (y no está en VIP): "¡Hola! Bienvenido a NexoFilm. ¿Me decís tu nombre por favor?"

2. Al saber el nombre: "Un gusto, [Nombre]. Acá te dejo nuestras opciones: $$SHOW_MENU$$"
   (REGLA CRÍTICA: NUNCA escribas las opciones en texto. Solo el tag $$SHOW_MENU$$. No escribas nada después del tag).

3. Al elegir "Pedir Presupuesto":
   a) "¡Qué bueno, [Nombre]! ¿Qué tipo de servicio o cobertura estás buscando? (Foto, Video, Streaming, o un combo)"
   b) Una vez respondió: "¿Me contás qué tipo de evento es? (Social, corporativo, feria, comercial, etc.)"
   c) "¿Me decís la fecha y el lugar estimado?"
   d) "¿Cantidad de personas y horas de cobertura?"
   e) VERIFICACIÓN DE EMAIL:
      - Si ya conocemos su mail (VIP): "[Nombre], ¿tu mail sigue siendo [email] o preferís que usemos otro?"
      - Si NO lo conocemos: "Perfecto. ¿Me pasás tu correo electrónico para mandarte la propuesta?"
   f) DESPEDIDA: "¡Bárbaro, [Nombre]! Fue un placer. Ya le paso los detalles a producción y en breve te contactan. 👋 Si necesitás algo más, escribí MENU."

HANDOFF JSON:
$$HANDOFF_JSON$$
{
  "handoff": true,
  "name": "Nombre",
  "email": "correo@ejemplo.com",
  "summary": "Resumen extremadamente detallado de lo que necesita el cliente.",
  "score": 95
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

        // 1. Reset manual
        if (text === 'reset') {
            if (supabase) { (async () => { try { await supabase.from('whatsapp_sessions').delete().eq('phone', from); } catch(e){} })(); }
            await sendText(phoneNumberId, from, "🔄 Memoria borrada.");
            return res.status(200).send('OK');
        }

        // 2. Cargar historial + Info del Lead (CRM) en PARALELO
        const [historyData, leadData] = await Promise.all([
            loadHistory(from),
            supabase ? supabase.from('whatsapp_leads').select('*').eq('phone', from).maybeSingle().then(r => r.data, () => null) : Promise.resolve(null)
        ]);

        const history = historyData.history;
        const now = Date.now();
        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

        // --- SILENCIO INTELIGENTE (30 DÍAS) ---
        // Si el lead está en el CRM y se actualizó hace < 30 días, el bot se calla (a menos que digan MENU)
        const lastHandoffDate = leadData?.updated_at ? new Date(leadData.updated_at).getTime() : 0;
        const isRecentlyHandoff = lastHandoffDate > (now - thirtyDaysMs);

        if (isRecentlyHandoff && text !== 'menu' && text !== 'menú' && !isInteractive) {
            console.log(`[SILENCIO] El cliente +${from} está en manos del CRM (último handoff: ${leadData.updated_at}).`);
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
                sendText(phoneNumberId, ADMIN_NUMBER, `🔔 ALERTA HUMANO: +${from}`).then(null, () => {});
            }

            if (qr) {
                history.push({ role: 'user', content: `[Seleccionó: ${btnTitle}]` });
                history.push({ role: 'assistant', content: qr });
                await persistHistory(from, history);
                await sendText(phoneNumberId, from, qr);
            }
            return res.status(200).send('OK');
        }

        // COMANDO MENU (rompe el silencio)
        if (text === 'menu' || text === 'menú') {
            await sendMenu(phoneNumberId, from);
            history.push({ role: 'user', content: message.text.body });
            history.push({ role: 'assistant', content: "[Se mostró el menú mediante comando MENU]" });
            await persistHistory(from, history);
            return res.status(200).send('OK');
        }

        // --- LÓGICA VIP (Reconocimiento del CRM) ---
        let vipRule = "";
        if (leadData?.name && leadData.name !== 'Sin nombre') {
            // Limpieza profunda: Solo la primera palabra, sin comas ni puntos (ej: "Martin Magarinios" -> "Martin")
            const firstName = leadData.name.trim().split(/[\s,.-]+/)[0]; 
            vipRule = `
VIP RECOGNITION:
- El cliente ya es conocido: se llama ${firstName}.
- NUNCA uses su apellido ni nombre de empresa (ej: si es "Juan Perez", decí solo "Juan").
- SALUDALOS SIEMPRE por su nombre de pila: ${firstName}.
- SI ES EL PRIMER MENSAJE: "¡Hola ${firstName}! Qué bueno tenerte de vuelta por acá. ¿En qué podemos ayudarte hoy?" y mandá $$SHOW_MENU$$.
- EMAIL: Ya tenemos registrado su mail (${leadData.email || 'desconocido'}). Cuando llegues al paso del mail, PREGUNTALE si sigue siendo ese o si cambió.
`;
        }

        // Llamada a Groq (Modelo 70B para máxima inteligencia)
        const comp = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'system', content: SYSTEM_PROMPT.replace('{{VIP_RULE}}', vipRule) }, ...history],
            temperature: 0.5,
            max_tokens: 500
        });

        const aiRes = comp.choices[0].message.content;
        history.push({ role: 'user', content: message.text.body }); // Guardar mensaje del usuario
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
        if (final.includes('$$SHOW_MENU$$')) {
            showMenu = true;
            final = final.replace('$$SHOW_MENU$$', '').trim();
        }

        await sendText(phoneNumberId, from, final);
        if (showMenu) await sendMenu(phoneNumberId, from);

        if (hf?.handoff) {
            await handleHandoff(from, hf);
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

async function sendMenu(pid, to) {
    return fetch(`https://graph.facebook.com/v21.0/${pid}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            messaging_product: 'whatsapp', to, type: 'interactive',
            interactive: {
                type: 'button', body: { text: "¿En qué podemos ayudarte hoy?" },
                action: {
                    buttons: [
                        { type: 'reply', reply: { id: 'btn_p', title: '📋 Pedir Presupuesto' } },
                        { type: 'reply', reply: { id: 'btn_v', title: '🎬 Ver Portfolio' } },
                        { type: 'reply', reply: { id: 'btn_h', title: '👤 Hablar con Humano' } }
                    ]
                }
            }
        })
    });
}
