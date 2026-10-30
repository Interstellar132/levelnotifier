const mongoose = require('mongoose');

const configSchema = new mongoose.Schema({
    guildID: { type: String, required: true, unique: true },
    channelName: { type: String, required: true },
    channelID: { type: String, required: true },
    roleID: { type: String, default: null },
    message: { type: String, required: true }
});

module.exports = mongoose.model('guildConfig', configSchema);