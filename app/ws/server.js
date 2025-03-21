// ----------------------
// Required Modules & Initial Setup
// ----------------------
const http = require('http');
const WebSocket = require('ws');
const mongoose = require('mongoose');
const fs = require('fs');
const { Kafka } = require('kafkajs');
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
const kafka = new Kafka({
  clientId: 'multiflow-producer',
  brokers: ['kafka:9092']
});

// Initializer
const producer = kafka.producer();
const admin = kafka.admin();

const activeStreams = new Map();

const connectKafka = async () => {
  try {
    await producer.connect();
    console.log('Kafka Producer is connected');
    
    await admin.connect();
    console.log('Kafka Admin is connected');
  } catch (error) {
    console.error('Error connecting to Kafka:', error);
    setTimeout(connectKafka, 5000);
  }
};

connectKafka();

const createKafkaTopic = async (topic) => {
  try {
    console.log(`Creating Kafka topic: ${topic}`);
    
    await admin.createTopics({
      topics: [{
        topic,
        numPartitions: 1,
        replicationFactor: 1
      }],
      timeout: 5000, 
    });
    
    console.log(`Successfully created Kafka topic: ${topic}`);
    return true;
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log(`Topic ${topic} already exists`);
      return true;
    }
    
    console.log(`Failed to create Kafka topic: ${topic}`, error);
    return false;
  }
};

const deleteKafkaTopic = async (topic) => {
  try {
    console.log(`Attempting to delete Kafka topic: ${topic}`);
    
    await admin.deleteTopics({
      topics: [topic],
      timeout: 5000, // 5 seconds timeout
    });
    
    console.log(`Successfully deleted Kafka topic: ${topic}`);
    return true;
  } catch (error) {
    console.log(`Failed to delete Kafka topic: ${topic}`, error);
    return false;
  }
};

// ----------------------
// MongoDB Connection & Schema Definition
// ----------------------
const mongoUrl = 'mongodb://mongodb:27017/Multiflow';
mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });

const db = mongoose.connection;

// Handle MongoDB connection errors and successful connection
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('MongoDB connection successfully established.');
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

const projectConnections = new Map();

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

async function stopStream(streamId, shouldDeleteTopic = true) {
  if (activeStreams.has(streamId)) {
    const streamData = activeStreams.get(streamId);
    
    if (streamData.timeouts) {
      streamData.timeouts.forEach(timeout => clearTimeout(timeout));
    }
    
    if (shouldDeleteTopic && streamData.topic) {
      try {
        await deleteKafkaTopic(streamData.topic);
        console.log(`Kafka topic for stream ${streamId} deleted`);
      } catch (error) {
        console.error(`Failed to delete Kafka topic for stream ${streamId}:`, error);
      }
    } else {
      console.log(`Stream ${streamId} stopped without deleting Kafka topic`);
    }
    
    activeStreams.delete(streamId);
    console.log(`Stream ${streamId} stopped`);
    return true;
  }
  return false;
}

async function stopProjectStreams(projectId) {
  let stopped = false;
  const stoppedStreams = [];
  
  for (const [streamId, streamData] of activeStreams.entries()) {
    if (streamData.projectId === projectId) {
      await stopStream(streamId, true);
      stoppedStreams.push(streamId);
      stopped = true;
    }
  }
  
  return { stopped, stoppedStreams };
}

/**
 * Sends messages from a CSV file to a Kafka topic based on the stream configuration.
 * @param {string} topic - Kafka topic to send messages to.
 * @param {Array<Object>} messages - Array of stream objects containing message details.
 * @param {WebSocket} ws - WebSocket instance for sending progress updates.
 * @param {Object} progressData - Object to track progress for each stream.
 */
