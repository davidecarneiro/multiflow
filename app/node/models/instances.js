const mongoose = require('mongoose');

const customFieldSchema = new mongoose.Schema({
    name: { type: String, required: true },
    type: { type: String, required: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true }
});

const instanceSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: String,
    appId: { type: String },
    dateCreated: { type: Date, default: Date.now },
    dateLastStarted: { type: Date },
    status: { type: Boolean, required: true, default: false },
    dateUpdated: Date,
    customFields: [customFieldSchema]
});

const Instance = mongoose.model('Instance', instanceSchema);
module.exports = Instance;