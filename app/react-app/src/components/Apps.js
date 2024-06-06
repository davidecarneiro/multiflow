/*import React from 'react';
import '../App.css';

function Apps() {
  return (
    <div className='container col-12'>
      <div className='panel-content mt-2'>
        <h2 className='page-title'>Apps 2</h2>
      </div>
    </div>
  );
}

export default Apps;*/

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../App.css';

/*function Apps() {
    const [pythonFiles, setPythonFiles] = useState([]);
    const [startStatus, setStartStatus] = useState('');

    useEffect(() => {

      //export FLASK_APP=server.py
    //flask run --port=5010 --host=0.0.0.0 

        axios.get('http://localhost:5010/list-python-files')
            .then(response => {
                setPythonFiles(response.data);
            })
            .catch(error => {
                console.error('Erro ao obter arquivos Python:', error);
            });
    }, []);

    const handleStartFaust = () => {
        axios.post('http://localhost:5010/start-faust')
            .then(response => {
                setStartStatus(response.data.message);
            })
            .catch(error => {
                console.error('Erro ao iniciar a aplicação Faust:', error);
            });
    };

    return (
        <div className='container col-12'>
            <div className='panel-content mt-2'>
                <h2 className='page-title'>Apps</h2>
                <ul>
                    {pythonFiles.map((file, index) => (
                        <li key={index}>{file}</li>
                    ))}
                </ul>
                <div>
                    <input type='text' placeholder='Comando Faust' />
                    <button onClick={handleStartFaust}>Iniciar Faust</button>
                </div>
                {startStatus && <p>{startStatus}</p>}
            </div>
        </div>
    );
}*/

function Apps() {
    const [pythonFiles, setPythonFiles] = useState([]);
    const [startStatus, setStartStatus] = useState('');

    useEffect(() => {
        axios.get('http://localhost:5010/list-python-files')
            .then(response => {
                setPythonFiles(response.data);
            })
            .catch(error => {
                console.error('Erro ao obter arquivos Python:', error);
            });
    }, []);

    const handleStartFaust = (file) => {
        const command = `faust -A ${file} worker`;
        axios.post('http://localhost:5010/start-faust', { command })
            .then(response => {
                setStartStatus(response.data.message);
            })
            .catch(error => {
                console.error('Erro ao iniciar a aplicação Faust:', error);
            });
    };

    return (
        <div className='container col-12'>
            <div className='panel-content mt-2'>
                <h2 className='page-title'>Apps</h2>
                <ul>
                    {pythonFiles.map((file, index) => (
                        <li key={index}>
                            {file}
                            <button onClick={() => handleStartFaust(file)}>Iniciar Faust</button>
                        </li>
                    ))}
                </ul>
                {startStatus && <p>{startStatus}</p>}
            </div>
        </div>
    );
}


export default Apps;
