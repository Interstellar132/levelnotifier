const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('view command info'),

async execute(interaction) {
    const helpCard = new EmbedBuilder()
    .setAuthor({ name: `Help` })
    .setTitle('__Info__')
    .setThumbnail('https://i.ibb.co/tTPTSssr/questiomark.png')
    .setDescription('Sends a notification in your discord server that lets everyone know you finally made and uploaded a new level! (pretty neat i think)')
    .setImage('https://cdn.discordapp.com/attachments/740038789812191292/1569517642925219891/levelnotifier.gif?ex=6af3beb6&is=6af26d36&hm=6f58309b378ac3fefb07d7fc06321d82a49cf45548c09ee666c8abb520e13758&')
    .setColor('#ffc400')
    .addFields(
        { name: '**Config**', value: "----------------", inline: false },
        { name: '``channel``', value: "Sets the channel for the message.", inline: true },
        { name: '``role``', value: "Sets the role for the announcement.", inline: true },
        { name: '``message``', value: "Sets a custom message.", inline: true },
        { name: 'view', value: "View the current configuration for this server.", inline: true },
        { name: 'addprofile', value: "Adds a Geometry Dash profile", inline: true },
        { name: 'removeprofile', value: "Removes a Geometry Dash profile.", inline: true },
        { name: '**Users**', value: "----------------", inline: false },
        { name: '``/listusers all``', value: "Lists every profile for a server", inline: true },
        { name: '``/listusers {user}``', value: "Lists a single profile.", inline: true },
        { name: '', value: "", inline: false },
        { name: '', value: "", inline: false },
        { name: '', value: 'Below shows how to add a user to the bot.', inline: false }
    )
    .setFooter({
        text: `Contact Interstellar for any questions or suggestions: interstellar_ca`
    })
    .setTimestamp();

    const inviteRow = new ActionRowBuilder()
    .addComponents(
        new ButtonBuilder()
            .setLabel('Add to Server')
            .setStyle(ButtonStyle.Link)
            .setURL('https://discord.com/oauth2/authorize?client_id=1561229093184475176&permissions=8&integration_type=0&scope=bot')
    );

    try {
        await interaction.reply({
            embeds: [helpCard],
            components: [inviteRow],
            ephemeral: true
        })
    } catch (err) {
        console.error('how did this POSSIBLY fail???', err);
        return interaction.reply({
            content: `HOW did you mess this up?! (thanks interstellar very cool)`,
            ephemeral: true
        })
    }
}

}
