import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCube, faClock, faFolderPlus, faPenToSquare, faTrash, faPlus, faPassport, faChevronDown, faCopy, faGear } from '@fortawesome/free-solid-svg-icons';

function AppDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [app, setApp] = useState(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [instanceStatus, setInstanceStatus] = useState({});
    const [logs, setLogs] = useState('');
    const logRef = useRef(null);
    const wsRef = useRef(null);

    // New states for settings
    const [maxLogs, setMaxLogs] = useState(250);
    const [consoleHeight, setConsoleHeight] = useState(250);
    const [showSettings, setShowSettings] = useState(false);

    // States for hover effects on buttons
    const [settingsHovered, setSettingsHovered] = useState(false);
    const [copyHovered, setCopyHovered] = useState(false);
    const [clearHovered, setClearHovered] = useState(false);
    const [scrollHovered, setScrollHovered] = useState(false);

    // Fetch app details when the component mounts
    useEffect(() => {
        const fetchAppDetails = async () => {
            try {
                const response = await axios.get(`http://localhost:3001/apps/${id}`);
                setApp(response.data);
                const initialStatus = response.data.instances.reduce((acc, instance) => {
                    acc[instance._id] = instance.status;
                    return acc;
                }, {});
                setInstanceStatus(initialStatus);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching app details:', error);
                setLoading(false);
            }
        };
        fetchAppDetails();
    }, [id]);

    // Setup WebSocket connection for docker logs; re-run when maxLogs changes
    useEffect(() => {
        const ws = new WebSocket('ws://localhost:8082');
        ws.onopen = () => {
            console.log('WebSocket connection established');
            ws.send('start-logs');
        };
        ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            if (message.type === 'docker-logs' || message.type === 'docker-logs-error') {
                setLogs((prevLogs) => {
                    const newLogs = prevLogs + message.log + "\n";
                    const logLines = newLogs.split("\n").filter(Boolean);
                    if (logLines.length > maxLogs) {
                        return logLines.slice(-maxLogs).join("\n") + "\n";
                    }
                    return newLogs;
                });
            } else if (message.type === 'docker-logs-cleared') {
                setLogs('');
            }
        };
        ws.onclose = () => {
            console.log('WebSocket connection closed. Reconnecting...');
            setTimeout(() => {
                ws.close();
                ws.onopen();
            }, 5000);
        };
        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
        return () => {
            ws.close();
        };
    }, [maxLogs]);

    // Clear logs function
    const clearLogs = () => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send('clear-logs');
        }
        setLogs('');
    };

    // Copy logs function
    const copyLogs = () => {
        navigator.clipboard.writeText(logs);
    };

    // Auto-scroll to bottom when logs update
    useEffect(() => {
        if (logRef.current) {
            logRef.current.scrollTop = logRef.current.scrollHeight;
        }
    }, [logs]);

    const scrollToBottom = () => {
        if (logRef.current) {
            logRef.current.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
        }
    };

    const handleAddInstanceClick = () => {
        navigate(`/add-instance?appId=${app._id}`);
    };

    // Make API call to update the status
    const handleToggle = async (instanceId) => {
        try {
            const currentStatus = instanceStatus[instanceId];
            const newStatus = !currentStatus;
            // Make API call to update the status
            if (newStatus) {
                await axios.post(`http://localhost:3001/instances/start/${instanceId}`);
            } else {
                await axios.post(`http://localhost:3001/instances/stop/${instanceId}`);
            }
            // Update local status after the API call
            setInstanceStatus(prevState => ({
                ...prevState,
                [instanceId]: newStatus
            }));
        } catch (error) {
            console.error('Error toggling instance status:', error);
        }
    };

    // Handle delete app action
    const handleDelete = async () => {
        const confirmDelete = window.confirm("Are you sure you want to delete this app?");
        if (!confirmDelete) return;
        try {
            await axios.delete(`http://localhost:3001/apps/${id}`);
            navigate('/apps');
        } catch (error) {
            console.error('Error deleting app:', error);
        }
    };

    // Handle edit app action
    const handleEdit = () => {
        navigate(`/edit-app/${id}`);
    };

    // Loading state
    if (loading) {
        return <div className='container'><div className='page-header mt-2'><h4 className='page-title'>Loading app details...</h4></div></div>;
    }

    // App not found state
    if (!app) {
        return <div className='container'><div className='page-header mt-2'><h4 className='page-title'>App not found</h4></div></div>;
    }

    // Function to parse date and calculate time from now
    const parseDate = (dateString) => {
        const dateStarted = new Date(dateString);
        const currentDate = new Date();
        const diffMs = currentDate - dateStarted;
        const diffMins = Math.round(diffMs / (1000 * 60));
        if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
        else if (diffMins < 1440) return `${Math.floor(diffMins / 60)} ${Math.floor(diffMins / 60) === 1 ? 'hour' : 'hours'} ago`;
        else if (diffMins < 10080) return `${Math.floor(diffMins / 1440)} ${Math.floor(diffMins / 1440) === 1 ? 'day' : 'days'} ago`;
        else if (diffMins < 43800) return `${Math.floor(diffMins / 10080)} ${Math.floor(diffMins / 10080) === 1 ? 'week' : 'weeks'} ago`;
        else if (diffMins < 525600) return `${Math.floor(diffMins / 43800)} ${Math.floor(diffMins / 43800) === 1 ? 'month' : 'months'} ago`;
        else return `${Math.floor(diffMins / 525600)} ${Math.floor(diffMins / 525600) === 1 ? 'year' : 'years'} ago`;
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

    // Function to copy app id to clipboard and show confirmation message
    const copyAppId = () => {
        navigator.clipboard.writeText(app._id);
        setCopied(true);
        setTimeout(() => {
            setCopied(false);
        }, 1000); // Hide the confirmation message after 1 second
    };

    return (
        <div className="container-fluid">
            {/* Page header */}
            <div className='page-header mt-2'>
                <h1 className='page-title'>{app.name}</h1>
            </div>

            {/* App details such as id, 'last started' and 'created at' */}
            <div className='d-flex justify-content-start'>
                <label className='tiny-label' style={{ fontSize: '10px', color: 'gray' }} onClick={copyAppId}>
                    <FontAwesomeIcon icon={faCube} />
                    <span className='ms-1' style={{ cursor: 'pointer' }}>Id: {app._id}</span>
                    {copied && <span style={{ marginLeft: '5px', color: 'green' }}>App ID Copied!</span>}
                </label>
                <label className='ms-4 tiny-label' style={{ fontSize: '10px', color: 'gray' }}>
                    <FontAwesomeIcon icon={faClock} />
                    <span className='ms-1'>Last started: {app.dateLastStarted ? parseDate(app.dateLastStarted) : 'Never'}</span>
                </label>
                <label className='ms-3 tiny-label' style={{ fontSize: '10px', color: 'gray' }}>
                    <FontAwesomeIcon icon={faFolderPlus} />
                    <span className='ms-1'>Created at: </span> {formatDate(app.dateCreated)}
                </label>
                <label className='ms-3 tiny-label' style={{ fontSize: '10px', color: 'gray' }}>
                    <FontAwesomeIcon icon={faClock} />
                    <span className='ms-1'>Last updated: {app.dateUpdated ? parseDate(app.dateUpdated) : 'Never'}</span>
                </label>
            </div>

            {/* App remaining details */}
            <div className='col-12 mt-3'>
                <h5 style={{ fontWeight: '650' }}>Description</h5>
                <h6>{app.description ? app.description : "This app has no description."}</h6>
                <h5 className='mt-3' style={{ fontWeight: '650' }}>App Details</h5>
                {/* Display selected App file */}
                <div className='d-flex justify-content-start align-items-center'>
                    <span className='me-2'>File Name:</span>
                    <div className='btn btn-light me-2' style={{ backgroundColor: '#e6e8e6', borderRadius: '8px', cursor: 'default' }}>
                        {app.filePath}
                    </div>
                </div>

                {/* Display custom fields */}
                <h5 className='mt-3' style={{ fontWeight: '650' }}>Custom Fields</h5>
                {app.customFields && app.customFields.length > 0 ? (
                    <div className='row'>
                        {app.customFields.map((field, index) => {
                            const truncate = (str, length) => (str.length <= length ? str : str.slice(0, length) + '...');
                            // To limit the amount of letters displayed
                            const truncatedName = truncate(field.name, 17);
                            return (
                                <div key={index} className={`col-md-${Math.ceil(12 / Math.min(app.customFields.length, 5))} mb-3`}>
                                    <div className='card' style={{ backgroundColor: '#F5F6F5', borderRadius: '8px' }}>
                                        <div className='card-body'>
                                            <div className='d-flex flex-column'>
                                                <div className='d-flex justify-content-between align-items-center'>
                                                    <div className='d-flex flex-column'>
                                                        <span><strong>Name:</strong> {truncatedName}</span>
                                                        <span><strong>Type:</strong> {field.type} </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {/* Fill remaining spaces in the row */}
                        {Array.from({ length: 5 - (app.customFields.length % 5) }, (_, i) => (
                            <div key={i} className={`col-md-${Math.ceil(12 / Math.min(app.customFields.length, 5))} mb-3`} />
                        ))}
                    </div>
                ) : (
                    <p className='text-muted'>This app has no custom fields.</p>
                )}

                {/* Instances list */}
                <div className='col-12 mt-3'>
                    <div className='page-header mt-2 mb-2 d-flex justify-content-between align-items-center'>
                        <h5 style={{ fontWeight: '650' }}>Instances associated</h5>
                        <button className="btn btn-sm btn-primary" onClick={handleAddInstanceClick}>
                            <FontAwesomeIcon icon={faPlus} className="me-2" />
                            <span>Add Instance</span>
                        </button>
                    </div>
                    {/* Instances Cards */}
                    <div className='row'>
                        {app.instances.length === 0 ? (
                            <p className='text-muted'>There are no instances associated with this app yet.</p>
                        ) : (
                            <>
                                {app.instances.map((instance, index) => (
                                    <div key={instance._id} className={`col-md-${Math.ceil(12 / Math.min(app.instances.length, 5))} mb-3`}>
                                        <div className='card' style={{ backgroundColor: '#F5F6F6', borderRadius: '8px' }}>
                                            <div className='card-body d-flex justify-content-between align-items-center'>
                                                <div className='col-10'>
                                                {/* Instance name */}
                                                    <span onClick={() => navigate(`/instances/${instance._id}`)}
                                                        style={{ cursor: 'pointer', textDecoration: 'none' }}
                                                        onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                                                        onMouseLeave={(e) => e.target.style.textDecoration = 'none'}>
                                                        {instance.name}
                                                    </span>
                                                    <div className='d-flex justify-content-start align-items-center mt-2'>
                                                    {/* Instance details such as 'last started' and 'created at' */}
                                                        <label className='tiny-label' style={{ fontSize: '10px', color: 'gray' }}>
                                                            <FontAwesomeIcon icon={faClock} />
                                                            <span className='ms-1'>{instance.dateLastStarted ? parseDate(instance.dateLastStarted) : 'Never'}</span>
                                                        </label>
                                                        <label className='ms-3 tiny-label' style={{ fontSize: '10px', color: 'gray' }}>
                                                            <FontAwesomeIcon icon={faFolderPlus} />
                                                            <span className='ms-1'></span> {formatDate(instance.dateCreated)}
                                                        </label>
                                                        <label className='ms-3 tiny-label' style={{ fontSize: '10px', color: 'gray' }}>
                                                            <FontAwesomeIcon icon={faPassport} />
                                                            <span className='ms-1'></span>{instance.port}
                                                        </label>
                                                    </div>
                                                </div>
                                                {/* Toggle instance switch */}
                                                <div className='col-md-2'>
                                                    <div className='d-flex align-items-center justify-content-end'>
                                                        <div className="form-check form-switch" style={{ transform: 'scale(1.25)' }}>
                                                            <input className="form-check-input" type="checkbox" id={`switch-${instance._id}`}
                                                                checked={instanceStatus[instance._id] || false} onChange={() => handleToggle(instance._id)} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {Array.from({ length: 5 - (app.instances.length % 5) }, (_, i) => (
                                    <div key={i} className={`col-md-${Math.ceil(12 / Math.min(app.instances.length, 5))} mb-3`} />
                                ))}
                            </>
                        )}
                    </div>
                </div>

                {/* Docker Logs Display */}
                <h5 style={{ fontWeight: '650' }}>Faust Logs</h5>
                <div style={{ position: "relative", width: "100%" }}>
                    <div ref={logRef}
                        style={{ background: "#F5F6F5", height: `${consoleHeight}px`, borderRadius: "8px", overflowY: "scroll", overflowX: "auto", padding: "15px" }}>
                        <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>{logs}</pre>
                    </div>
                    {/* Top-right group: Settings, then Copy & Clear buttons */}
                    <div style={{
                        position: "absolute",
                        top: "10px",
                        right: "10px",
                        background: "white",
                        borderRadius: "6px",
                        padding: "4px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        boxShadow: "0px 2px 5px rgba(0, 0, 0, 0.2)"
                    }}>
                        {/* Settings button */}
                        <button onClick={() => setShowSettings(!showSettings)}
                            onMouseEnter={() => setSettingsHovered(true)}
                            onMouseLeave={() => setSettingsHovered(false)}
                            style={{
                                padding: "6px",
                                border: "none",
                                borderRadius: "4px",
                                background: settingsHovered ? "#f0f0f0" : "none",
                                color: "#818589",
                                cursor: "pointer",
                                transition: "background 0.2s ease"
                            }}>
                            <FontAwesomeIcon icon={faGear} />
                        </button>
                        {/* Settings Panel */}
                        {showSettings && (
                            <div style={{ position: 'absolute', right: '100%', marginRight: '10px', top: "0px", width: '150px', background: 'white', borderRadius: '6px', padding: '8px', boxShadow: '0px 2px 5px rgba(0,0,0,0.2)', zIndex: 100 }}>
                                <div className='mb-2'>
                                    <div className='row'><label className='tiny-label' style={{ fontSize: '12px' }}>Max Logs (lines):</label></div>
                                    <input type="range" value={maxLogs} min="50" max="500" onChange={(e) => setMaxLogs(Number(e.target.value))} />
                                    <label className='d-flex justify-content-center'><input className='d-flex justify-content-center' type="number" value={maxLogs} min="50" max="500" onChange={(e) => setMaxLogs(Math.min(500, Math.max(50, Number(e.target.value))))} /></label>
                                    {/*<label className='tiny-label d-flex justify-content-center'>{maxLogs} lines</label>*/}
                                </div>
                                <div>
                                    <div className='row'><label className='tiny-label' style={{ fontSize: '12px' }}>Console Height (px):</label></div>
                                    <input type="range" value={consoleHeight} min="200" max="1000" onChange={(e) => setConsoleHeight(Number(e.target.value))} />
                                    <label className='d-flex justify-content-center'><input type="number" value={consoleHeight} min="200" max="1000" onChange={(e) => setConsoleHeight(Math.min(1000, Math.max(200, Number(e.target.value))))} /></label>
                                    {/*<label className='tiny-label d-flex justify-content-center'>{consoleHeight}px</label>*/}
                                </div>
                            </div>
                        )}
                        {/* Copy Button */}
                        <button onClick={copyLogs}
                            onMouseEnter={() => setCopyHovered(true)}
                            onMouseLeave={() => setCopyHovered(false)}
                            style={{
                                padding: "6px",
                                border: "none",
                                background: copyHovered ? "#f0f0f0" : "none",
                                borderRadius: "4px",
                                color: "#818589",
                                cursor: "pointer",
                                transition: "background 0.2s ease"
                            }}>
                            <FontAwesomeIcon icon={faCopy} />
                        </button>
                        {/* Clear Button */}
                        <button onClick={clearLogs}
                            onMouseEnter={() => setClearHovered(true)}
                            onMouseLeave={() => setClearHovered(false)}
                            style={{
                                padding: "6px",
                                border: "none",
                                background: clearHovered ? "#f0f0f0" : "none",
                                borderRadius: "4px",
                                color: "#818589",
                                cursor: "pointer",
                                marginTop: "4px",
                                transition: "background 0.2s ease"
                            }}>
                            <FontAwesomeIcon icon={faTrash} />
                        </button>
                    </div>
                    {/* Bottom-right scroll-to-bottom circular button */}
                    <button onClick={scrollToBottom}
                        onMouseEnter={() => setScrollHovered(true)}
                        onMouseLeave={() => setScrollHovered(false)}
                        style={{
                            position: "absolute",
                            bottom: "10px",
                            right: "10px",
                            width: "35px",
                            height: "35px",
                            borderRadius: "50%",
                            border: "none",
                            background: scrollHovered ? "#7DF9FF" : "white",
                            color: "#007BFF",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            transition: "background 0.2s ease",
                            boxShadow: "0px 2px 5px rgba(0, 0, 0, 0.2)"
                        }}>
                        <FontAwesomeIcon icon={faChevronDown} />
                    </button>
                </div>

                {/* Action buttons */}
                <div className="d-flex justify-content-end mt-3 mb-4">
                    <button className="btn btn-warning me-2" style={{ fontWeight: '500' }} onClick={handleEdit}>
                        <FontAwesomeIcon icon={faPenToSquare} /> Edit
                    </button>
                    <button className="btn btn-danger" style={{ fontWeight: '500' }} onClick={handleDelete}>
                        <FontAwesomeIcon icon={faTrash} /> Delete
                    </button>
                </div>
            </div>
        </div >
    );
}

export default AppDetails;