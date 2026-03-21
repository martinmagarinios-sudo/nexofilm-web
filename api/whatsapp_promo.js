import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL)?.trim();
const supabaseKey = (process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_KEY)?.trim();
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

    const { phone, promoType } = req.body;

    if (!phone) return res.status(400).json({ error: 'Falta el teléfono' });

    const PROMO_MESSAGE = `¡Hola! Te escribimos de NexoFilm 🎬. Vimos que consultaste por nuestros servicios hace poco. 

Te recordamos que además de coberturas, hacemos:
✅ Foto Producto
✅ Streaming Profesional
✅ Video Institucional

¡Si mencionás este mensaje tenés un 10% OFF en tu próxima reserva! 🎥✨
¿Te gustaría que te coticemos algo nuevo?`;

    try {
        // 1. Enviar el mensaje por la API de Meta
        const token = process.env.WHATSAPP_TOKEN?.trim();
        const phoneNumberId = process.env.WHATSAPP_PHONE_ID?.trim();
        
        if (!token || !phoneNumberId) {
            throw new Error('Faltan credenciales de WhatsApp (Token o PhoneID) en el servidor.');
        }

        const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
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

        // 2. Registrar en el historial para que el Admin lo vea
        if (supabase) {
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
            
            // También actualizamos la etiqueta
            await supabase.from('whatsapp_leads').update({ etiquetas: 'promo_enviada' }).eq('phone', phone);
        }

        return res.status(200).json({ status: 'success', message: 'Promo enviada' });

    } catch (error) {
        console.error('Error enviando promo:', error);
        return res.status(500).json({ error: error.message });
    }
}
