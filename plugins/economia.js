const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../database/users.json');

function loadDB() {
    if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, '{}');
    return JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
}

function saveDB(data) {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

function getUser(db, jid) {
    if (!db[jid]) {
        db[jid] = {
            genero: 'No especificado', orientacion: 'No especificada', cumpleaños: 'No registrado',
            estatura: 'No especificada', color: 'No especificado', gustos: 'No especificados',
            pareja: null, estadoCivil: 'Soltero(a)', dinero: 0, banco: 0, hogar: 'Ninguno',
            hijos: [], mascotas: [], servidores: 0, faccion: 'Sin Facción',
            lastWork: 0, lastDaily: 0, lastRob: 0, lastSlut: 0
        };
    }
    if (db[jid].banco === undefined) db[jid].banco = 0;
    if (db[jid].lastWork === undefined) db[jid].lastWork = 0;
    if (db[jid].lastDaily === undefined) db[jid].lastDaily = 0;
    if (db[jid].lastRob === undefined) db[jid].lastRob = 0;
    if (db[jid].lastSlut === undefined) db[jid].lastSlut = 0;
    return db[jid];
}

module.exports = {
    name: 'economia',
    async execute(sock, m, args, command) {
        const db = loadDB();
        const chatId = m.key.remoteJid;
        const sender = m.key.participant || chatId;
        const user = getUser(db, sender);

        // --- TRABAJAR ---
        if (command === 'work' || command === 'trabajar') {
            const now = Date.now();
            const cooldown = 10 * 60 * 1000;
            if (now - user.lastWork < cooldown) {
                const minRestantes = Math.ceil((cooldown - (now - user.lastWork)) / 1000 / 60);
                return sock.sendMessage(chatId, { text: `⏳ Estás cansado. Espera *${minRestantes} minuto(s)*.` }, { quoted: m });
            }
            const trabajos = ['programador freelance', 'cajero', 'mecanico', 'diseñador grafico', 'repartidor', 'entrenador personal'];
            const trabajoRealizado = trabajos[Math.floor(Math.random() * trabajos.length)];
            const ganancia = (Math.floor(Math.random() * 5) + 1) * 1000;

            user.dinero += ganancia;
            user.lastWork = now;
            saveDB(db);

            await sock.sendMessage(chatId, { text: `💼 Trabajaste como *${trabajoRealizado}* y ganaste *$${ganancia.toLocaleString()}*.\n💰 Saldo: *$${user.dinero.toLocaleString()}*` }, { quoted: m });
        }

        // --- SLUT ---
        if (command === 'slut') {
            const now = Date.now();
            const cooldown = 15 * 60 * 1000;
            if (now - user.lastSlut < cooldown) {
                const minRestantes = Math.ceil((cooldown - (now - user.lastSlut)) / 1000 / 60);
                return sock.sendMessage(chatId, { text: `⏳ Necesitas descansar. Espera *${minRestantes} minuto(s)*.` }, { quoted: m });
            }
            user.lastSlut = now;
            const exito = Math.random() < 0.7;

            if (exito) {
                const ganancia = (Math.floor(Math.random() * 7) + 2) * 1000;
                user.dinero += ganancia;
                saveDB(db);
                await sock.sendMessage(chatId, { text: `🔥 ¡Consiguieron un patrocinador generoso! Ganaste *$${ganancia.toLocaleString()}*.\n💵 Billetera: *$${user.dinero.toLocaleString()}*` }, { quoted: m });
            } else {
                const perdida = (Math.floor(Math.random() * 2) + 1) * 1000;
                user.dinero = Math.max(0, user.dinero - perdida);
                saveDB(db);
                await sock.sendMessage(chatId, { text: `🙈 Tuviste un inconveniente y perdiste *$${perdida.toLocaleString()}*.\n💵 Billetera: *$${user.dinero.toLocaleString()}*` }, { quoted: m });
            }
        }

        // --- DIARIO ---
        if (command === 'claimdaily' || command === 'diario') {
            const now = Date.now();
            const cooldown = 24 * 60 * 60 * 1000;
            if (now - user.lastDaily < cooldown) {
                const horasRestantes = Math.ceil((cooldown - (now - user.lastDaily)) / 1000 / 60 / 60);
                return sock.sendMessage(chatId, { text: `⏳ Vuelve en *${horasRestantes} hora(s)*.` }, { quoted: m });
            }
            user.dinero += 10000;
            user.lastDaily = now;
            saveDB(db);
            await sock.sendMessage(chatId, { text: `🎉 ¡Reclamaste tu bono diario de *$10,000*!\n💰 Total: *$${user.dinero.toLocaleString()}*` }, { quoted: m });
        }

        // --- DEPOSITAR / RETIRAR / BAL ---
        if (command === 'deposit' || command === 'dep') {
            let monto = args[0] === 'all' ? user.dinero : parseInt(args[0]);
            if (isNaN(monto) || monto <= 0 || monto > user.dinero) return sock.sendMessage(chatId, { text: '❌ Cantidad inválida.' }, { quoted: m });
            user.dinero -= monto; user.banco += monto; saveDB(db);
            await sock.sendMessage(chatId, { text: `🏦 Depositaste *$${monto.toLocaleString()}*.\n💵 Billetera: *$${user.dinero.toLocaleString()}* | 🏦 Banco: *$${user.banco.toLocaleString()}*` }, { quoted: m });
        }

        if (command === 'withdraw' || command === 'retirar') {
            let monto = args[0] === 'all' ? user.banco : parseInt(args[0]);
            if (isNaN(monto) || monto <= 0 || monto > user.banco) return sock.sendMessage(chatId, { text: '❌ Cantidad inválida.' }, { quoted: m });
            user.banco -= monto; user.dinero += monto; saveDB(db);
            await sock.sendMessage(chatId, { text: `🏧 Retiraste *$${monto.toLocaleString()}*.\n💵 Billetera: *$${user.dinero.toLocaleString()}* | 🏦 Banco: *$${user.banco.toLocaleString()}*` }, { quoted: m });
        }

        if (command === 'bal' || command === 'banco' || command === 'dinero') {
            let target = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || sender;
            const targetUser = getUser(db, target);
            await sock.sendMessage(chatId, { text: `💰 *FINANZAS DE @${target.split('@')[0]}*\n\n💵 Billetera: $${targetUser.dinero.toLocaleString()}\n🏦 Banco: $${targetUser.banco.toLocaleString()}\n💳 Total: $${(targetUser.dinero + targetUser.banco).toLocaleString()}`, mentions: [target] }, { quoted: m });
        }

        // --- ROBAR / PAGAR ---
        if (command === 'rob' || command === 'robar') {
            const target = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            if (!target || target === sender) return sock.sendMessage(chatId, { text: '⚠️ Menciona a alguien válido para robar.' }, { quoted: m });
            const targetUser = getUser(db, target);
            if (targetUser.dinero < 1000) return sock.sendMessage(chatId, { text: '❌ No tiene suficiente dinero.' }, { quoted: m });
            
            if (Math.random() < 0.5) {
                const robado = Math.floor(Math.random() * (targetUser.dinero * 0.3)) + 1000;
                targetUser.dinero -= robado; user.dinero += robado; saveDB(db);
                await sock.sendMessage(chatId, { text: `🥷 ¡Le robaste *$${robado.toLocaleString()}* a @${target.split('@')[0]}!`, mentions: [target] }, { quoted: m });
            } else {
                user.dinero = Math.max(0, user.dinero - 1000); saveDB(db);
                await sock.sendMessage(chatId, { text: `🚨 ¡Te atraparon! Pagaste una multa de *$1,000*.` }, { quoted: m });
            }
        }

        if (command === 'pay' || command === 'pagar') {
            const target = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            const monto = parseInt(args[1]) || parseInt(args[0]);
            if (!target || isNaN(monto) || monto <= 0 || user.dinero < monto) return sock.sendMessage(chatId, { text: '❌ Datos o saldo insuficiente.' }, { quoted: m });
            const targetUser = getUser(db, target);
            user.dinero -= monto; targetUser.dinero += monto; saveDB(db);
            await sock.sendMessage(chatId, { text: `💸 Le transferiste *$${monto.toLocaleString()}* a @${target.split('@')[0]}.`, mentions: [target] }, { quoted: m });
        }
    }
};
