const { EmbedBuilder } = require('discord.js');

const userInfo = require('../models/userInfo');
const guildConfig = require('../models/guildConfig');
const lvlTracker = require('../models/tracker');
const { getOfficialSong, getCustomSong, getMusicLibrarySong } = require('../service/songs');

const gdendpoint = 'https://www.boomlings.com/database/getGJLevels21.php';

const checkInterval = 5 * 60 * 1000;

const reqDelay = 650;

let watStart = false;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve,ms));
}

function parseLevelData(raw) {
    const values = raw.split(':');
    const lvl = {};

    for (let i = 0; i < values.length - 1; i += 2) {
        lvl[values[i]] = values[i + 1];
    }

    const officialSong = getOfficialSong(lvl['12']);

    return {
        id: lvl['1'],
        name: lvl['2'],
        description: lvl['3'] ? Buffer.from(lvl[3], 'base64').toString('utf8') : '',
        playerID: lvl['6'],
        downloads: lvl['10'] || '0',
        likes: lvl['10'] || '0',
        starsRequested: Number(lvl['39'] || 0),
        length: Number(lvl['15'] || 0),
        officialSongID: lvl['12'] || '0',
        customSongID: lvl['35'] || '0',
        musicLibrarySongIDs: lvl['52'] || '',
        userCoins: Number(lvl['37'] || 0),
        officialSong
    };
}

async function getLatestLvl(playerID) {
    const body = new URLSearchParams({
        secret: 'Wmfd2893gb7',
        gameVersion: '22',
        binaryVersion: '51',
        type: '5',
        str: String(playerID),
        page: '0',
        total: '0',
        diff: '-',
        len: '0',
        uncompleted: '0',
        onlyCompleted: '0',
        featured: '0',
        original: '0',
    });

    const response = await fetch(gdendpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': ''
        },
        body: body.toString()
    });

    if (!response.ok) {
        throw new Error(`gd returned http ${response.status}`);
    }

    const responseText = await response.text();

    if (!responseText || responseText.trim() === '-1') {
        return null;
    }

    const resParts = responseText.split('#');
    const lvlParts = resParts[0];
    const whomadeLevel = resParts[1] || '';
    const songParts = resParts[2] || '';


    if (!lvlParts) {
        return null;
    }


    const theselevelsareRAWWWWW = lvlParts.split('|').filter(Boolean);

    if (!theselevelsareRAWWWWW.length) {
        return null;
    }

    const lvl = parseLevelData(theselevelsareRAWWWWW[0]);

    const creator = whomadeLevel.split('|').map(entry => entry.split(':')).find(entry => entry[0] === lvl.playerID);

    if (creator) {
        lvl.creator = creator[1];
    } else {
        lvl.creator = `Player ${playerID}`
    }

    if (lvl.customSongID !== '0') {
        const song = getCustomSong(songParts, lvl.customSongID);

        lvl.songName = song?.name || 'N/A';
        lvl.songArtist = song?.artist || 'N/A'
    } else if (lvl.musicLibrarySongIDs) {
        const libraryIDs = lvl.musicLibrarySongIDs.split(',').map(id => id.trim()).filter(Boolean);

        const song = await getMusicLibrarySong(libraryIDs[0]);

        lvl.songName = song?.name || 'N/A';
        lvl.songArtist = song?.artist || 'N/A';

    } else {
        lvl.songName = lvl.officialSong?.name || 'N/A';
        lvl.songArtist = lvl.officialSong?.artist || 'N/A';
    }


    return lvl;
}

const cardColor = {
  0: { img: "https://cdn.discordapp.com/emojis/1566553889262542848.webp?size=96", color: "#969796" },
  1: { img: "https://cdn.discordapp.com/emojis/1566553704545386577.webp?size=96", color: "#f6ca62" },
  2: { img: "https://cdn.discordapp.com/emojis/1566553864667136181.webp?size=96", color: "#01b9ff" },
  3: { img: "https://cdn.discordapp.com/emojis/1566553839539069008.webp?size=96", color: "#00fc05" },
  4: { img: "https://cdn.discordapp.com/emojis/1566553818421006376.webp?size=96", color: "#fed000" },
  5: { img: "https://cdn.discordapp.com/emojis/1566553818421006376.webp?size=96", color: "#fed000" },
  6: { img: "https://cdn.discordapp.com/emojis/1566553750225686590.webp?size=96", color: "#fe5501" },
  7: { img: "https://cdn.discordapp.com/emojis/1566553750225686590.webp?size=96", color: "#fe5501" },
  8: { img: "https://cdn.discordapp.com/emojis/1566553233474986106.webp?size=96", color: "#fe65df" },
  9: { img: "https://cdn.discordapp.com/emojis/1566553233474986106.webp?size=96", color: "#fe65df" },
  10:{ img: "https://cdn.discordapp.com/emojis/1566553726590914732.webp?size=96", color: "#ff3444" },
};

