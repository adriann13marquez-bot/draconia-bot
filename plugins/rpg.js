const fs = require('fs');
const path = require('path');

const usersDbPath = path.join(__dirname, '../database/users.json');

function loadUsersDB() {
    if (!fs.existsSync(usersDbPath)) fs.writeFileSync(usersDbPath, '{}');
    return JSON.parse(fs.readFileSync(usersDbPath, 'utf-8'));
}

function saveUsersDB(data) {
    fs.writeFileSync(usersDbPath, JSON.stringify(data, null, 2));
}

const FACCIONES = {
    'capas': { nombre: 'Los Capas de la Tormenta', bono: '🛡️ +10% Ataque' },
    'legion': { nombre: 'La Legión Imperial', bono: '🦅 +10% Defensa' },
    'hermandad': { nombre: 'La Hermandad Oscura', bono: '🗡️ +15% Agilidad' },
    'colegio': { nombre: 'El Colegio de Hibernalia', bono: '🔮 15% Descuento Alquimia' },
    'ladrones': { nombre: 'El Gremio de Ladrones', bono: '🏹 +10% Oro en Duelos/Trabajo' }
};

function getUser(db, jid) {
    if (!db[jid]) {
        db[jid] = {
            dinero: 0, banco: 0, nivel: 1, xp: 0,
            faccion: 'Sin Facción', salud: 100, enfermedad: 'Ninguna',
            arma: 'Puños', armadura: 'Ropa Común',
            pocionActiva: null, local: null,
            inventario: { pociones: [], armas: [], armaduras: [] }
        };
    }
    if (db[jid].salud === undefined) db[jid].salud = 100;
    if (db[jid].enfermedad === undefined) db[jid].enfermedad = 'Ninguna';
    if (db[jid].arma === undefined) db[jid].arma = 'Puños';
    if (db[jid].armadura === undefined) db[jid].armadura = 'Ropa Común';
    if (!db[jid].inventario) db[jid].inventario = { pociones: [], armas: [], armaduras: [] };
    return db[jid];
}

function getStats(user) {
    let atk = 10, def = 5, agi = 10;

    // Armas
    if (user.arma === 'Daga de Hierro') { atk += 15; agi += 10; }
    if (user.arma === 'Mandoble de Acero') { atk += 40; agi -= 5; }

    // Armaduras
    if (user.armadura === 'Armadura de Cuero') { def += 20; agi += 5; }
    if (user.armadura === 'Placas de Hierro') { def += 50; agi -= 10; }

    // Beneficios de Facción
    if (user.faccion === 'Los Capas de la Tormenta') atk = Math.floor(atk * 1.1);
    if (user.faccion === 'La Legión Imperial') def = Math.floor(def * 1.1);
    if (user.faccion === 'La Hermandad Oscura') agi = Math.floor(agi * 1.15);

    // Efecto de Enfermedad
    if (user.enfermedad !== 'Ninguna') {
        atk = Math.floor(atk * 0.8);
        def = Math.floor(def * 0.8);
    }

    return { atk, def, agi };
}

