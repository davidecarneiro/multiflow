import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCube, faClock, faFolderPlus, faPenToSquare, faTrash, faChevronDown, faCopy, faGear } from '@fortawesome/free-solid-svg-icons';

function InstanceDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [instance, setInstance] = useState(null);
    const [instanceStatus, setInstanceStatus] = useState({});
    const [app, setApp] = useState(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [copiedApp, setCopiedApp] = useState(false);
    const [copiedStream, setCopiedStream] = useState(false);
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

    // Fetch instance details when the component mounts
    useEffect(() => {
        const fetchInstanceDetails = async () => {
            try {
                const response = await axios.get(`http://localhost:3001/instances/${id}`);
                setInstance(response.data);
                setLoading(false);
                // Initialize instance statuses based on fetched data
                const initialStatus = { [response.data._id]: response.data.status };
                setInstanceStatus(initialStatus);
            } catch (error) {
                console.error('Error fetching instance details:', error);
                setLoading(false);
            }
        };

        fetchInstanceDetails();
    }, [id]);

    // Fetch app details when instance is fetched
    useEffect(() => {
        const fetchAppDetails = async () => {
            try {
                const response = await axios.get(`http://localhost:3001/apps/${instance?.appId}`);
                setApp(response.data);
            } catch (error) {
                console.error('Error fetching app details:', error);
            }
        };

        if (instance) {
            fetchAppDetails();
        }
    }, [instance]);

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

    // Function to copy instance ID to clipboard and show confirmation message
    const copyInstanceId = () => {
        navigator.clipboard.writeText(instance._id);
        setCopied(true);
        setTimeout(() => {
            setCopied(false);
        }, 1000); // Hide the confirmation message after 1 second
    };

    // Function to copy app ID to clipboard and show confirmation message
    const copyAppId = () => {
        navigator.clipboard.writeText(app._id);
        setCopiedApp(true);
        setTimeout(() => {
            setCopiedApp(false);
        }, 1000); // Hide the confirmation message after 1 second
    };

    // Function to copy stream ID to clipboard and show confirmation message
    const copyStreamId = () => {
        navigator.clipboard.writeText(instance.streamTopicId);
        setCopiedStream(true);
        setTimeout(() => {
            setCopiedStream(false);
        }, 1000); // Hide the confirmation message after 1 second
    };

    // Function to start or stop the instance
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

    // Handle delete instance action
    const handleDelete = async () => {
        const confirmDelete = window.confirm("Are you sure you want to delete this instance?");
        if (!confirmDelete) {
            return;
        }

        try {
            await axios.delete(`http://localhost:3001/instances/${id}`);
            navigate(`/apps/${instance.appId}`);
        } catch (error) {
            console.error('Error deleting instance:', error);
        }
    };

    // Handle edit instance action
    const handleEdit = () => {
        navigate(`/edit-instance/${id}`);
    };

    // Loading state
    if (loading) {
        return <div className='container'><div className='page-header mt-2'><h4 className='page-title'>Loading instance details...</h4></div></div>;
    }

    // Instance not found state
    if (!instance) {
        return <div className='container'><div className='page-header mt-2'><h4 className='page-title'>Instance not found</h4></div></div>;
    }

    return (
        <div className="container-fluid">
            {/* Page header */}
            <div className='page-header mt-2'>
                <h1 className='page-title'>{instance.name}</h1>
            </div>

            {/* Instance details such as id, 'last started' and 'created at' */}
            <div className='d-flex justify-content-start'>
                <label className='tiny-label' style={{ fontSize: '10px', color: 'gray' }} onClick={copyInstanceId}>
                    <FontAwesomeIcon icon={faCube} />
                    <span className='ms-1' style={{ cursor: 'pointer' }}>Id: {instance._id}</span>
                    {copied && <span style={{ marginLeft: '5px', color: 'green' }}>Instance ID Copied!</span>}
                </label>
                <label className='ms-4 tiny-label' style={{ fontSize: '10px', color: 'gray' }}><FontAwesomeIcon icon={faClock} /><span className='ms-1'>Last started: {instance.dateLastStarted ? parseDate(instance.dateLastStarted) : 'Never'}</span></label>
                <label className='ms-3 tiny-label' style={{ fontSize: '10px', color: 'gray' }}><FontAwesomeIcon icon={faFolderPlus} /><span className='ms-1'>Created at: </span> {formatDate(instance.dateCreated)}</label>
            </div>

            {/* Instance remaining details */}
            <div className='col-12 mt-3'>

                {/* Description */}
                <h5 style={{ fontWeight: '650' }}>Description</h5>
                <h6>{instance.description ? instance.description : "This instance has no description."}</h6>

                {/* Status */}
                <h5 style={{ fontWeight: '650' }}>Instance Status</h5>
                <div className='card mt-2 p-2 col-3' style={{ backgroundColor: '#F5F6F5', borderRadius: '8px' }}>
                    <div className='d-flex align-items-center'>
                        <div className='ps-2'>
                            {/* Toggle instance switch */}
                            <div className="form-check form-switch" style={{ transform: 'scale(1.25)' }}>
                                <input
                                    className="form-check-input"
                                    type="checkbox"
                                    id={`switch-${instance._id}`}
                                    checked={instanceStatus[instance._id] || false}
                                    onChange={() => handleToggle(instance._id)}
                                />
                            </div>
                        </div>
                        <label className='ps-2'>{instanceStatus[instance._id] ? 'Running' : 'Stopped'}</label>
                    </div>
                </div>
            </div>

            {/* Port Number */}
            <h5 className='mt-3' style={{ fontWeight: '650' }}>Port Number</h5>
            <div className='d-flex align-items-center'>
                <label>Port:</label>
                <div className='card ms-2' style={{ backgroundColor: '#F5F6F5', borderRadius: '8px', minHeight: '100%' }}>
                    <span className='p-2'>{instance.port}</span>
                </div>
            </div>

            {/* Stream Topic */}
            {app && (
                <div className='mt-3'>
                    <h5 style={{ fontWeight: '650' }}>Stream Topic</h5>
                    <div className='card mt-2 col-4' style={{ backgroundColor: '#F5F6F5', borderRadius: '8px' }}>
                        <div className='card-body'>
                            <div onClick={() => navigate(`/streams/${instance.streamTopicId}`)}
                                style={{ cursor: 'pointer', textDecoration: 'none' }}
                                onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                                onMouseLeave={(e) => e.target.style.textDecoration = 'none'}>
                                {instance.streamTopic}
                            </div>
                            <span className='tiny-label' style={{ fontSize: '10px', color: 'gray' }} onClick={copyStreamId}>
                                <span style={{ cursor: 'pointer' }}>Stream Id: {instance.streamTopicId}</span>
                                {copiedStream && <span style={{ marginLeft: '5px', color: 'green' }}>Stream ID Copied!</span>}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Configuration */}
            <h5 className='mt-3' style={{ fontWeight: '650' }}>Configuration</h5>
            {app && app.customFields && app.customFields.length > 0 ? (
                <div className='row'>
                    {app.customFields.map((field, index) => {
                        const instanceField = instance.customFields.find(cf => cf.customFieldId === field._id);
                        if (!instanceField) return null;

                        const truncate = (str, length) => {
                            if (str.length <= length) return str;
                            return str.slice(0, length) + '...';
                        };

                        // To limit the amount of letters displayed
                        const truncatedName = truncate(field.name, 17);

                        return (
                            <div key={index} className={`col-md-${Math.ceil(12 / Math.min(app.customFields.length, 5))} mb-3`}>
                                <div className='card' style={{ backgroundColor: '#F5F6F5', borderRadius: '8px', minHeight: '100%' }}>
                                    <div className='card-body d-flex flex-column'>
                                        <div className='mb-2'>
                                            <span><strong>Name:</strong> {truncatedName}</span>
                                        </div>
                                        <div className='mb-2'>
                                            <span><strong>Type:</strong> {field.type}</span>
                                        </div>
                                        <div className='d-flex align-items-center'>
                                            <span className='me-2'><strong>Value:</strong></span>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={instanceField.value}
                                                readOnly // Make the value field read-only
                                                style={{ backgroundColor: '#FFFFFF', border: 'none', paddingLeft: '0.5rem' }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <p className='text-muted'>There are no custom fields defined for this app.</p>
            )}

            {/* App associated */}
            {app && (
                <div className='mt-1'>
                    <h5 style={{ fontWeight: '650' }}>App Associated</h5>
                    <div className='card mt-2 col-4' style={{ backgroundColor: '#F5F6F5', borderRadius: '8px' }}>
                        <div className='card-body'>
                            <div onClick={() => navigate(`/apps/${instance.appId}`)}
                                style={{ cursor: 'pointer', textDecoration: 'none' }}
                                onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                                onMouseLeave={(e) => e.target.style.textDecoration = 'none'}>
                                {app.name}
                            </div>
                            <span className='tiny-label' style={{ fontSize: '10px', color: 'gray' }} onClick={copyAppId}>
                                <FontAwesomeIcon icon={faCube} />
                                <span className='ms-1' style={{ cursor: 'pointer' }}>App Id: {app._id}</span>
                                {copiedApp && <span style={{ marginLeft: '5px', color: 'green' }}>App ID Copied!</span>}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Docker Logs Display */}
            <h5 className='mt-3' style={{ fontWeight: '650' }}>Faust Logs</h5>
            <div className='card' style={{ position: "relative", width: "100%" }}>
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

            {/* Buttons for Edit and Delete */}
            <div className="d-flex justify-content-end mb-4">
                <button className="btn btn-warning me-2" style={{ fontWeight: '500' }} onClick={handleEdit}><FontAwesomeIcon icon={faPenToSquare} /> Edit</button>
                <button className="btn btn-danger" style={{ fontWeight: '500' }} onClick={handleDelete}><FontAwesomeIcon icon={faTrash} /> Delete</button>
            </div>
        </div>
    );
}

export default InstanceDetails;