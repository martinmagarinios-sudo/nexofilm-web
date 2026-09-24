import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pino from 'pino';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import makeWASocket, {
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion
} from '@whiskeysockets/baileys';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const API_KEY = (process.env.GATEWAY_API_KEY || 'nexofilm_gw_secret_2026').trim();
const AUTH_FOLDER = process.env.AUTH_FOLDER || path.join(__dirname, 'auth_info');

if (!fs.existsSync(AUTH_FOLDER)) {
    fs.mkdirSync(AUTH_FOLDER, { recursive: true });
}

app.use(cors());
app.use(express.json());

let sock = null;
let currentQR = null;
let currentQRDataUrl = null;
let isConnected = false;
let connectedUser = null;
let isInitializing = false;

const logger = pino({ level: 'silent' });

async function initWhatsApp() {
    if (isInitializing) return;
    isInitializing = true;

    try {
        const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);
        const { version } = await fetchLatestBaileysVersion();

        sock = makeWASocket({
            version,
            logger,
            printQRInTerminal: false,
            auth: state,
            browser: ['NexoFilm CRM', 'Chrome', '1.0.0'],
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 60000,
            keepAliveIntervalMs: 10000,
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                currentQR = qr;
                try {
                    currentQRDataUrl = await QRCode.toDataURL(qr, { margin: 2, scale: 8 });
                } catch (e) {
                    console.error('Error generating QR code data URL:', e);
                }
                isConnected = false;
                connectedUser = null;
                console.log('📌 [NexoFilm Gateway] Nuevo Código QR generado para escanear.');
            }

            if (connection === 'open') {
                isConnected = true;
                currentQR = null;
                currentQRDataUrl = null;
                connectedUser = sock.user;
                console.log('🟢 [NexoFilm Gateway] ¡WhatsApp Conectado con éxito!');
                console.log(`👤 Usuario conectado: ${sock.user?.name || sock.user?.id || 'WhatsApp Business'}`);
            }

            if (connection === 'close') {
                isConnected = false;
                connectedUser = null;
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

                console.log(`🔴 [NexoFilm Gateway] Conexión cerrada. Razón: ${statusCode}. Reconectando: ${shouldReconnect}`);

                if (statusCode === DisconnectReason.loggedOut) {
                    console.log('⚠️ [NexoFilm Gateway] Sesión cerrada. Limpiando credenciales...');
                    try {
                        fs.rmSync(AUTH_FOLDER, { recursive: true, force: true });
                        fs.mkdirSync(AUTH_FOLDER, { recursive: true });
                    } catch (err) {
                        console.error('Error borrando auth_info:', err);
                    }
                }

                if (shouldReconnect) {
                    setTimeout(() => {
                        isInitializing = false;
                        initWhatsApp();
                    }, 3000);
                }
            }
        });

    } catch (err) {
        console.error('❌ Error al inicializar WhatsApp Socket:', err);
    } finally {
        isInitializing = false;
    }
}

// Middleware de autenticación
function checkAuth(req, res, next) {
    const authHeader = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
    const reqKey = authHeader || req.body?.apiKey || req.query?.apiKey;

    if (reqKey !== API_KEY) {
        return res.status(401).json({ error: 'No autorizado. API Key incorrecta.' });
    }
    next();
}

// Formateador de teléfonos para WhatsApp
function formatPhoneToJid(rawPhone) {
    let clean = (rawPhone || '').replace(/\D/g, '');
    
    // Normalizar números de Argentina
    // Formato internacional de WA móvil en Argentina: 549 + código de área + número
    if (clean.startsWith('54') && !clean.startsWith('549') && clean.length >= 12) {
        clean = '549' + clean.slice(2);
    }
    if (!clean.startsWith('54') && clean.length === 10) {
        clean = '549' + clean;
    }

    return `${clean}@s.whatsapp.net`;
}

// Resolver y validar JID real registrado en WhatsApp (soporta 549 vs 54)
async function resolveWhatsAppJid(sockInstance, rawPhone) {
    let clean = (rawPhone || '').replace(/\D/g, '');
    if (!clean) return null;

    const candidates = [];
    if (clean.startsWith('549')) {
        candidates.push(`${clean}@s.whatsapp.net`);
        candidates.push(`54${clean.slice(3)}@s.whatsapp.net`);
    } else if (clean.startsWith('54')) {
        candidates.push(`549${clean.slice(2)}@s.whatsapp.net`);
        candidates.push(`${clean}@s.whatsapp.net`);
    } else if (clean.length === 10) {
        candidates.push(`549${clean}@s.whatsapp.net`);
        candidates.push(`54${clean}@s.whatsapp.net`);
    } else {
        candidates.push(`${clean}@s.whatsapp.net`);
    }

    try {
        for (const candidate of candidates) {
            const results = await sockInstance.onWhatsApp(candidate);
            if (results && results.length > 0 && results[0].exists) {
                console.log(`🔍 [Gateway] JID validado en WhatsApp: ${results[0].jid}`);
                return results[0].jid;
            }
        }
    } catch (e) {
        console.warn('Advertencia en onWhatsApp check:', e.message);
    }

    return formatPhoneToJid(rawPhone);
}

// Rutas API
app.get('/api/status', (req, res) => {
    res.json({
        connected: isConnected,
        qr: currentQR,
        qrDataUrl: currentQRDataUrl,
        user: connectedUser,
        timestamp: new Date().toISOString()
    });
});

app.post('/api/send', checkAuth, async (req, res) => {
    const { to, message, mediaUrl, caption } = req.body;

    if (!to || (!message && !mediaUrl)) {
        return res.status(400).json({ error: 'Faltan parámetros requeridos: "to" y "message" o "mediaUrl".' });
    }

    if (!isConnected || !sock) {
        return res.status(503).json({
            error: 'WhatsApp Gateway no está conectado. Escaneá el código QR primero.',
            connected: false
        });
    }

    try {
        const jid = await resolveWhatsAppJid(sock, to);

        let sentMsg;
        if (mediaUrl) {
            sentMsg = await sock.sendMessage(jid, {
                image: { url: mediaUrl },
                caption: caption || message || ''
            });
        } else {
            sentMsg = await sock.sendMessage(jid, {
                text: message
            });
        }

        console.log(`📤 [Gateway] Mensaje enviado exitosamente a ${jid}`);

        res.json({
            success: true,
            messageId: sentMsg.key.id,
            to: jid,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        console.error('❌ Error enviando mensaje por Gateway:', err);
        res.status(500).json({ error: 'Error al enviar mensaje', details: err.message });
    }
});

app.post('/api/restart', checkAuth, async (req, res) => {
    try {
        if (sock) {
            sock.end(new Error('Manual restart'));
        }
        setTimeout(() => {
            isInitializing = false;
            initWhatsApp();
        }, 1500);
        res.json({ success: true, message: 'Reiniciando socket de WhatsApp...' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/logout', checkAuth, async (req, res) => {
    try {
        if (sock) {
            await sock.logout();
        }
        try {
            fs.rmSync(AUTH_FOLDER, { recursive: true, force: true });
            fs.mkdirSync(AUTH_FOLDER, { recursive: true });
        } catch (e) {}

        isConnected = false;
        connectedUser = null;
        currentQR = null;
        currentQRDataUrl = null;

        setTimeout(() => {
            isInitializing = false;
            initWhatsApp();
        }, 2000);

        res.json({ success: true, message: 'Sesión cerrada y credenciales eliminadas.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 [NexoFilm WhatsApp Gateway] Servidor iniciado en puerto ${PORT}`);
    initWhatsApp();
});
