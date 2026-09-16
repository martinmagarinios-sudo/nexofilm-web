// api/storage-download.js — Vercel Edge Function con streaming proxy
// Actúa como proxy entre Google Drive y el navegador del cliente.
// El usuario NUNCA ve una URL de Google: descarga directamente desde nexofilm.com/api/storage-download
// Soporta archivos grandes (>4.5MB) usando Web Streams API (Transfer-Encoding: chunked).

export const config = { runtime: 'edge' };

/**
 * Resuelve la URL de descarga directa de Google Drive (bypass del "virus scan warning").
 * Para archivos grandes (>25MB), Google Drive muestra una página HTML de advertencia.
 * Esta función parsea esa página y extrae el UUID necesario para la descarga directa.
 * Retorna: { directResponse } si el archivo es pequeño, o { url } con la URL resuelta.
 */
async function getBypassUrl(fileId) {
    const initialUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;

    const res1 = await fetch(initialUrl, {
        redirect: 'follow',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
    });

    const contentType1 = res1.headers.get('content-type') || '';

    // Archivos pequeños (<25MB): Google ya devuelve el binario directamente
    if (!contentType1.includes('text/html')) {
        return { directResponse: res1 };
    }

    // Archivos grandes: leer el HTML de advertencia y extraer el UUID de bypass
    const html = await res1.text();

    const uuidMatch =
        html.match(/name="uuid"\s+value="([^"]+)"/i) ||
        html.match(/"uuid"\s*:\s*"([^"]+)"/i);

    if (uuidMatch) {
        const uuid = uuidMatch[1];
        return { url: `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t&uuid=${uuid}` };
    }

    // Fallback: extraer form action si el UUID no aparece
    const actionMatch = html.match(/action="([^"]+)"/i);
    if (actionMatch) {
        const actionUrl = actionMatch[1].replace(/&amp;/g, '&');
        return { url: actionUrl.startsWith('http') ? actionUrl : `https://drive.usercontent.google.com${actionUrl}` };
    }

    // Último fallback: URL directa sin UUID (puede mostrar advertencia para archivos muy grandes)
    return { url: `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t` };
}

export default async function handler(req) {
    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get('fileId');
    const fileName = searchParams.get('name') || 'archivo';

    // CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, x-client-token',
            }
        });
    }

    if (!fileId) {
        return new Response(JSON.stringify({ error: 'fileId es requerido' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const result = await getBypassUrl(fileId);

        let fileResponse;
        if (result.directResponse) {
            // Archivo pequeño: ya tenemos la response con el stream listo
            fileResponse = result.directResponse;
        } else {
            // Archivo grande: fetch a la URL resuelta con UUID
            fileResponse = await fetch(result.url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
                    'Accept': '*/*',
                }
            });
        }

        if (!fileResponse.ok && fileResponse.status !== 206) {
            throw new Error(`Google Drive respondió con status ${fileResponse.status}`);
        }

        const contentType = fileResponse.headers.get('content-type') || 'application/octet-stream';
        const contentLength = fileResponse.headers.get('content-length');

        // Sanitizar nombre de archivo para el header Content-Disposition
        const safeFileName = encodeURIComponent(fileName.trim());

        const responseHeaders = {
            // Content-Disposition: attachment fuerza descarga (nunca abre el archivo inline)
            'Content-Disposition': `attachment; filename*=UTF-8''${safeFileName}`,
            'Content-Type': contentType,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'X-NexoFilm-Storage': 'true',
            'Access-Control-Allow-Origin': '*',
        };

        // Pasar Content-Length si está disponible (permite mostrar progreso en el navegador)
        if (contentLength) {
            responseHeaders['Content-Length'] = contentLength;
        }

        // --- STREAMING ---
        // Edge Functions soportan Web Streams API nativo.
        // fileResponse.body es un ReadableStream que se envía en chunks al cliente.
        // Funciona para cualquier tamaño de archivo sin límite de 4.5MB.
        return new Response(fileResponse.body, {
            status: 200,
            headers: responseHeaders,
        });

    } catch (err) {
        console.error('[storage-download] Error:', err.message);
        return new Response(JSON.stringify({
            error: 'No se pudo iniciar la descarga. Intentá de nuevo.',
            detail: err.message
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            }
        });
    }
}

