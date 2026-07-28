const { Jimp } = require('jimp');
const fs = require('fs');

async function generateOgImages() {
    try {
        console.log('🎨 Generando imágenes de vista previa para WhatsApp y OpenGraph...');

        const bgPath = fs.existsSync('public/background_cine.jpg') 
            ? 'public/background_cine.jpg' 
            : 'public/img/hero/Insta toma playa.jpg';

        const bg = await Jimp.read(bgPath);
        const logo = await Jimp.read('components/logo.png');

        // 1. Imagen Landscape 1200x630 (Ideal para Twitter, LinkedIn, Facebook, WhatsApp HD)
        const bg1200 = bg.clone();
        try {
            bg1200.cover({ w: 1200, h: 630 });
        } catch(e) {
            bg1200.resize({ w: 1200, h: 630 });
        }
        bg1200.brightness(-0.35); // Fondo cinemático oscuro de alto contraste
        bg1200.contrast(0.1);

        const logo1200 = logo.clone();
        logo1200.resize({ w: 620 }); // Ancho ideal para lectura nítida

        const x1200 = Math.round((1200 - logo1200.bitmap.width) / 2);
        const y1200 = Math.round((630 - logo1200.bitmap.height) / 2);
        bg1200.composite(logo1200, x1200, y1200);

        await bg1200.write('public/preview_whatsapp.jpg');
        await bg1200.write('public/og-image.jpg');
        console.log('✅ Creado: public/preview_whatsapp.jpg (1200x630)');

        // 2. Imagen Cuadrada 800x800 (Ideal para miniaturas laterales de WhatsApp y Telegram)
        const bg800 = bg.clone();
        try {
            bg800.cover({ w: 800, h: 800 });
        } catch(e) {
            bg800.resize({ w: 800, h: 800 });
        }
        bg800.brightness(-0.35);
        bg800.contrast(0.1);

        const logo800 = logo.clone();
        logo800.resize({ w: 550 });

        const x800 = Math.round((800 - logo800.bitmap.width) / 2);
        const y800 = Math.round((800 - logo800.bitmap.height) / 2);
        bg800.composite(logo800, x800, y800);

        await bg800.write('public/logo-whatsapp.jpg');
        console.log('✅ Creado: public/logo-whatsapp.jpg (800x800)');

    } catch (error) {
        console.error('❌ Error generando imágenes OG:', error);
    }
}

generateOgImages();
