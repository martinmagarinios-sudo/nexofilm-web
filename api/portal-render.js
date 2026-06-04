import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
// Usamos la clave de rol de servicio (si existe) para tener privilegios de lectura y bypass de RLS
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_KEY;
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

export default async function handler(req, res) {
    const token = req.query.token;

    // Metadatos por defecto para el Portal
    let title = "Portal de Clientes | NexoFilm";
    let description = "Portal de autogestión de NexoFilm. Completá la información del proyecto para diseñar tu propuesta comercial a medida.";
    
    if (token && supabase) {
        try {
            // Buscamos el proyecto por su token de acceso seguro
            const { data: project, error } = await supabase
                .from('projects')
                .select('client_name, title')
                .eq('access_token', token)
                .maybeSingle();

            if (project && !error) {
                const clientName = project.client_name || '';
                const projectTitle = project.title || '';
                
                title = `Portal de Clientes - NexoFilm`;
                
                if (clientName && projectTitle) {
                    description = `Hola ${clientName}, ingresá aquí para completar los datos de "${projectTitle}" y generar tu presupuesto personalizado.`;
                } else if (clientName) {
                    description = `Hola ${clientName}, ingresá aquí para completar la información de tu evento o producción y generar tu presupuesto.`;
                } else if (projectTitle) {
                    description = `Ingresá aquí para completar los datos de "${projectTitle}" y generar tu presupuesto de NexoFilm.`;
                } else {
                    description = `Ingresá aquí para completar la información de tu proyecto y generar tu presupuesto en el Portal de Autogestión.`;
                }
            }
        } catch (err) {
            console.error('Error fetching project for OG tags:', err);
        }
    }

    try {
        // Leemos el index.html de producción (compilado por Vite en la carpeta dist)
        const filePath = path.join(process.cwd(), 'dist', 'index.html');
        let html = fs.readFileSync(filePath, 'utf8');

        // Reemplazo dinámico de etiquetas HTML de metadatos (SEO y OG Tags)
        
        // 1. Título de la página
        html = html.replace(/<title>[^<]*<\/title>/g, `<title>${title}</title>`);
        
        // 2. Descripción SEO
        html = html.replace(
            /<meta\s+name="description"\s+content="[^"]*"/g,
            `<meta name="description" content="${description}"`
        );
        html = html.replace(
            /<meta\s+name="description"\s+content='[^']*'/g,
            `<meta name="description" content="${description}"`
        );
        
        // 3. Open Graph Title
        html = html.replace(
            /<meta\s+property="og:title"\s+content="[^"]*"/g,
            `<meta property="og:title" content="${title}"`
        );
        html = html.replace(
            /<meta\s+property="og:title"\s+content='[^']*'/g,
            `<meta property="og:title" content="${title}"`
        );
        
        // 4. Open Graph Description
        html = html.replace(
            /<meta\s+property="og:description"\s+content="[^"]*"/g,
            `<meta property="og:description" content="${description}"`
        );
        html = html.replace(
            /<meta\s+property="og:description"\s+content='[^']*'/g,
            `<meta property="og:description" content="${description}"`
        );

        // 5. Twitter Title
        html = html.replace(
            /<meta\s+property="twitter:title"\s+content="[^"]*"/g,
            `<meta property="twitter:title" content="${title}"`
        );
        html = html.replace(
            /<meta\s+property="twitter:title"\s+content='[^']*'/g,
            `<meta property="twitter:title" content="${title}"`
        );

        // 6. Twitter Description
        html = html.replace(
            /<meta\s+property="twitter:description"\s+content="[^"]*"/g,
            `<meta property="twitter:description" content="${description}"`
        );
        html = html.replace(
            /<meta\s+property="twitter:description"\s+content='[^']*'/g,
            `<meta property="twitter:description" content="${description}"`
        );

        // Enviamos el HTML modificado
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send(html);
    } catch (error) {
        console.error('Error reading index.html:', error);
        return res.status(500).send('Error loading page');
    }
}
