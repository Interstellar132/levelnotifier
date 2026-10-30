require('dotenv').config(); //remove on github
const fs = require('fs');
const https = require('https');
const { Client, REST, Routes, GatewayIntentBits, Collection, ActivityType } = require('discord.js');
const connectDB = require('./database');
const { startEyes } = require('./service/watcher');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const token = process.env.discord_token;
const clientID = process.env.clientID;

const commands = [];
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    if (command.data && typeof command.data.toJSON === 'function') {
        commands.push(command.data.toJSON());
    } else {
        console.warn(`${file} does not have valid builder data`);
    }
}

(async () => {
    const rest = new REST({ version: '10' }).setToken(token);

    try {
        console.log(`started refreshing ${commands.length} commands`);

        await rest.put(Routes.applicationCommands(clientID),
        { body: commands });
        console.log(`reloaded commands`);
    } catch (error) {
        console.error(error);
    }
})();

client.commands = new Collection();

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.data.name, command);
}

client.on('interactionCreate', async interaction => {
    try {
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);

            if (!command) {
                console.log(`${interaction.commandName} does not exist`);
                return;
            }

            await command.execute(interaction);
            return;
        }
    } catch (error) {
        console.error('interaction failed:', error);

        if (!interaction.replied && interaction.deferred) {
            await interaction.reply({
                content: `error processing interaction`,
                ephemeral: true
            }).catch(() => {});
        }
    }
})

client.once('clientReady', () => {
    console.log(`${client.user.tag} online`);

    client.user.setPresence({
        status: 'Geometry Dash',
        activities: [
            {
                name: 'Geometry Dash',
                type: ActivityType.Playing
            }
        ]
    })
    startEyes(client);
});

if (!token) {
    console.error('token not set');
    process.exit(1);
}

(async () => {
    try {
        await connectDB();
        await client.login(token);
    } catch (err) {
        console.error('i have died', err);
        process.exit(1);
    }
})();