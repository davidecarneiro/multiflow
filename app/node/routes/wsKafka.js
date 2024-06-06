const WebSocket = require('ws');
const { KafkaClient, Producer } = require('kafka-node');

// Kafka broker configuration
const kafkaHost = 'localhost:9092'; // Kafka broker address

// Create Kafka client
const kafkaClient = new KafkaClient({ kafkaHost });

// Create Kafka producer
const kafkaProducer = new Producer(kafkaClient);

// Handle Kafka producer errors
kafkaProducer.on('error', (error) => {
    console.error('Kafka producer error:', error);
});

// WebSocket server setup
const wss = new WebSocket.Server({ port: 8080 });

// Function to send message to Kafka topic
function sendMessageToKafka(streamId) {
    const payloads = [{
        topic: 'your_topic_name', // Replace with your Kafka topic
        messages: [streamId]
    }];
    kafkaProducer.send(payloads, (error, data) => {
        if (error) {
            console.error('Error sending message to Kafka:', error);
        } else {
            console.log('Message sent to Kafka:', data);
        }
    });
}

// WebSocket server logic
wss.on('connection', (ws) => {
    console.log('Client connected');

    ws.on('message', (message) => {
        console.log(`Received message: ${message}`);
        // Assuming message contains stream ID, send it to Kafka
        sendMessageToKafka(message);
    });
});
