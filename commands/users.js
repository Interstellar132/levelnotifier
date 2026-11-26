const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const userInfo = require('../models/userInfo');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('listusers')
    .setDescription('All Geometry Dash accounts configured for this server.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
        subcommand.setName('all')
        .setDescription('Lists all accounts.')
    )
     .addSubcommand(subcommand =>
         subcommand.setName('single')
         .setDescription('Shows one profile.')
         .addStringOption(option =>
             option.setName('username')
             .setDescription('The Geometry Dash Username')
             .setRequired(true)
         )
    ),

async execute(interaction) {
    const guildID = interaction.guild.id;
    const subcommand = interaction.options.getSubcommand();

    try {
        if (subcommand === 'all') {
            const allProfileList = await userInfo.find({ guildID });

            if (allProfileList === 0) {
                return interaction.reply({
                    content: "You don't have any profiles added. Try ``/config addprofile`` to add one!",
                    ephemeral: true
                });
            }

            const list = allProfileList.map(entry => `**${entry.accountName}** - Player ID: ${entry.playerID}, Account ID: ${entry.accountID}`).join('\n');
            return interaction.reply({
                content: `**__Profiles I'm watching__** \n${list}`,
                ephemeral: true
            });
        }

         if (subcommand === 'single') {
             const accountName = interaction.options.getString('username');
             const acc = await userInfo.find({ guildID, accountName: { $regex: `^${accountName}$`, $options: 'i' } });

             if (acc.length === 0) {
                return interaction.reply({
                    content: `Profile not found.`,
                    ephemeral: true
                })
             }

             const usrCard = acc.map(entry => new EmbedBuilder() 
            .setAuthor({ name: `Notifier Profile` })
            .setTitle(`${entry.accountName}'s profile`)
            .setColor('#ffffff')
            .addFields(
                { name: 'Account ID', value: `${entry.accountID}`, inline: false },
                { name: 'Player ID', value: `${entry.playerID}`, inline: false }
            )
            .setTimestamp());

            return interaction.reply({
                embeds: usrCard,
                ephemeral: true
            })
         }

    } catch (err) {
        console.error('failed to list accounts', err)
        return interaction.reply({
            content: `I have failed! :D`,
            ephemeral: true
        });
    }
}
}
