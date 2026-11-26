const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { execute } = require('./config');
const guildConfig = require('../models/guildConfig');
const tracker = require('../models/tracker');
const userInfo = require('../models/userInfo');

async function checkGDHealth() {
    const serverendpoint = 'https://www.boomlings.com/database/getGJLevels21.php';

    const body = new URLSearchParams({
        secret: 'Wmfd2893gb7',
        gameVersion: '22',
        binaryVersion: '51',
        type: '5',
        str: '1',
        page: '0',
        total: '0',
        diff: '-',
        len: '0',
        uncompleted: '0',
        onlyCompleted: '0',
        featured: '0',
        original: '0'
    });

    const start = Date.now();

    try {
        const response = await fetch(serverendpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': ''
            },
            body: body.toString(),
            signal: AbortSignal.timeout(10000)
        });

        const resTime = Date.now() - start;
        const resText = await response.text();
        const lowerRes = resText.toLowerCase();

        if (
            response.status === 429 ||
            response.headers.has('retry-after') ||
            lowerRes.includes('rate limit') ||
            lowerRes.includes('too many requests') ||
            lowerRes.includes('error 1015')
        ) {
            return {
                status: 'Rate Limited',
                color: '#ff0000',
                resTime,
                details: `http ${response.status}`
            };
        }

        if (response.status >= 500) {
            return {
                status: 'Server Error',
                color: '#ffee00',
                resTime,
                details: `http ${response.status}`
            };
        }

        if (!response.ok) {
            return {
                status: 'Request Failed',
                color: '#ff6600',
                resTime,
                details: `http ${response.status}`
            };
        }

        if (
            lowerRes.includes('<html') && (lowerRes.includes('cloudflare') || lowerRes.includes('attention required'))
        ) {
            return {
                status: 'Request Blocked',
                color: '#ff0000',
                resTime,
                details: 'Blocked by Cloudflare'
            };
        }

        if (!resText.trim()) {
            return {
                status: 'Empty Response',
                color: '#FFA500',
                resTime,
                details: 'Empty response'
            };
        }

        return {
            status: 'Online',
            color: '#2bff00',
            resTime,
            details: 'Bot working'
        };
    } catch (error) {
        return {
            status: error.name === 'TimeoutError' || 'AbortError' ? 'Timeout': 'Unreachable',
            color: '#FF0000',
            resTime: Date.now() - start,
            details: error.message
        };
    }
}

