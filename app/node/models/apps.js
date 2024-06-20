const mongoose = require('mongoose');

const appsSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: false,
    },
    filePath: {
        type: String,
        required: false,
    },
    dateCreated: {
        type: Date,
        required: true,
        default: Date.now
    },
    dateUpdated: {
        type: Date,
        required: false,
        default: null
    }
});

const Apps = mongoose.model('Apps', appsSchema);

module.exports = Apps;