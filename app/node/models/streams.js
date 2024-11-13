const mongoose = require('mongoose');

const streamsSchema = new mongoose.Schema({
    projectId: {
        type: String,
        required: true,
    },
    topic: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: false,
    },
    dataSourceType: {
        type: String, // The type of data source: saved, sql, file...
        required: true,
    },
    dataSourceId: {
        type: String, // The data source id (filled only if selected)
        required: false,
    },          
    filePath: {
        type: String, // For file data source
        required: false,
    },
    connectionString: {
        type: String, // For SQL data source
        required: false, 
    },
    playbackConfigType: {
        type: String, // The type of playback config: lps, ais ou rt
        required: true,
    },
    linesPerSecond: {
        type: Number, // For lps
        required: false,
        default: null
    },
    allInSeconds: {
        type: Number, // For ais
        required: false, 
        default: null
    },
    realTime: {
        type: Boolean, // For real time
        required: false,
        default: false
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
    },
    dateLastStarted: {
        type: Date,
        required: false,
        default: null
    },
    status: {
        type: Boolean,
        required: true,
        default: false // Default status is false (not running)
    }
});

const Streams = mongoose.model('Streams', streamsSchema);

module.exports = Streams;