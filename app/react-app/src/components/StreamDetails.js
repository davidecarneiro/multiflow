import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClock, faFolderPlus, faPause, faPlay, faDiagramProject, faPenToSquare, faTrash, faCopy } from '@fortawesome/free-solid-svg-icons';
//import WebSocket from 'ws';


function StreamDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [stream, setStream] = useState(null);
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [copiedType, setCopiedType] = useState(false);
    const [copiedPath, setCopiedPath] = useState(false);
    const [copiedProject, setCopiedProject] = useState(false);
    const [dataSource, setDataSource] = useState(null);
    const [playbackConfig, setPlaybackConfig] = useState(null);

    // Empty dependency array ensures this effect runs only once
    useEffect(() => {
        console.log("123...");
        //const ws = new WebSocket('ws://localhost:8082');
        /*
            // Create a WebSocket connection to the server
            const ws = new WebSocket('ws://localhost:8082');
        
            // Listen for messages from the server
            ws.onmessage = (event) => {
            setStatus(event.data);

            console.log(event.data);
            };
        
            // Cleanup function to close the WebSocket connection
            return () => {
            ws.close();
            };
        */
    }, []);

    // Endpoint to get stream details
    useEffect(() => {
        const fetchStreamDetails = async () => {
            try {
                const response = await axios.get(`http://localhost:3001/streams/${id}`);
                setStream(response.data);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching stream details:', error);
                setLoading(false);
            }
        };
        fetchStreamDetails();

    }, [id]);

    // Endpoint to get project details
    useEffect(() => {
        const fetchProjectDetails = async () => {
            try {
                const response = await axios.get(`http://localhost:3001/projects/${stream.projectId}`);
                setProject(response.data);
            } catch (error) {
                console.error('Error fetching project details:', error);
            }
        };

        if (stream) {
            fetchProjectDetails();
        }
    }, [stream]);

    // Function to fetch data source details
    useEffect(() => {
        const fetchDataSourceDetails = async () => {
            try {
                if (stream.dataSourceId) {
                    const response = await axios.get(`http://localhost:3001/dataSources/${stream.dataSourceId}`);
                    setDataSource(response.data);
                }
            } catch (error) {
                console.error('Error fetching data source details:', error);
            }
        };

        // Fetch data source details only if dataSourceId is not null or empty
        if (stream) {
            fetchDataSourceDetails();
        }
    }, [stream]);

    // Function to fetch playback configuration details
    useEffect(() => {
        const fetchPlaybackConfig = async () => {
            try {
                if (stream.playbackConfigId) {
                    const response = await axios.get(`http://localhost:3001/playbackConfigs/${stream.playbackConfigId}`);
                    setPlaybackConfig(response.data);
                }
            } catch (error) {
                console.error('Error fetching playback configuration details:', error);
            }
        };

        // Fetch playback configuration details only if playbackConfigId is not null or empty
        if (stream) {
            fetchPlaybackConfig();
        }
    }, [stream]);

    // Function to parse date and calculate time from now
    const parseDate = (dateString) => {
        const dateStarted = new Date(dateString);
        const currentDate = new Date();
        const diffMs = currentDate - dateStarted;
        const diffMins = Math.round(diffMs / (1000 * 60));

        if (diffMins < 60) {
            return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
        } else if (diffMins < 1440) {
            const diffHours = Math.floor(diffMins / 60);
            return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
        } else if (diffMins < 10080) {
            const diffDays = Math.floor(diffMins / 1440);
            return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
        } else if (diffMins < 43800) {
            const diffWeeks = Math.floor(diffMins / 10080);
            return `${diffWeeks} ${diffWeeks === 1 ? 'week' : 'weeks'} ago`;
        } else if (diffMins < 525600) {
            const diffMonths = Math.floor(diffMins / 43800);
            return `${diffMonths} ${diffMonths === 1 ? 'month' : 'months'} ago`;
        } else {
            const diffYears = Math.floor(diffMins / 525600);
            return `${diffYears} ${diffYears === 1 ? 'year' : 'years'} ago`;
        }
    };

    // Function to parse date into hh:mm dd/mm/yyyy
    const formatDate = (dateString) => {
        const date = new Date(dateString);

        // Format hours and minutes with leading zeros
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');

        // Format day, month, and year
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();

        return `${hours}:${minutes} ${day}/${month}/${year}`;
    };

    // Function to start and stop stream (using endpoints)
    const handleStreamStatus = async (streamId, status) => {
        try {
            if (status) {
                // Stop stream
                await axios.put(`http://localhost:3001/streams/stop/${streamId}`);
                // Update the status of the stream in the local state
                setStream(prevStream => ({
                    ...prevStream,
                    status: false
                }));

                console.log("Pause");

            } else {
                // Start stream
                await axios.put(`http://localhost:3001/streams/start/${streamId}`);
                // Update the status of the stream in the local state
                setStream(prevStream => ({
                    ...prevStream,
                    status: true
                }));

                /*const ws = new WebSocket('ws://localhost:8082');
        
                // Event listeners for WebSocket events
                ws.onopen = () => {
                    console.log('WebSocket connection established');
                    ws.send("663ec152186fc7e4d15d0758");
                };
        
                ws.onmessage = (event) => {
                console.log('Message received from server:', event.data);
                setStatus(event.data);
                };
        
                ws.onclose = () => {
                console.log('WebSocket connection closed');
                };
        
                ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                };*/

                console.log("Play");
            }
        } catch (error) {
            console.error('Error updating stream status:', error);
        }
    };

    // To show up when loading stream details
    if (loading) {
        return <div className='container'><div className='page-header mt-2'><h4 className='page-title'>Loading stream details...</h4></div></div>;
    }
    // To show up when 404 error
    if (!stream) {
        return <div className='container'><div className='page-header mt-2'><h4 className='page-title'>Stream not found</h4></div></div>;
    }

    // Function to copy stream ID to clipboard and show confirmation message
    const copyStreamId = () => {
        navigator.clipboard.writeText(stream._id);
        setCopied(true);
        setTimeout(() => {
            setCopied(false);
        }, 1000); // Hide the confirmation message after 1 second
    };

    // Function to copy project ID to clipboard and show confirmation message
    const copyProjectId = () => {
        navigator.clipboard.writeText(project._id);
        setCopiedProject(true);
        setTimeout(() => {
            setCopiedProject(false);
        }, 1000); // Hide the confirmation message after 1 second
    };

    // Function to copy type to clip
    const copyTypeToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setCopiedType(true);
        setTimeout(() => {
            setCopiedType(false);
        }, 1000); // Hide the confirmation message after 1 second
    };

    // Function to copy text to clip
    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setCopiedPath(true);
        setTimeout(() => {
            setCopiedPath(false);
        }, 1000); // Hide the confirmation message after 1 second
    };

    // Endpoint to delete the stream
    const handleDelete = async () => {
        // Asking the user for confirmation before deleting
        const confirmDelete = window.confirm("Are you sure you want to delete this stream?");
        if (!confirmDelete) {
            return; // If the user cancels the deletion, exit the function
        }

        try {
            await axios.delete(`http://localhost:3001/streams/${stream._id}`);
            // Redirecting the user to the streams page after successful deletion
            navigate(`/projects/${stream.projectId}`);
        } catch (error) {
            console.error('Error deleting stream:', error);
        }
    };

    // To update the stream details
    const handleEdit = () => {
        navigate(`/edit-stream/${id}`);
    };

    return (
        <div className="container">
            {/* Page header */}
            <div className='page-header mt-2'>
                <h1 className='page-title'>{stream.topic}</h1>
            </div>

            {/* Stream details such as id, 'last started' and 'created at' */}
            <div className='d-flex justify-content-start'>
                <label className='tiny-label' style={{ fontSize: '10px', color: 'gray' }} onClick={copyStreamId}>
                    <FontAwesomeIcon icon={faDiagramProject} />
                    <span className='ms-1' style={{ cursor: 'pointer' }}>Id: {stream._id}</span>
                    {copied && <span style={{ marginLeft: '5px', color: 'green' }}>Stream ID Copied!</span>}
                </label>
                <label className='ms-4 tiny-label' style={{ fontSize: '10px', color: 'gray' }}><FontAwesomeIcon icon={faClock} /><span className='ms-1'>Last started: {stream.dateLastStarted ? parseDate(stream.dateLastStarted) : 'Never'}</span></label>
                <label className='ms-3 tiny-label' style={{ fontSize: '10px', color: 'gray' }}><FontAwesomeIcon icon={faFolderPlus} /><span className='ms-1'>Created at: </span> {formatDate(stream.dateCreated)}</label>
            </div>

            {/* Stream Details */}
            <div className='col-12 mt-3'>

                {/* Stream description */}
                <h5 style={{ fontWeight: '650' }}>Description</h5>
                <h6>{stream.description ? stream.description : "This stream has no description."}</h6>

                {/* Data Source Type */}
                <h5 className='mt-3' style={{ fontWeight: '650' }}>Data Source Type</h5>
                <div className='col-12 d-flex align-items-center'>
                    {/* Display dataSourceType and details */}
                    <div className='d-flex justify-content-start align-items-center'>
                        <span className='me-2'>Type:</span>
                        {stream.dataSourceType === "SavedDataSource" ? (
                            dataSource && (
                                <div className='btn btn-light me-2' style={{ backgroundColor: '#e6e8e6', borderRadius: '8px', cursor: 'default' }}>
                                    {dataSource.name}
                                    <FontAwesomeIcon icon={faCopy} className="ms-3" onClick={() => copyTypeToClipboard(dataSource.name)} style={{ cursor: 'pointer' }} />
                                    {copiedType && <span className="ms-2" style={{ color: 'green' }}>Copied!</span>}
                                </div>
                            )
                        ) : (
                            <div className='btn btn-light me-2' style={{ backgroundColor: '#e6e8e6', borderRadius: '8px', cursor: 'default' }}>
                                {stream.dataSourceType === 'SQL' ? (
                                    <span>SQL</span>
                                ) : (
                                    <span>File</span>
                                )}
                            </div>
                        )}
                        {stream.dataSourceType === 'SavedDataSource' && (
                            <>
                                <span className='me-2'>Data Source ID:</span>
                                <div className='btn btn-light me-2' style={{ backgroundColor: '#e6e8e6', borderRadius: '8px', cursor: 'text' }}>
                                    {stream.dataSourceId}
                                    <FontAwesomeIcon icon={faCopy} className="ms-3" onClick={() => copyToClipboard(stream.dataSourceId)} style={{ cursor: 'pointer' }} />
                                    {copiedPath && <span className="ms-2" style={{ color: 'green' }}>Copied!</span>}
                                </div>
                            </>
                        )}
                        {stream.dataSourceType === 'SQL' && (
                            <>
                                <span className='me-2'>Connection String:</span>
                                <div className='btn btn-light me-2' style={{ backgroundColor: '#e6e8e6', borderRadius: '8px', cursor: 'text' }}>
                                    {stream.connectionString}
                                    <FontAwesomeIcon icon={faCopy} className="ms-3" onClick={() => copyToClipboard(stream.connectionString)} style={{ cursor: 'pointer' }} />
                                    {copiedPath && <span className="ms-2" style={{ color: 'green' }}>Copied!</span>}
                                </div>
                            </>
                        )}
                        {stream.dataSourceType === 'File' && (
                            <>
                                <span className='me-2'>Path:</span>
                                <div className='btn btn-light me-2' style={{ backgroundColor: '#e6e8e6', borderRadius: '8px', cursor: 'text' }}>
                                    {stream.filePath}
                                    <FontAwesomeIcon icon={faCopy} className="ms-3" onClick={() => copyToClipboard(stream.filePath)} style={{ cursor: 'pointer' }} />
                                    {copiedPath && <span className="ms-2" style={{ color: 'green' }}>Copied!</span>}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Playback Configuration Type */}
                <h5 className='mt-3' style={{ fontWeight: '650' }}>Playback Configuration Type</h5>
                <div className='col-12 d-flex align-items-center'>
                    {/* Display playback configuration type */}
                    <div className='d-flex justify-content-start align-items-center'>
                        <span className='me-2'>Type:</span>
                        <div className='btn btn-light me-2' style={{ backgroundColor: '#e6e8e6', borderRadius: '8px', cursor: 'default' }}>
                            {stream.playbackConfigType === 'realTime' ? (
                                <span>Real Time</span>
                            ) : (
                                <span>{stream.playbackConfigType === 'allInSeconds' ? 'All in Seconds' : 'Lines per Second'}</span>
                            )}
                        </div>
                        {/* Playback Configuration Details */}
                        {stream.playbackConfigType !== 'realTime' && (
                            <div className='ms-2'>
                                <span className='me-2'>Configuration:</span>
                                <div className='btn btn-light me-2' style={{ backgroundColor: '#e6e8e6', borderRadius: '8px', cursor: 'default' }}>
                                    {/* Display playback configuration details based on type */}
                                    {stream.playbackConfigType === 'linesPerSecond' ? (
                                        <span>{stream.linesPerSecond}</span>
                                    ) : (
                                        <span>{stream.allInSeconds}</span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Stream status */}
                <h5 className='mt-3' style={{ fontWeight: '650' }}>Stream Status</h5>
                <div className='card mt-2 col-4' style={{ backgroundColor: '#F5F6F5', borderRadius: '8px' }}>
                    <div className='card-body d-flex align-items-center'>
                        <FontAwesomeIcon onClick={() => handleStreamStatus(stream._id, stream.status)} icon={stream.status ? faPause : faPlay} size="2x" style={{ cursor: 'pointer' }} />
                        <span className='ms-4'>{stream.status ? 'Stream is currently running' : 'Stream is currently paused'}</span>
                    </div>
                </div>

                {/* Project associated : - Status: {status ? status: '0%'}< */}
                {project && (
                    <div className='mt-3'>
                        <h5 style={{ fontWeight: '650' }}>Project Associated</h5>
                        <div className='card mt-2 col-4' style={{ backgroundColor: '#F5F6F5', borderRadius: '8px' }}>
                            <div className='card-body'>

                                <div>{project.name}</div>
                                <span className='tiny-label' style={{ fontSize: '10px', color: 'gray' }} onClick={copyProjectId}>
                                    <FontAwesomeIcon icon={faDiagramProject} />
                                    <span className='ms-1' style={{ cursor: 'pointer' }}>Project Id: {project._id}</span>
                                    {copiedProject && <span style={{ marginLeft: '5px', color: 'green' }}>Project ID Copied!</span>}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Stream Edit and Delete Buttons */}
                <div className="d-flex justify-content-end">
                    <button className="btn btn-warning me-2" style={{ fontWeight: '500' }} onClick={handleEdit}><FontAwesomeIcon icon={faPenToSquare} /> Edit</button>
                    <button className="btn btn-danger" style={{ fontWeight: '500' }} onClick={handleDelete}><FontAwesomeIcon icon={faTrash} /> Delete</button>
                </div>
            </div>
        </div>
    );
}

export default StreamDetails;