module.exports = {
    name: 'rpg',
    async execute(sock, m, args, command) {
        const usersDb = loadUsersDB();
        const chatId = m.key.remoteJid;
        const sender = m.key.participant || chatId;
        const user = getUser(usersDb, sender);

        // --- 🧪 CATÁLOGO DE POCIONES (#pociones) ---
        if (command === 'pociones' || command === 'tiendapociones') {
            const menu = 
`🧪 *BOTICA REAL DE TAMRIEL* 🧪
───────────────
*SECCIÓN 1: SALUD Y CURACIÓN*
1. *Poción de Curación* — *$5,000*
   └ _Efecto:_ Restaura salud a 100 HP y cura enfermedades.

*SECCIÓN 2: ENCANTAMIENTO Y BARRERA*
2. *Poción de Fuerza Berserker* — *$15,000*
   └ _Efecto:_ +20% de Ataque por 1 combate.
3. *Poción de Piel de Piedra* — *$12,000*
   └ _Efecto:_ +15% de Defensa por 1 combate.

*SECCIÓN 3: AGILIDAD Y SABIDURÍA*
4. *Poción de Rapidez* — *$10,000*
   └ _Efecto:_ +25% de Agilidad/Esquive por 1 combate.
5. *Elixir de Sabiduría* — *$25,000*
   └ _Efecto:_ Concede +500 XP instantáneos.

📌 *Para comprar:* Escribe \`#comprar pocion [número]\`
📌 *Para tomar:* Escribe \`#tomar [número]\``;
            return sock.sendMessage(chatId, { text: menu }, { quoted: m });
        }

        // --- 🛒 MERCADO DE ARMAS Y ARMADURAS (#tienda) ---
        if (command === 'tienda' || command === 'mercado') {
            const menu = 
`⚔️ *ARMERÍA Y MERCADO DE WHITERUN* ⚔️
───────────────
🗡️ *ARMAS:*
• \`#comprar daga\` — *Daga de Hierro* ($8,000) [+15 Atq, +10 Agi]
• \`#comprar mandoble\` — *Mandoble de Acero* ($25,000) [+40 Atq, -5 Agi]

🛡️ *ARMADURAS:*
• \`#comprar cuero\` — *Armadura de Cuero* ($10,000) [+20 Def, +5 Agi]
• \`#comprar hierro\` — *Placas de Hierro* ($30,000) [+50 Def, -10 Agi]

🏬 *PROPIEDADES:*
• \`#comprar local\` — *Local Comercial* ($200,000) [Permite montar tu tienda]`;
            return sock.sendMessage(chatId, { text: menu }, { quoted: m });
        }

        // --- 🛍️ COMPRAR ---
        if (command === 'comprar') {
            const tipo = args[0]?.toLowerCase();
            const num = parseInt(args[1]);

            if (tipo === 'pocion') {
                const precios = { 1: 5000, 2: 15000, 3: 12000, 4: 10000, 5: 25000 };
                if (!precios[num]) return sock.sendMessage(chatId, { text: '⚠️ Usa `#pociones` para ver los números válidos.' }, { quoted: m });

                let costo = precios[num];
                if (user.faccion === 'El Colegio de Hibernalia') costo = Math.floor(costo * 0.85);

                if (user.dinero < costo) return sock.sendMessage(chatId, { text: `❌ Saldo insuficiente ($${costo.toLocaleString()}).` }, { quoted: m });

                user.dinero -= costo;
                user.inventario.pociones.push(num);
                saveUsersDB(usersDb);
                return sock.sendMessage(chatId, { text: `✅ Compraste la *Poción #${num}* por *$${costo.toLocaleString()}*.` }, { quoted: m });
            }

            if (tipo === 'daga' && user.dinero >= 8000) {
                user.dinero -= 8000; user.arma = 'Daga de Hierro'; saveUsersDB(usersDb);
                return sock.sendMessage(chatId, { text: '🗡️ Equipaste la *Daga de Hierro*.' }, { quoted: m });
            }

            if (tipo === 'mandoble' && user.dinero >= 25000) {
                user.dinero -= 25000; user.arma = 'Mandoble de Acero'; saveUsersDB(usersDb);
                return sock.sendMessage(chatId, { text: '⚔️ Equipaste el *Mandoble de Acero*.' }, { quoted: m });
            }

            if (tipo === 'cuero' && user.dinero >= 10000) {
                user.dinero -= 10000; user.armadura = 'Armadura de Cuero'; saveUsersDB(usersDb);
                return sock.sendMessage(chatId, { text: '🥋 Equipaste la *Armadura de Cuero*.' }, { quoted: m });
            }

            if (tipo === 'hierro' && user.dinero >= 30000) {
                user.dinero -= 30000; user.armadura = 'Placas de Hierro'; saveUsersDB(usersDb);
                return sock.sendMessage(chatId, { text: '🛡️ Equipaste la *Armadura de Placas de Hierro*.' }, { quoted: m });
            }

            if (tipo === 'local') {
                if (user.dinero < 200000) return sock.sendMessage(chatId, { text: '❌ Necesitas *$200,000* para comprar un local comercial.' }, { quoted: m });
                user.dinero -= 200000;
                user.local = 'Tienda Genérica';
                saveUsersDB(usersDb);
                return sock.sendMessage(chatId, { text: '🏬 ¡Felicidades! Compraste tu local comercial. Configúralo con `#miTienda [carne/pociones/armas]`.' }, { quoted: m });
            }

            return sock.sendMessage(chatId, { text: '⚠️ Revisa las tiendas con `#pociones` o `#tienda`.' }, { quoted: m });
        }

        // --- 🧪 TOMAR POCIÓN (#tomar) ---
        if (command === 'tomar') {
            const num = parseInt(args[0]);
            const idx = user.inventario.pociones.indexOf(num);

            if (idx === -1) return sock.sendMessage(chatId, { text: '❌ No tienes esa poción en tu inventario.' }, { quoted: m });

            user.inventario.pociones.splice(idx, 1);

            let efectoMsg = '';
            if (num === 1) {
                user.salud = 100;
                user.enfermedad = 'Ninguna';
                efectoMsg = '💚 *Poción de Curación consumida:*\n_Restaura tu Salud a 100 HP y elimina cualquier enfermedad active._\n⏱️ *Duración:* Instantáneo / Permanente.';
            } else if (num === 2) {
                user.pocionActiva = 'fuerza';
                efectoMsg = '💥 *Poción de Fuerza Berserker consumida:*\n_Aumenta tu Ataque un +20% en tu próximo duelo._\n⏱️ *Duración:* 1 Batalla.';
            } else if (num === 3) {
                user.pocionActiva = 'defensa';
                efectoMsg = '🛡️ *Poción de Piel de Piedra consumida:*\n_Aumenta tu Defensa un +15% en tu próximo duelo._\n⏱️ *Duración:* 1 Batalla.';
            } else if (num === 4) {
                user.pocionActiva = 'rapidez';
                efectoMsg = '⚡ *Poción de Rapidez consumida:*\n_Aumenta tu Agilidad un +25% en tu próximo duelo._\n⏱️ *Duración:* 1 Batalla.';
            } else if (num === 5) {
                user.xp += 500;
                efectoMsg = '✨ *Elixir de Sabiduría consumido:*\n_Has ganado +500 Puntos de Experiencia (XP)._\n⏱️ *Duración:* Instantáneo.';
            }

            saveUsersDB(usersDb);
            return sock.sendMessage(chatId, { text: efectoMsg }, { quoted: m });
        }

        // --- 📊 FICHA DE EQUIPO Y SALUD (#equipo / #estado) ---
        if (command === 'equipo' || command === 'estado') {
            const stats = getStats(user);
            const msg = 
`🛡️ *ESTADO Y BALANCE DE @${sender.split('@')[0]}*

❤️ *Salud:* ${user.salud} / 100 HP
🤒 *Enfermedad:* ${user.enfermedad}
🏰 *Facción:* ${user.faccion}

🗡️ *Arma:* ${user.arma}
🛡️ *Armadura:* ${user.armadura}
🧪 *Poción Activa:* ${user.pocionActiva || 'Ninguna'}

⚡ *BALANCE TOTAL DE COMBATE:*
• ⚔️ *Ataque:* ${stats.atk}
• 🛡️ *Defensa:* ${stats.def}
• 💨 *Agilidad:* ${stats.agi}`;

            return sock.sendMessage(chatId, { text: msg, mentions: [sender] }, { quoted: m });
        }

        // --- ⚔️ DUELO Y BATALLA (#pelear / #duelo) ---
        if (command === 'pelear' || command === 'duelo') {
            const target = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            const apuesta = parseInt(args[1]) || parseInt(args[0]);

            if (!target || isNaN(apuesta) || apuesta <= 0) return sock.sendMessage(chatId, { text: '⚠️ Uso: `#pelear @usuario [apuesta]`' }, { quoted: m });
            if (target === sender) return sock.sendMessage(chatId, { text: '❌ No puedes pelear contigo mismo.' }, { quoted: m });

            const targetUser = getUser(usersDb, target);

            if (user.dinero < apuesta || targetUser.dinero < apuesta) {
                return sock.sendMessage(chatId, { text: '❌ Uno de los dos no tiene suficiente dinero en billetera para la apuesta.' }, { quoted: m });
            }

            let s1 = getStats(user);
            let s2 = getStats(targetUser);

            // Aplicar pociones activas
            if (user.pocionActiva === 'fuerza') s1.atk = Math.floor(s1.atk * 1.2);
            if (user.pocionActiva === 'defensa') s1.def = Math.floor(s1.def * 1.15);
            if (user.pocionActiva === 'rapidez') s1.agi = Math.floor(s1.agi * 1.25);
            user.pocionActiva = null; // Se consume en el combate

            if (targetUser.pocionActiva === 'fuerza') s2.atk = Math.floor(s2.atk * 1.2);
            if (targetUser.pocionActiva === 'defensa') s2.def = Math.floor(s2.def * 1.15);
            if (targetUser.pocionActiva === 'rapidez') s2.agi = Math.floor(s2.agi * 1.25);
            targetUser.pocionActiva = null;

            // Poder de combate
            const poder1 = (s1.atk * 1.5) + s1.def + (s1.agi * 0.8) + (Math.random() * 20);
            const poder2 = (s2.atk * 1.5) + s2.def + (s2.agi * 0.8) + (Math.random() * 20);

            let ganador = poder1 >= poder2 ? sender : target;
            let perdedor = poder1 >= poder2 ? target : sender;

            const uGanador = getUser(usersDb, ganador);
            const uPerdedor = getUser(usersDb, perdedor);

            uGanador.dinero += apuesta;
            uPerdedor.dinero -= apuesta;

            // Transmitir enfermedad aleatoria si ocurre
            if (Math.random() < 0.2) uPerdedor.enfermedad = 'Ataxia de Tamriel';

            saveUsersDB(usersDb);

            const resultado = 
`⚔️ *¡DUELO SANGRIENTO EN LA ARENA!* ⚔️
───────────────
👤 @${sender.split('@')[0]} (Poder: ${Math.floor(poder1)})
VS
👤 @${target.split('@')[0]} (Poder: ${Math.floor(poder2)})

🎉 *¡VICTORIA PARA @${ganador.split('@')[0]}!*
💰 Se lleva los *$${(apuesta * 2).toLocaleString()}* puestos en la mesa.
🛡️ *+50 Puntos de Gloria* para su facción (${uGanador.faccion}).`;

            return sock.sendMessage(chatId, { text: resultado, mentions: [sender, target] }, { quoted: m });
        }

        // --- 🏰 FACCIONES (#facciones / #unirse) ---
        if (command === 'facciones') {
            let list = `🏰 *FACCIONES DE SKYRIM*\n\n`;
            Object.keys(FACCIONES).forEach(k => {
                const f = FACCIONES[k];
                list += `🛡️ *${f.nombre}* (\`#unirse ${k}\`)\n└ _Bono:_ ${f.bono}\n\n`;
            });
            return sock.sendMessage(chatId, { text: list }, { quoted: m });
        }

        if (command === 'unirse') {
            const k = args[0]?.toLowerCase();
            if (!FACCIONES[k]) return sock.sendMessage(chatId, { text: '⚠️ Facción no válida. Usa `#facciones`.' }, { quoted: m });
            user.faccion = FACCIONES[k].nombre;
            saveUsersDB(usersDb);
            return sock.sendMessage(chatId, { text: `⚔️ Te uniste a *${FACCIONES[k].nombre}*.` }, { quoted: m });
        }

        // --- 🏬 GESTIÓN DE TIENDA PROPIA (#miTienda) ---
        if (command === 'mitienda') {
            if (!user.local) return sock.sendMessage(chatId, { text: '❌ No posees un local. Cómpralo en `#tienda` por $200,000.' }, { quoted: m });
            const rubro = args[0]?.toLowerCase();
            if (!['carne', 'pociones', 'armas'].includes(rubro)) {
                return sock.sendMessage(chatId, { text: 'Uso: `#miTienda [carne/pociones/armas]`' }, { quoted: m });
            }
            user.local = `Comercio de ${rubro.toUpperCase()}`;
            saveUsersDB(usersDb);
            return sock.sendMessage(chatId, { text: `🏬 Tu local ahora está especializado en la venta de *${rubro.toUpperCase()}*.` }, { quoted: m });
        }
    }
};
