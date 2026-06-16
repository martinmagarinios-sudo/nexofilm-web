const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
    try {
        const { id } = req.query;
        
        // We can't easily require ts files in this plain js vercel function, so we'll just mock the config grab
        // or better yet, since it's just meta tags, we'll try to extract them from a compiled config or fetch them
        // For simplicity and safety (since Vite compiles data/config.ts), we will use generic OG tags but with the project ID
        
        const indexPath = path.join(process.cwd(), 'dist', 'index.html');
        if (!fs.existsSync(indexPath)) {
             return res.redirect('/');
        }
        let html = fs.readFileSync(indexPath, 'utf8');

        // Prepare SEO/OG Data (Fallback logic)
        const title = `Proyecto ${id.toUpperCase()} | NexoFilm Portfolio`;
        const description = `Mira el proyecto ${id.toUpperCase()} producido por NexoFilm. Producción audiovisual corporativa, comercial y streaming en Latam.`;
        const imageUrl = `https://nexofilm.com/logo-whatsapp.jpg`; // Default fallback until we can read the specific image
        const url = `https://nexofilm.com/portfolio/${id}`;

        // Inject Meta Tags dynamically
        html = html
            .replace(/<title>.*?<\/title>/g, `<title>${title}</title>`)
            .replace(/<meta name="description" content="[^"]*"/g, `<meta name="description" content="${description}"`)
            .replace(/<meta property="og:title" content="[^"]*"/g, `<meta property="og:title" content="${title}"`)
            .replace(/<meta property="og:description" content="[^"]*"/g, `<meta property="og:description" content="${description}"`)
            .replace(/<meta property="og:image" content="[^"]*"/g, `<meta property="og:image" content="${imageUrl}"`)
            .replace(/<meta property="og:url" content="[^"]*"/g, `<meta property="og:url" content="${url}"`)
            .replace(/<meta name="twitter:title" content="[^"]*"/g, `<meta name="twitter:title" content="${title}"`)
            .replace(/<meta name="twitter:description" content="[^"]*"/g, `<meta name="twitter:description" content="${description}"`)
            .replace(/<meta name="twitter:image" content="[^"]*"/g, `<meta name="twitter:image" content="${imageUrl}"`);

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate'); // Cache on Vercel Edge
        return res.status(200).send(html);

    } catch (error) {
        console.error("Error in portfolio OG api:", error);
        return res.redirect('/');
    }
};
