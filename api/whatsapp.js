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

const SYSTEM_PROMPT = `Eres el asistente virtual de NexoFilm (Argentina). Sos cálido, cercano y profesional.

IDENTIDAD:
- Usá VOSEO SIEMPRE ("me decís", "mirá", "querés"). Prohibido "tú" o "usted".
- NUNCA uses la palabra "che".
- Respuestas breves y conversacionales, una cosa a la vez.
- NUNCA pidas disculpas por demoras ni errores técnicos.

FLUJO EXACTO:
1. Si no sabés el nombre: "¡Hola! Bienvenido a NexoFilm. ¿Me decís tu nombre por favor?"

2. Al recibir el nombre, respondé EXACTAMENTE así (copiá el formato):
   "Un gusto, [Nombre]. Acá te dejo nuestras opciones: $$SHOW_MENU$$"

   ⚠️ PROHIBICIÓN ABSOLUTA: NUNCA escribas las opciones como lista de texto. NUNCA escribas palabras como "Presupuesto", "Portfolio", "Contacto", "Video" como opciones. El tag $$SHOW_MENU$$ es lo ÚNICO que se necesita. El sistema envía los botones automáticamente.
   ❌ MAL: "Un gusto, Martín.\n- Presupuesto\n- Portfolio\n- Contacto"
   ✅ BIEN: "Un gusto, Martín. Acá te dejo nuestras opciones: $$SHOW_MENU$$"

   Después del tag, NO escribas nada más. STOP total. Esperá que el cliente haga clic.

3. Si el cliente eligió "Pedir Presupuesto" o quiere cotizar:
   - Preguntá UNA SOLA COSA POR VEZ, en este orden:
   a) "¡Qué bueno, [Nombre]! ¿Qué tipo de servicio o cobertura estás buscando? (Foto, Video, Streaming, o un combo de ellos)"
   b) Una vez que respondió el servicio: "¿Me podés contar qué tipo de evento es? (Evento social, feria, publicidad, fiesta de fin de año, presentación de producto, corporativo, etc.)"
   c) Una vez que respondió el tipo de evento: "¿Me decís la fecha y el lugar del evento?"
   d) Una vez que respondió: "¿Me decís la cantidad de personas esperadas y las horas de cobertura?"
   e) Una vez que respondió: "Perfecto. ¿Me pasás tu correo electrónico para mandarte el presupuesto?"
   f) Al tener el email, despedite con ESTE mensaje exactamente: "¡Bárbaro, [Nombre]! Fue un placer charlar con vos. Ya le paso los detalles a nuestro equipo. En breve te contactan. ¡Hasta pronto! 👋 Si necesitás algo más, escribí la palabra MENU."
   Y ADEMÁS, inmediatamente después de ese mensaje, insertá OBLIGATORIAMENTE el bloque $$HANDOFF_JSON$$ con todos los datos recogidos, para que el sistema interno guarde el lead. No omitas el $$HANDOFF_JSON$$.

   IMPORTANTE: Si el cliente ya te dijo el tipo de servicio, NO volvás a preguntarlo.

4. Si el cliente vio el portfolio y dice "si": comenzá desde el paso a) del punto 3.

REGLA ANTI-PAVADAS: Si el cliente dice algo que no tiene que ver con producción audiovisual, fotografía, video, streaming o eventos, respondé exactamente esto: "No estoy capacitado para responder eso, pero no te preocupes. Te voy a derivar con alguien de nuestro equipo que te va a ayudar. Si querés hacer una nueva consulta, escribí la palabra MENU." Luego generá el handoff con summary "Consulta fuera de tema".

{{VIP_RULE}}

HANDOFF: Cuando tenés nombre, servicio, fecha, lugar, personas, horas y email:
$$HANDOFF_JSON$$
{
  "handoff": true,
  "name": "Nombre del cliente",
  "email": "correo@ejemplo.com",
  "summary": "Video corporativo. Evento en San Miguel del Monte. 31 de julio. 460 personas. 6 horas de cobertura.",
  "score": 95
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
        // --- Botones Interactivos ---
        if (message.type === 'interactive') {
            const btnId = message.interactive.button_reply.id;
            const btnTitle = message.interactive.button_reply.title || btnId;

            let qr = "";
            if (btnId === 'btn_p') qr = "¡Bárbaro! ¿Qué tipo de servicio o cobertura estás buscando? (Foto, Video, Streaming, o un combo de ellos) 📸🎥";
            else if (btnId === 'btn_v') qr = "🎬 Mirá algunos de nuestros trabajos en: https://nexofilm.com \n¿Te gustaría consultar por un presupuesto?";
            else if (btnId === 'btn_h') {
                qr = "Entendido. Un productor te va a contactar a la brevedad. 👤📞";
                sendText(phoneNumberId, ADMIN_NUMBER, `🔔 ALERTA HUMANO: +${from}`).then(null, () => {});
            }

            if (qr) {
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
            if (supabase) { (async () => { try { await supabase.from('whatsapp_sessions').delete().eq('phone', from); } catch(e){} })(); }
            await sendText(phoneNumberId, from, "🔄 Memoria borrada.");
            return res.status(200).send('OK');
        }

        // Cargar historial + VIP check EN PARALELO
        const [history, leadData] = await Promise.all([
            loadHistory(from),
            supabase
                ? supabase.from('whatsapp_leads').select('name, email').eq('phone', from).order('created_at', { ascending: false }).limit(1).maybeSingle().then(r => r.data, () => null)
                : Promise.resolve(null)
        ]);

        history.push({ role: 'user', content: text });
        if (history.length > 14) history.splice(0, history.length - 14);

        let vipRule = "";
        if (history.length <= 1 && leadData?.name && leadData.name !== 'Sin nombre') {
            vipRule = `VIP: Es ${leadData.name}. Saludalo: "¡Hola ${leadData.name}! Qué bueno tenerte de vuelta. ¿En qué podemos ayudarte?" y mandá $$SHOW_MENU$$. No preguntes nombre. ${leadData.email ? `Verificá su mail (${leadData.email}) al final.` : ''}`;
        }

        // Llamada a Groq
        const comp = await groq.chat.completions.create({
            model: 'llama-3.1-8b-instant',
            messages: [{ role: 'system', content: SYSTEM_PROMPT.replace('{{VIP_RULE}}', vipRule) }, ...history],
            temperature: 0.4,
            max_tokens: 400
        });
        const aiRes = comp.choices[0].message.content;
        history.push({ role: 'assistant', content: aiRes });

        // Guardar historial (no bloqueante)
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

        // ENVIAR RESPUESTA (prioridad absoluta)
        await sendText(phoneNumberId, from, final);
        if (showMenu) await sendMenu(phoneNumberId, from);

        // HANDOFF: Guardar Lead + Enviar Mail (SÍNCRONO: debe completarse antes del 200)
        if (hf?.handoff) {
            console.log('HANDOFF detectado:', JSON.stringify(hf));
            await handleHandoff(from, hf);
        }

    } catch (err) {
        console.error("BOT ERROR:", err.message);
    }

    return res.status(200).send('OK');
}

async function handleHandoff(phone, hf) {
    // 1. Guardar Lead en Supabase
    if (supabase) {
        const { error } = await supabase.from('whatsapp_leads').upsert({
            phone,
            name: hf.name,
            email: hf.email,
            summary: hf.summary,
            score: hf.score || 90,
            updated_at: new Date().toISOString()
        }, { onConflict: 'phone' });
        if (error) console.error('Supabase Lead Error:', error.message);
    }

    // 2. Email al Admin vía Resend
    try {
        await resend.emails.send({
            from: 'NexoFilm CRM <onboarding@resend.dev>',
            to: [ADMIN_EMAIL],
            subject: `🔥 NUEVO LEAD: ${hf.name} (+${phone})`,
            html: `
                <h2>🎬 Nuevo Lead de NexoFilm</h2>
                <p><strong>Nombre:</strong> ${hf.name}</p>
                <p><strong>Teléfono:</strong> +${phone}</p>
                <p><strong>Email:</strong> ${hf.email || 'No proporcionado'}</p>
                <p><strong>Resumen:</strong> ${hf.summary}</p>
                <p><strong>Score:</strong> ${hf.score || 90}/100</p>
                <hr/>
                <p><a href="https://nexofilm.com/dashboard">👉 Abrir CRM para continuar la charla</a></p>
            `
        });
    } catch(e) {
        console.error("Error Resend:", e.message);
    }
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
