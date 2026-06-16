const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
    try {
        const { id } = req.query;
        
        const indexPath = path.join(process.cwd(), 'dist', 'index.html');
        if (!fs.existsSync(indexPath)) {
             return res.redirect('/');
        }
        let html = fs.readFileSync(indexPath, 'utf8');

        // Mapa de proyectos para previsualización rica en WhatsApp
        const projectsData = {
          "1": { title: "Copa Airlines", cat: "Video Comercial", img: "/logo-whatsapp.jpg" },
          "2": { title: "Bahia Principe", cat: "Video Institucional", img: "/logo-whatsapp.jpg" },
          "3": { title: "Cerámica San Lorenzo", cat: "Video Comercial", img: "/logo-whatsapp.jpg" },
          "4": { title: "Droguería del Sud", cat: "Video Comercial", img: "/logo-whatsapp.jpg" },
          "5": { title: "GEA", cat: "Video Institucional", img: "/logo-whatsapp.jpg" },
          "6": { title: "Namida Nikkei", cat: "Foto Producto", img: "/img/portfolio/Namida Nikkei/Namida.Nikkei-10.jpg" },
          "7": { title: "TS Tour Operador", cat: "Video Comercial", img: "/logo-whatsapp.jpg" },
          "8": { title: "Vista Sol", cat: "Video Institucional", img: "/logo-whatsapp.jpg" },
          "9": { title: "Droguería del Sud", cat: "Video Comercial", img: "/logo-whatsapp.jpg" },
          "10": { title: "Expo Delicatessen & Vinos", cat: "Cobertura de Evento", img: "/logo-whatsapp.jpg" }
        };

        const project = projectsData[id] || { title: `Proyecto ${id}`, cat: "Portfolio", img: "/logo-whatsapp.jpg" };

        // Prepare SEO/OG Data
        const title = `${project.title} | NexoFilm`;
        const description = `Mira el proyecto audiovisual de ${project.title} (${project.cat}) producido por NexoFilm. Producción corporativa y cinematográfica en Latam.`;
        const imageUrl = `https://nexofilm.com${project.img.replace(/ /g, '%20')}`;
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
