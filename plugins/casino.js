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
            hijos: [], mascotas: [], servidores: 0, faccion: 'Sin Facción'
        };
    }
    return db[jid];
}

module.exports = {
    name: 'casino',
    async execute(sock, m, args, command) {
        const db = loadDB();
        const chatId = m.key.remoteJid;
        const sender = m.key.participant || chatId;
        const user = getUser(db, sender);

        // --- 🪙 CARA O CRUZ (#cf / #coinflipp) ---
        if (command === 'cf' || command === 'coinflipp') {
            const eleccion = args[0]?.toLowerCase();
            const apuesta = parseInt(args[1]);

            if (!eleccion || !['cara', 'cruz'].includes(eleccion) || isNaN(apuesta) || apuesta <= 0) {
                return sock.sendMessage(chatId, { text: '⚠️ Uso correcto: `#cf [cara/cruz] [apuesta]`\nEjemplo: `#cf cara 2000`' }, { quoted: m });
            }

            if (user.dinero < apuesta) {
                return sock.sendMessage(chatId, { text: '❌ No tienes suficiente dinero en tu billetera.' }, { quoted: m });
            }

            const resultado = Math.random() < 0.5 ? 'cara' : 'cruz';
            const gano = eleccion === resultado;

            if (gano) {
                user.dinero += apuesta;
                saveDB(db);
                await sock.sendMessage(chatId, {
                    text: `🪙 La moneda cayó en *${resultado.toUpperCase()}*.\n\n🎉 ¡Ganaste *$${apuesta.toLocaleString()}*!\n💰 Billetera: *$${user.dinero.toLocaleString()}*`
                }, { quoted: m });
            } else {
                user.dinero -= apuesta;
                saveDB(db);
                await sock.sendMessage(chatId, {
                    text: `🪙 La moneda cayó en *${resultado.toUpperCase()}*.\n\n❌ Perdiste *$${apuesta.toLocaleString()}*.\n💰 Billetera: *$${user.dinero.toLocaleString()}*`
                }, { quoted: m });
            }
        }

        // --- 🎲 DADOS (#dados) ---
        if (command === 'dados') {
            const apuesta = parseInt(args[0]);

            if (isNaN(apuesta) || apuesta <= 0) {
                return sock.sendMessage(chatId, { text: '⚠️ Uso correcto: `#dados [apuesta]`\nEjemplo: `#dados 1000`' }, { quoted: m });
            }

            if (user.dinero < apuesta) {
                return sock.sendMessage(chatId, { text: '❌ No tienes suficiente dinero en tu billetera.' }, { quoted: m });
            }

            const tuDado = Math.floor(Math.random() * 6) + 1;
            const botDado = Math.floor(Math.random() * 6) + 1;

            let msg = `🎲 *JUEGO DE DADOS*\n\n👤 Tu dado: *${tuDado}*\n🤖 Dado del bot: *${botDado}*\n\n`;

            if (tuDado > botDado) {
                user.dinero += apuesta;
                msg += `🎉 ¡Ganaste *$${apuesta.toLocaleString()}*!`;
            } else if (tuDado < botDado) {
                user.dinero -= apuesta;
                msg += `❌ Perdiste *$${apuesta.toLocaleString()}*.`;
            } else {
                msg += `🤝 ¡Empate! Se te devuelve tu apuesta.`;
            }

            saveDB(db);
            msg += `\n💰 Billetera: *$${user.dinero.toLocaleString()}*`;

            await sock.sendMessage(chatId, { text: msg }, { quoted: m });
        }

        // --- 🎰 TRAGAMONEDAS (#slot / #tragamonedas) ---
        if (command === 'slot' || command === 'tragamonedas') {
            const apuesta = parseInt(args[0]);

            if (isNaN(apuesta) || apuesta <= 0) {
                return sock.sendMessage(chatId, { text: '⚠️ Uso correcto: `#slot [apuesta]`\nEjemplo: `#slot 2000`' }, { quoted: m });
            }

            if (user.dinero < apuesta) {
                return sock.sendMessage(chatId, { text: '❌ No tienes suficiente dinero en tu billetera.' }, { quoted: m });
            }

            const emojis = ['🍇', '🍉', '🍊', '🍋', '🍌', '🍒', '7️⃣'];
            const e1 = emojis[Math.floor(Math.random() * emojis.length)];
            const e2 = emojis[Math.floor(Math.random() * emojis.length)];
            const e3 = emojis[Math.floor(Math.random() * emojis.length)];

            let multiplicador = 0;
            if (e1 === e2 && e2 === e3) {
                multiplicador = e1 === '7️⃣' ? 5 : 3; // 777 paga 5x, otros tríos pagan 3x
            } else if (e1 === e2 || e1 === e3 || e2 === e3) {
                multiplicador = 1.5; // Pareja paga 1.5x
            }

            let msg = `🎰 *TRAGAMONEDAS* 🎰\n\n[ ${e1} | ${e2} | ${e3} ]\n\n`;

            if (multiplicador > 0) {
                const ganancia = Math.floor(apuesta * multiplicador);
                user.dinero += ganancia;
                msg += `🎉 ¡FELICIDADES! Ganaste *$${ganancia.toLocaleString()}* (${multiplicador}x)`;
            } else {
                user.dinero -= apuesta;
                msg += `❌ Mala suerte, perdiste *$${apuesta.toLocaleString()}*.`;
            }

            saveDB(db);
            msg += `\n💰 Billetera: *$${user.dinero.toLocaleString()}*`;

            await sock.sendMessage(chatId, { text: msg }, { quoted: m });
        }

        // --- ✂️ PIEDRA, PAPEL O TIJERA (#ppt) ---
        if (command === 'ppt') {
            const eleccion = args[0]?.toLowerCase();
            const apuesta = parseInt(args[1]);

            if (!eleccion || !['piedra', 'papel', 'tijera'].includes(eleccion) || isNaN(apuesta) || apuesta <= 0) {
                return sock.sendMessage(chatId, { text: '⚠️ Uso correcto: `#ppt [piedra/papel/tijera] [apuesta]`\nEjemplo: `#ppt piedra 1000`' }, { quoted: m });
            }

            if (user.dinero < apuesta) {
                return sock.sendMessage(chatId, { text: '❌ No tienes suficiente dinero en tu billetera.' }, { quoted: m });
            }

            const opciones = ['piedra', 'papel', 'tijera'];
            const botEleccion = opciones[Math.floor(Math.random() * opciones.length)];

            let resultado = '';
            if (eleccion === botEleccion) {
                resultado = 'empate';
            } else if (
                (eleccion === 'piedra' && botEleccion === 'tijera') ||
                (eleccion === 'papel' && botEleccion === 'piedra') ||
                (eleccion === 'tijera' && botEleccion === 'papel')
            ) {
                resultado = 'gano';
            } else {
                resultado = 'perdio';
            }

            let msg = `✂️ *PIEDRA, PAPEL O TIJERA*\n\n👤 Tu elección: *${eleccion}*\n🤖 Bot: *${botEleccion}*\n\n`;

            if (resultado === 'gano') {
                user.dinero += apuesta;
                msg += `🎉 ¡Ganaste *$${apuesta.toLocaleString()}*!`;
            } else if (resultado === 'perdio') {
                user.dinero -= apuesta;
                msg += `❌ Perdiste *$${apuesta.toLocaleString()}*.`;
            } else {
                msg += `🤝 ¡Empate! Recuperas tu apuesta.`;
            }

            saveDB(db);
            msg += `\n💰 Billetera: *$${user.dinero.toLocaleString()}*`;

            await sock.sendMessage(chatId, { text: msg }, { quoted: m });
        }
    }
};
