const yts = require('yt-search');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

async function execute(conn, m, args, command) {
    const chatId = m.key?.remoteJid || m.chat || m.from;
    if (!chatId) return;

    // 1. Validar estrictamente que el comando sea play o musica
    if (!['play', 'musica'].includes(command)) return;

    // 2. Obtener la búsqueda exclusivamente de los argumentos
    let query = '';
    if (Array.isArray(args) && args.length > 0) {
        query = args.join(' ').trim();
    }

    console.log('\n==============================');
    console.log('🎵 [PLAY] Solicitud recibida');
    console.log(`💬 Chat: ${chatId}`);
    console.log(`🔍 Búsqueda para YouTube: "${query}"`);
    console.log('==============================\n');

    if (!query) {
        return conn.sendMessage(chatId, { 
            text: '⚠️ *Draconia Malfoy:* Debe escribir el nombre de la canción o artista después de `#play`.\n\n*Ejemplo:* `#play TheFatRat Unity`' 
        }, { quoted: m });
    }

    await conn.sendMessage(chatId, { 
        text: `⏳ *Draconia Malfoy:* Buscando en YouTube: "*${query}*"...` 
    }, { quoted: m });

    try {
        // 3. Buscar en YouTube
        const search = await yts(query);
        const video = search.videos[0];

        if (!video) {
            return conn.sendMessage(chatId, { 
                text: `❌ No se encontraron resultados en YouTube para: "*${query}*".` 
            }, { quoted: m });
        }

        console.log(`✅ [PLAY] Encontrado: ${video.title} (${video.timestamp})`);

        const tempDir = path.join(__dirname, '../media');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

        const tempMp3 = path.join(tempDir, `play_${Date.now()}.mp3`);

        // 4. Descargar y convertir a MP3
        const cmd = `yt-dlp -f "ba" -x --audio-format mp3 --audio-quality 0 -o "${tempMp3}" "${video.url}"`;

        exec(cmd, async (error) => {
            if (error) {
                console.error('❌ Error en yt-dlp:', error);
                return conn.sendMessage(chatId, { 
                    text: '❌ Ocurrió un error al procesar el audio de YouTube.' 
                }, { quoted: m });
            }

            console.log('📦 [PLAY] Enviando MP3 a WhatsApp...');

            // 5. Enviar audio
            await conn.sendMessage(chatId, {
                audio: fs.readFileSync(tempMp3),
                mimetype: 'audio/mp4',
                fileName: `${video.title}.mp3`,
                ptt: false
            }, { quoted: m });
        });

    } catch (err) {
        console.error('❌ Error general en play.js:', err);
        await conn.sendMessage(chatId, { text: '❌ Ocurrió un error interno al buscar el video.' }, { quoted: m });
    }
}

module.exports = {
    command: ['play', 'musica'],
    execute
};
