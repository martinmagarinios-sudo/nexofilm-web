import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_KEY;
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

// Helper para codificar en Base64URL
function base64url(str) {
    return Buffer.from(str)
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
}

// Genera un token JWT firmado con RS256 para Google OAuth2
function generateJWT(email, privateKey) {
    const header = JSON.stringify({ alg: 'RS256', typ: 'JWT' });
    const now = Math.floor(Date.now() / 1000);
    const payload = JSON.stringify({
        iss: email,
        scope: 'https://www.googleapis.com/auth/drive.readonly',
        aud: 'https://oauth2.googleapis.com/token',
        exp: now + 3600,
        iat: now
    });

    const signatureInput = `${base64url(header)}.${base64url(payload)}`;
    
    // Normalizar la clave privada si viene con caracteres de escape
    const formattedKey = privateKey.replace(/\\n/g, '\n');

    const sign = crypto.createSign('RSA-SHA256');
    sign.update(signatureInput);
    const signature = sign.sign(formattedKey, 'base64');
    const encodedSignature = signature.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

    return `${signatureInput}.${encodedSignature}`;
}

// Intercambia el JWT por un access_token de Google
async function getGoogleAccessToken(email, privateKey) {
    const jwt = generateJWT(email, privateKey);
    
    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
    });

    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.error_description || data.error || 'Error de autenticación con Google');
    }
    return data.access_token;
}

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const token = req.headers['x-client-token'] || req.query.token;

    if (!token) {
        return res.status(401).json({ error: 'Token de acceso requerido' });
    }

    if (!supabase) {
        return res.status(500).json({ error: 'Supabase credentials not configured' });
    }

    try {
        // 1. Obtener y validar el proyecto en Supabase
        const { data: project, error: projErr } = await supabase
            .from('projects')
            .select('*')
            .eq('access_token', token)
            .maybeSingle();

        if (projErr) throw projErr;

        if (!project) {
            return res.status(404).json({ error: 'Proyecto no encontrado' });
        }

        // Si el proyecto no está en estado 'delivered', no mostramos los archivos finales
        if (project.status !== 'delivered') {
            return res.status(403).json({ error: 'El material final aún no está disponible' });
        }

        const driveFolderId = project.drive_folder_id;

        // --- MOCK FALLBACK (PARA PRUEBAS) ---
        // Si no están configuradas las variables de entorno de la Service Account de Google,
        // devolvemos archivos simulados para que Martín pueda probar la interfaz sin trabarse.
        const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
        const privateKey = process.env.GOOGLE_PRIVATE_KEY;

        if (!driveFolderId || !clientEmail || !privateKey) {
            console.warn('[DRIVE BRIDGE] Faltan credenciales de Google Drive o drive_folder_id. Usando datos mock.');
            
            const mockFiles = [
                {
                    id: 'mock-1',
                    name: '01_Video_Principal_Final_1080p.mp4',
                    mimeType: 'video/mp4',
                    webViewLink: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                    thumbnailLink: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=400&q=80',
                    webContentLink: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                    size: '245678900' // ~234 MB
                },
                {
                    id: 'mock-2',
                    name: '02_Teaser_Redes_9x16.mp4',
                    mimeType: 'video/mp4',
                    webViewLink: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                    thumbnailLink: 'https://images.unsplash.com/photo-1542204172-e7052809a8a7?auto=format&fit=crop&w=400&q=80',
                    webContentLink: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                    size: '89123450' // ~85 MB
                },
                {
                    id: 'mock-3',
                    name: 'Selección_Fotografías_Editadas.zip',
                    mimeType: 'application/zip',
                    webViewLink: '#',
                    thumbnailLink: 'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?auto=format&fit=crop&w=400&q=80',
                    webContentLink: '#',
                    size: '1256789000' // ~1.17 GB
                },
                {
                    id: 'mock-4',
                    name: 'Fotografías de Producto (Carpeta en Google Drive)',
                    mimeType: 'application/vnd.google-apps.folder',
                    webViewLink: 'https://drive.google.com',
                    thumbnailLink: null,
                    webContentLink: null,
                    size: null
                }
            ];

            return res.status(200).json({
                success: true,
                isMock: true,
                files: mockFiles
            });
        }

        // 2. Autenticación con Google Drive usando Service Account
        const googleAccessToken = await getGoogleAccessToken(clientEmail, privateKey);

        // 3. Hacer fetch directo a la REST API de Google Drive para listar archivos de la carpeta
        const q = `'${driveFolderId}' in parents and trashed = false`;
        const fields = 'files(id,name,mimeType,webViewLink,thumbnailLink,webContentLink,size)';
        const driveUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=${encodeURIComponent(fields)}`;

        const driveRes = await fetch(driveUrl, {
            headers: { 'Authorization': `Bearer ${googleAccessToken}` }
        });

        const driveData = await driveRes.json();
        
        if (!driveRes.ok) {
            throw new Error(driveData.error?.message || 'Error al listar archivos de Google Drive');
        }

        return res.status(200).json({
            success: true,
            isMock: false,
            files: driveData.files || []
        });

    } catch (error) {
        console.error('Error en drive-bridge API:', error);
        return res.status(500).json({ error: error.message });
    }
}
