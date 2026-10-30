const mongoose = require('mongoose');

const trackerSchema = new mongoose.Schema({
    playerID: { type: String, required: true, unique: true },
    lastLvlID: { type: String, default: null }
});

module.exports = mongoose.model('lvlTracker', trackerSchema);