const fs = require('fs');

// Verifique se os argumentos necessários foram fornecidos na linha de comando
if (process.argv.length < 4) {
    console.error('Uso: node generate-package.js nome-do-projeto descricao-do-projeto');
    process.exit(1);
}

// Extrair argumentos da linha de comando
const projectName = process.argv[2];
const projectDescription = process.argv[3];

// Objeto com as informações do package.json
const packageJsonData = {
    name: projectName,
    version: '1.0.0',
    description: projectDescription,
    dependencies: {
        'ws': '^8.3.0' // Dependência do pacote ws
    }
};

// Converter o objeto para uma string JSON
const packageJsonString = JSON.stringify(packageJsonData, null, 2); // 2 para identação de 2 espaços

// Escrever a string JSON em um arquivo package.json
fs.writeFileSync('package.json', packageJsonString, 'utf8');

console.log('Arquivo package.json criado com sucesso.');