const coinCount = {
    0: '<:transcoin:1565788795142541424><:transcoin:1565788795142541424><:transcoin:1565788795142541424>',
    1: '<:silvercoin:1565785503771402310><:transcoin:1565788795142541424><:transcoin:1565788795142541424>',
    2: '<:silvercoin:1565785503771402310><:silvercoin:1565785503771402310><:transcoin:1565788795142541424>',
    3: '<:silvercoin:1565785503771402310><:silvercoin:1565785503771402310><:silvercoin:1565785503771402310>'
}

async function sendLvl(client, playerID, lvl) {
    const lvlLengthToName = {
    0: 'Tiny',
    1: 'Short',
    2: 'Medium',
    3: 'Long',
    4: 'XL',
    5: 'Platformer'
};

    const lvlLength = lvlLengthToName[lvl.length] ?? 'N/A';
    const diff = cardColor[lvl.starsRequested] ?? cardColor[0];
    const coins = coinCount[lvl.userCoins] ?? coinCount[0];
    const subbies = await userInfo
        .find({ playerID: String(playerID) })
        .select('guildID')
        .lean();

    const guildIDs = [ ...new Set(subbies.map(subbies => subbies.guildID))];

    if (!guildIDs.length) return;

    const configs = await guildConfig
        .find({ guildID: { $in: guildIDs } })
        .lean();

    for (const config of configs) {
        try {
            const channel = await client.channels.fetch(config.channelID);

            if (!channel || !channel.isTextBased() || typeof channel.send !== 'function') {
                console.log(`Invalid announcement channel for ${config.guildID}`);
                continue;
            }

            const lvlCard = new EmbedBuilder()
            .setAuthor({ name: 'New Level!', iconURL: 'https://cdn.discordapp.com/emojis/740636765882417164.webp?size=96' })
                .setColor(diff.color)
                .setTitle(`**${lvl.name}** by **${lvl.creator}**`)
                .setThumbnail(diff.img)
                .setURL(`https://gdbrowser.com/${lvl.id}`)
                .addFields(
                    { name: '', value: '----------------------------', inline: false },
                    { name: '<:play:1565847211151990925> __Level ID__', value: String(lvl.id), inline: false },
                    { name: '<:star:1565838558399307806> __Stars/Moons Requested__ <:moon:1565838579660488755>', value: lvl.starsRequested > 0 ? `${lvl.starsRequested}` : 'N/A', inline: false },
                    { name: '<:time:1565841217340571870> __Level Length__', value: String(lvlLength), inline: false },
                    { name: '', value: '----------------------------', inline: false },
                    { name: `__Coins:__ ${coins}`, value: `:musical_note: __${lvl.songName}__ by __${lvl.songArtist}__`, inline: false }
                )
                .setTimestamp()
                .setFooter({
                    text: `Level Notifier`
                });

                if (lvl.description) {
                    lvlCard.setDescription(lvl.description.slice(0, 4000));
                } else {
                    lvlCard.setDescription(`*No Description Provided*`);
                }

                const tagRole = config.roleID ? `<@&${config.roleID}>` : '';

                await channel.send({
                    content: [tagRole, config.message]
                        .filter(Boolean)
                        .join(' '),
                    embeds: [lvlCard],
                    allowedMentions: {
                        roles: config.roleID ? [config.roleID] : []
                    }
                });

                console.log(`sent "${lvl.name}" in guild "${config.guildID}"`);
        } catch (error) {
            console.error(`failed to send level data in ${config.guildID}:`, error);
        }
    }
}

async function checkPlayers(client) {
    const playerIDs = await userInfo.distinct('playerID');

    for (const playerID of playerIDs) {
        try {
            const lvl = await getLatestLvl(playerID);

            if (!lvl) {
                continue;
            }

            let tracker = await lvlTracker.findOne({
                playerID: String(playerID)
            });

            if (!tracker) {
                await lvlTracker.create({
                    playerID: String(playerID),
                    lastLvlID: lvl.id,
                });

                continue;
            }

            if (tracker.lastLvlID >= lvl.id) {
                continue;
            }

            await sendLvl(client, playerID, lvl);
            tracker.lastLvlID = lvl.id;

            await tracker.save();

        } catch (error) {
            console.error(`failed ${playerID}:`, error);
        }
        await sleep(reqDelay);
    }
}

async function loopEyes(client) {
    while (true) {
        if (client.isReady()) {
            try {
                await checkPlayers(client);
            } catch (error) {
                console.error('watcher error:', error);
            }
        }
        await sleep(checkInterval);
    }
}

function startEyes(client) {
    if (watStart) return;

    watStart = true;

    console.log('eyes started');

    loopEyes(client);
}

module.exports = { startEyes };
