// api/storage-zip.js
// Descarga múltiples archivos de Google Drive, los comprime en un ZIP y lo envía
// como una única descarga desde nexofilm.com. El cliente nunca ve URLs de Google.
// Se invoca con: POST /api/storage-zip
// Body JSON: { files: [{ id, name }], zipName: "NexoFilm_Entregables.zip" }

import AdmZip from 'adm-zip';

/**
 * Resuelve la URL de descarga directa de Google Drive (bypass del "virus scan warning").
 */
async function getDirectUrl(fileId) {
    const initialUrl = https://drive.google.com/uc?export=download&id=;
    const res1 = await fetch(initialUrl, {
        redirect: 'follow',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
    });
    const ct = res1.headers.get('content-type') || '';
    if (!ct.includes('text/html')) {
        const buf = Buffer.from(await res1.arrayBuffer());
        return { buffer: buf };
    }
    const html = await res1.text();
    const uuidMatch =
        html.match(/name="uuid"\s+value="([^"]+)"/i) ||
        html.match(/"uuid"\s*:\s*"([^"]+)"/i);
    let directUrl;
    if (uuidMatch) {
        directUrl = https://drive.usercontent.google.com/download?id=&export=download&confirm=t&uuid=;
    } else {
        const actionMatch = html.match(/action="([^"]+)"/i);
        if (actionMatch) {
            const u = actionMatch[1].replace(/&amp;/g, '&');
            directUrl = u.startsWith('http') ? u : https://drive.usercontent.google.com;
        } else {
            directUrl = https://drive.usercontent.google.com/download?id=&export=download&confirm=t;
        }
    }
    return { url: directUrl };
}

async function fetchFileBuffer(fileId) {
    const result = await getDirectUrl(fileId);
    if (result.buffer) return result.buffer;
    const res = await fetch(result.url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
            'Accept': '*/*',
        }
    });
    if (!res.ok) throw new Error(Error descargando : HTTP );
    return Buffer.from(await res.arrayBuffer());
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-client-token');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo no permitido' });

    let body;
    try {
        body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch {
        return res.status(400).json({ error: 'Body JSON invalido' });
    }

    const { files, zipName } = body || {};
    if (!Array.isArray(files) || files.length === 0)
        return res.status(400).json({ error: 'Se requiere un array "files" con al menos un archivo' });
    if (files.length > 20)
        return res.status(400).json({ error: 'Maximo 20 archivos por ZIP' });

    const safeZipName = (zipName || 'NexoFilm_Storage.zip').replace(/[^\w\s.\-()]/g, '_');

    try {
        const zip = new AdmZip();
        const results = await Promise.allSettled(
            files.map(async (file) => {
                const buffer = await fetchFileBuffer(file.id);
                return { name: file.name, buffer };
            })
        );

        let addedCount = 0;
        for (const result of results) {
            if (result.status === 'fulfilled') {
                const { name, buffer } = result.value;
                zip.addFile(name, buffer);
                addedCount++;
            } else {
                console.error('[storage-zip] Error:', result.reason?.message);
            }
        }

        if (addedCount === 0)
            return res.status(500).json({ error: 'No se pudo descargar ningun archivo' });

        const zipBuffer = zip.toBuffer();
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', ttachment; filename*=UTF-8'');
        res.setHeader('Content-Length', zipBuffer.length);
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('X-NexoFilm-Storage', 'true');
        return res.status(200).send(zipBuffer);

    } catch (err) {
        console.error('[storage-zip] Error generando ZIP:', err.message);
        return res.status(500).json({ error: 'Error al generar el archivo ZIP. Intenta de nuevo.', detail: err.message });
    }
}
