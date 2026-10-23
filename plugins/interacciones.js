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

module.exports = {
    name: 'interacciones',
    async execute(sock, m, args, command) {
        const chatId = m.key.remoteJid;
        const sender = m.key.participant || chatId;
        const usersDB = loadUsersDB();

        if (!usersDB[sender]) {
            usersDB[sender] = { pareja: null, cafeCount: 0 };
        }
        const user = usersDB[sender];
        const target = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || null;

        async function sendAction(text, gifKey) {
            try {
                const folderPath = path.join(__dirname, `../media/gifs/${gifKey}`);
                
                if (!fs.existsSync(folderPath)) {
                    return sock.sendMessage(chatId, { text: `⚠️ No existe la carpeta local: ${gifKey}` });
                }

                const files = fs.readdirSync(folderPath).filter(file => file.endsWith('.gif') || file.endsWith('.mp4'));

                if (files.length === 0) {
                    return sock.sendMessage(chatId, { text: `⚠️ La carpeta '${gifKey}' está vacía.` });
                }

                const randomGif = files[Math.floor(Math.random() * files.length)];
                const gifPath = path.join(folderPath, randomGif);

                await sock.sendMessage(chatId, {
                    video: fs.readFileSync(gifPath),
                    gifPlayback: true,
                    mimetype: 'video/mp4',
                    caption: text,
                    mentions: target ? [sender, target] : [sender]
                }, { quoted: m });
            } catch (err) {
                console.error("Error enviando GIF local:", err);
                await sock.sendMessage(chatId, {
                    text: text,
                    mentions: target ? [sender, target] : [sender]
                }, { quoted: m });
            }
        }

        switch (command) {
            case 'help':
            case 'menu':
                const menuText = `🐍 ━━━━━━━━━━━━━━━━━━━━ 🐍\n       🐉  ᴅʀᴀᴄᴏɴɪᴀ ᴍᴀʟғᴏʏ  🐉\n   "Orgullo, elegancia y astucia"\n🐍 ━━━━━━━━━━━━━━━━━━━━ 🐍\n\n¡Hola! Soy *Draconia Malfoy*, tu asistente virtual. Aquí tienes la guía de comandos oficial:\n\n👤 *1. PERFIL Y PERSONALIZACIÓN*\n• #pf / #profile — Ver tu ficha de perfil.\n• #pic — Muestra y descarga foto de perfil.\n• #setgenre [hombre/mujer/otro] | #os [hetero/homo/bi]\n• #setbirth DDMMAA | #ss [estatura] | #setcolor [color] | #setgusto [gustos]\n\n💍 *2. PAREJAS Y FAMILIA*\n• #marry @usuario | #accept | #divorce\n• #adopt @usuario | #mascota [nombre]\n\n🎴 *3. GACHA Y COLECCIONABLES*\n• #roll / #rw — Tira la ruleta de personajes.\n• #claim / #c — Reclama el personaje activo.\n• #harem [página] | #infochar [nombre]\n\n💰 *4. ECONOMÍA Y APUESTAS*\n• #work / #trabajar | #slut | #diario / #claimdaily\n• #deposit [monto/all] | #withdraw [monto/all]\n• #bal / #banco | #rob @usuario | #pay @usuario [monto]\n• #cf [cara/cruz] [monto] | #dados [monto] | #slot [monto] | #ppt [opcion] [monto]\n\n⚔️ *5. RPG, FACCIONES Y TAMRIEL*\n🏰 *Facciones Disponibles:*\n  • ⚡ *Capas de la Tormenta* (+Ataque)\n  • 🛡️ *Legión Imperial* (+Defensa)\n  • 🗡️ *Hermandad Oscura* (+Agilidad)\n  • 🧙 *Colegio de Hibernalia* (+XP Extra)\n\n• #facciones — Ver clanes activos, líderes y bonos.\n• #unirse [nombre] — Únete a un clan (Ej: #unirse hermandad).\n• #crearfaccion [nombre] — Funda tu facción ($50,000).\n• #renombrar / #motto — Configura tu facción (Líderes).\n• #equipo / #estado — Salud, atributos y armamento.\n• #rank / #nivel | #top / #leaderboard\n• #pelear @usuario [apuesta] — Duelo sangriento por oro.\n• #dungeon / #aventura — Explora la mazmorra (20m).\n• #pociones | #comprar pocion [número] | #tomar [número]\n• #tienda | #comprar [objeto] | #miTienda [rubro]\n\n💖 *6. INTERACCIONES Y EXPRESIONES*\n• #abrazo | #beso | #mejilla | #frente | #mano | #dedos | #morder\n• #sentar | #nalgada | #secuestro | #cafe | #chocar\n• #patada | #puno | #cachetada | #escupir\n• #caminar | #bailar | #escribir\n• #gritar | #asustado | #vomitar | #enloquecer | #enfadarse | #feliz | #sorprendido | #triste | #llorar\n\n🐍 ━━━━━━━━━━━━━━━━━━━━ 🐍`;

                const imagePath = path.join(__dirname, '../media/draconia.jpg');

                if (fs.existsSync(imagePath)) {
                    return sock.sendMessage(chatId, {
                        image: fs.readFileSync(imagePath),
                        caption: menuText
                    }, { quoted: m });
                } else {
                    return sock.sendMessage(chatId, { text: menuText }, { quoted: m });
                }

            case 'abrazo':
                if (!target) return sock.sendMessage(chatId, { text: '⚠️ Etiqueta a alguien.' });
                return sendAction(`🤗 *@${sender.split('@')[0]}* le da un fuerte abrazo a *@${target.split('@')[0]}*`, 'abrazo');

            case 'beso':
                if (!target) return sock.sendMessage(chatId, { text: '⚠️ Etiqueta a alguien.' });
                return sendAction(`💋 *@${sender.split('@')[0]}* le da un beso apasionado a *@${target.split('@')[0]}*`, 'beso');

            case 'mejilla':
                if (!target) return sock.sendMessage(chatId, { text: '⚠️ Etiqueta a alguien.' });
                return sendAction(`😊 *@${sender.split('@')[0]}* le da un tierno beso en la mejilla a *@${target.split('@')[0]}*`, 'mejilla');

            case 'frente':
                if (!target) return sock.sendMessage(chatId, { text: '⚠️ Etiqueta a alguien.' });
                return sendAction(`✨ *@${sender.split('@')[0]}* le da un dulce beso en la frente a *@${target.split('@')[0]}*`, 'frente');

            case 'mano':
                if (!target) return sock.sendMessage(chatId, { text: '⚠️ Etiqueta a alguien.' });
                return sendAction(`🎩 *@${sender.split('@')[0]}* toma la mano de *@${target.split('@')[0]}* y le da un beso respetuoso.`, 'mano');

            case 'dedos':
            case 'entrelazar':
                if (!target) return sock.sendMessage(chatId, { text: '⚠️ Etiqueta a alguien.' });
                if (user.pareja !== target) {
                    return sock.sendMessage(chatId, { text: '❌ ¡Solo las parejas registradas pueden entrelazar sus dedos!' });
                }
                return sendAction(`🤝 *@${sender.split('@')[0]}* entrelaza sus dedos románticamente con *@${target.split('@')[0]}*`, 'dedos');

            case 'morder':
                if (!target) return sock.sendMessage(chatId, { text: '⚠️ Etiqueta a alguien.' });
                return sendAction(`🦷 *@${sender.split('@')[0]}* le da una mordida traviesa en la mejilla a *@${target.split('@')[0]}*`, 'morder');

            case 'sentar':
                if (!target) return sock.sendMessage(chatId, { text: '⚠️ Etiqueta a alguien.' });
                if (user.pareja && user.pareja !== target) {
                    return sock.sendMessage(chatId, { text: '❌ ¡Respeta a tu pareja! No puedes sentarte en las piernas de alguien más.' });
                }
                return sendAction(`🪑 *@${sender.split('@')[0]}* se sienta de forma cariñosa en las piernas de *@${target.split('@')[0]}*`, 'sentar');

            case 'nalgada':
                if (!target) return sock.sendMessage(chatId, { text: '⚠️ Etiqueta a alguien.' });
                return sendAction(`👋 *@${sender.split('@')[0]}* le propina una nalgada a *@${target.split('@')[0]}*`, 'nalgada');

            case 'secuestro':
                if (!target) return sock.sendMessage(chatId, { text: '⚠️ Etiqueta a alguien.' });
                return sendAction(`🍬 *@${sender.split('@')[0]}* carga al hombro y se lleva secuestrado a *@${target.split('@')[0]}*`, 'secuestro');

            case 'patada':
                if (!target) return sock.sendMessage(chatId, { text: '⚠️ Etiqueta a alguien.' });
                return sendAction(`🦵 *@${sender.split('@')[0]}* le lanza una patada voladora a *@${target.split('@')[0]}*`, 'patada');

            case 'puno':
                if (!target) return sock.sendMessage(chatId, { text: '⚠️ Etiqueta a alguien.' });
                return sendAction(`🥊 *@${sender.split('@')[0]}* le conecta un puñetazo directo al mentón a *@${target.split('@')[0]}*`, 'puno');

            case 'cachetada':
                if (!target) return sock.sendMessage(chatId, { text: '⚠️ Etiqueta a alguien.' });
                return sendAction(`✋ *@${sender.split('@')[0]}* le da una tremenda cachetada a *@${target.split('@')[0]}*`, 'cachetada');

            case 'escupir':
                if (!target) return sock.sendMessage(chatId, { text: '⚠️ Etiqueta a alguien.' });
                return sendAction(`💦 *@${sender.split('@')[0]}* escupe al suelo mirando con desprecio a *@${target.split('@')[0]}*`, 'escupir');

            case 'caminar':
                return sendAction(`🚶‍♂️ *@${sender.split('@')[0]}* sale a dar un paseo para despejar la mente.`, 'caminar');

            case 'bailar':
                return sendAction(`💃 *@${sender.split('@')[0]}* saca sus mejores pasos y empieza a bailar.`, 'bailar');

            case 'escribir':
                return sendAction(`✍️ *@${sender.split('@')[0]}* está concentrado escribiendo notas muy importantes.`, 'escribir');

            case 'gritar':
                return sendAction(`😱 *@${sender.split('@')[0]}* pega un grito ensordecedor que se escucha en todo el grupo.`, 'gritar');

            case 'asustado':
                return sendAction(`😨 *@${sender.split('@')[0]}* se quedó pálido del susto y está temblando.`, 'asustado');

            case 'vomitar':
                return sendAction(`🤮 *@${sender.split('@')[0]}* sale corriendo al baño a vomitar de la impresión.`, 'vomitar');

            case 'enloquecer':
                return sendAction(`🤪 *@${sender.split('@')[0]}* ha perdido completamente la razón y corre en círculos.`, 'enloquecer');

            case 'enfadarse':
                return sendAction(`😡 *@${sender.split('@')[0]}* está echando chispas de lo molesto que se puso.`, 'enfadarse');

            case 'feliz':
                return sendAction(`😸 *@${sender.split('@')[0]}* tiene una sonrisa de oreja a oreja de lo feliz que está.`, 'feliz');

            case 'sorprendido':
                return sendAction(`😲 *@${sender.split('@')[0]}* se quedó con la boca abierta sin poder creérselo.`, 'sorprendido');

            case 'triste':
                return sendAction(`🥺 *@${sender.split('@')[0]}* tiene el ánimo por el suelo y mira fijamente la ventana.`, 'triste');

            case 'llorar':
                return sendAction(`😭 *@${sender.split('@')[0]}* está inundando el suelo con sus lágrimas.`, 'llorar');

            case 'cafe':
                user.cafeCount = (user.cafeCount || 0) + 1;
                saveUsersDB(usersDB);
                let msg = `☕ *@${sender.split('@')[0]}* se está tomando una deliciosa taza de café. (Lleva ${user.cafeCount} tazas hoy)`;
                if (user.cafeCount >= 5) msg += `\n⚠️ *¡Cuidado!* Ya llevas mucho café, te va a dar insomnio.`;
                return sendAction(msg, 'cafe');

            default:
                break;
        }
    }
};
