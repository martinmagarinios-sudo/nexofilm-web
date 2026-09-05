import { createClient } from '@supabase/supabase-js';

const TELEGRAM_BOT_TOKEN = (process.env.TELEGRAM_BOT_TOKEN || '8912638236:AAFuMcVeWaZvocS2PZVrgtCm8SSgbeqikC4').trim();
const TELEGRAM_CHAT_ID = (process.env.TELEGRAM_CHAT_ID || '-1004401105264').trim();

const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_KEY || '').trim();
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

export default async function handler(req, res) {
    if (req.method === 'GET') {
        return res.status(200).json({ status: 'Telegram webhook live' });
    }

    if (req.method !== 'POST') {
        return res.status(405).send('Method not allowed');
    }

    const body = req.body;
    const message = body?.message;

    // Solo procesamos mensajes de texto dentro de un tema del grupo por humanos
    if (!message || !message.text || message.from?.is_bot) {
        return res.status(200).send('OK');
    }

    const chatId = String(message.chat?.id);
    const threadId = message.message_thread_id;

    // Validar que provenga de nuestro grupo y de un tema específico
    if (!threadId || chatId !== TELEGRAM_CHAT_ID) {
        return res.status(200).send('OK');
    }

    const textToSend = message.text.trim();
    if (!textToSend) return res.status(200).send('OK');

    if (!supabase) {
        console.error('[TELEGRAM] Supabase no configurado');
        return res.status(200).send('OK');
    }

    try {
        // 1. Buscar en whatsapp_sessions cuál teléfono tiene este thread_id en su historial
        const { data: sessions, error: sessErr } = await supabase
            .from('whatsapp_sessions')
            .select('phone, history');

        if (sessErr) {
            console.error('[TELEGRAM] Error buscando sesión:', sessErr.message);
            return res.status(200).send('OK');
        }

        const matchedSession = sessions?.find(s => 
            Array.isArray(s.history) && s.history.some(m => m.role === 'system' && m.type === 'telegram_topic' && Number(m.thread_id) === Number(threadId))
        );

        if (!matchedSession || !matchedSession.phone) {
            console.log(`[TELEGRAM] No se encontró cliente de WhatsApp asociado al tema ${threadId}`);
            return res.status(200).send('OK');
        }

        const phone = matchedSession.phone;
        const token = process.env.WHATSAPP_TOKEN?.trim();
        const phoneNumberId = process.env.WHATSAPP_PHONE_ID?.trim();

        if (!token || !phoneNumberId) {
            console.error('[TELEGRAM] Faltan credenciales de WhatsApp en el servidor');
            return res.status(200).send('OK');
        }

        // 2. Enviar mensaje a WhatsApp vía Meta Cloud API
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
            // Notificar error de entrega en el tema de Telegram
            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: TELEGRAM_CHAT_ID,
                    message_thread_id: threadId,
                    text: `⚠️ *No se pudo enviar a WhatsApp:*\nMeta respondió: "${result.error.message || 'Error desconocido'}".\nRecordá que deben haber pasado menos de 24hs desde el último mensaje del cliente.`
                })
            });
            return res.status(200).send('OK');
        }

        // 3. Guardar en el historial de Supabase con role 'admin'
        let currentHistory = matchedSession.history || [];
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

        console.log(`[TELEGRAM] Mensaje enviado exitosamente a WhatsApp +${phone}`);

    } catch (err) {
        console.error('[TELEGRAM] Error general en handler:', err.message);
    }

    return res.status(200).send('OK');
}
