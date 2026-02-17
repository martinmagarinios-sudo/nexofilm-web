
const { Jimp } = require('jimp');
const fs = require('fs');

const BG_PATH = 'public/img/hero/Insta toma playa.jpg';
const LOGO_PATH = 'components/logo.png';
const OUTPUT_PATH = 'public/preview_whatsapp.jpg';

async function run() {
    try {
        console.log('🖼️ Procesando imagen personalizada...');

        if (!fs.existsSync(BG_PATH)) throw new Error(`Falta imagen fondo: ${BG_PATH}`);

        let logoPath = LOGO_PATH;
        if (!fs.existsSync(logoPath)) {
            if (fs.existsSync('components/logo.jpg')) logoPath = 'components/logo.jpg';
            else throw new Error(`Falta logo: ${LOGO_PATH}`);
        }

        const bg = await Jimp.read(BG_PATH);
        const logo = await Jimp.read(logoPath);

        // COVER: Recorta inteligentemente para llenar 1200x630 sin estirar
        // En v1 cover suele aceptar params posicionales (w, h)
        // Intentamos objeto si falla? ZodError suele ser claro.
        // Pero resize({w,h}) funcionó. Cover probablemente sea cover({w,h}) en v1.
        // Probaremos con objeto.
        try {
            bg.cover({ w: 1200, h: 630 });
        } catch (e) {
            // Fallback sintaxis clásica
            bg.cover(1200, 630);
        }

        console.log('🎨 Aplicando efectos...');
        bg.sepia();
        bg.brightness(-0.4); // Un poco más oscuro para resaltar logo

        // Resize logo (max 500px ancho)
        if (logo.bitmap.width > 500) {
            logo.resize({ w: 500 });
        }

        // Centrar logo
        const x = (bg.bitmap.width - logo.bitmap.width) / 2;
        const y = (bg.bitmap.height - logo.bitmap.height) / 2;

        console.log(`Componiendo logo en ${x},${y}`);
        bg.composite(logo, x, y);

        await bg.write(OUTPUT_PATH);
        console.log('✅ ÉXITO: Imagen generada en ' + OUTPUT_PATH);

    } catch (error) {
        console.error('❌ ERROR FATAL:', error);
    }
}

run();
