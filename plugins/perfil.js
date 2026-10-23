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
    name: 'perfil',
    async execute(sock, m, args, command) {
        const db = loadDB();
        const sender = m.key.participant || m.key.remoteJid;
        const user = getUser(db, sender);

        if (command === 'profile' || command === 'pf') {
            let target = sender;
            if (m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
                target = m.message.extendedTextMessage.contextInfo.mentionedJid[0];
            }
            const targetUser = getUser(db, target);

            let ppUrl;
            try {
                ppUrl = await sock.profilePictureUrl(target, 'image');
            } catch {
                ppUrl = 'https://i.imgur.com/2wD3A2D.png';
            }

            const textoPerfil = `┌───〔 *FICHA DE USUARIO* 〕───┐
│ 👤 *Nombre:* @${target.split('@')[0]}
│ 🏛️ *Facción:* ${targetUser.faccion}
├───────────────────────────
│ 💖 *Estado Civil:* ${targetUser.estadoCivil}${targetUser.pareja ? ' con @' + targetUser.pareja.split('@')[0] : ''}
│ 🚻 *Género:* ${targetUser.genero}
│ 🧭 *Orientación:* ${targetUser.orientacion}
│ 🎂 *Cumpleaños:* ${targetUser.cumpleaños}
├───────────────────────────
│ 📏 *Estatura:* ${targetUser.estatura}
│ 🎨 *Color Favorito:* ${targetUser.color}
│ ☕ *Gustos:* ${targetUser.gustos}
├───────────────────────────
│ 💰 *Dinero Total:* $${targetUser.dinero}
│ 🏠 *Hogar:* ${targetUser.hogar}
│ 👨‍👩‍👧 *Hijos:* ${targetUser.hijos.length}
│ 🐾 *Mascotas:* ${targetUser.mascotas.length > 0 ? targetUser.mascotas.join(', ') : 'Ninguna'}
│ 📑 *Servidores (Harem):* ${targetUser.servidores}
└───────────────────────────`;

            await sock.sendMessage(m.key.remoteJid, {
                image: { url: ppUrl },
                caption: textoPerfil,
                mentions: [target, ...(targetUser.pareja ? [targetUser.pareja] : [])]
            }, { quoted: m });
        }

        if (command === 'setgenre' || command === 'setgenero') {
            const val = args.join(' ').toLowerCase();
            if (!val) return sock.sendMessage(m.key.remoteJid, { text: 'Uso: #setgenre [hombre/mujer/otro]' }, { quoted: m });
            user.genero = val.charAt(0).toUpperCase() + val.slice(1);
            saveDB(db);
            await sock.sendMessage(m.key.remoteJid, { text: `✅ Se ha establecido tu género como: *${user.genero}*` }, { quoted: m });
        }

        if (command === 'os' || command === 'orientacion') {
            const val = args.join(' ').toLowerCase();
            if (!['heterosexual', 'hetero', 'homosexual', 'homo', 'bisexual', 'bi'].includes(val)) {
                return sock.sendMessage(m.key.remoteJid, { text: 'Uso: #os [hetero / homo / bi]' }, { quoted: m });
            }
            let res = 'Heterosexual';
            if (val.includes('homo')) res = 'Homosexual';
            if (val.includes('bi')) res = 'Bisexual';

            user.orientacion = res;
            saveDB(db);
            await sock.sendMessage(m.key.remoteJid, { text: `✅ Tu orientación sexual se ha guardado como: *${res}*` }, { quoted: m });
        }

        if (command === 'setbirth' || command === 'setcumple') {
            const input = args[0];
            if (!input || input.length !== 6 || isNaN(input)) {
                return sock.sendMessage(m.key.remoteJid, { text: 'Uso: #setbirth DDMMAA (Ejemplo: #setbirth 070603)' }, { quoted: m });
            }
            const dia = input.substring(0, 2);
            const mesNum = parseInt(input.substring(2, 4)) - 1;
            const anio = '20' + input.substring(4, 6);

            const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
            const mesNombre = meses[mesNum] || 'desconocido';

            user.cumpleaños = `${dia} de ${mesNombre} de ${anio}`;
            saveDB(db);
            await sock.sendMessage(m.key.remoteJid, { text: `¡Se ha establecido tu cumpleaños el ${dia} de ${mesNombre} del ${anio}! 🎉` }, { quoted: m });
        }

        if (command === 'setstature' || command === 'ss') {
            const val = args.join(' ');
            if (!val) return sock.sendMessage(m.key.remoteJid, { text: 'Uso: #ss [tu estatura, ej: 1.75m]' }, { quoted: m });
            user.estatura = val;
            saveDB(db);
            await sock.sendMessage(m.key.remoteJid, { text: `✅ Estatura guardada: *${val}*` }, { quoted: m });
        }

        if (command === 'setcolor') {
            const val = args.join(' ');
            if (!val) return sock.sendMessage(m.key.remoteJid, { text: 'Uso: #setcolor [tu color favorito]' }, { quoted: m });
            user.color = val;
            saveDB(db);
            await sock.sendMessage(m.key.remoteJid, { text: `🎨 Color favorito guardado: *${val}*` }, { quoted: m });
        }

        if (command === 'setgusto' || command === 'setgustos') {
            const val = args.join(' ');
            if (!val) return sock.sendMessage(m.key.remoteJid, { text: 'Uso: #setgusto [lo que te gusta]' }, { quoted: m });
            user.gustos = val;
            saveDB(db);
            await sock.sendMessage(m.key.remoteJid, { text: `☕ Gustos actualizados: *${val}*` }, { quoted: m });
        }

        if (command === 'pic' || command === 'getpic') {
            let target = sender;
            if (m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
                target = m.message.extendedTextMessage.contextInfo.mentionedJid[0];
            }
            let ppUrl;
            try {
                ppUrl = await sock.profilePictureUrl(target, 'image');
            } catch {
                ppUrl = 'https://i.imgur.com/2wD3A2D.png';
            }
            await sock.sendMessage(m.key.remoteJid, { image: { url: ppUrl }, caption: `🖼️ Foto de perfil de @${target.split('@')[0]}`, mentions: [target] }, { quoted: m });
        }
    }
};
