import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function AddStream() {
    const navigate = useNavigate();
    const [topic, setTopic] = useState('');
    const [description, setDescription] = useState('');
    const [dataSourceType, setDataSourceType] = useState('');
    const [additionalField, setAdditionalField] = useState('');
    const [playbackConfigType, setPlaybackConfigType] = useState('');
    const [playbackConfigValue, setPlaybackConfigValue] = useState('');
    const [dataSourceId, setDataSourceId] = useState('');
    const [dataSources, setDataSources] = useState([]);
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const projectId = queryParams.get('projectId');
    const [files, setFiles] = useState([]);

    // Function to get the Saved Data Sources
    useEffect(() => {
        // Fetch data sources from the server
        const fetchDataSources = async () => {
            try {
                const response = await axios.get('http://localhost:3001/dataSources');
                setDataSources(response.data);
            } catch (error) {
                console.error('Error fetching data sources:', error);
            }
        };

        fetchDataSources();

        // Getting the list of datasets in datasets folder
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
    }, [dataSourceType]);

    const handleAdditionalFieldChange = (e) => {
        setAdditionalField(e.target.value);
    };

    const handleDataSourceChange = (e) => {
        const selectedDataSourceId = e.target.value;
        setDataSourceId(selectedDataSourceId);
        setAdditionalField(selectedDataSourceId);
    };

    // Function that handles the create stream endpoint
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            let postData = { projectId, topic, description, dataSourceType, dataSourceId };

            // Conditionally add additionalField based on dataSourceType
            if (dataSourceType === 'SQL') {
                postData.connectionString = additionalField;
            } else if (dataSourceType === 'SavedDataSource') {
                postData.dataSourceId = additionalField;
            } else if (dataSourceType === 'File') {
                postData.filePath = additionalField;
            }

            // Conditionally add playback configuration based on playbackConfigType
            if (playbackConfigType === 'linesPerSecond' || playbackConfigType === 'allInSeconds') {
                // Set the playbackConfigType to the selected value
                postData.playbackConfigType = playbackConfigType;
                // Set the corresponding value based on the selected playbackConfigType
                postData[playbackConfigType] = playbackConfigValue;
            } else if (playbackConfigType === 'realTime') {
                // For realTime playbackConfigType, no additional value is needed
                postData.playbackConfigType = 'realTime';
                postData.realTime = true;
            }

            await axios.post('http://localhost:3001/streams', postData);
            // Redirect the user to the streams page after adding the stream
            navigate(`/projects/${projectId}`);
        } catch (error) {
            console.error('Error adding stream:', error);
        }
    };

    // Function to cancel stream creation and return to project details page
    const handleCancel = () => {
        // Navigate back to the project details page
        navigate(`/projects/${projectId}`);
    };

    return (
        <div className="container">
            {/* Page header */}
            <div className='page-header mt-2'>
                <h1 className='page-title'>Add new stream</h1>
            </div>

            {/* Form */}
            <div className='panel-content mt-2' style={{ backgroundColor: '#E6E8E6', borderRadius: '8px' }}>
                <div className='container ps-4 pe-4 pt-3 pb-4'>
                    <div className='col-12'>
                        <form onSubmit={handleSubmit}>
                            <input type="hidden" name="projectId" value={projectId} />
                            {/* Stream Topic */}
                            <div className="mb-3">
                                <label htmlFor="topic" className="form-label">Stream Topic</label>
                                <input type="text" className="form-control" id="topic" placeholder='Enter the stream topic' value={topic} onChange={(e) => setTopic(e.target.value)} />
                            </div>
                            {/* Stream Description */}
                            <div className="mb-3">
                                <label htmlFor="description" className="form-label">Stream Description</label>
                                <textarea className="form-control" id="description" placeholder='Enter the description' value={description} onChange={(e) => setDescription(e.target.value)}></textarea>
                            </div>
                            {/* Data Source Type DropDown Menu */}
                            <div className='d-flex justify-content-start align-items-center'>
                                <div className="mb-3 col-3 me-4">
                                    <label htmlFor="dataSourceType" className="form-label">Data Source Type</label>
                                    <select className="form-select" id="dataSourceType" value={dataSourceType} onChange={(e) => setDataSourceType(e.target.value)}>
                                        <option value="">Select Data Source Type</option>
                                        <option value="SQL">SQL</option>
                                        <option value="File">File</option>
                                        <option value="SavedDataSource">Saved Data Source</option>
                                    </select>
                                </div>
                                {/* Render additional field based on selected dataSourceType */}
                                {dataSourceType === 'SQL' && (
                                    <div className="mb-3 col-3">
                                        <label htmlFor="connectionString" className="form-label">Connection String</label>
                                        <input type="text" className="form-control" id="connectionString" value={additionalField} onChange={handleAdditionalFieldChange} />
                                    </div>
                                )}
                                {dataSourceType === 'File' && (
                                    <div className="mb-3 col-3">
                                        <label htmlFor="filePath" className="form-label">File Path</label>
                                        <select type="text" className="form-select" id="filePath" value={additionalField} onChange={handleAdditionalFieldChange}>
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
                                        <select className="form-select" id="dataSourceId" value={dataSourceId} onChange={handleDataSourceChange}>
                                            <option value="">Select Data Source</option>
                                            {dataSources.map(dataSource => (
                                                <option key={dataSource._id} value={dataSource._id}>{dataSource.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                            {/* Playback Configuration */}
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
                                {/* Render additional field based on selected playbackConfigType */}
                                {(playbackConfigType === 'linesPerSecond' || playbackConfigType === 'allInSeconds') && (
                                    <div className="mb-3 col-3">
                                        <label htmlFor="playbackConfigValue" className="form-label">Playback Value</label>
                                        <input type="number" className="form-control" id="playbackConfigValue" value={playbackConfigValue} onChange={(e) => setPlaybackConfigValue(e.target.value)} />
                                    </div>
                                )}
                            </div>
                            {/* Cancel and Confirm Btns */}
                            <div className="d-flex justify-content-end">
                                <button type="button" className="btn btn-danger me-2" style={{ fontWeight: '500' }} onClick={handleCancel}>Cancel</button>
                                <button type="submit" className="btn btn-primary" style={{ fontWeight: '500' }}>Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AddStream;
