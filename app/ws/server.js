const http = require('http');
const WebSocket = require('ws');
const mongoose = require('mongoose');
const fs = require('fs');
const { Kafka } = require('kafkajs');

const server = http.createServer();
const wss = new WebSocket.Server({ server });

// Configurações do Kafka usando kafkajs
const kafka = new Kafka({
  clientId: 'multiflow-producer',
  brokers: ['kafka:9092']
});

// Inicializar produtor e admin
const producer = kafka.producer();
const admin = kafka.admin();

// Mapa para rastrear as streams ativas e seus intervalos
const activeStreams = new Map();

// Conectar ao Kafka
const connectKafka = async () => {
  try {
    await producer.connect();
    console.log('Kafka Producer is connected');
    
    await admin.connect();
    console.log('Kafka Admin is connected');
  } catch (error) {
    console.error('Error connecting to Kafka:', error);
    // Tentar reconectar após um atraso
    setTimeout(connectKafka, 5000);
  }
};

// Iniciar conexão com Kafka
connectKafka();

// Função para criar tópico Kafka
const createKafkaTopic = async (topic) => {
  try {
    console.log(`Creating Kafka topic: ${topic}`);
    
    await admin.createTopics({
      topics: [{
        topic,
        numPartitions: 1,
        replicationFactor: 1
      }],
      timeout: 5000, // 5 segundos de timeout
    });
    
    console.log(`Successfully created Kafka topic: ${topic}`);
    return true;
  } catch (error) {
    // Se o erro for que o tópico já existe, isso é ok
    if (error.message.includes('already exists')) {
      console.log(`Topic ${topic} already exists`);
      return true;
    }
    
    console.log(`Failed to create Kafka topic: ${topic}`, error);
    return false;
  }
};

// Função para deletar um tópico Kafka
const deleteKafkaTopic = async (topic) => {
  try {
    console.log(`Attempting to delete Kafka topic: ${topic}`);
    
    await admin.deleteTopics({
      topics: [topic],
      timeout: 5000, // 5 segundos de timeout
    });
    
    console.log(`Successfully deleted Kafka topic: ${topic}`);
    return true;
  } catch (error) {
    console.log(`Failed to delete Kafka topic: ${topic}`, error);
    return false;
  }
};

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

// Função para parar o envio de mensagens para uma stream específica
async function stopStream(streamId, shouldDeleteTopic = true) {
  if (activeStreams.has(streamId)) {
    const streamData = activeStreams.get(streamId);
    
    // Limpar todos os timeouts ou intervalos associados à stream
    if (streamData.timeouts) {
      streamData.timeouts.forEach(timeout => clearTimeout(timeout));
    }
    
    // Tentar deletar o tópico Kafka associado APENAS se shouldDeleteTopic for true
    if (shouldDeleteTopic && streamData.topic) {
      try {
        await deleteKafkaTopic(streamData.topic);
        console.log(`Kafka topic for stream ${streamId} deleted`);
      } catch (error) {
        console.error(`Failed to delete Kafka topic for stream ${streamId}:`, error);
        // Continuar mesmo se a deleção do tópico falhar
      }
    } else {
      console.log(`Stream ${streamId} stopped without deleting Kafka topic`);
    }
    
    // Remover a stream da lista de streams ativas
    activeStreams.delete(streamId);
    console.log(`Stream ${streamId} stopped`);
    return true;
  }
  return false;
}

// Função para parar todas as streams de um projeto
async function stopProjectStreams(projectId) {
  let stopped = false;
  const stoppedStreams = [];
  
  // Iterar por todas as streams ativas
  for (const [streamId, streamData] of activeStreams.entries()) {
    if (streamData.projectId === projectId) {
      // Quando paramos via botão, queremos excluir o tópico, então passamos true
      await stopStream(streamId, true);
      stoppedStreams.push(streamId);
      stopped = true;
    }
  }
  
  return { stopped, stoppedStreams };
}

