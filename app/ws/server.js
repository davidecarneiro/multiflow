const http = require('http');
const WebSocket = require('ws');
const mongoose = require('mongoose');
const fs = require('fs');
const { KafkaClient, Producer } = require('kafka-node');

const server = http.createServer();
const wss = new WebSocket.Server({ server });

// Configurações do Kafka
const kafkaClient = new KafkaClient({ kafkaHost: 'kafka_server:9092' });
const producer = new Producer(kafkaClient);

producer.on('ready', () => {
  console.log('Kafka Producer is ready');
});

producer.on('error', (error) => {
  console.error('Error occurred with Kafka Producer:', error);
});

// Função para ler o arquivo CSV
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

async function sendMessagesToKafkaTopic(topic, messages, ws, progressData) {
  let totalGlobalLines = 0;
  let globalLinesSent = 0;

  for (const message of messages) {
    console.log("message.filePath: ", message.filePath);
    try {
      const lines = await readCSV(message.filePath); // Função para ler o arquivo CSV
      const totalLines = lines.length; // Total de linhas no arquivo CSV
      totalGlobalLines += totalLines;
      let linesSent = 0; // Inicialize o contador de linhas enviadas

      // Enviar o número de linhas para o cliente WebSocket
      const numberOfLinesMessage = { numberOfLines: totalLines };
      ws.send(JSON.stringify(numberOfLinesMessage));

      const updateProgress = () => {
        const percentage = (linesSent / totalLines) * 100; // Calcula a percentagem
        progressData[message._id] = {
          percentage: percentage.toFixed(2),
          streamId: message._id
        };

        globalLinesSent = Object.values(progressData).reduce((sum, stream) => sum + (stream.percentage / 100) * totalLines, 0);
        const globalPercentage = (globalLinesSent / totalGlobalLines) * 100;

        const aggregatedProgress = {
          streams: Object.values(progressData)/*,
          globalPercentage: globalPercentage.toFixed(2)*/
        };

        ws.send(JSON.stringify(aggregatedProgress)); // Envia o progresso agregado
      };

      if (message.allInSeconds) {
        console.log("message.allInSeconds: ", message.allInSeconds);
        const totalSeconds = parseFloat(message.allInSeconds);
        const interval = (totalSeconds * 1000) / totalLines; // Intervalo para enviar todas as linhas em totalSeconds
        for (const row of lines) {
          const data = { csv_data: row.trim() };
          const json_data = JSON.stringify(data);
          producer.send([{ topic: message.topic, messages: json_data }], (error) => {
            if (error) {
              console.error('Error sending message to Kafka:', error);
            }
          });
          linesSent++; // Incrementa o contador de linhas enviadas
          updateProgress();
          await new Promise(resolve => setTimeout(resolve, interval));
        }
      } else if (message.linesPerSecond) {
        console.log("message.linesPerSecond: ", message.linesPerSecond);
        const linesPerSecond = parseInt(message.linesPerSecond);
        const interval = 1000 / linesPerSecond; // Calcula o intervalo em milissegundos
        
        for (const row of lines) {
          const data = { csv_data: row.trim() };
          const json_data = JSON.stringify(data);
          console.log(json_data);
          producer.send([{ topic: message.topic, messages: json_data }], (error) => {
            if (error) {
              console.error('Error sending message to Kafka:', error);
            }
          });
        
          linesSent++; // Incrementa o contador de linhas enviadas
          updateProgress();
        
          // Aguarda pelo intervalo antes de enviar a próxima linha
          await new Promise(resolve => setTimeout(resolve, interval));
        }
      } else if (message.realTime) {
        console.log("message.realTime: ", message.realTime);
        for (const row of lines) {
          const data = { csv_data: row.trim() };
          const json_data = JSON.stringify(data);
          producer.send([{ topic: message.topic, messages: json_data }], (error) => {
            if (error) {
              console.error('Error sending message to Kafka:', error);
            }
          });
          linesSent++; // Incrementa o contador de linhas enviadas
          updateProgress();
        }
      }
    } catch (error) {
      console.error('Erro ao processar arquivo CSV:', error);
    }
  }
}

const url = 'mongodb://mongodb_server:27017/Multiflow';

mongoose.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'Erro de conexão ao MongoDB:'));
db.once('open', () => {
  console.log('Conexão com o MongoDB estabelecida com sucesso.');
});

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
  status: Boolean
});

const Stream = mongoose.model('Streams', streamSchema);

wss.on('connection', (ws) => {
  console.log('Client connected...');

  ws.on('message', async (id) => {
    console.log('Received ID:', id.toString('utf-8'));

    try {
      const streams = await Stream.find({ projectId: id.toString('utf-8') }).exec();
      if (streams.length === 0) {
        ws.send('Nenhuma stream encontrada para o projeto');
        return;
      }

      // Objeto para acumular o progresso das streams
      const progressData = {};

      for (const stream of streams) {
        console.log("stream: ", stream);
        if (stream) {
          sendMessagesToKafkaTopic('nome_do_topico_no_kafka', [stream], ws, progressData);
        } else {
          ws.send('Erro ao processar a stream');
        }
      }
    } catch (error) {
      console.error('Erro ao consultar o MongoDB:', error);
      ws.send('Erro ao consultar o MongoDB');
    }
  });

  // Handle disconnection
  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

const PORT = process.env.PORT || 8082;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
