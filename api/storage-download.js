// api/storage-download.js
// Resuelve dinámicamente el token UUID de Google Drive para evitar la pantalla de advertencia
// de análisis de virus en archivos grandes (>100MB) y descargar directamente el archivo.

import https from 'https';

function getBypassUrl(fileId) {
    return new Promise((resolve) => {
        const initialUrl = 'https://drive.google.com/uc?export=download&id=' + fileId;
        https.get(initialUrl, (res) => {
            const redirectUrl = res.headers.location || initialUrl;
            https.get(redirectUrl, (res2) => {
                let body = '';
                res2.on('data', (c) => {
                    if (body.length < 100000) body += c;
                });
                res2.on('end', () => {
                    const uuidMatch = body.match(/name="uuid"\s+value="([^"]+)"/i) || body.match(/uuid=([a-zA-Z0-9_-]+)/i);
                    if (uuidMatch) {
                        const uuid = uuidMatch[1];
                        resolve('https://drive.usercontent.google.com/download?id=' + fileId + '&export=download&confirm=t&uuid=' + uuid);
                    } else {
                        resolve(redirectUrl || ('https://drive.usercontent.google.com/download?id=' + fileId + '&export=download&confirm=t'));
                    }
                });
            }).on('error', () => resolve('https://drive.usercontent.google.com/download?id=' + fileId + '&export=download&confirm=t'));
        }).on('error', () => resolve('https://drive.usercontent.google.com/download?id=' + fileId + '&export=download&confirm=t'));
    });
}

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-client-token');
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { fileId, json } = req.query;
    if (!fileId) {
        return res.status(400).json({ error: 'fileId es requerido' });
    }

    try {
        const downloadUrl = await getBypassUrl(fileId);

        // Si la petición solicita JSON (desde frontend de StorageDelivery o ClientPortal)
        if (json === 'true' || (req.headers.accept && req.headers.accept.includes('application/json'))) {
            return res.status(200).json({ ok: true, downloadUrl });
        }

        // Redirección 302 directa al stream de descarga con uuid bypass
        res.writeHead(302, {
            Location: downloadUrl,
            'Cache-Control': 'no-cache, no-store, must-revalidate'
        });
        return res.end();
    } catch (err) {
        console.error('[storage-download] Error procesando bypass:', err);
        const fallbackUrl = 'https://drive.usercontent.google.com/download?id=' + fileId + '&export=download&confirm=t';
        if (json === 'true') {
            return res.status(200).json({ ok: true, downloadUrl: fallbackUrl });
        }
        res.writeHead(302, { Location: fallbackUrl });
        return res.end();
    }
}
