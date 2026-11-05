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
    ),
    // .addSubcommand(subcommand =>
    //     subcommand.setName('single')
    //     .setDescription('Shows one profile.')
    //     .addStringOption(option =>
    //         option.setName('username')
    //         .setDescription('The Geometry Dash Username')
    //     )
    //),

async execute(interaction) {
    const guildID = interaction.guild.id;
    const subcommand = interaction.options.getSubcommand();

    try {
        if (subcommand === 'all') {
            const allProfileList = userInfo.find({ guildID });

            if (!allProfileList) {
                return interaction.reply({
                    content: "You don't have any profiles added. Try ``/config addprofile`` to add one!",
                    ephemeral: true
                });
            }

            const list = (await allProfileList).map(entry => `**${entry.accountName}** - Player ID: ${entry.playerID}, Account ID: ${entry.accountID}`).join('\n');
            return interaction.reply({
                content: `**__Profiles I'm watching__** \n${list}`,
                ephemeral: true
            });
        }

        // if (subcommand === 'single') {
        //     const accName = interaction.options.getString('username');
        //     const acc = userInfo.find({ guildID, accountName });
        // }

    } catch (err) {
        console.error('failed to list accounts', err)
        return interaction.reply({
            content: `I have failed! :D`,
            ephemeral: true
        });
    }
}
}