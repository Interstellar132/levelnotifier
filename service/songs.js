const gdmusiclib = 'https://geometrydashfiles.b-cdn.net/music/musiclibrary_02.dat';

const officialSongs = {
    '0': {
        name: 'Stereo Madness',
        artist: 'ForeverBound'
    },
    '1': {
        name: 'Back On Track',
        artist: 'DJVI'
    },
    '2': {
        name: 'Polargeist',
        artist: 'Step'
    },
    '3': {
        name: 'Dry Out',
        artist: 'DJVI'
    },
    '4': {
        name: 'Base After Base',
        artist: 'DJVI'
    },
    '5': {
        name: 'Cant Let Go',
        artist: 'DJVI'
    },
    '6': {
        name: 'Jumper',
        artist: 'Waterflame'
    },
    '7': {
        name: 'Time Machine',
        artist: 'Waterflame'
    },
    '8': {
        name: 'Cycles',
        artist: 'DJVI'
    },
    '9': {
        name: 'xStep',
        artist: 'DJVI'
    },
    '10': {
        name: 'Clutterfunk',
        artist: 'Waterflame'
    },
    '11': {
        name: 'Theory of Everything',
        artist: 'DJ-Nate'
    },
    '12': {
        name: 'Electroman Adventures',
        artist: 'Waterflame'
    },
    '13': {
        name: 'Clubstep',
        artist: 'DJ-Nate'
    },
    '14': {
        name: 'Electrodynamix',
        artist: 'DJ-Nate'
    },
    '15': {
        name: 'Hexagon Force',
        artist: 'Waterflame'
    },
    '16': {
        name: 'Blast Processing',
        artist: 'Waterflame'
    },
    '17': {
        name: 'Theory of Everything 2',
        artist: 'DJ-Nate'
    },
    '18': {
        name: 'Geometrical Dominator',
        artist: 'Waterflame'
    },
    '19': {
        name: 'Deadlocked',
        artist: 'F-777'
    },
    '20': {
        name: 'Fingerdash',
        artist: 'MDK'
    },
    '21': {
        name: 'Dash',
        artist: 'MDK'
    }
};

let musicLibrary = new Map();
let libraryLoaded = false;

function getOfficialSong(songID) {
    return officialSongs[String(songID)] || null;
}

function getCustomSong(songSection, customSongID) {
    if (!songSection || !customSongID || customSongID === '0') {
        return null;
    }

    const songs = songSection.split('~:~');

    for (const song of songs) {
        const values = song.split('~|~');
        const songData = {};

        for (let i = 0; i < values.length - 1; i += 2) {
            songData[values[i]] = values[i +1];
        }

        if (String(songData['1']) === String(customSongID)) {
            return {
                name: songData['2'] || 'N/A',
                artist: songData['4'] || 'N/A'
            };
        }
    } return null;
}

async function loadMusicLibrary() {
    if (libraryLoaded) {
        return;
    }

    console.log('loading gd music library...fun :)');

    const response = await fetch(gdmusiclib);

    if (!response.ok) {
        throw new Error(`failed to bang head: ${response.status}`);
    }

    const thoushaltBUFFER = Buffer.from(await response.arrayBuffer());

    const zlib = require('zlib');

    const decode = Buffer.from(thoushaltBUFFER.toString().replace(/-/g, '+').replace(/_/g, '/'), 'base64');

    const decompressed = zlib.inflateSync(decode).toString('utf8');

    const sections = decompressed.split('|');

    if (sections.length < 3) {
        throw new Error('bad library format');
    }

    const artists = new Map();

    for (const entry of sections[1].split(';')) {
        const values = entry.split(',');

        if (values.length >= 2) {
            artists.set(values[0], values[1]);
        }
    }

    for (const entry of sections[2].split(';')) {
        const values = entry.split(',');

        const id = values[0];
        const name = values[1];
        const artistID = values[2];

        if (!id || !name) {
            continue;
        }

        const song = {name, artist:artists.get(artistID) || 'Unknown Artist'};

        musicLibrary.set(String(id), song);
        musicLibrary.set(String(Number(id) + 1000000), song);
    }

    libraryLoaded = true;

    console.log(`loaded ${musicLibrary.size}, now i can head bang! :D`);

}

async function getMusicLibrarySong(songID) {
    if (!songID || songID ==='0') {
        return null;
    }

    await loadMusicLibrary();

    const id = String(songID);

    return musicLibrary.get(id) || musicLibrary.get(String(Number(id) - 1000000)) || null;

}

module.exports = { getOfficialSong, getCustomSong, getMusicLibrarySong };