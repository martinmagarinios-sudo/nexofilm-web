
const { Jimp } = require('jimp');
const https = require('https');
const fs = require('fs');

// URL alternativa directa (Pexels) - Film Set / Camera
const BACKGROUND_URL = "https://images.pexels.com/photos/3062545/pexels-photo-3062545.jpeg";
const BG_PATH = 'public/background_cine.jpg';
const LOGO_PATH = 'components/logo.png';
const OUTPUT_PATH = 'public/preview_whatsapp.jpg';

function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            if (response.statusCode === 302 || response.statusCode === 301) {
                downloadFile(response.headers.location, dest).then(resolve).catch(reject);
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close(() => resolve(dest));
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => { });
            reject(err);
        });
    });
}

async function run() {
    try {
        console.log('⬇️ Descargando fondo:', BACKGROUND_URL);
        await downloadFile(BACKGROUND_URL, BG_PATH);

        const stats = fs.statSync(BG_PATH);
        console.log(`📦 Tamaño archivo fondo: ${stats.size} bytes`);

        if (stats.size < 1000) {
            throw new Error('El archivo descargado es demasiado pequeño (posiblemente un error HTML).');
        }

        console.log('🖼️ Procesando imagen...');
        const bg = await Jimp.read(BG_PATH);
        const logo = await Jimp.read(LOGO_PATH);

        // Resize fondo
        bg.resize({ w: 1200, h: 630 });

        // Resize logo (max 500px ancho)
        if (logo.bitmap.width > 500) {
            logo.resize({ w: 500 });
        }

        // Centrar
        const x = (bg.bitmap.width - logo.bitmap.width) / 2;
        const y = (bg.bitmap.height - logo.bitmap.height) / 2;

        console.log(`Logotipo redimensionado a ${logo.bitmap.width}x${logo.bitmap.height}. Posición: ${x},${y}`);

        // Componer
        bg.composite(logo, x, y);

        await bg.write(OUTPUT_PATH);
        console.log('✅ ÉXITO: Imagen generada en ' + OUTPUT_PATH);

    } catch (error) {
        console.error('❌ ERROR:', error);
    }
}

run();
