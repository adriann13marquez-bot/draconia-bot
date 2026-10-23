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

    if (!['crime', 'crimen', 'robarbanco'].includes(command)) return;

    const db = getDB();
    if (!db[sender]) db[sender] = { wallet: 0, bank: 0, lastWork: 0, lastCrime: 0 };

    const now = Date.now();
    const cooldown = 2 * 60 * 1000; // 2 minutos de cooldown

    if (now - (db[sender].lastCrime || 0) < cooldown) {
        const remaining = Math.ceil((cooldown - (now - db[sender].lastCrime)) / 1000);
        return conn.sendMessage(chatId, { 
            text: `🚔 La guardia te está buscando. Espera *${remaining} segundos* antes de volver a intentar un crimen.` 
        }, { quoted: m });
    }

    db[sender].lastCrime = now;

    // 60% éxito, 40% fallo
    const isSuccess = Math.random() < 0.6;

    if (isSuccess) {
        const reward = Math.floor(Math.random() * (12000 - 7000 + 1)) + 7000; // Entre 7,000 y 12,000
        
        const successCrimes = [
            'Hiciste un atraco relámpago a la carruaje del banco',
            'Squeaste un cofre secreto en el mercado negro',
            'Hackeaste una bóveda digital con éxito',
            'Falsificaste documentos del imperio y cobraste una recompensa'
        ];
        const randomSuccess = successCrimes[Math.floor(Math.random() * successCrimes.length)];

        db[sender].wallet += reward;
        saveDB(db);

        const text = `🥷 *CRIMEN EXITOSO*\n\n${randomSuccess}.\n💰 **Ganancia:** +$${reward.toLocaleString()} monedas.`;
        return conn.sendMessage(chatId, { text }, { quoted: m });

    } else {
        const penalty = Math.floor(Math.random() * (10000 - 3000 + 1)) + 3000; // Pérdida de hasta 10,000
        
        const failCrimes = [
            'La guardia Imperial te atrapó con las manos en la masa',
            'Te delató un informante mientras intentabas forzar la cerradura',
            'Activaste la alarma de la bóveda y tuviste que pagar una fianza',
            'El atraco salió mal y perdiste el botín en la huida'
        ];
        const randomFail = failCrimes[Math.floor(Math.random() * failCrimes.length)];

        // Restar dinero de la billetera (no puede quedar en negativo)
        db[sender].wallet = Math.max(0, db[sender].wallet - penalty);
        saveDB(db);

        const text = `🚨 *CRIMEN FALLIDO*\n\n${randomFail}.\n💸 **Multa/Pérdida:** -$${penalty.toLocaleString()} monedas.`;
        return conn.sendMessage(chatId, { text }, { quoted: m });
    }
}

module.exports = {
    command: ['crime', 'crimen', 'robarbanco'],
    execute
};
