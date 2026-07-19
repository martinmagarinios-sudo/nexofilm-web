import fs from 'fs';
import path from 'path';

export default async function(req, res) {
    try {
        const indexPath = path.join(process.cwd(), 'dist', 'index.html');
        if (!fs.existsSync(indexPath)) {
             return res.redirect('/');
        }
        let html = fs.readFileSync(indexPath, 'utf8');

        // Prepare SEO/OG Data
        const title = `Cotizá tu Producción Audiovisual | NexoFilm`;
        const description = `Completá esta breve información y nosotros armamos un presupuesto detallado para tu próximo evento.`;
        const imageUrl = `https://nexofilm.com/preview_whatsapp.jpg`;
        const url = `https://nexofilm.com/presupuesto`;

        // Inject Meta Tags dynamically
        html = html
            .replace(/<title>.*?<\/title>/g, `<title>${title}</title>`)
            .replace(/<meta name="description"\s+content="[^"]*"/g, `<meta name="description" content="${description}"`)
            .replace(/<meta property="og:title" content="[^"]*"/g, `<meta property="og:title" content="${title}"`)
            .replace(/<meta property="og:description"\s+content="[^"]*"/g, `<meta property="og:description" content="${description}"`)
            .replace(/<meta property="og:image" content="[^"]*"/g, `<meta property="og:image" content="${imageUrl}"`)
            .replace(/<meta property="og:url" content="[^"]*"/g, `<meta property="og:url" content="${url}"`)
            .replace(/<meta name="twitter:title" content="[^"]*"/g, `<meta name="twitter:title" content="${title}"`)
            .replace(/<meta name="twitter:description"\s+content="[^"]*"/g, `<meta name="twitter:description" content="${description}"`)
            .replace(/<meta name="twitter:image" content="[^"]*"/g, `<meta name="twitter:image" content="${imageUrl}"`);

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate'); // Cache on Vercel Edge
        return res.status(200).send(html);

    } catch (error) {
        console.error("Error in presupuesto OG api:", error);
        return res.redirect('/');
    }
};
