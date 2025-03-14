// ----------------------
// Required Modules & Initial Setup
// ----------------------
const http = require('http');
const WebSocket = require('ws');
const mongoose = require('mongoose');
const fs = require('fs');
const { KafkaClient, Producer } = require('kafka-node');
const Docker = require('dockerode');
const stream = require('stream');

// Initialize Docker client for interacting with Docker containers
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

// Create an HTTP server and a WebSocket server
const server = http.createServer();
const wss = new WebSocket.Server({ server });

// Limit the number of log messages stored in memory
const MAX_LOG_MESSAGES = 500;
let logMessages = [];

// ----------------------
// Kafka Configuration
// ----------------------
// Initialize Kafka client and producer
const kafkaClient = new KafkaClient({ kafkaHost: 'kafka_server:9092' });
const producer = new Producer(kafkaClient);

// Handle Kafka producer readiness and errors
producer.on('ready', () => {
  console.log('Kafka Producer is ready');
});
producer.on('error', (error) => {
  console.error('Error occurred with Kafka Producer:', error);
});

// ----------------------
// MongoDB Connection & Schema Definition
// ----------------------
const mongoUrl = 'mongodb://mongodb_server:27017/Multiflow';
mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });

const db = mongoose.connection;

// Handle MongoDB connection errors and successful connection
db.on('error', console.error.bind(console, 'Error connecting to MongoDB:'));
db.once('open', () => {
  console.log('Successfully connected to MongoDB.');
});

// Define the schema for the "Streams" collection
const streamSchema = new mongoose.Schema({
  _id: String,
  projectId: String,
  topic: String,
  description: String,
  dataSourceType: String,
  dataSourceId: String,
  filePath: String,
  connectionString: String,
  playbackConfigType: String,
  linesPerSecond: Number,
  allInSeconds: Number,
  realTime: Boolean,
  dateCreated: Date,
  dateUpdated: Date,
  dateLastStarted: Date,
  status: Boolean,
});

// Create a Mongoose model for the "Streams" collection
const Stream = mongoose.model('Streams', streamSchema);

// ----------------------
// Helper Functions
// ----------------------

/**
 * Reads a CSV file and returns its lines as an array.
 * @param {string} filePath - Path to the CSV file.
 * @returns {Promise<string[]>} - Array of lines from the CSV file.
 */
function readCSV(filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf8', (error, data) => {
      if (error) {
        reject(error);
      } else {
        const lines = data.split('\n');
        resolve(lines);
      }
    });
  });
}

/**
 * Sends messages from a CSV file to a Kafka topic based on the stream configuration.
 * @param {Array<Object>} messages - Array of stream objects containing message details.
 * @param {WebSocket} ws - WebSocket instance for sending progress updates.
 * @param {Object} progressData - Object to track progress for each stream.
 */
