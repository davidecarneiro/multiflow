import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../App.css';

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
        <div className='container-fluid'>
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