async function sendMessagesToKafkaTopic(topic, messages, ws, progressData) {
  let totalGlobalLines = 0;
  let globalLinesSent = 0;

  for (const message of messages) {
    console.log("message.filePath: ", message.filePath);
    try {
      await createKafkaTopic(message.topic);
      
      const lines = await readCSV(message.filePath);
      const totalLines = lines.length;
      totalGlobalLines += totalLines;
      let linesSent = 0;

      const numberOfLinesMessage = { numberOfLines: totalLines };
      ws.send(JSON.stringify(numberOfLinesMessage));

      const streamData = {
        projectId: message.projectId,
        topic: message.topic,
        timeouts: [],
        ws: ws
      };
      activeStreams.set(message._id, streamData);

      const updateProgress = () => {
        const percentage = (linesSent / totalLines) * 100;
        progressData[message._id] = {
          percentage: percentage.toFixed(2),
          streamId: message._id
        };

        globalLinesSent = Object.values(progressData).reduce(
          (sum, stream) => sum + (stream.percentage / 100) * totalLines,
          0
        );
        
        const aggregatedProgress = {
          type: 'progress-feedback',
          streams: Object.values(progressData)
        };

        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(aggregatedProgress));
        }
        
        if (linesSent >= totalLines) {
          console.log(`Stream ${message._id} completed naturally`);
          
          if (activeStreams.has(message._id)) {
            stopStream(message._id, false);
          }
        }
      };

      if (message.allInSeconds) {
        console.log("message.allInSeconds: ", message.allInSeconds);
        const totalSeconds = parseFloat(message.allInSeconds);
        const interval = (totalSeconds * 1000) / totalLines;
        
        for (let i = 0; i < lines.length; i++) {
          const row = lines[i];
          if (!activeStreams.has(message._id)) {
            console.log(`Stream ${message._id} was stopped, halting processing`);
            break;
          }
          
          const timeout = setTimeout(async () => {
            const data = { csv_data: row.trim() };
            const json_data = JSON.stringify(data);
            
            try {
              await producer.send({
                topic: message.topic,
                messages: [{ value: json_data }]
              });
              
              linesSent++;
              updateProgress();
              
              const streamData = activeStreams.get(message._id);
              if (streamData) {
                const index = streamData.timeouts.indexOf(timeout);
                if (index > -1) {
                  streamData.timeouts.splice(index, 1);
                }
              }
            } catch (error) {
              console.error('Error sending message to Kafka:', error);
            }
          }, i * interval);
          
          activeStreams.get(message._id).timeouts.push(timeout);
        }
      } else if (message.linesPerSecond) {
        console.log("message.linesPerSecond: ", message.linesPerSecond);
        const linesPerSecond = parseInt(message.linesPerSecond);
        const interval = 1000 / linesPerSecond;
        
        for (let i = 0; i < lines.length; i++) {
          const row = lines[i];
          if (!activeStreams.has(message._id)) {
            console.log(`Stream ${message._id} was stopped, halting processing`);
            break;
          }
          
          const timeout = setTimeout(async () => {
            const data = { csv_data: row.trim() };
            const json_data = JSON.stringify(data);
            
            try {
              await producer.send({
                topic: message.topic,
                messages: [{ value: json_data }]
              });
              
              linesSent++;
              updateProgress();
              
              const streamData = activeStreams.get(message._id);
              if (streamData) {
                const index = streamData.timeouts.indexOf(timeout);
                if (index > -1) {
                  streamData.timeouts.splice(index, 1);
                }
              }
            } catch (error) {
              console.error('Error sending message to Kafka:', error);
            }
          }, i * interval);
          
          activeStreams.get(message._id).timeouts.push(timeout);
        }
      } else if (message.realTime) {
        console.log("message.realTime: ", message.realTime);
        for (const row of lines) {
          if (!activeStreams.has(message._id)) {
            console.log(`Stream ${message._id} was stopped, halting processing`);
            break;
          }
          
          const data = { csv_data: row.trim() };
          const json_data = JSON.stringify(data);
          
          try {
            await producer.send({
              topic: message.topic,
              messages: [{ value: json_data }]
            });
            
            linesSent++;
            updateProgress();
          } catch (error) {
            console.error('Error sending message to Kafka:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error processing CSV file:', error);
      // Send error to client
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ error: `Error processing CSV file: ${error.message}` }));
      }
    }
  }
}

// ----------------------
// WebSocket Event Handlers
// ----------------------

wss.on('connection', (ws) => {
  console.log('Client connected...');
  let clientProjectId = null;
  let logStream = null;

  /**
   * Handles incoming messages from the WebSocket client.
   */
  ws.on('message', async (message) => {
    const messageStr = message.toString('utf-8');
    console.log('Received message:', messageStr);
    
    // Start streaming Docker logs
    if (messageStr === 'start-logs') {
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
    else if (messageStr === 'clear-logs') {
      logMessages = [];
      ws.send(JSON.stringify({ type: 'docker-logs-cleared' }));
      console.log('Logs cleared.');
    }
    // Check if the message is a command to stop a project
    else if (messageStr.startsWith('STOP:')) {
      const projectId = messageStr.substring(5);
      console.log(`Received stop command for project ${projectId}`);
      
      // Stop all streams associated with the project
      const result = await stopProjectStreams(projectId);
      
      if (result.stopped) {
        ws.send(JSON.stringify({ 
          status: 'stopped', 
          projectId,
          stoppedStreams: result.stoppedStreams
        }));
      } else {
        ws.send(JSON.stringify({ status: 'not_found', projectId }));
      }
    }
    // Handle project ID requests for progress feedback
    else {
      clientProjectId = messageStr;
      console.log('Received project ID:', clientProjectId);

      if (projectConnections.has(clientProjectId)) {
        // If there's already a connection for this project, close it
        const oldWs = projectConnections.get(clientProjectId);
        if (oldWs && oldWs.readyState === WebSocket.OPEN) {
          oldWs.close();
        }
      }
      projectConnections.set(clientProjectId, ws);

      try {
        const streams = await Stream.find({ projectId: clientProjectId }).exec();
        if (streams.length === 0) {
          ws.send(JSON.stringify({ type: 'error', message: 'No streams found for the project' }));
          return;
        }

        const progressData = {};

        for (const stream of streams) {
          console.log("stream: ", stream);
          if (stream) {
            sendMessagesToKafkaTopic(stream.topic, [stream], ws, progressData);
          } else {
            ws.send(JSON.stringify({ type: 'error', message: 'Error processing the stream' }));
          }
        }
      } catch (error) {
        console.error('Error querying MongoDB:', error);
        ws.send(JSON.stringify({ type: 'error', message: 'Error querying MongoDB: ' + error.message }));
      }
    }
  });

  /**
   * Handles client disconnection.
   */
  ws.on('close', () => {
    console.log('Client disconnected');
    
    if (clientProjectId && projectConnections.get(clientProjectId) === ws) {
      projectConnections.delete(clientProjectId);
    }
    
    for (const [streamId, streamData] of activeStreams.entries()) {
      if (streamData.ws === ws) {
        stopStream(streamId, false);  // Don't delete the topic when the client disconnects
      }
    }
    
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

const shutdown = async () => {
  try {
    // Disconnect Kafka clients
    await producer.disconnect();
    await admin.disconnect();
    console.log('Kafka clients disconnected');
    
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  } catch (error) {
    console.error('Error during shutdown:', error);
  } finally {
    process.exit(0);
  }
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// ----------------------
// Server Initialization
// ----------------------
const PORT = process.env.PORT || 8082;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
