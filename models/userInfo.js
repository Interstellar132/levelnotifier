const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    guildID: { type: String, required: true },
    playerID: { type: String, required: true },
    accountID: { type: String, required: true }
});

module.exports = mongoose.model('userInfo', userSchema);