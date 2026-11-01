const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType } = require('discord.js');
const guildConfig = require('../models/guildConfig');
const userInfo = require('../models/userInfo');
const lvlTracker = require('../models/tracker');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('set the bot up')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
        subcommand
        .setName('setup')
        .setDescription('sets the announcement channel')
        .addChannelOption(option =>
            option.setName('channel')
            .setDescription('the channel')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
        .addRoleOption(option =>
            option.setName('role')
            .setDescription('the role')
            .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('message')
            .setDescription('the message')
        )
    )
    .addSubcommand(subcommand =>
        subcommand
        .setName('view')
        .setDescription('view the current config')
    )
    .addSubcommand(subcommand =>
        subcommand
        .setName('addprofile')
        .setDescription('adds someone')
        .addStringOption(option =>
            option.setName('playerid')
            .setDescription('the player id of the geometry dash account')
            .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('accountid')
            .setDescription('the account id of the geometry dash profile. this is different from the player id.')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
        subcommand
        .setName('removeprofile')
        .setDescription('removes a profile')
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
                    content: `config saved`,
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
                const accountID = interaction.options.getString('accountid');
                const playerID = interaction.options.getString('playerid');

                const newEntry = new userInfo({
                    guildID,
                    accountID, 
                    playerID
                })

                await newEntry.save();
                return interaction.reply({
                    content: `Account has been added.`,
                    ephemeral: true
                })
            }

        if (subcommand === 'removeprofile') {
            const accountID = interaction.options.getString('accountid');
            const playerID = interaction.options.getString('playerid');

            const removeAcc = await userInfo.findOneAndDelete({ guildID, accountID, playerID });
            const removeLvls = await lvlTracker.findOneAndDelete({ playerID });

            if (!removeAcc && !removeLvls) {
                return interaction.reply({
                    content: `There is nothing associated with the details you provided.`,
                    ephemeral: true
                });
            }

            return interaction.reply({
                content: `Account has been removed`,
                ephemeral: true
            });
        }

        } catch (err) {
            console.error('there was an error with config setup', err);
            return interaction.reply({
                content: `there was an error with setup`,
                ephemeral: true
            })
        }
    }
}
