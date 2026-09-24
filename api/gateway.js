export default async function handler(req, res) {
    const GATEWAY_URL = (process.env.WHATSAPP_GATEWAY_URL || 'https://nexofilm-whatsapp-gateway.onrender.com').replace(/\/$/, '');
    const GATEWAY_KEY = (process.env.WHATSAPP_GATEWAY_KEY || process.env.GATEWAY_API_KEY || 'nexofilm_gw_secret_2026').trim();

    // 1. Consultar estado del Gateway (GET)
    if (req.method === 'GET') {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000);

            const response = await fetch(`${GATEWAY_URL}/api/status`, {
                method: 'GET',
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                return res.status(200).json({
                    connected: false,
                    configured: Boolean(process.env.WHATSAPP_GATEWAY_URL),
                    gatewayUrl: GATEWAY_URL,
                    error: `Gateway respondió con código ${response.status}`
                });
            }

            const data = await response.json();
            return res.status(200).json({
                ...data,
                configured: true,
                gatewayUrl: GATEWAY_URL
            });
        } catch (err) {
            return res.status(200).json({
                connected: false,
                configured: Boolean(process.env.WHATSAPP_GATEWAY_URL),
                gatewayUrl: GATEWAY_URL,
                error: 'No se pudo conectar con el microservicio de WhatsApp Gateway. Asegurate de que esté corriendo.',
                details: err.message
            });
        }
    }

    // 2. Acciones del Gateway (POST)
    if (req.method === 'POST') {
        const { action, password, to, message, mediaUrl } = req.body || {};

        if (password !== 'Nex@2023R') {
            return res.status(401).json({ error: 'No autorizado' });
        }

        try {
            if (action === 'send') {
                if (!to || (!message && !mediaUrl)) {
                    return res.status(400).json({ error: 'Faltan parámetros: "to" y "message"' });
                }

                const response = await fetch(`${GATEWAY_URL}/api/send`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': GATEWAY_KEY
                    },
                    body: JSON.stringify({ to, message, mediaUrl })
                });

                const result = await response.json();
                if (!response.ok) {
                    return res.status(response.status).json(result);
                }

                return res.status(200).json({ success: true, ...result });
            }

            if (action === 'restart') {
                const response = await fetch(`${GATEWAY_URL}/api/restart`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': GATEWAY_KEY
                    }
                });
                const result = await response.json();
                return res.status(200).json(result);
            }

            if (action === 'logout') {
                const response = await fetch(`${GATEWAY_URL}/api/logout`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': GATEWAY_KEY
                    }
                });
                const result = await response.json();
                return res.status(200).json(result);
            }

            return res.status(400).json({ error: 'Acción no reconocida' });
        } catch (err) {
            return res.status(500).json({
                error: 'Error de comunicación con el Gateway',
                details: err.message
            });
        }
    }

    return res.status(405).json({ error: 'Método no permitido' });
}
