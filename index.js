const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const pino = require('pino');
const fs = require('fs');
const path = require('path');

const plugins = new Map();
const pluginsPath = path.join(__dirname, 'plugins');

if (fs.existsSync(pluginsPath)) {
    const files = fs.readdirSync(pluginsPath).filter(f => f.endsWith('.js'));
    for (const file of files) {
        delete require.cache[require.resolve(path.join(pluginsPath, file))];
        const plugin = require(path.join(pluginsPath, file));
        plugins.set(file, plugin);
    }
}

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        auth: state,
        printQRInTerminal: false
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) qrcode.generate(qr, { small: true });

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) connectToWhatsApp();
        } else if (connection === 'open') {
            console.log('\n✅ ¡BOT CONECTADO Y PERMISOS ACTUALIZADOS!\n');
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg || !msg.message) return;

        // Extraer texto del mensaje
        const body = (
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            msg.message.imageMessage?.caption ||
            msg.message.videoMessage?.caption ||
            ''
        ).trim();

        // Evitar que el bot responda a sus propias RESPUESTAS automatizadas (para no hacer bucle)
        if (msg.key.fromMe && !body.startsWith('#')) return;

        if (body.startsWith('#')) {
            const args = body.slice(1).trim().split(/ +/);
            const command = args.shift().toLowerCase();

            if (command === 'ping') {
                return await sock.sendMessage(msg.key.remoteJid, { text: '🏓 ¡Pong! El bot está vivo y respondiendo.' }, { quoted: msg });
            }

            for (const plugin of plugins.values()) {
                try {
                    await plugin.execute(sock, msg, args, command);
                } catch (err) {
                    console.error('Error al ejecutar plugin:', err);
                }
            }
        }
    });
}

connectToWhatsApp();
