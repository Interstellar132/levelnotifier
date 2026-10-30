const mongoose = require('mongoose');

module.exports = async function connectDB() {
    try {
        await mongoose.connect(process.env.mongo_uri, {
            // useNewUrlParser: true,
            // useUnifiedTopology: true
        });
        console.log('connected to database');
    } catch (err) {
        console.error('failed to connect to the db', err);
        process.exit(1);
    }
}