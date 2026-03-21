import Groq from 'groq-sdk';
import { createClient } from '@supabase/supabase-js';

const groq = new Groq({ apiKey: (process.env.GROQ_API_KEY || '').trim() });
const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const supabaseKey = (process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_KEY || '').trim();
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

const ADMIN_NUMBER = '541151191964';

const SYSTEM_PROMPT = `Eres el asistente virtual de NexoFilm (Argentina). 

IDENTIDAD:
- Usá VOSEO SIEMPRE ("me decís", "mirá", "querés"). Prohibido "tú" o "usted".
- NUNCA uses la palabra "che".
- Respuestas breves, cordiales y profesionales. Sin adornos innecesarios.
- NUNCA pidas disculpas por demoras, errores técnicos ni nada similar.

FLUJO:
1. Si no sabés el nombre: "¡Hola! Bienvenido a NexoFilm. ¿Me decís tu nombre por favor?"
2. Al saber el nombre: "Un gusto, [Nombre]. Acá te dejo nuestras opciones:" + tag $$SHOW_MENU$$.
   REGLA DE ORO: NUNCA escribas las opciones en texto. Solo usá el tag y el sistema envía los botones.
3. Después del menú, recolectá de a una pregunta por vez:
   - Servicio (Foto / Video / Streaming / Combo)
   - Si es evento: Fecha, Lugar, Duración y Cantidad de gente
   - Email de contacto (siempre pedilo)

REGLA ANTI-PAVADAS: Si el cliente habla de temas irrelevantes para NexoFilm, respondé que un productor humano lo va a ayudar y generá el handoff con summary "Consulta fuera de tema".

Si el cliente dice "si" después de ver el portfolio, retomá la charla: "¿Buscás presupuesto para Foto, Video, o ambos?"

{{VIP_RULE}}

HANDOFF (cuando tenés todo, incluido el mail):
$$HANDOFF_JSON$$
{
  "handoff": true,
  "name": "Nombre",
  "email": "correo@ejemplo.com",
  "summary": "Resumen detallado del servicio solicitado.",
  "score": 90
}
$$HANDOFF_JSON$$`;

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
        // --- Botones Interactivos (respuesta rápida, sin IA) ---
        if (message.type === 'interactive') {
            const btnId = message.interactive.button_reply.id;
            const btnTitle = message.interactive.button_reply.title || btnId;

            let qr = "";
            if (btnId === 'btn_p') qr = "¡Bárbaro! Para el presupuesto, ¿me decís si buscás Foto, Video, o ambos? 📸🎥";
            else if (btnId === 'btn_v') qr = "🎬 Mirá algunos de nuestros trabajos en: https://nexofilm.com \n¿Te gustaría que te armemos una propuesta?";
            else if (btnId === 'btn_h') {
                qr = "Entendido. Un productor te va a contactar. 👤📞";
                sendText(phoneNumberId, ADMIN_NUMBER, `🔔 ALERTA HUMANO: +${from}`).catch(() => {});
            }

            if (qr) {
                // Guardamos el historial ANTES de responder para que el próximo mensaje tenga contexto
                const h = await loadHistory(from);
                h.push({ role: 'user', content: `[Seleccionó: ${btnTitle}]` });
                h.push({ role: 'assistant', content: qr });
                await persistHistory(from, h);
                await sendText(phoneNumberId, from, qr);
            }
            return res.status(200).send('OK');
        }

        if (message.type !== 'text') return res.status(200).send('OK');

        const text = message.text.body;

        // Reset manual
        if (text.toLowerCase() === 'reset') {
            if (supabase) supabase.from('whatsapp_sessions').delete().eq('phone', from).catch(() => {});
            await sendText(phoneNumberId, from, "🔄 Memoria borrada.");
            return res.status(200).send('OK');
        }

        // Cargar historial + VIP check EN PARALELO para ganar tiempo
        const [history, leadData] = await Promise.all([
            loadHistory(from),
            supabase ? supabase.from('whatsapp_leads').select('name, email').eq('phone', from).order('created_at', { ascending: false }).limit(1).maybeSingle().then(r => r.data).catch(() => null) : Promise.resolve(null)
        ]);

        history.push({ role: 'user', content: text });
        if (history.length > 10) history.splice(0, history.length - 10);

        // VIP Rule
        let vipRule = "";
        if (history.length <= 1 && leadData?.name && leadData.name !== 'Sin nombre') {
            vipRule = `VIP: Es ${leadData.name}. Saludalo: "¡Hola ${leadData.name}! Qué bueno tenerte de vuelta. ¿En qué podemos ayudarte?" y mandá $$SHOW_MENU$$. No preguntes nombre. ${leadData.email ? `Verificá su mail (${leadData.email}) al final.` : ''}`;
        }

        // Llamada a Groq
        const comp = await groq.chat.completions.create({
            model: 'llama-3.1-8b-instant',
            messages: [{ role: 'system', content: SYSTEM_PROMPT.replace('{{VIP_RULE}}', vipRule) }, ...history],
            temperature: 0.5,
            max_tokens: 450
        });
        const aiRes = comp.choices[0].message.content;
        history.push({ role: 'assistant', content: aiRes });

        // Guardar historial en background (no bloqueante)
        persistHistory(from, history).catch(() => {});

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

        // ENVIAR (esto es lo más importante)
        await sendText(phoneNumberId, from, final);
        if (showMenu) await sendMenu(phoneNumberId, from);

        // Handoff en background
        if (hf?.handoff && supabase) {
            supabase.from('whatsapp_leads').upsert({ phone: from, name: hf.name, email: hf.email, summary: hf.summary, updated_at: new Date().toISOString() }, { onConflict: 'phone' }).catch(() => {});
        }

    } catch (err) {
        console.error("BOT ERROR:", err.message);
        // Error silencioso - no molestamos al cliente
    }

    return res.status(200).send('OK');
}

// HELPERS
async function loadHistory(phone) {
    if (!supabase) return [];
    try {
        const { data } = await supabase.from('whatsapp_sessions').select('history').eq('phone', phone).maybeSingle();
        return Array.isArray(data?.history) ? data.history : [];
    } catch(e) { return []; }
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
                type: 'button', body: { text: "¿En qué podemos ayudarte hoy? Seleccioná una opción:" },
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