async function sendMessagesToKafkaTopic(topic, messages, ws, progressData) {
  let totalGlobalLines = 0;
  let globalLinesSent = 0;

  for (const message of messages) {
    console.log("message.filePath: ", message.filePath);
    try {
      // Garantir que o tópico exista antes de enviar mensagens
      await createKafkaTopic(message.topic);
      
      const lines = await readCSV(message.filePath); // Função para ler o arquivo CSV
      const totalLines = lines.length; // Total de linhas no arquivo CSV
      totalGlobalLines += totalLines;
      let linesSent = 0; // Inicialize o contador de linhas enviadas

      // Enviar o número de linhas para o cliente WebSocket
      const numberOfLinesMessage = { numberOfLines: totalLines };
      ws.send(JSON.stringify(numberOfLinesMessage));

      // Inicializar o registro da stream ativa
      const streamData = {
        projectId: message.projectId,
        topic: message.topic,
        timeouts: [],
        ws: ws
      };
      activeStreams.set(message._id, streamData);

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

        // Verificar se o WebSocket ainda está aberto antes de enviar
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(aggregatedProgress)); // Envia o progresso agregado
        }
        
        // Se todas as linhas foram enviadas, marcamos o stream como concluído, mas SEM excluir o tópico
        if (linesSent >= totalLines) {
          console.log(`Stream ${message._id} completed naturally`);
          
          // Remover a stream da lista de streams ativas, mas sem excluir o tópico
          if (activeStreams.has(message._id)) {
            // Chamamos stopStream com false para não excluir o tópico
            stopStream(message._id, false);
          }
        }
      };

      if (message.allInSeconds) {
        console.log("message.allInSeconds: ", message.allInSeconds);
        const totalSeconds = parseFloat(message.allInSeconds);
        const interval = (totalSeconds * 1000) / totalLines; // Intervalo para enviar todas as linhas em totalSeconds
        
        for (let i = 0; i < lines.length; i++) {
          const row = lines[i];
          // Verificar se a stream ainda está ativa antes de continuar
          if (!activeStreams.has(message._id)) {
            console.log(`Stream ${message._id} was stopped, halting processing`);
            break;
          }
          
          const timeout = setTimeout(async () => {
            const data = { csv_data: row.trim() };
            const json_data = JSON.stringify(data);
            
            try {
              // Usando kafkajs para enviar mensagem
              await producer.send({
                topic: message.topic,
                messages: [{ value: json_data }]
              });
              
              linesSent++; // Incrementa o contador de linhas enviadas
              updateProgress();
              
              // Remover este timeout da lista após execução
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
          
          // Adicionar o timeout à lista de timeouts da stream
          activeStreams.get(message._id).timeouts.push(timeout);
        }
      } else if (message.linesPerSecond) {
        console.log("message.linesPerSecond: ", message.linesPerSecond);
        const linesPerSecond = parseInt(message.linesPerSecond);
        const interval = 1000 / linesPerSecond; // Calcula o intervalo em milissegundos
        
        for (let i = 0; i < lines.length; i++) {
          const row = lines[i];
          // Verificar se a stream ainda está ativa antes de continuar
          if (!activeStreams.has(message._id)) {
            console.log(`Stream ${message._id} was stopped, halting processing`);
            break;
          }
          
          const timeout = setTimeout(async () => {
            const data = { csv_data: row.trim() };
            const json_data = JSON.stringify(data);
            console.log(json_data);
            
            try {
              // Usando kafkajs para enviar mensagem
              await producer.send({
                topic: message.topic,
                messages: [{ value: json_data }]
              });
              
              linesSent++; // Incrementa o contador de linhas enviadas
              updateProgress();
              
              // Remover este timeout da lista após execução
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
          
          // Adicionar o timeout à lista de timeouts da stream
          activeStreams.get(message._id).timeouts.push(timeout);
        }
      } else if (message.realTime) {
        console.log("message.realTime: ", message.realTime);
        for (const row of lines) {
          // Verificar se a stream ainda está ativa antes de continuar
          if (!activeStreams.has(message._id)) {
            console.log(`Stream ${message._id} was stopped, halting processing`);
            break;
          }
          
          const data = { csv_data: row.trim() };
          const json_data = JSON.stringify(data);
          
          try {
            // Usando kafkajs para enviar mensagem
            await producer.send({
              topic: message.topic,
              messages: [{ value: json_data }]
            });
            
            linesSent++; // Incrementa o contador de linhas enviadas
            updateProgress();
          } catch (error) {
            console.error('Error sending message to Kafka:', error);
          }
        }
      }
    } catch (error) {
      console.error('Erro ao processar arquivo CSV:', error);
      // Enviar erro para o cliente
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ error: `Erro ao processar arquivo CSV: ${error.message}` }));
      }
    }
  }
}


