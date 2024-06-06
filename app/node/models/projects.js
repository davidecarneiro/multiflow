const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
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
  },
  streams: [{ type: Schema.Types.ObjectId, ref: 'Streams' }] // Reference to Streams model
});

const Project = mongoose.model('Project', projectSchema);

module.exports = Project;
