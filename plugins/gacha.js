const fs = require('fs');
const path = require('path');

// Almacén temporal de personajes invocados en chats
global.activeGachas = global.activeGachas || new Map();

// Control de tiempos de espera (Cooldowns)
const cooldownsGacha = new Map();
const cooldownsClaim = new Map();
const COOLDOWN_TIME = 15 * 60 * 1000; // 15 minutos en milisegundos

// Base de datos de Harems
const dbPath = path.join(__dirname, '../harems.json');
function loadHarems() {
    if (!fs.existsSync(dbPath)) {
        fs.writeFileSync(dbPath, JSON.stringify({}), 'utf-8');
    }
    try {
        return JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    } catch {
        return {};
    }
}

function saveHarems(data) {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8');
}

// Función auxiliar para formatear tiempo restante
function getRemainingTime(lastTime) {
    const remaining = COOLDOWN_TIME - (Date.now() - lastTime);
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
}

// Consulta a AniList API (GraphQL) filtrando por personajes POPULARES
async function fetchPopularAnimeCharacter(genderFilter) {
    const page = Math.floor(Math.random() * 30) + 1;
    
    const query = `
    query ($page: Int) {
      Page(page: $page, perPage: 25) {
        characters(sort: FAVOURITES_DESC) {
          name {
            full
          }
          image {
            large
          }
          gender
          media(sort: POPULARITY_DESC, perPage: 1) {
            nodes {
              title {
                romaji
                english
              }
            }
          }
        }
      }
    }
    `;

    try {
        const response = await fetch('https://graphql.anilist.co', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({ query, variables: { page } })
        });

        const data = await response.json();
        const characters = data?.data?.Page?.characters || [];

        if (characters.length > 0) {
            let filtered = characters;
            if (genderFilter === 'waifu') {
                filtered = characters.filter(c => c.gender === 'Female' || !c.gender);
            } else if (genderFilter === 'husbu') {
                filtered = characters.filter(c => c.gender === 'Male' || !c.gender);
            }

            if (filtered.length === 0) filtered = characters;

            const char = filtered[Math.floor(Math.random() * filtered.length)];
            const media = char.media?.nodes?.[0];
            const animeTitle = media?.title?.english || media?.title?.romaji || 'Serie / Juego Famoso';
            const charName = char.name?.full || 'Personaje de Anime';
            const imageUrl = char.image?.large;

            if (imageUrl) {
                return {
                    name: charName,
                    anime: animeTitle,
                    image: imageUrl,
                    gender: char.gender === 'Male' ? 'Masculino ⚡' : 'Femenino 🌸'
                };
            }
        }
    } catch (e) {
        console.error('⚠️ Error consultando AniList:', e);
    }

    return null;
}

function getRandomRarity() {
    const rand = Math.random() * 100;
    if (rand < 5) return '👑 Legendario';
    if (rand < 20) return '🔮 Épico';
    if (rand < 50) return '⚔️ Raro';
    return '⚪ Común';
}

