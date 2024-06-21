const mongoose = require('mongoose');

const customFieldSchema = new mongoose.Schema({
    name: { type: String, required: true },
    type: { type: String, required: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true }
});

const appSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: String,
    filePath: String,
    dateCreated: { type: Date, default: Date.now },
    dateUpdated: Date,
    customFields: [customFieldSchema]
});

const App = mongoose.model('App', appSchema);
module.exports = App;