const url = 'mongodb://mongodb:27017/Multiflow';

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

// Mapa para rastrear as conexões WebSocket por projectId
const projectConnections = new Map();

wss.on('connection', (ws) => {
  console.log('Client connected...');
  let clientProjectId = null;

  ws.on('message', async (message) => {
    const messageStr = message.toString('utf-8');
    console.log('Received message:', messageStr);
    
    // Verificar se a mensagem é um comando para parar um projeto
    if (messageStr.startsWith('STOP:')) {
      const projectId = messageStr.substring(5);
      console.log(`Received stop command for project ${projectId}`);
      
      // Parar todas as streams associadas ao projeto
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
      
      return;
    }
    
    // Tratar como ID do projeto para iniciar streams
    clientProjectId = messageStr;
    console.log('Received project ID:', clientProjectId);

    // Registrar esta conexão para o projectId
    if (projectConnections.has(clientProjectId)) {
      // Se já existe uma conexão para este projeto, feche-a
      const oldWs = projectConnections.get(clientProjectId);
      if (oldWs && oldWs.readyState === WebSocket.OPEN) {
        oldWs.close();
      }
    }
    projectConnections.set(clientProjectId, ws);

    try {
      const streams = await Stream.find({ projectId: clientProjectId }).exec();
      if (streams.length === 0) {
        ws.send(JSON.stringify({ error: 'Nenhuma stream encontrada para o projeto' }));
        return;
      }

      // Objeto para acumular o progresso das streams
      const progressData = {};

      for (const stream of streams) {
        console.log("stream: ", stream);
        if (stream) {
          sendMessagesToKafkaTopic(stream.topic, [stream], ws, progressData);
        } else {
          ws.send(JSON.stringify({ error: 'Erro ao processar a stream' }));
        }
      }
    } catch (error) {
      console.error('Erro ao consultar o MongoDB:', error);
      ws.send(JSON.stringify({ error: 'Erro ao consultar o MongoDB: ' + error.message }));
    }
  });

  // Handle disconnection
  ws.on('close', () => {
    console.log('Client disconnected');
    
    // Remover a conexão do mapa de conexões de projeto
    if (clientProjectId && projectConnections.get(clientProjectId) === ws) {
      projectConnections.delete(clientProjectId);
    }
    
    // Parar todas as streams associadas a esta conexão, mas sem excluir os tópicos
    for (const [streamId, streamData] of activeStreams.entries()) {
      if (streamData.ws === ws) {
        stopStream(streamId, false);  // Não excluir o tópico quando o cliente desconecta
      }
    }
  });
}); // Esta chave estava faltando para fechar o evento wss.on('connection')


// Função de limpeza para encerramento gracioso
const shutdown = async () => {
  try {
    // Desconectar clientes Kafka
    await producer.disconnect();
    await admin.disconnect();
    console.log('Kafka clients disconnected');
    
    // Fechar conexão com MongoDB
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  } catch (error) {
    console.error('Error during shutdown:', error);
  } finally {
    process.exit(0);
  }
};

// Registrar handlers para encerramento gracioso
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

const PORT = process.env.PORT || 8082;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
