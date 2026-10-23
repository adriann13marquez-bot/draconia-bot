const fs = require('fs');
const path = require('path');
const https = require('https');

// Mapeo corregido de categorías de Otakugifs
const categorias = {
    'asustado': 'blush',
    'bailar': 'dance',
    'cachetada': 'slap',
    'caminar': 'happy',
    'chocar': 'airkiss',
    'enfadarse': 'pout',
    'escribir': 'nom',
    'escupir': 'bite',
    'feliz': 'happy',
    'frente': 'kiss',
    'mano': 'handhold',
    'mejilla': 'kiss',
    'abrazo': 'hug',
    'beso': 'kiss',
    'patada': 'slap',
    'puno': 'punch',
    'llorar': 'cry',
    'triste': 'sad'
};

function descargarURL(url, destino) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(destino);
        https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (response) => {
            if (response.statusCode === 301 || response.statusCode === 302) {
                return descargarURL(response.headers.location, destino).then(resolve).catch(reject);
            }
            response.pipe(file);
            file.on('finish', () => file.close(resolve));
        }).on('error', (err) => {
            fs.unlink(destino, () => {});
            reject(err);
        });
    });
}

async function obtenerGifUrl(type) {
    return new Promise((resolve, reject) => {
        https.get(`https://api.otakugifs.xyz/gif?reaction=${type}`, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve(json.url);
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

async function iniciar() {
    console.log("🚀 Llenando el arsenal de Draconia (+7 GIFs por carpeta)...\n");
    
    for (const [folder, apiCategory] of Object.entries(categorias)) {
        const dirPath = path.join(__dirname, 'media/gifs', folder);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }

        console.log(`📥 Descargando paquete extra para: [ ${folder} ]...`);

        // Descarga 7 GIFs adicionales por carpeta
        for (let i = 1; i <= 7; i++) {
            try {
                const gifUrl = await obtenerGifUrl(apiCategory);
                if (!gifUrl) throw new Error("URL no válida");
                const filePath = path.join(dirPath, `extra_${Date.now()}_${i}.gif`);
                await descargarURL(gifUrl, filePath);
                console.log(`   ✅ Extra ${i} guardado en ${folder}`);
            } catch (err) {
                console.log(`   ❌ Error en ${folder}:`, err.message);
            }
        }
    }
    console.log("\n🎉 ¡Súper descarga completada con éxito!");
}

iniciar();
