const mongoose = require('mongoose');

const dataSourcesSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: false,
    },
    dataSourceType: {
        type: String, // e.g., 'file', 'sql'
        required: true,
        default: 'file'
    },
    filePath: {
        type: String, // For file data source
        required: false,
    },
    connectionString: {
        type: String,
        required: false, // For SQL data source
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

const DataSources = mongoose.model('DataSources', dataSourcesSchema);

module.exports = DataSources;