module.exports = {
    data: new SlashCommandBuilder()
    .setName('dev')
    .setDescription('Developer commands')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
        subcommand.setName('viewserverconfig')
        .setDescription('Views settings for a server')
        .addStringOption(option =>
            option.setName('serverid')
            .setDescription('The Discord Server ID')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
        subcommand.setName('removeserverconfig')
        .setDescription('Clears a server config, includes users.')
        .addStringOption(option =>
            option.setName('serverid')
            .setDescription('The Discord Server ID.')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
        subcommand.setName('setlastlevel')
        .setDescription('Sets last level for a profile.')
        .addStringOption(option =>
            option.setName('playerid')
            .setDescription('The Player ID.')
            .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('levelid')
            .setDescription('The level ID being set.')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
        subcommand.setName('database')
        .setDescription('export db info')
        .addStringOption(option =>
            option.setName('type')
            .setDescription('type of data')
            .setRequired(true)
            .addChoices(
                { name: 'Guild Config', value: 'guildConfig' },
                { name: 'User Info', value: 'userInfo' }
            )
        )
    )
    .addSubcommand(subcommand =>
        subcommand.setName('cleandb')
        .setDescription('Clean the database.')
    )
    .addSubcommand(subcommand =>
        subcommand.setName('checkhealth')
        .setDescription('Check the bot\'s health.')
    ),

async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    const devID = process.env.devID;

    if (interaction.user.id !== devID) {
        return interaction.reply({
            content: 'You are not authorized to use this command.',
            ephemeral: true
        });
    }

    if (subcommand === 'viewserverconfig') {
        const serverID = interaction.options.getString('serverid');

        const config = await guildConfig.findOne({ guildID: serverID });

        if (!config) {
            return interaction.reply({
                content: `No configuration set up for this server.`
            });
        }

        const configCard = new EmbedBuilder()
        .setTitle('Server Config')
        .setColor('#7700ff')
        .addFields(
            { name: 'Server ID', value: config.guildID, inline: false },
            { name: 'Channel Name', value: config.channelName, inline: false },
            { name: 'Channel ID', value: config.channelID, inline: false },
            { name: 'Message set', value: config.message, inline: false }
        )
        .setTimestamp();

        return interaction.reply({
            embeds: [configCard]
        });
    };

    if (subcommand === 'removeserverconfig') {
        const serverID = interaction.options.getString('serverid');

        const delConfig = await guildConfig.findOneAndDelete({ guildID: serverID });

        if (!delConfig) {
            return interaction.reply({
                content: `No configuration set up for this server.`
            });
        }

        return interaction.reply({
            content: `Server config removed.`
        });
    };

    if (subcommand === 'setlastlevel') {
        const playerID = interaction.options.getString('playerid');
        const lastLvlID = interaction.options.getString('levelid');

        const updateLvlID = await tracker.findOneAndUpdate( { playerID }, { lastLvlID });

        if (!updateLvlID) {
            return interaction.reply({
                content: `Player ID not found.`
            });
        }

        return interaction.reply({
            content: `${playerID}'s last level updated to ${lastLvlID}.`
        });
    };

    if (subcommand === 'database') {
        const type = interaction.options.getString('type');

        let documents;
        let text;

        if (type === 'guildConfig') {
            documents = await guildConfig.find({}).lean();

            text = documents.map((doc, index) => {
                return `doc ${index + 1}\n${JSON.stringify(doc, null, 4)}`;
            }).join('\n\n==============================================\n\n');
        } else if (type === 'userInfo') {
            const userInfoDocs = await userInfo.find({}).lean();
            const trackerDocs = await tracker.find({}).lean();

            const trackerMap = new Map(
                trackerDocs.map(doc => [String(doc.playerID), doc])
            );

            documents = userInfoDocs;

            text = userInfoDocs.map((doc, index) => {
                const tracked = trackerMap.get(String(doc.playerID));

                const exportDoc = {...doc, lastLvlID: tracked?.lastLvlID ?? 'N/A'};

                return `doc ${index + 1}\n${JSON.stringify(exportDoc, null, 4)}`;
            }).join('\n\n==============================================\n\n');

        }

        if (!documents || documents.length === 0) {
            return interaction.reply({
                content: `No docs in collection`
            });
        }

        const file = new AttachmentBuilder(
            Buffer.from(text, 'utf8'),
            { name: `${type}.txt`}
        );

        return interaction.reply({
            content: `Exported ${documents.length} docs from \`${type}\`.`,
            files: [file]
        });

    }

    if (subcommand === 'cleandb') {
        try {
            const guilds = await interaction.client.guilds.fetch();
            
            const activeGuilds = guilds.map(guild => guild.id);

            if (activeGuilds.length === 0) {
                return interaction.reply({
                    content: `No servers found`
                });
            }

            const configResult = await guildConfig.deleteMany({ guildID: {$nin: activeGuilds}});
            const userResult = await userInfo.deleteMany({ guildID: {$nin: activeGuilds}});

            return interaction.reply({
                content: `db cleanup successful: ${activeGuilds.length} checked, ${configResult.deletedCount} configs deleted, ${userResult.deletedCount} users deleted.`
            });
        } catch (error) {
            console.error('db cleanup error:', error);
            return interaction.reply({
                content: `Failed to clean db`
            });
        }
    }

    if (subcommand === 'checkhealth') {
        const start = Date.now();

        await interaction.deferReply({ ephemeral: false });

        const commandRes = Date.now() - interaction.createdTimestamp;

        const gatewayPing = interaction.client.ws.ping;

        const gd = await checkGDHealth();

        let overallStatus = 'Operational';
        let overallColor = '#00ff00';

        if (gd.status === 'Unreachable' || gd.status === 'Timeout' || gd.status === 'Server Error' || gd.status === 'Request Failed') {
            overallStatus = 'Degraded';
            overallColor = '#FF0000';
        } else if (gd.status !== 'Online') {
            overallStatus = 'Warning';
            overallColor = '#ffae00';
        }

        const healthCard = new EmbedBuilder()
            .setTitle('Level Notifier Health Diagnostics')
            .setColor(overallColor)
            .setDescription(overallStatus)
            .addFields(
                { name: 'Geometry Dash', value: `**${gd.status}**\n${gd.details}`, inline: false },
                { name: 'Geometry Dash Response Time', value: `${gd.resTime}ms`, inline: true },
                { name: 'Gateway Ping', value: `${gatewayPing}ms`, inline: false },
                { name: 'Command Response', value: `${commandRes}ms`, inline: false }
            )
            .setFooter({ text: `Health Check`})
            .setTimestamp();

            return interaction.editReply({
                embeds: [healthCard]
            });
    }
}

}