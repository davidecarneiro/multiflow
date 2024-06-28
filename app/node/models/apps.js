const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const customFieldSchema = new mongoose.Schema({
    name: { type: String, required: true },
    type: { type: String, required: true }
});

const appSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: String,
    filePath: String,
    dateCreated: { type: Date, default: Date.now },
    dateLastStarted: { type: Date },
    status: { type: Boolean, required: true, default: false },
    dateUpdated: Date,
    customFields: [customFieldSchema],
    instances: [{ type: Schema.Types.ObjectId, ref: 'Instance'}]
});

const App = mongoose.model('App', appSchema);
module.exports = App;