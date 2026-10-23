const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../database/users.json');
const propPath = path.join(__dirname, '../database/propuestas.json');

function loadDB() {
    if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, '{}');
    return JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
}

function saveDB(data) {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

function loadProp() {
    if (!fs.existsSync(propPath)) fs.writeFileSync(propPath, '{}');
    return JSON.parse(fs.readFileSync(propPath, 'utf-8'));
}

function saveProp(data) {
    fs.writeFileSync(propPath, JSON.stringify(data, null, 2));
}

function getUser(db, jid) {
    if (!db[jid]) {
        db[jid] = {
            genero: 'No especificado',
            orientacion: 'No especificada',
            cumpleaños: 'No registrado',
            estatura: 'No especificada',
            color: 'No especificado',
            gustos: 'No especificados',
            pareja: null,
            estadoCivil: 'Soltero(a)',
            dinero: 0,
            hogar: 'Ninguno',
            hijos: [],
            mascotas: [],
            servidores: 0,
            faccion: 'Sin Facción'
        };
    }
    return db[jid];
}

module.exports = {
    name: 'familia',
    async execute(sock, m, args, command) {
        const db = loadDB();
        const prop = loadProp();
        const sender = m.key.participant || m.key.remoteJid;
        const user = getUser(db, sender);

        // --- PROPUESTA DE MATRIMONIO ---
        if (command === 'marry' || command === 'casar') {
            const target = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            if (!target) return sock.sendMessage(m.key.remoteJid, { text: '⚠️ Menciona a la persona con la que deseas casarte. Ej: `#marry @usuario`' }, { quoted: m });
            if (target === sender) return sock.sendMessage(m.key.remoteJid, { text: '❌ No puedes casarte contigo mismo(a).' }, { quoted: m });

            const targetUser = getUser(db, target);

            if (user.pareja) return sock.sendMessage(m.key.remoteJid, { text: '❌ Ya estás casado(a). Divórciate primero para casarte de nuevo.' }, { quoted: m });
            if (targetUser.pareja) return sock.sendMessage(m.key.remoteJid, { text: '❌ Esa persona ya está casada con alguien más.' }, { quoted: m });

            prop[target] = { de: sender, tipo: 'matrimonio' };
            saveProp(prop);

            await sock.sendMessage(m.key.remoteJid, {
                text: `💍 @${sender.split('@')[0]} le ha propuesto matrimonio a @${target.split('@')[0]}.\n\nEscribe *#accept* o *#aceptar* para responder.`,
                mentions: [sender, target]
            }, { quoted: m });
        }

        // --- ACEPTAR PROPUESTAS ---
        if (command === 'accept' || command === 'aceptar') {
            const propuesta = prop[sender];
            if (!propuesta) return sock.sendMessage(m.key.remoteJid, { text: '❌ No tienes ninguna propuesta pendiente.' }, { quoted: m });

            const solicitante = propuesta.de;
            const userSol = getUser(db, solicitante);

            if (propuesta.tipo === 'matrimonio') {
                user.pareja = solicitante;
                user.estadoCivil = 'Casado(a)';
                userSol.pareja = sender;
                userSol.estadoCivil = 'Casado(a)';

                saveDB(db);
                delete prop[sender];
                saveProp(prop);

                await sock.sendMessage(m.key.remoteJid, {
                    text: `🎉 ¡FELICIDADES! 🎉\n\n@${sender.split('@')[0]} y @${solicitante.split('@')[0]} ahora están oficialmente casados. 💖💍`,
                    mentions: [sender, solicitante]
                }, { quoted: m });
            }

            if (propuesta.tipo === 'adopcion') {
                if (!userSol.hijos.includes(sender)) userSol.hijos.push(sender);

                saveDB(db);
                delete prop[sender];
                saveProp(prop);

                await sock.sendMessage(m.key.remoteJid, {
                    text: `👨‍👩‍👧 ¡Felicidades! @${solicitante.split('@')[0]} ha adoptado a @${sender.split('@')[0]} como su hijo(a). 🎉`,
                    mentions: [sender, solicitante]
                }, { quoted: m });
            }
        }

        // --- DIVORCIO ---
        if (command === 'divorce' || command === 'divorcio') {
            if (!user.pareja) return sock.sendMessage(m.key.remoteJid, { text: '❌ Actualmente estás soltero(a).' }, { quoted: m });

            const ex = user.pareja;
            const exUser = getUser(db, ex);

            user.pareja = null;
            user.estadoCivil = 'Soltero(a)';
            exUser.pareja = null;
            exUser.estadoCivil = 'Soltero(a)';

            saveDB(db);

            await sock.sendMessage(m.key.remoteJid, {
                text: `💔 @${sender.split('@')[0]} se ha divorciado de @${ex.split('@')[0]}. Ahora ambos vuelven a estar solteros.`,
                mentions: [sender, ex]
            }, { quoted: m });
        }

        // --- ADOPTAR HIJO/A ---
        if (command === 'adopt' || command === 'adoptar') {
            const target = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            if (!target) return sock.sendMessage(m.key.remoteJid, { text: '⚠️ Menciona a la persona que deseas adoptar. Ej: `#adopt @usuario`' }, { quoted: m });
            if (target === sender) return sock.sendMessage(m.key.remoteJid, { text: '❌ No puedes adoptarte a ti mismo.' }, { quoted: m });

            prop[target] = { de: sender, tipo: 'adopcion' };
            saveProp(prop);

            await sock.sendMessage(m.key.remoteJid, {
                text: `👨‍👩‍👧 @${sender.split('@')[0]} quiere adoptarte como su hijo(a), @${target.split('@')[0]}.\n\nEscribe *#accept* para aceptar la adopción.`,
                mentions: [sender, target]
            }, { quoted: m });
        }

        // --- ADOPTAR MASCOTA ---
        if (command === 'adoptpet' || command === 'mascota') {
            const petName = args.join(' ');
            if (!petName) return sock.sendMessage(m.key.remoteJid, { text: '⚠️ Indica el nombre o tipo de mascota. Ej: `#mascota Perro Gengar`' }, { quoted: m });

            user.mascotas.push(petName);
            saveDB(db);

            await sock.sendMessage(m.key.remoteJid, { text: `🐾 ¡Has adoptado a tu nueva mascota: *${petName}*! 🎉` }, { quoted: m });
        }
    }
};
