const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType } = require('discord.js');
const guildConfig = require('../models/guildConfig');
const userInfo = require('../models/userInfo');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('Server configuration.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
        subcommand
        .setName('setup')
        .setDescription('Set\'s this server config up.')
        .addChannelOption(option =>
            option.setName('channel')
            .setDescription('Where the announcement gets sent to.')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
        .addRoleOption(option =>
            option.setName('role')
            .setDescription('The role that gets tagged in the announcement message.')
            .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('message')
            .setDescription('The message for the announcement.')
        )
    )
    .addSubcommand(subcommand =>
        subcommand
        .setName('view')
        .setDescription('Views the current configuration for this server.')
    )
    .addSubcommand(subcommand =>
        subcommand
        .setName('addprofile')
        .setDescription('adds someone')
                .addStringOption(option =>
            option.setName('username')
            .setDescription('The Geometry Dash Username.')
            .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('playerid')
            .setDescription('the player id of the geometry dash account')
            .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('accountid')
            .setDescription('the account id of the geometry dash profile. this is different from the player id.')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
        subcommand
        .setName('removeprofile')
        .setDescription('Removes an account.')
        .addStringOption(option =>
            option.setName('accountid')
            .setDescription('Geometry Dash account id')
            .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('playerid')
            .setDescription('Geometry Dash player id')
            .setRequired(true)
        )
    ),


    async execute(interaction) {
        const guildID = interaction.guild.id;
        const subcommand = interaction.options.getSubcommand();

        try {

            if (subcommand === 'setup') {
                const channelID = interaction.options.getChannel('channel').id;
                const channelName = interaction.options.getChannel('channel').name;
                const role = interaction.options.getRole('role');
                const roleID = role?.id ?? null;
                const message = interaction.options.getString('message') ?? 'There is a new level!';

                await guildConfig.findOneAndUpdate(
                    { guildID },
                    { channelID, channelName, roleID, message },
                    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
                )
                 return interaction.reply({
                    content: `Server config settings saved.`,
                    ephemeral: true
                 })
            }

            if (subcommand === 'view') {
                const findSrvrConfig = await guildConfig.find({ guildID })
                const serverImage = interaction.guild.iconURL();

                if (!findSrvrConfig.length) {
                    await interaction.reply({
                        content: `There is no config setup for this server.`,
                        ephemeral: true
                    })
                }
                const configCard = findSrvrConfig.map(entry => new EmbedBuilder()
            .setTitle(`${interaction.guild.name}'s config settings`)
            .setThumbnail(serverImage)
            .setColor('#1c99ff')
            .addFields(
                { name: 'Channel', value: `<#${entry.channelID}>`, inline: false },
                { name: 'Role', value: `<@&${entry.roleID}>`, inline: false },
                { name: 'Message', value: entry.message, inline: false }
            )
            .setFooter({
                text: `Rerunning the config setup command overwrites these settings.`
            })
            .setTimestamp());

            return interaction.reply({
                embeds: configCard,
                ephemeral: true
            })
            }

            if (subcommand === 'addprofile') {
                const accToSearch = interaction.options.getString('username');

                const gdusrendpoint = 'https://www.boomlings.com/database/getGJUsers20.php';

                async function searchUser(username) {
                    if (!username || !username.trim()) {
                        throw new Error('Invalid Username field')
                    }

                    const body = new URLSearchParams({
                        secret: 'Wmfd2893gb7',
                        gameVersion: '22',
                        binaryVersion: '51',
                        gdw: '0',
                        str: username.trim(),
                        page: '0',
                        total: '0'
                    });

                    const response = await fetch(gdusrendpoint, {
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

                    const resText = await response.text();

                    if (!resText || resText.trim() === '-1') {
                        return null;
                    }

                    const userData = resText.split('#')[0];

                    if (!userData) {
                        return null;
                    }
                    const values = userData.split(':');
                    const user = {};

                    for (let i = 0; i < values.length - 1; i += 2) {
                        user[values[i]] = values[i + 1];
                    }

                    if (!user['1'] || !user['2']) {
                        return null;
                    }

                    return {
                        username: user['1'],
                        playerID: user['2'],
                        accountID: user['16']
                    };
                }

                const usr = await searchUser(accToSearch);

                if (!usr) {
                    return interaction.reply({
                        content: `Geometry Dash profile not found.`,
                        ephemeral: true
                    })
                }

                const accountID = usr.accountID;
                const playerID = usr.playerID;
                const accountName = usr.username;

                const doesExist = await userInfo.findOne({ guildID, playerID });

                if (doesExist) {
                    return interaction.reply({
                        content: `**${accountName}** has already been added.`,
                        ephemeral: true
                    })
                }

                const newEntry = new userInfo({
                    guildID,
                    accountID, 
                    playerID,
                    accountName
                })

                await newEntry.save();
                return interaction.reply({
                    content: `Geometry Dash profile has been added.`,
                    ephemeral: true
                })
            }

        if (subcommand === 'removeprofile') {
            const accountID = interaction.options.getString('accountid');
            const playerID = interaction.options.getString('playerid');

            const removeAcc = await userInfo.findOneAndDelete({ guildID, accountID, playerID });

            if (!removeAcc) {
                return interaction.reply({
                    content: `No account found.`,
                    ephemeral: true
                });
            }

            return interaction.reply({
                content: `Account has been removed.`,
                ephemeral: true
            });
        }

        } catch (err) {
            console.error('there was an error with config setup', err);
            return interaction.reply({
                content: `Failed configuration.`,
                ephemeral: true
            })
        }
    }
}
