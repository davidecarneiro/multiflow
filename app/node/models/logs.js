const mongoose = require('mongoose');

const logsSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  type: {
    type: String,
    required: false,
  },
  content: {
    type: String,
    required: true
  }
});

const Logs = mongoose.model('Logs', logsSchema);

module.exports = Logs;