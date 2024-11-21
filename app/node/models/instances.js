const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const instanceSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: String,
    appId: { type: String, required: true }, // Stores a reference to the parent App using its _id
    pid: { type: Number }, // Stores a reference to the pid (process id) on faust
    port: { type: Number, required: true, unique: true }, // Refers to the port used to run at Faust and must be unique
    dateCreated: { type: Date, default: Date.now },
    dateLastStarted: { type: Date },
    status: { type: Boolean, required: true, default: false },
    dateUpdated: Date,
    streamTopic: String, // Stream associated to the instance
    customFields: [{
        customFieldId: { type: String, required: true },
        value: { type: mongoose.Schema.Types.Mixed, required: false, default: null }
    }] // Stores instances-specific values (value) for each custom field defined in the App
});

const Instance = mongoose.model('Instance', instanceSchema);
module.exports = Instance;