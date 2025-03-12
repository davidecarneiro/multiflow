FROM node:18

# Diretório de trabalho dentro do contêiner
WORKDIR /usr/src/app

# Copie os arquivos do servidor WebSocket para o contêiner
COPY . .

# Instale as dependências do servidor WebSocket
RUN npm install

# Install dockerode
RUN npm install dockerode

# Exponha a porta em que o servidor WebSocket está ouvindo
EXPOSE 8082

# Comando para iniciar o servidor WebSocket
CMD [ "node", "server.js" ]