const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

async function execute(conn, m, args, command) {
    const chatId = m.key?.remoteJid || m.chat || m.from;
    if (!chatId) return;

    if (!['s', 'sticker', 'stiker'].includes(command)) return;

    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const isImage = m.message?.imageMessage || quoted?.imageMessage;
    const isVideo = m.message?.videoMessage || quoted?.videoMessage;

    if (!isImage && !isVideo) {
        return conn.sendMessage(chatId, { 
            text: '❌ Responde a una imagen o video corto con *#s* para convertirlo en sticker.' 
        }, { quoted: m });
    }

    try {
        await conn.sendMessage(chatId, { text: '⏳ *Creando sticker...*' }, { quoted: m });

        let targetMsg = m;
        if (quoted) {
            targetMsg = { message: quoted };
        }

        const buffer = await downloadMediaMessage(
            targetMsg,
            'buffer',
            {},
            { 
                logger: console,
                reconnectIntervalMs: 1234
            }
        );

        if (!buffer) {
            return conn.sendMessage(chatId, { text: '❌ No se pudo descargar el archivo multimedia.' }, { quoted: m });
        }

        const tmpInput = path.join(__dirname, `../tmp_in_${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`);
        const tmpOutput = path.join(__dirname, `../tmp_out_${Date.now()}.webp`);

        fs.writeFileSync(tmpInput, buffer);

        // Comando FFMPEG compatible con la versión actual de Termux (sin -vsync)
        const ffmpegCmd = `ffmpeg -i "${tmpInput}" -vf "scale='min(512,iw)':min'(512,ih)':force_original_aspect_ratio=decrease,pad=512:512:(512-iw)/2:(512-ih)/2:color=0x00000000" -c:v libwebp -preset default -loop 0 -s 512x512 "${tmpOutput}"`;

        exec(ffmpegCmd, async (err) => {
            if (err) {
                console.error('Error procesando FFMPEG:', err);
                if (fs.existsSync(tmpInput)) fs.unlinkSync(tmpInput);
                if (fs.existsSync(tmpOutput)) fs.unlinkSync(tmpOutput);
                return conn.sendMessage(chatId, { text: '❌ Error al procesar el sticker.' }, { quoted: m });
            }

            const stickerBuffer = fs.readFileSync(tmpOutput);

            await conn.sendMessage(chatId, { 
                sticker: stickerBuffer 
            }, { quoted: m });

            if (fs.existsSync(tmpInput)) fs.unlinkSync(tmpInput);
            if (fs.existsSync(tmpOutput)) fs.unlinkSync(tmpOutput);
        });

    } catch (err) {
        console.error('Error al crear sticker:', err);
        await conn.sendMessage(chatId, { 
            text: '❌ Hubo un error al procesar el sticker.' 
        }, { quoted: m });
    }
}

module.exports = {
    command: ['s', 'sticker', 'stiker'],
    execute
};
