import Groq from 'groq-sdk';
import { createClient } from '@supabase/supabase-js';

const groq = new Groq({ apiKey: (process.env.GROQ_API_KEY || '').trim() });
const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const supabaseKey = (process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_KEY || '').trim();
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

const ADMIN_NUMBER = '541151191964';

const SYSTEM_PROMPT = `Eres el asistente virtual de NexoFilm (Argentina). 

REGLAS DE IDENTIDAD:
1. Usá VOSEO SIEMPRE ("decime", "mirá", "querés"). Prohibido usar "tú" o "usted".
2. PROHIBIDO usar la palabra "che". Nunca la uses.
3. Respuestas muy breves y profesionales.

FLUJO DE ATENCIÓN:
ETAPA 1: Si no sabés el nombre, saludá y pedíselo. Ej: "¡Hola! Bienvenido a NexoFilm. ¿Decime tu nombre, por favor?"
ETAPA 2: Al saber el nombre, decí: "Un gusto, [Nombre]. Acá te dejo nuestras opciones:" seguido del tag $$SHOW_MENU$$.
   - REGLA DE ORO: NO escribas la lista de opciones (Foto, Video, etc.) en texto. El sistema las envía automáticamente por botones.
ETAPA 3: Recolección de datos técnicos para el presupuesto (Foto/Video, Fecha, Lugar, Cantidad de gente, Duración).
   - **Email de contacto (Fundamental).** Pedilo siempre.

REGLA ANTI-PAVADAS: Si preguntan tonterías, decí que un productor humano los ayudará y cortá con $$HANDOFF_JSON$$ (summary: "Consulta fuera de tema").

Si el cliente te dice "si" tras ver el portfolio, retoma la charla de inmediato preguntando: "¿Buscás presupuesto para servicio de Foto, de Video, o ambos?".

{{VIP_RULE}}

$$HANDOFF_JSON$$: Si tenés todo (con mail), generá:
$$HANDOFF_JSON$$
{
  "handoff": true,
  "name": "Nombre",
  "email": "correo@ejemplo.com",
  "summary": "Resumen detallado de todo lo pedido para producción.",
  "score": 90
}
$$HANDOFF_JSON$$`;

