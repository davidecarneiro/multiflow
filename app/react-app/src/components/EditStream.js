import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

function EditStream() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [topic, setTopic] = useState('');
    const [description, setDescription] = useState('');
    const [dataSourceType, setDataSourceType] = useState('');
    const [additionalField, setAdditionalField] = useState('');
    const [playbackConfigType, setPlaybackConfigType] = useState('');
    const [playbackConfigValue, setPlaybackConfigValue] = useState('');
    const [dataSourceId, setDataSourceId] = useState('');
    const [dataSources, setDataSources] = useState([]);
    const [files, setFiles] = useState([]);

    // Fetching stream details and related data on component mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get(`http://localhost:3001/streams/${id}`);
                const { topic, description, dataSourceType, dataSourceId, connectionString, filePath, playbackConfigType, linesPerSecond, allInSeconds } = response.data;
                setTopic(topic);
                setDescription(description);
                setDataSourceType(dataSourceType);
                setDataSourceId(dataSourceId);
                setPlaybackConfigType(playbackConfigType);

                if (dataSourceType === 'File') {
                    fetchFiles();
                    setAdditionalField(filePath);
                } else if (dataSourceType === 'SQL') {
                    fetchDataSources();
                    setAdditionalField(connectionString);
                } else if (dataSourceType === 'SavedDataSource') {
                    fetchDataSources();
                    setAdditionalField(dataSourceId);
                }

                if (playbackConfigType === 'linesPerSecond') {
                    setPlaybackConfigValue(linesPerSecond);
                } else if (playbackConfigType === 'allInSeconds') {
                    setPlaybackConfigValue(allInSeconds);
                } else {
                    setPlaybackConfigValue(''); // Set default or empty value if playbackConfigType is not recognized
                }

            } catch (error) {
                console.error('Error fetching stream:', error);
            }
        };

        // Getting the list of all saved datasources
        const fetchDataSources = async () => {
            try {
                const response = await axios.get('http://localhost:3001/dataSources');
                setDataSources(response.data);
            } catch (error) {
                console.error('Error fetching data sources:', error);
            }
        };

        fetchData();
    }, [id]);

    // Function to get the list of datasets in datasets folder
    const fetchFiles = async () => {
        try {
            const response = await axios.get('http://localhost:3001/streams/datasets');
            setFiles(response.data);
        } catch (error) {
            console.error('Error fetching files:', error);
        }
    };
    if (dataSourceType === 'File') {
        fetchFiles();
    }

    const handleAdditionalFieldChange = (e) => {
        setAdditionalField(e.target.value);
    };

    // Function to handle submit and update the stream
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            let postData = { 
                topic, 
                description, 
                dataSourceType, 
                dataSourceId: additionalField, 
                playbackConfigType,
            };
    
            // Include playbackConfigValue only if playbackConfigType is linesPerSecond or allInSeconds
            if (playbackConfigType === 'linesPerSecond') {
                postData.linesPerSecond = parseFloat(playbackConfigValue);
            } else if (playbackConfigType === 'allInSeconds') {
                postData.allInSeconds = parseFloat(playbackConfigValue);
            } else if (playbackConfigType === 'realTime') {
                postData.realTime = true;
            }
    
            if (dataSourceType === 'SQL') {
                postData.connectionString = additionalField;
            } else if (dataSourceType === 'SavedDataSource') {
                postData.dataSourceId = additionalField;
            } else if (dataSourceType === 'File') {
                postData.filePath = additionalField;
            }
    
            await axios.put(`http://localhost:3001/streams/${id}`, postData);
            navigate(`/streams/${id}`);
        } catch (error) {
            console.error('Error updating stream:', error);
        }
    };
    

    const handleCancel = () => {
        navigate(`/streams/${id}`);
    };

    return (
        <div className="container-fluid">
            <div className='page-header mt-2'>
                <h1 className='page-title'>Edit Stream</h1>
            </div>

            <div className='panel-content mt-2' style={{ backgroundColor: '#E6E8E6', borderRadius: '8px' }}>
                <div className='container ps-4 pe-4 pt-3 pb-4'>
                    <div className='col-12'>
                        <form onSubmit={handleSubmit}>
                            <div className="mb-3">
                                <label htmlFor="topic" className="form-label">Stream Topic</label>
                                <input type="text" className="form-control" id="topic" placeholder='Enter the stream topic' value={topic} onChange={(e) => setTopic(e.target.value)} />
                            </div>
                            <div className="mb-3">
                                <label htmlFor="description" className="form-label">Stream Description</label>
                                <textarea className="form-control" id="description" placeholder='Enter the description' value={description} onChange={(e) => setDescription(e.target.value)}></textarea>
                            </div>
                            <div className='d-flex justify-content-start align-items-center'>
                                <div className="mb-3 col-3 me-4">
                                    <label htmlFor="dataSourceType" className="form-label">Data Source Type</label>
                                    <select className="form-select" id="dataSourceType" value={dataSourceType} onChange={(e) => {
                                        setDataSourceType(e.target.value);
                                        setAdditionalField(''); // Reseting additionalField on dataSourceType change
                                        if (dataSourceType !== 'File') {
                                            fetchFiles();
                                        }
                                    }}>
                                        <option value="">Select Data Source Type</option>
                                        <option value="SQL">SQL</option>
                                        <option value="File">File</option>
                                        <option value="SavedDataSource">Saved Data Source</option>
                                    </select>
                                </div>
                                {/* Rendering additional field based on selected dataSourceType */}
                                {dataSourceType === 'SQL' && (
                                    <div className="mb-3 col-3">
                                        <label htmlFor="connectionString" className="form-label">Connection String</label>
                                        <input type="text" className="form-control" id="connectionString" value={additionalField} onChange={handleAdditionalFieldChange} />
                                    </div>
                                )}
                                {dataSourceType === 'File' && (
                                    <div className="mb-3 col-3">
                                        <label htmlFor="filePath" className="form-label">File Path</label>
                                        <select className="form-select" id="filePath" value={additionalField} onChange={handleAdditionalFieldChange}>
                                            <option value="">Select a file</option>
                                            {files.map((file) => (
                                                <option key={file} value={`datasets/${file}`}>{file}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                {dataSourceType === 'SavedDataSource' && (
                                    <div className="mb-3 col-3">
                                        <label htmlFor="dataSourceId" className="form-label">Select Data Source</label>
                                        <select className="form-select" id="dataSourceId" value={additionalField} onChange={handleAdditionalFieldChange}>
                                            <option value="">Select Data Source</option>
                                            {dataSources.map(dataSource => (
                                                <option key={dataSource._id} value={dataSource._id}>{dataSource.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                            <div className='d-flex justify-content-start align-items-center'>
                                <div className="mb-3 col-3 me-4">
                                    <label htmlFor="playbackConfigType" className="form-label">Playback Configuration Type</label>
                                    <select className="form-select" id="playbackConfigType" value={playbackConfigType} onChange={(e) => setPlaybackConfigType(e.target.value)}>
                                        <option value="">Select Playback Type</option>
                                        <option value="linesPerSecond">Lines per Second</option>
                                        <option value="allInSeconds">All in Seconds</option>
                                        <option value="realTime">Real Time</option>
                                    </select>
                                </div>
                                {(playbackConfigType === 'linesPerSecond' || playbackConfigType === 'allInSeconds') && (
                                    <div className="mb-3 col-3">
                                        <label htmlFor="playbackConfigValue" className="form-label">Playback Value</label>
                                        <input type="number" className="form-control" id="playbackConfigValue" value={playbackConfigValue} onChange={(e) => setPlaybackConfigValue(e.target.value)} />
                                    </div>
                                )}
                            </div>
                            <div className="d-flex justify-content-end">
                                <button type="button" className="btn btn-danger me-2" onClick={handleCancel}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Update</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default EditStream;