# Use uma imagem base como Node.js
FROM openjdk:11-jre-slim

# Instale o Node.js
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Baixe e instale o Kafka CLI
RUN apt-get update && apt-get install -y wget && \
    wget https://archive.apache.org/dist/kafka/3.7.0/kafka-3.7.0-src.tgz && \
    tar -xvf kafka-3.7.0-src.tgz && \
    mv kafka-3.7.0-src /usr/local/kafka && \
    rm kafka-3.7.0-src.tgz && \
    apt-get remove -y wget && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Adicione o Kafka CLI ao PATH
ENV PATH="/usr/local/kafka/bin:${PATH}"

# Defina o diretório de trabalho
WORKDIR /usr/src/app

# Copie os arquivos do projeto para o container
COPY package*.json ./
RUN npm install
COPY . .

# Exponha a porta da aplicação
EXPOSE 3000

# Comando padrão para rodar a aplicação
CMD ["node", "index.js"]