async function sendMessagesToKafkaTopic(messages, ws, progressData) {
  let totalGlobalLines = 0;
  let globalLinesSent = 0;

  for (const message of messages) {
    try {
      // Read the CSV file and calculate total lines
      const lines = await readCSV(message.filePath);
      const totalLines = lines.length;
      totalGlobalLines += totalLines;
      let linesSent = 0;

      /**
       * Updates the progress for the current stream and sends aggregated progress to the client.
       */
      const updateProgress = () => {
        const percentage = (linesSent / totalLines) * 100;
        progressData[message._id] = {
          percentage: percentage.toFixed(2),
          streamId: message._id,
        };
        globalLinesSent = Object.values(progressData).reduce(
          (sum, stream) => sum + (stream.percentage / 100) * totalLines,
          0
        );
        const aggregatedProgress = {
          type: 'progress-feedback',
          streams: Object.values(progressData),
        };
        ws.send(JSON.stringify(aggregatedProgress));
      };

      // Send messages to Kafka based on the stream's playback configuration
      if (message.allInSeconds) {
        const totalSeconds = parseFloat(message.allInSeconds);
        const interval = (totalSeconds * 1000) / totalLines;
        for (const row of lines) {
          sendToKafka(message.topic, row.trim());
          linesSent++;
          updateProgress();
          await new Promise((resolve) => setTimeout(resolve, interval));
        }
      } else if (message.linesPerSecond) {
        const linesPerSecond = parseInt(message.linesPerSecond);
        const interval = 1000 / linesPerSecond;
        for (const row of lines) {
          sendToKafka(message.topic, row.trim());
          linesSent++;
          updateProgress();
          await new Promise((resolve) => setTimeout(resolve, interval));
        }
      } else if (message.realTime) {
        for (const row of lines) {
          sendToKafka(message.topic, row.trim());
          linesSent++;
          updateProgress();
        }
      }
    } catch (error) {
      console.error('Error processing CSV file:', error);
    }
  }

  /**
   * Sends a single message to the specified Kafka topic.
   * @param {string} topic - Kafka topic name.
   * @param {string} message - Message to send.
   */
  function sendToKafka(topic, message) {
    const data = { csv_data: message };
    const json_data = JSON.stringify(data);
    producer.send([{ topic, messages: json_data }], (error) => {
      if (error) console.error('Error sending message to Kafka:', error);
    });
  }
}

// ----------------------
// WebSocket Event Handlers
// ----------------------

wss.on('connection', (ws) => {
  console.log('Client connected...');
  let logStream = null;

  /**
   * Handles incoming messages from the WebSocket client.
   */
  ws.on('message', async (message) => {
    const msg = message.toString();

    // Start streaming Docker logs
    if (msg === 'start-logs') {
      console.log('Starting docker logs streaming...');
      try {
        logStream = await docker.getContainer('faust_server').logs({
          follow: true,
          stdout: true,
          stderr: true,
        });

        // Create PassThrough streams for stdout and stderr
        const stdoutStream = new stream.PassThrough();
        const stderrStream = new stream.PassThrough();

        // Demux the raw log stream to split out stdout and stderr without headers
        docker.modem.demuxStream(logStream, stdoutStream, stderrStream);

        // Function to handle each log chunk
        const handleLog = (data) => {
          const logMessage = data.toString();
          logMessages.push(logMessage);
          if (logMessages.length > MAX_LOG_MESSAGES) {
            logMessages.shift();
          }
          ws.send(JSON.stringify({ type: 'docker-logs', log: logMessage }));
        };

        stdoutStream.on('data', handleLog);
        stderrStream.on('data', handleLog);
      } catch (error) {
        console.error('Error starting docker logs:', error);
        ws.send(JSON.stringify({ type: 'docker-logs-error', log: 'Failed to start logs.' }));
      }
    }
    // Clear stored logs
    else if (msg === 'clear-logs') {
      logMessages = [];
      ws.send(JSON.stringify({ type: 'docker-logs-cleared' }));
      console.log('Logs cleared.');
    }
    // Handle project ID requests for progress feedback
    else {
      const projectId = msg;
      console.log('Received request for progress feedback for project:', projectId);

      try {
        const streams = await Stream.find({ projectId }).exec();
        if (streams.length === 0) {
          ws.send(JSON.stringify({ type: 'error', message: 'No stream found for the project' }));
          return;
        }

        const progressData = {};
        for (const stream of streams) {
          sendMessagesToKafkaTopic([stream], ws, progressData);
        }
      } catch (error) {
        console.error('Error querying MongoDB:', error);
        ws.send(JSON.stringify({ type: 'error', message: 'Error querying MongoDB' }));
      }
    }
  });

  /**
   * Handles client disconnection.
   */
  ws.on('close', () => {
    console.log('Client disconnected');
    if (logStream) {
      logStream.destroy();
    }
  });

  /**
   * Handles WebSocket errors.
   */
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// ----------------------
// Server Initialization
// ----------------------
const PORT = process.env.PORT || 8082;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});