const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../economy.json');

function getDB() {
    if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify({}));
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}

function saveDB(data) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

async function execute(conn, m, args, command) {
    const chatId = m.key?.remoteJid || m.chat || m.from;
    const sender = m.key?.participant || m.key?.remoteJid || m.from;
    if (!chatId || !sender) return;

    if (!['work', 'w', 'trabajar'].includes(command)) return;

    const db = getDB();
    if (!db[sender]) db[sender] = { wallet: 0, bank: 0, lastWork: 0, lastCrime: 0 };

    const now = Date.now();
    const cooldown = 30 * 1000; // 30 segundos

    if (now - db[sender].lastWork < cooldown) {
        const remaining = Math.ceil((cooldown - (now - db[sender].lastWork)) / 1000);
        return conn.sendMessage(chatId, { 
            text: `⏳ Debes descansar un poco. Vuelve a trabajar en *${remaining} segundos*.` 
        }, { quoted: m });
    }

    const works = [
        'Atendiste un negocio de pociones',
        'Cuidaste a las criaturas del castillo',
        'Reparaste escudos y armaduras en la forja',
        'Recolectaste hierbas mágicas en el bosque',
        'Escribiste pergaminos para la biblioteca',
        'Limpiaste el Gran Comedor'
    ];

    const randomWork = works[Math.floor(Math.random() * works.length)];
    const earnings = Math.floor(Math.random() * (2500 - 800 + 1)) + 800; // Entre 800 y 2500

    db[sender].wallet += earnings;
    db[sender].lastWork = now;
    saveDB(db);

    const text = `🛠️ *TRABAJO COMPLETADO*\n\n${randomWork} y ganaste *$${earnings.toLocaleString()}* monedas.`;
    await conn.sendMessage(chatId, { text }, { quoted: m });
}

module.exports = {
    command: ['work', 'w', 'trabajar'],
    execute
};
