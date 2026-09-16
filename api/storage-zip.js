// api/storage-zip.js
// Genera un ZIP en streaming con archiver — sin cargar todo en RAM.
// Soporta hasta 500 archivos (fotos o videos).
// Para cada archivo: lo descarga desde Google Drive y lo agrega al ZIP al vuelo.
// El cliente empieza a recibir el ZIP antes de que terminen de bajar todos los archivos.

import archiver from 'archiver';

// ─── Resolución de URL de Google Drive ───────────────────────────────────────

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

    // Archivos pequeños: Google ya devuelve el binario
    if (!ct.includes('text/html')) {
        return { response: res1 };
    }

    // Archivos grandes: extraer UUID de la página de advertencia
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

    const res2 = await fetch(directUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
            'Accept': '*/*',
        }
    });
    return { response: res2 };
}

// ─── Conversión de fetch Response a Node.js ReadableStream ───────────────────
// Archiver espera streams de Node.js, pero fetch devuelve Web ReadableStream.
// Esta función convierte entre los dos.

import { Readable } from 'stream';

function webReadableToNodeReadable(webReadable) {
    const reader = webReadable.getReader();
    return new Readable({
        async read() {
            try {
                const { done, value } = await reader.read();
                if (done) {
                    this.push(null);
                } else {
                    this.push(Buffer.from(value));
                }
            } catch (err) {
                this.destroy(err);
            }
        }
    });
}

// ─── Handler principal ────────────────────────────────────────────────────────

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

    // Límite generoso: 500 archivos
    // Para fotos: 500 × 8MB promedio = 4GB, pero gracias al streaming
    // el ZIP se transmite al cliente mientras se descarga, no se acumula en RAM.
    if (files.length > 500)
        return res.status(400).json({ error: 'Maximo 500 archivos por ZIP' });

    const safeZipName = (zipName || 'NexoFilm_Storage.zip').replace(/[^\w\s.\-()áéíóúÁÉÍÓÚñÑ]/g, '_');

    // Enviar headers de streaming ANTES de empezar el ZIP
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', ttachment; filename*=UTF-8'');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('X-NexoFilm-Storage', 'true');

    // Crear el ZIP en streaming con nivel de compresión 5 (balance entre velocidad y tamaño)
    const archive = archiver('zip', { zlib: { level: 5 } });

    archive.pipe(res);

    // Manejar errores del archiver
    archive.on('error', (err) => {
        console.error('[storage-zip] Archiver error:', err.message);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Error generando ZIP', detail: err.message });
        } else {
            res.end();
        }
    });

    let addedCount = 0;
    let errorCount = 0;

    // Descargar y agregar archivos de a BLOQUES de 10 en paralelo.
    // Esto evita hacer 300 requests simultáneos a Google (que los bloquearía)
    // y mantiene la memoria controlada.
    const BATCH_SIZE = 10;

    for (let i = 0; i < files.length; i += BATCH_SIZE) {
        const batch = files.slice(i, i + BATCH_SIZE);

        // Descargar el lote en paralelo
        const results = await Promise.allSettled(
            batch.map(async (file) => {
                const { response } = await getDirectUrl(file.id);
                if (!response.ok) throw new Error(HTTP  para );
                return { name: file.name, response };
            })
        );

        // Agregar cada archivo al ZIP (secuencial dentro del lote para el archiver)
        for (const result of results) {
            if (result.status === 'fulfilled') {
                const { name, response } = result.value;
                try {
                    // Convertir el Web ReadableStream de fetch a Node.js Readable para archiver
                    const nodeStream = webReadableToNodeReadable(response.body);
                    // archive.append recibe el stream y lo escribe en el ZIP en streaming
                    archive.append(nodeStream, { name });
                    addedCount++;
                } catch (appendErr) {
                    console.error('[storage-zip] Error appending:', name, appendErr.message);
                    errorCount++;
                }
            } else {
                console.error('[storage-zip] Download failed:', result.reason?.message);
                errorCount++;
            }
        }
    }

    if (addedCount === 0) {
        // Si no se pudo agregar nada, finalizar con error
        archive.abort();
        if (!res.headersSent) {
            return res.status(500).json({ error: 'No se pudo descargar ningun archivo' });
        }
        return;
    }

    console.log([storage-zip] ZIP finalizado:  archivos OK,  errores);

    // Finalizar el ZIP — esto escribe el directorio central y cierra el stream
    await archive.finalize();
}