async function execute(conn, m, args, command) {
    const chatId = m.key?.remoteJid || m.chat || m.from;
    const sender = m.key?.participant || m.key?.remoteJid || m.sender;
    if (!chatId) return;

    // 1. INVOCACIÓN (gacha, waifu, husbu, roll)
    if (['gacha', 'waifu', 'husbu', 'roll'].includes(command)) {
        // Verificar Cooldown de Gacha
        const lastGacha = cooldownsGacha.get(sender);
        if (lastGacha && (Date.now() - lastGacha < COOLDOWN_TIME)) {
            const timeWait = getRemainingTime(lastGacha);
            return conn.sendMessage(chatId, { 
                text: `⏳ *¡Aguanta!* Debes esperar *${timeWait}* para volver a invocar.` 
            }, { quoted: m });
        }

        let endpoint = 'waifu';
        if (command === 'husbu') endpoint = 'husbu';
        else if (command === 'gacha' || command === 'roll') endpoint = Math.random() < 0.5 ? 'waifu' : 'husbu';

        try {
            await conn.sendMessage(chatId, { text: '✨ *Invocación Gacha:* Abriendo portal dimensional...' }, { quoted: m });

            const result = await fetchPopularAnimeCharacter(endpoint);
            if (!result) {
                return conn.sendMessage(chatId, { text: '❌ No se pudieron obtener los datos. Intenta de nuevo.' }, { quoted: m });
            }

            const rareza = getRandomRarity();
            const charId = Date.now().toString(36);

            const caption = `╭━━━✦ *GACHA SPAWN* ✦━━━
┃ 👤 *Nombre:* ${result.name}
┃ 📺 *Serie / Juego:* ${result.anime}
┃ 🏷️ *Categoría:* ${result.gender}
┃ ⭐ *Rareza:* ${rareza}
╰━━━━━━━━━━━━━━━━━━━
⏱️ *¡TIENES 1 MINUTO PARA RECLAMAR!*
Responde con *#claim* o *#reclamar* para añadir a *${result.name}* a tu harem.`;

            const sentMsg = await conn.sendMessage(chatId, {
                image: { url: result.image },
                caption: caption
            }, { quoted: m });

            // Registrar tiempo del usuario
            cooldownsGacha.set(sender, Date.now());

            // Temporizador de expiración de 1 minuto
            const timer = setTimeout(async () => {
                if (global.activeGachas.has(chatId)) {
                    global.activeGachas.delete(chatId);
                    await conn.sendMessage(chatId, { 
                        text: `⌛ *¡Tiempo agotado!* ${result.name} ha escapado de regreso al portal.` 
                    }, { quoted: sentMsg });
                }
            }, 60000);

            global.activeGachas.set(chatId, {
                messageKey: sentMsg.key,
                character: {
                    id: charId,
                    name: result.name,
                    anime: result.anime,
                    rarity: rareza,
                    type: result.gender,
                    image: result.image
                },
                claimed: false,
                timer: timer
            });

        } catch (err) {
            console.error('Error en gacha:', err);
        }
        return;
    }

    // 2. RECLAMAR (claim, reclamar)
    if (['claim', 'reclamar'].includes(command)) {
        const active = global.activeGachas.get(chatId);
        
        if (!active || active.claimed) {
            return conn.sendMessage(chatId, { 
                text: '❌ No hay ningún personaje disponible o ya fue reclamado por alguien más.' 
            }, { quoted: m });
        }

        // Verificar Cooldown de Claim
        const lastClaim = cooldownsClaim.get(sender);
        if (lastClaim && (Date.now() - lastClaim < COOLDOWN_TIME)) {
            const timeWait = getRemainingTime(lastClaim);
            return conn.sendMessage(chatId, { 
                text: `⏳ *¡Aguanta!* Debes esperar *${timeWait}* para volver a reclamar un personaje.` 
            }, { quoted: m });
        }

        // Marcar como reclamado e invalidar para otros
        active.claimed = true;
        clearTimeout(active.timer);
        const char = active.character;
        global.activeGachas.delete(chatId);

        // Guardar en la base de datos
        const harems = loadHarems();
        if (!harems[sender]) harems[sender] = [];
        
        harems[sender].push({
            ...char,
            claimedAt: new Date().toLocaleDateString()
        });
        
        saveHarems(harems);
        cooldownsClaim.set(sender, Date.now());

        const userTag = sender.split('@')[0];
        return conn.sendMessage(chatId, {
            text: `🎉 ¡Felicidades @${userTag}! Has reclamado a *${char.name}* [${char.rarity}] (${char.anime}). ¡Ahora es exclusivamente tuyo!`,
            mentions: [sender]
        }, { quoted: m });
    }

    // 3. TRANSFERIR PERSONAJE (givechar)
    if (['givechar', 'regalar', 'transferir'].includes(command)) {
        let target = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || 
                     m.message?.extendedTextMessage?.contextInfo?.participant;

        if (!target && args.length > 0) {
            const possibleMention = args.find(a => a.includes('@'));
            if (possibleMention) {
                target = possibleMention.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
            }
        }

        if (!target) {
            return conn.sendMessage(chatId, { 
                text: '❌ Debes mencionar a la persona a quien le vas a regalar el personaje.\nEjemplo: *#givechar Rem @mencion*' 
            }, { quoted: m });
        }

        // Extraer el nombre del personaje de los argumentos
        const charNameInput = args.filter(a => !a.startsWith('@')).join(' ').trim().toLowerCase();

        if (!charNameInput) {
            return conn.sendMessage(chatId, { 
                text: '❌ Escribe el nombre del personaje que deseas regalarle.\nEjemplo: *#givechar Rem @mencion*' 
            }, { quoted: m });
        }

        const harems = loadHarems();
        const myHarem = harems[sender] || [];

        // Buscar el personaje en el harem del emisor
        const charIndex = myHarem.findIndex(c => c.name.toLowerCase().includes(charNameInput));

        if (charIndex === -1) {
            return conn.sendMessage(chatId, { 
                text: `❌ No posees ningún personaje que coincida con "*${charNameInput}*" en tu harem.` 
            }, { quoted: m });
        }

        // Transferencia
        const [transferredChar] = myHarem.splice(charIndex, 1);
        if (!harems[target]) harems[target] = [];
        harems[target].push(transferredChar);

        saveHarems(harems);

        const senderTag = sender.split('@')[0];
        const targetTag = target.split('@')[0];

        return conn.sendMessage(chatId, {
            text: `🎁 @${senderTag} le ha regalado a *${transferredChar.name}* (${transferredChar.anime}) a @${targetTag}. ¡Trátal@ bien!`,
            mentions: [sender, target]
        }, { quoted: m });
    }

    // 4. VER HAREM (harem)
    if (command === 'harem') {
        const harems = loadHarems();
        const userHarem = harems[sender] || [];

        if (userHarem.length === 0) {
            return conn.sendMessage(chatId, { 
                text: '🌸 Tu harem está vacío. Invoca personajes con *#gacha* y sé el más rápido en reclamarlos con *#claim*.' 
            }, { quoted: m });
        }

        let txt = `╭━━━✦ *TU HAREM (${userHarem.length})* ✦━━━\n`;
        userHarem.forEach((item, idx) => {
            txt += `┃ ${idx + 1}. *${item.name}* (${item.anime}) - ${item.rarity}\n`;
        });
        txt += `╰━━━━━━━━━━━━━━━━━━━\n¡Usa *#givechar [Nombre] @mencion* para transferir personajes!`;

        return conn.sendMessage(chatId, { text: txt }, { quoted: m });
    }
}

module.exports = {
    command: ['gacha', 'waifu', 'husbu', 'roll', 'claim', 'reclamar', 'givechar', 'regalar', 'transferir', 'harem'],
    execute
};
