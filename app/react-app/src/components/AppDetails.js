import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCube, faClock, faFolderPlus, faPenToSquare, faTrash, faPlus, faPassport } from '@fortawesome/free-solid-svg-icons';

function AppDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [app, setApp] = useState(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [instanceStatus, setInstanceStatus] = useState({});

    // Fetch app details when the component mounts
    useEffect(() => {
        const fetchAppDetails = async () => {
            try {
                const response = await axios.get(`http://localhost:3001/apps/${id}`);
                setApp(response.data);
                // Initialize instance statuses based on fetched data
                const initialStatus = response.data.instances.reduce((acc, instance) => {
                    acc[instance._id] = instance.status; // Assume the API returns status
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

    // Function to handle click event of "Add Instance" button
    const handleAddInstanceClick = () => {
        navigate(`/add-instance?appId=${app._id}`);
    };

    // Function to start or stop an instance
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
        if (!confirmDelete) {
            return;
        }

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

    // Function to copy data source ID to clipboard and show confirmation message
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
                <label className='ms-4 tiny-label' style={{ fontSize: '10px', color: 'gray' }}><FontAwesomeIcon icon={faClock} /><span className='ms-1'>Last started: {app.dateLastStarted ? parseDate(app.dateLastStarted) : 'Never'}</span></label>
                <label className='ms-3 tiny-label' style={{ fontSize: '10px', color: 'gray' }}><FontAwesomeIcon icon={faFolderPlus} /><span className='ms-1'>Created at: </span> {formatDate(app.dateCreated)}</label>
                <label className='ms-3 tiny-label' style={{ fontSize: '10px', color: 'gray' }}><FontAwesomeIcon icon={faClock} /><span className='ms-1'>Last updated: {app.dateUpdated ? parseDate(app.dateUpdated) : 'Never'}</span></label>
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
                            const truncate = (str, length) => {
                                if (str.length <= length) return str;
                                return str.slice(0, length) + '...';
                            };

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
                                        <div className='card' style={{ backgroundColor: '#F5F6F5', borderRadius: '8px' }}>
                                            <div className='card-body d-flex justify-content-between align-items-center'>
                                                <div className='col-10'>
                                                    {/* Instance name */}
                                                    <span
                                                        onClick={() => navigate(`/instances/${instance._id}`)}
                                                        style={{ cursor: 'pointer', textDecoration: 'none' }}
                                                        onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                                                        onMouseLeave={(e) => e.target.style.textDecoration = 'none'}>
                                                        {instance.name}
                                                    </span>
                                                    <div className='d-flex justify-content-start align-items-center mt-2'>
                                                        {/* Instance details such as 'last started' and 'created at' */}
                                                        <label className='tiny-label' style={{ fontSize: '10px', color: 'gray' }}><FontAwesomeIcon icon={faClock} /><span className='ms-1'>{instance.dateLastStarted ? parseDate(instance.dateLastStarted) : 'Never'}</span></label>
                                                        <label className='ms-3 tiny-label' style={{ fontSize: '10px', color: 'gray' }}><FontAwesomeIcon icon={faFolderPlus} /><span className='ms-1'></span> {formatDate(instance.dateCreated)}</label>
                                                        <label className='ms-3 tiny-label' style={{ fontSize: '10px', color: 'gray' }}><FontAwesomeIcon icon={faPassport} /><span className='ms-1'></span>{instance.port}</label>
                                                    </div>
                                                </div>
                                                {/* Toggle instance switch */}
                                                <div className='col-md-2'>
                                                    <div className='d-flex align-items-center justify-content-end'>
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
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {/* Fill remaining spaces in the row */}
                                {Array.from({ length: 5 - (app.instances.length % 5) }, (_, i) => (
                                    <div key={i} className={`col-md-${Math.ceil(12 / Math.min(app.instances.length, 5))} mb-3`} />
                                ))}
                            </>
                        )}
                    </div>
                </div>

                {/* Action buttons */}
                <div className="d-flex justify-content-end mt-3">
                    <button className="btn btn-warning me-2" style={{ fontWeight: '500' }} onClick={handleEdit}><FontAwesomeIcon icon={faPenToSquare} /> Edit</button>
                    <button className="btn btn-danger" style={{ fontWeight: '500' }} onClick={handleDelete}><FontAwesomeIcon icon={faTrash} /> Delete</button>
                </div>
            </div>
        </div>
    );
}

export default AppDetails;