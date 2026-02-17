
import { Jimp } from 'jimp';
import fs from 'fs';
import https from 'https';

// URL de la imagen de fondo (Studio, lights, camera)
const BACKGROUND_URL = "https://images.unsplash.com/photo-1598555231223-2895f403e944?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=1200";
const BACKGROUND_PATH = 'public/background_cine.jpg';

// Función para descargar imagen
function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      } else if (response.statusCode === 302 || response.statusCode === 301) {
        // Manejar redirección
        downloadImage(response.headers.location, filepath).then(resolve).catch(reject);
      } else {
        reject(`Server responded with ${response.statusCode}: ${response.statusMessage}`);
      }
    }).on('error', (err) => {
      fs.unlink(filepath, () => { });
      reject(err.message);
    });
  });
}

async function createOgImage() {
  try {
    console.log('⬇️ Descargando fondo...');
    await downloadImage(BACKGROUND_URL, BACKGROUND_PATH);
    console.log('✅ Fondo descargado.');

    console.log('🖼️ Componiendo imagen...');

    const background = await Jimp.read(BACKGROUND_PATH);
    const logo = await Jimp.read('components/logo.png');

    // Redimensionar fondo a 1200x630
    background.resize({ w: 1200, h: 630 });

    // Ajustar logo
    if (logo.bitmap.width > 500) {
      logo.resize({ w: 500 });
    }

    // Calcular posición centrada
    const x = (background.bitmap.width - logo.bitmap.width) / 2;
    const y = (background.bitmap.height - logo.bitmap.height) / 2;

    // Componer (logo sobre fondo)
    background.composite(logo, x, y);

    // Guardar
    await background.write('public/preview_whatsapp.jpg');
    console.log('✅ Imagen creada: public/preview_whatsapp.jpg');

    // Limpiar fondo temporal
    // fs.unlinkSync(BACKGROUND_PATH);

  } catch (error) {
    console.error('❌ Error principal:', error);

    // Fallback: intentar sintaxis clásica de Jimp si falla la nueva
    try {
      console.log('🔄 Intentando método alternativo (Jimp Classic)...');
      const JimpClassic = (await import('jimp')).default;

      const background = await JimpClassic.read(BACKGROUND_PATH);
      const logo = await JimpClassic.read('components/logo.png');

      background.cover(1200, 630);
      if (logo.bitmap.width > 500) logo.resize(500, JimpClassic.AUTO);

      const x = (background.bitmap.width - logo.bitmap.width) / 2;
      const y = (background.bitmap.height - logo.bitmap.height) / 2;

      background.composite(logo, x, y);
      await background.writeAsync('public/preview_whatsapp.jpg');
      console.log('✅ Imagen creada (método alt): public/preview_whatsapp.jpg');
    } catch (err2) {
      console.error('❌ Error fatal en fallback:', err2);
    }
  }
}

createOgImage();
