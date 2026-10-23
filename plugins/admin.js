const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../database/config.json');

function loadConfig() {
    if (!fs.existsSync(configPath)) {
        fs.writeFileSync(configPath, JSON.stringify({
            secciones: {
                familia: true,
                gacha: true,
                economia: true,
                casino: true,
                rpg: true
            }
        }, null, 2));
    }
    return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
}

module.exports = {
    name: 'admin',
    async execute(sock, m, args, command) {
        const chatId = m.key.remoteJid;
        const isGroup = chatId.endsWith('@g.us');

        // --- STICKER Y TOIMG DISPONIBLES PARA TODOS ---
        if (command === 's' || command === 'sticker') {
            const isQuotedImage = m.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;
            const isImage = m.message?.imageMessage;

            if (!isImage && !isQuotedImage) {
                return sock.sendMessage(chatId, { text: '⚠️ Responde a una imagen con `#sticker` o `#s`.' }, { quoted: m });
            }

            try {
                const messageType = isImage ? m.message.imageMessage : isQuotedImage;
                const stream = await downloadContentFromMessage(messageType, 'image');
                let buffer = Buffer.from([]);
                for await (const chunk of stream) {
                    buffer = Buffer.concat([buffer, chunk]);
                }

                const tempImg = path.join(__dirname, '../temp_sticker.jpg');
                fs.writeFileSync(tempImg, buffer);

                await sock.sendMessage(chatId, { sticker: fs.readFileSync(tempImg) }, { quoted: m });
                if (fs.existsSync(tempImg)) fs.unlinkSync(tempImg);
            } catch (err) {
                await sock.sendMessage(chatId, { text: '❌ Error al procesar el sticker.' }, { quoted: m });
            }
        }
    }
};