export default async function handler(req, res) {
    if (req.method === 'GET') {
        const token = req.query['hub.verify_token'];
        if (token === process.env.WHATSAPP_VERIFY_TOKEN) return res.status(200).send(req.query['hub.challenge']);
        return res.status(403).send('Error');
    }

    if (req.method === 'POST') {
        const body = req.body;
        const message = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
        if (!message) return res.status(200).send('OK');

        const phoneNumberId = body.entry[0].changes[0].value.metadata.phone_number_id;
        const fromRaw = message.from;
        let from = fromRaw;
        if (from.startsWith('549') && from.length === 13) from = '54' + from.substring(3);

        try {
            if (from === ADMIN_NUMBER || fromRaw === ADMIN_NUMBER) return res.status(200).send('OK');

            let text = "";
            let btnId = null;

            if (message.type === 'text') {
                text = message.text.body;
            } else if (message.type === 'interactive') {
                btnId = message.interactive.button_reply.id;
                const btnTitle = message.interactive.button_reply.title || btnId;

                // --- RESPUESTAS RÁPIDAS (INSTANTÁNEAS) ---
                let qr = "";
                if (btnId === 'btn_p') qr = "¡Bárbaro! Para mandarte el presupuesto, decime: ¿Buscás servicio de Foto, de Video, o ambos? 📸🎥";
                else if (btnId === 'btn_v') qr = "🎬 Mirá algunos de nuestros trabajos en: https://nexofilm.com \n¿Te gustaría que te armemos una propuesta ahora que los viste?";
                else if (btnId === 'btn_h') {
                    qr = "Entendido. Un productor te va a contactar a la brevedad. 👤📞";
                    await sendText(phoneNumberId, ADMIN_NUMBER, `🔔 ALERTA HUMANO: +${from}`);
                }

                if (qr) {
                    await sendText(phoneNumberId, from, qr);
                    // Actualizamos historial y RESPONDEMOS 200 para evitar timeout en esta fase rápida
                    await saveHistory(from, `[Botón: ${btnTitle}]`, 'user');
                    await saveHistory(from, qr, 'assistant');
                    return res.status(200).send('OK');
                }
                text = `[Botón: ${btnTitle}]`;
            }

            if (!text) return res.status(200).send('OK');

            // Reset manual
            if (text.toLowerCase() === 'reset') {
                if (supabase) await supabase.from('whatsapp_sessions').delete().eq('phone', from);
                await sendText(phoneNumberId, from, "🔄 Memoria borrada.");
                return res.status(200).send('OK');
            }

            // --- CHAT CON IA ---
            let history = [];
            if (supabase) {
                const { data } = await supabase.from('whatsapp_sessions').select('history').eq('phone', from).maybeSingle();
                if (data?.history) history = data.history;
            }

            history.push({ role: 'user', content: text });
            if (history.length > 10) history = history.slice(-10);

            // Reconocimiento VIP
            let vipRule = "";
            if (history.length <= 1 && supabase) {
                const { data: ld } = await supabase.from('whatsapp_leads').select('name, email').eq('phone', from).order('created_at', {ascending:false}).limit(1).maybeSingle();
                if (ld?.name && ld.name !== 'Sin nombre') {
                    vipRule = `RECONOCIMIENTO VIP: Usuario ${ld.name}. Saludalo así: "¡Hola ${ld.name}! Qué bueno tenerte de vuelta por NexoFilm. ¿En qué podemos ayudarte?" y mandá $$SHOW_MENU$$. No preguntes nombre. Si tenés su mail (${ld.email || 'no'}), confirmalo al final antes del handoff.`;
                }
            }

            // Llamada a Groq con Timeout
            const comp = await groq.chat.completions.create({
                model: 'llama-3.1-8b-instant',
                messages: [{ role: 'system', content: SYSTEM_PROMPT.replace('{{VIP_RULE}}', vipRule) }, ...history],
                temperature: 0.5, max_tokens: 500
            });
            const aiRes = comp.choices[0].message.content;

            history.push({ role: 'assistant', content: aiRes });
            if (supabase) await supabase.from('whatsapp_sessions').upsert({ phone: from, history, updated_at: new Date().toISOString() }, { onConflict: 'phone' });

            // Procesar tags
            let final = aiRes;
            let showMenu = false;
            let hf = null;

            const m = aiRes.match(/\$\$HANDOFF_JSON\$\$([\s\S]*?)\$\$HANDOFF_JSON\$\$/);
            if (m) { try { hf = JSON.parse(m[1]); final = aiRes.replace(m[0], '').trim(); } catch(e){} }
            if (final.includes('$$SHOW_MENU$$')) {
                showMenu = true;
                final = final.replace('$$SHOW_MENU$$', '').trim();
            }

            // ENVIAR POR WHATSAPP
            await sendText(phoneNumberId, from, final);
            if (showMenu) await sendMenu(phoneNumberId, from);

            // Actualizar Lead en background
            if (hf?.handoff && supabase) {
                await supabase.from('whatsapp_leads').upsert({ phone: from, name: hf.name, email: hf.email, summary: hf.summary, updated_at: new Date().toISOString() }, { onConflict: 'phone' });
            }

            return res.status(200).send('OK');

        } catch (err) {
            console.error("CRITICAL ERROR:", err);
            try { await sendText(phoneNumberId, from, "A veces mi sistema se satura por mucha demanda 🚀. ¿Me podrías repetir lo último por favor?"); } catch(smErr){}
            return res.status(200).send('OK');
        }
    }
}

// HELPERS
async function sendText(pid, to, msg) {
    if (!msg) return;
    await fetch(`https://graph.facebook.com/v21.0/${pid}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: msg, preview_url: true } })
    });
}

async function sendMenu(pid, to) {
    await fetch(`https://graph.facebook.com/v21.0/${pid}/messages`, {
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

async function saveHistory(phone, content, role) {
    if (!supabase) return;
    try {
        const { data } = await supabase.from('whatsapp_sessions').select('history').eq('phone', phone).maybeSingle();
        let h = data?.history || [];
        h.push({ role, content, timestamp: new Date().toISOString() });
        await supabase.from('whatsapp_sessions').upsert({ phone, history: h, updated_at: new Date().toISOString() }, { onConflict: 'phone' });
    } catch(err){}
}
