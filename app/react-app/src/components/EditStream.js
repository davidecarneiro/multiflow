import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
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
    const location = useLocation();

    // Getting stream details to prepopulate forms
    useEffect(() => {
        const fetchStream = async () => {
            try {
                const response = await axios.get(`http://localhost:3001/streams/${id}`);
                const { topic, description, dataSourceType, dataSourceId, playbackConfigType, linesPerSecond, allInSeconds } = response.data;
                setTopic(topic);
                setDescription(description);
                setDataSourceType(dataSourceType);
                setDataSourceId(dataSourceId);
                setPlaybackConfigType(playbackConfigType);

                // Set playbackConfigValue based on playbackConfigType
                if (playbackConfigType === 'linesPerSecond') {
                    setPlaybackConfigValue(linesPerSecond);
                } else if (playbackConfigType === 'allInSeconds') {
                    setPlaybackConfigValue(allInSeconds);
                } else {
                    setPlaybackConfigValue(''); // Set to default or empty if playbackConfigType is not recognized
                }
                setAdditionalField(dataSourceId); // Assuming additionalField is derived from dataSourceId
            } catch (error) {
                console.error('Error fetching stream:', error);
            }
        };

        fetchStream();

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
    }, [id]);

    const handleAdditionalFieldChange = (e) => {
        setAdditionalField(e.target.value);
    };

    // Function that submits the form and updates stream details
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            let postData = { topic, description, dataSourceType, dataSourceId, playbackConfigType, playbackConfigValue };

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
                postData[playbackConfigType] = playbackConfigValue;
            } else if (playbackConfigType === 'realTime') {
                postData.realTime = true;
            }

            await axios.put(`http://localhost:3001/streams/${id}`, postData);
            // Redirect the user to the streams page after updating the stream
            navigate(`/streams/${id}`);
        } catch (error) {
            console.error('Error updating stream:', error);
        }
    };

    // Function that returns to details on canceling edit
    const handleCancel = () => {
        // Navigate back to the streams page
        navigate(`/streams/${id}`);
    };

    return (
        <div className="container">
            {/* Page header */}
            <div className='page-header mt-2'>
                <h1 className='page-title'>Edit Stream</h1>
            </div>

            {/* Form */}
            <div className='panel-content mt-2' style={{ backgroundColor: '#E6E8E6', borderRadius: '8px' }}>
                <div className='container ps-4 pe-4 pt-3 pb-4'>
                    <div className='col-12'>
                        <form onSubmit={handleSubmit}>
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
                                        <input type="text" className="form-control" id="filePath" value={additionalField} onChange={handleAdditionalFieldChange} />
                                    </div>
                                )}
                                {dataSourceType === 'SavedDataSource' && (
                                    <div className="mb-3 col-3">
                                        <label htmlFor="dataSourceId" className="form-label">Select Data Source</label>
                                        <select className="form-select" id="dataSourceId" value={dataSourceId} onChange={(e) => setDataSourceId(e.target.value)}>
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
                                {/* Playback Configuration Type */}
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
                            {/* Cancel and Update Btns */}
                            <div className="d-flex justify-content-end">
                                <button type="button" className="btn btn-danger me-2" style={{ fontWeight: '500' }} onClick={handleCancel}>Cancel</button>
                                <button type="submit" className="btn btn-primary" style={{ fontWeight: '500' }}>Update</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default EditStream;