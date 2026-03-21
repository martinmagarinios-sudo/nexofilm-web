import { createClient } from '@supabase/supabase-js';

// Inicializar cliente Supabase para guardar el historial
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_KEY;
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { phone, message, password } = req.body;

    // Validación de seguridad simple
    if (password !== 'Nex@2023R') {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!phone || !message) {
        return res.status(400).json({ error: 'Faltan datos requeridos (phone o message)' });
    }

    const token = process.env.WHATSAPP_TOKEN?.trim();
    const phoneNumberId = process.env.WHATSAPP_PHONE_ID?.trim();

    if (!token || !phoneNumberId) {
        return res.status(500).json({ error: 'Faltan credenciales de WhatsApp en el servidor' });
    }

    try {
        // Ejecutar envío real a WhatsApp (Mensaje de Texto plano)
        const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
        
        const payload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: phone,
            type: 'text',
            text: {
                body: message
            }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.error) {
            console.error("Error API Meta al enviar:", result.error);
            return res.status(500).json({ error: 'Meta rechazó el mensaje', details: result.error });
        }

        // Si se envió bien por WhatsApp, lo guardamos en el historial de Supabase
        if (supabase) {
            try {
                // 1. Obtener historial actual
                const { data: sessionInfo } = await supabase
                    .from('whatsapp_sessions')
                    .select('history')
                    .eq('phone', phone)
                    .single();
                
                let currentHistory = [];
                if (sessionInfo && sessionInfo.history) {
                    currentHistory = sessionInfo.history;
                }

                // 2. Anexar el registro del Admin
                currentHistory.push({
                    role: 'admin',
                    content: message,
                    timestamp: new Date().toISOString()
                });

                // 3. Guardar (Upsert) en la base de datos
                await supabase
                    .from('whatsapp_sessions')
                    .upsert({ 
                        phone: phone,
                        history: currentHistory,
                        updated_at: new Date().toISOString() 
                    });
            } catch (dbErr) {
                console.error("Mensaje enviado, pero error al guardar historial en BD:", dbErr.message);
            }
        }

        return res.status(200).json({ success: true, messageId: result.messages?.[0]?.id });

    } catch (err) {
        console.error("Error procesando whatsapp-send:", err);
        return res.status(500).json({ error: 'Error interno del servidor', details: err.message });
    }
}
