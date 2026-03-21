import Groq from 'groq-sdk';
import { createClient } from '@supabase/supabase-js';

const groq = new Groq({ apiKey: (process.env.GROQ_API_KEY || '').trim() });
const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const supabaseKey = (process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_KEY || '').trim();
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

const ADMIN_NUMBER = '541151191964';

const SYSTEM_PROMPT = `Eres el asistente de NexoFilm (Argentina). Usa voseo ("contame", "mirá"). Prohibido usar "che".
Respuestas breves y amigables. Tu meta es calificar al cliente para derivarlo a un humano.

ETAPA 1 - BIENVENIDA:
- Pedí el nombre. Si no lo sabés, no envíes el menú.

ETAPA 2 - MENÚ:
- Al saber el nombre, saludá y enviá $$SHOW_MENU$$. No escribas las opciones en texto.

ETAPA 3 - DATOS (Uno por uno):
- Servicio buscado (Foto/Video).
- Fecha y lugar.
- Cantidad de gente y duración (si es evento).
- **Email de contacto.**

REGLA ANTI-PAVADAS: Si el cliente habla fuera de tema, decile que preferís que un humano lo ayude y cortá con $$HANDOFF_JSON$$ (summary: "Consulta fuera de tema").

{{VIP_RULE}}

$$HANDOFF_JSON$$: Si tenés todo (incluyendo mail), generá:
$$HANDOFF_JSON$$
{
  "handoff": true,
  "name": "Nombre",
  "email": "correo",
  "summary": "Resumen detallado de todo lo pedido.",
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
        try {
            const body = req.body;
            const message = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
            if (!message) return res.status(200).send('OK');

            const fromRaw = message.from;
            const phoneNumberId = body.entry[0].changes[0].value.metadata.phone_number_id;
            let from = fromRaw;

            // Parche Argentina
            if (from.startsWith('549') && from.length === 13) from = '54' + from.substring(3);

            // Filtro Admin
            if (from === ADMIN_NUMBER || fromRaw === ADMIN_NUMBER) return res.status(200).send('OK');

            // --- LÓGICA DE MENSAJE ---
            let text = "";
            let btnId = null;

            if (message.type === 'text') text = message.text.body;
            else if (message.type === 'interactive') {
                btnId = message.interactive.button_reply.id;
                text = `[Botón: ${message.interactive.button_reply.title}]`;
            }

            if (!text) return res.status(200).send('OK');

            // Reset manual
            if (text.toLowerCase() === 'reset') {
                if (supabase) await supabase.from('whatsapp_sessions').delete().eq('phone', from);
                await sendText(phoneNumberId, from, "🔄 Memoria borrada.");
                return res.status(200).send('OK');
            }

            // Silencio Inteligente (Solo si hay un lead activo creado en las últimas 24hs)
            if (supabase && text.toLowerCase() !== 'menu' && !btnId) {
                const { data: lead } = await supabase.from('whatsapp_leads').select('created_at').eq('phone', from).order('created_at', {ascending:false}).limit(1).maybeSingle();
                if (lead) {
                    const hrs = (new Date() - new Date(lead.created_at)) / 36e5;
                    if (hrs < 24) {
                        // Guardamos igual para el CRM
                        await saveHistory(from, text);
                        return res.status(200).send('OK');
                    }
                }
            }

            // --- CONVERSACIÓN ---
            let history = [];
            if (supabase) {
                const { data } = await supabase.from('whatsapp_sessions').select('history').eq('phone', from).maybeSingle();
                if (data?.history) history = data.history;
            }

            // Si es un botón, manejamos rápido fuera de la IA si queremos, o se lo pasamos
            history.push({ role: 'user', content: text });
            if (history.length > 10) history = history.slice(-10);

            // VIP Check
            let vipRule = "";
            if (history.length <= 1 && supabase) {
                const { data } = await supabase.from('whatsapp_leads').select('name, email').eq('phone', from).maybeSingle();
                if (data?.name && data.name !== 'Sin nombre') {
                    vipRule = `VIP: Es ${data.name}. Saludalo por nombre y mandá $$SHOW_MENU$$. Si tenés su mail (${data.email || 'no'}), verificalo al final.`;
                }
            }

            // IA Call (HARD TIMEOUT 8 SEG)
            const aiPromise = groq.chat.completions.create({
                model: 'llama-3.1-8b-instant',
                messages: [{ role: 'system', content: SYSTEM_PROMPT.replace('{{VIP_RULE}}', vipRule).replace('{{SOURCE}}', 'Directo') }, ...history],
                temperature: 0.5,
                max_tokens: 500
            });

            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 8000));
            const completion = await Promise.race([aiPromise, timeoutPromise]);
            const aiRes = completion.choices[0].message.content;

            history.push({ role: 'assistant', content: aiRes });

            // Persistencia
            if (supabase) await supabase.from('whatsapp_sessions').upsert({ phone: from, history, updated_at: new Date().toISOString() }, { onConflict: 'phone' });

            // Enviar a WhatsApp
            let cleanRes = aiRes;
            let showMenu = false;
            let hf = null;

            const hMatch = aiRes.match(/\$\$HANDOFF_JSON\$\$([\s\S]*?)\$\$HANDOFF_JSON\$\$/);
            if (hMatch) {
                try { hf = JSON.parse(hMatch[1]); cleanRes = aiRes.replace(hMatch[0], '').trim(); } catch(e){}
            }
            if (cleanRes.includes('$$SHOW_MENU$$')) {
                showMenu = true;
                cleanRes = cleanRes.replace('$$SHOW_MENU$$', '').trim();
            }

            await sendText(phoneNumberId, from, cleanRes);
            if (showMenu) await sendMenu(phoneNumberId, from);

            // Handoff y Alertas (Background)
            if (hf?.handoff) {
                // ... Lead update, etc ...
                if (supabase) {
                    await supabase.from('whatsapp_leads').upsert({ phone: from, name: hf.name, email: hf.email, summary: hf.summary, updated_at: new Date().toISOString() }, { onConflict: 'phone' });
                }
                // Alerta básica Email
                try {
                    const Resend = (await import('resend')).Resend;
                    const resend = new Resend(process.env.RESEND_API_KEY);
                    await resend.emails.send({ from: 'NexoFilm <onboarding@resend.dev>', to: ['martinmagarinios@gmail.com'], subject: `LEAD: ${hf.name}`, html: `<p>${hf.summary}</p>` });
                } catch(e){}
            }

            return res.status(200).send('OK');

        } catch (err) {
            console.error(err);
            // Mensaje de rescate si podemos
            return res.status(200).send('OK');
        }
    }
}

// HELPERS (fetch global en Node 18+)
async function sendText(pid, to, msg) {
    await fetch(`https://graph.facebook.com/v21.0/${pid}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: msg } })
    });
}

async function sendMenu(pid, to) {
    await fetch(`https://graph.facebook.com/v21.0/${pid}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            messaging_product: 'whatsapp', to, type: 'interactive',
            interactive: {
                type: 'button', body: { text: "¿Qué buscás?" },
                action: {
                    buttons: [
                        { type: 'reply', reply: { id: 'btn_p', title: '📋 Presupuesto' } },
                        { type: 'reply', reply: { id: 'btn_v', title: '🎬 Portfolio' } },
                        { type: 'reply', reply: { id: 'btn_h', title: '👤 Hablar con Humano' } }
                    ]
                }
            }
        })
    });
}

async function saveHistory(phone, text) {
    if (!supabase) return;
    const { data } = await supabase.from('whatsapp_sessions').select('history').eq('phone', phone).maybeSingle();
    let hist = data?.history || [];
    hist.push({ role: 'user', content: text, timestamp: new Date().toISOString() });
    await supabase.from('whatsapp_sessions').upsert({ phone, history: hist, updated_at: new Date().toISOString() }, { onConflict: 'phone' });
}
