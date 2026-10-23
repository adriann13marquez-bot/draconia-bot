const fs = require('fs');
const path = require('path');

async function execute(conn, m, args, command) {
    const chatId = m.key?.remoteJid || m.chat || m.from;
    if (!chatId) return;

    if (!['menu', 'help', 'ayuda', 'guia'].includes(command)) return;

    try {
        const pluginsDir = __dirname;
        const files = fs.readdirSync(pluginsDir);

        let activeCommands = [];

        // Leer cada archivo activo en /plugins
        for (const file of files) {
            if (file.endsWith('.js')) {
                const filePath = path.join(pluginsDir, file);
                
                // Limpiar caché de Node para no cargar comandos eliminados
                delete require.cache[require.resolve(filePath)];
                
                try {
                    const plugin = require(filePath);
                    if (plugin && plugin.command) {
                        if (Array.isArray(plugin.command)) {
                            activeCommands.push(...plugin.command);
                        } else if (typeof plugin.command === 'string') {
                            activeCommands.push(plugin.command);
                        }
                    }
                } catch (e) {
                    // Si un archivo falló o fue borrado, no interrumpe el menú
                }
            }
        }

        // Eliminar duplicados
        activeCommands = [...new Set(activeCommands)];

        // Formatear lista de comandos
        const commandList = activeCommands.map(cmd => `• #${cmd}`).join('\n');

        const menuText = `🐍 ━━━━━━━━━━━━━━━━━━━━ 🐍
       🐉  ᴅʀᴀᴄᴏɴɪᴀ ᴍᴀʟғᴏʏ  🐉
   "Orgullo, elegancia y astucia"
🐍 ━━━━━━━━━━━━━━━━━━━━ 🐍

¡Hola! Soy *Draconia Malfoy*. Aquí tienes la guía oficial de comandos activos y disponibles:

📜 *COMANDOS DISPONIBLES (${activeCommands.length}):*

${commandList}

🐍 ━━━━━━━━━━━━━━━━━━━━ 🐍
_Guía actualizada y sincronizada con tus plugins de Termux._`;

        await conn.sendMessage(chatId, { text: menuText }, { quoted: m });

    } catch (err) {
        console.error('Error al generar la guía:', err);
        await conn.sendMessage(chatId, { text: '❌ Ocurrió un error al cargar la guía.' }, { quoted: m });
    }
}

module.exports = {
    command: ['menu', 'help', 'ayuda', 'guia'],
    execute
};
