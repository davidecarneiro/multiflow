import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCube, faClock, faFolderPlus, faPenToSquare, faTrash, faCopy } from '@fortawesome/free-solid-svg-icons';

function InstanceDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [instance, setInstance] = useState(null);
    const [app, setApp] = useState(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [copiedApp, setCopiedApp] = useState(false);

    // Fetch instance details when the component mounts
    useEffect(() => {
        const fetchInstanceDetails = async () => {
            try {
                const response = await axios.get(`http://localhost:3001/instances/${id}`);
                setInstance(response.data);
                setLoading(false);
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
                    <div className='mt-3'>
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

                {/* Buttons for Edit and Delete */}
                <div className="d-flex justify-content-end">
                    <button className="btn btn-warning me-2" style={{ fontWeight: '500' }} onClick={handleEdit}><FontAwesomeIcon icon={faPenToSquare} /> Edit</button>
                    <button className="btn btn-danger" style={{ fontWeight: '500' }} onClick={handleDelete}><FontAwesomeIcon icon={faTrash} /> Delete</button>
                </div>
            </div>
        </div>
    );
}

export default InstanceDetails;