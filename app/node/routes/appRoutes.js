const express = require('express');
const router = express.Router();
const Logs = require('../models/logs');
//
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Endpoint to list Python files in /app directory
router.get('/list-python-files', (req, res) => {

    try {
    // Comando para listar arquivos Python no diretório /app do contêiner Docker
    const command = 'ls -l /usr/src/appfaust';

    console.log("list-python-files");

    exec(command, (error, stdout, stderr) => {

        console.log("list-python-files : exec");

        if (error) {
            console.error(`Erro ao listar arquivos Python: ${error.message}`);
            console.log("error.message : ", error.message );
            return res.status(500).send({ error: 'Erro ao listar arquivos Python' });
        }
        if (stderr) {
            console.error(`Erro ao listar arquivos Python: ${stderr}`);
            console.log("stderr : ", stderr );
            return res.status(500).send({ error: 'Erro ao listar arquivos Python' });
        }

        // Convertendo a saída em uma matriz de nomes de arquivos
        const pythonFiles = stdout.trim().split('\n');
        
        // Filtrando apenas os arquivos Python
        const pythonFilesFiltered = pythonFiles.filter(file => path.extname(file) === '.py');
        
        res.json(pythonFilesFiltered);
    });

    } catch (err) {
        // Log the error
        console.log("err.message : ", err.message );
        res.status(400).json({ message: err.message });
    }
});

// Endpoint to start Faust application
router.post('/start-faust', (req, res) => {
    exec('faust -A my_app worker -l info', (error, stdout, stderr) => {
        if (error) {
            console.error(`Erro ao iniciar a aplicação Faust: ${error.message}`);
            return res.status(500).send({ error: 'Erro ao iniciar a aplicação Faust' });
        }
        if (stderr) {
            console.error(`Erro ao iniciar a aplicação Faust: ${stderr}`);
            return res.status(500).send({ error: 'Erro ao iniciar a aplicação Faust' });
        }
        console.log(`Aplicação Faust iniciada: ${stdout}`);
        res.send({ message: 'Aplicação Faust iniciada com sucesso' });
    });
});



//------


module.exports = router;