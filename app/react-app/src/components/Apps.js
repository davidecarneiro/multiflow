import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay, faPause, faChevronDown, faChevronRight, faClock, faFolderPlus, faPlus, faSearch } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';

function Apps() {
    const [apps, setApps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedApp, setExpandedApp] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [instanceStatus, setInstanceStatus] = useState({});
    const navigate = useNavigate();

    // Fetch all apps when the component mounts
    useEffect(() => {
        fetchApps();
    }, []);

    // Function to fetch all apps
    const fetchApps = async () => {
        try {
            const response = await axios.get('http://localhost:3001/apps');
            setApps(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching apps:', error);
            setLoading(false);
        }
    };

    // Function to toggle the expansion of app details
    const toggleAppDescription = (appId) => {
        setExpandedApp(expandedApp === appId ? null : appId);
    };

    // Function to handle the search input change
    const handleSearchChange = (e) => {
        setSearchQuery(e.target.value);
    };

    // Function to execute search
    const handleSearch = async () => {
        try {
            const response = await axios.get(`http://localhost:3001/apps/search?query=${searchQuery}`);
            setApps(response.data);
        } catch (error) {
            console.error('Error searching apps:', error);
        }
    };

    // Function to handle Enter key press for search
    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    // Function to start or stop an app
    const handleToggle = (instanceId) => {
        const newStatus = !instanceStatus[instanceId];
        setInstanceStatus(prevState => ({
            ...prevState,
            [instanceId]: newStatus
        }));
        // Implementacao Temporaria!
    };

    // const handleAppStatus = async (appId, status) => {
    //     try {
    //         if (status) {
    //             // Stop app
    //             console.log("--> Stopping app");
    //             await axios.put(`http://localhost:3001/apps/${appId}`, { status: 'stop' });
    //         } else {
    //             // Start app
    //             console.log("--> Starting app");
    //             await axios.put(`http://localhost:3001/apps/${appId}`, { status: 'start' });
    //         }

    //         // Refresh app list after updating status
    //         fetchApps();
    //     } catch (error) {
    //         console.error('Error updating app status:', error);
    //     }
    // };

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

    // Function to format date
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();

        return `${hours}:${minutes} ${day}/${month}/${year}`;
    };

    return (
        <div className='container-fluid'>
            {/* Page header (title and btn) */}
            <div className='page-header mt-2 d-flex justify-content-between align-items-center'>
                <h1 className='page-title'>Apps</h1>
                <button className="btn btn-primary" onClick={() => navigate('/add-app')}>
                    <FontAwesomeIcon icon={faPlus} className="me-2" />
                    <span>Add App</span>
                </button>
            </div>
            <div className='panel-content mt-2'>
                {/* Search bar */}
                <div className='col-6'>
                    <div className="form-group d-flex justify-content-between align-items-center">
                        <label htmlFor="search" className="sr-only">Search</label>
                        <input type="text" className="form-control" name="search" id="search" placeholder="Search for apps" value={searchQuery} onChange={handleSearchChange} onKeyPress={handleKeyPress} />
                        <button className='ms-2 btn btn-secondary' style={{ backgroundColor: '#E6E8E6', border: 'none' }} onClick={handleSearch}><span><FontAwesomeIcon icon={faSearch} className='me-2 ms-2' style={{ color: '#000' }} /></span></button>
                    </div>
                </div>
                {/* Apps list */}
                {loading ? (
                    <h4>Loading apps...</h4>
                ) : (
                    <div className='col-12 mt-4'>
                        {apps.length === 0 ? (
                            <h4>No apps found.</h4>
                        ) : (
                            <ul className="list-group">
                                {apps.map(app => (
                                    <div key={app._id} className="mt-1 mb-1">
                                        {/* App Item List */}
                                        <div className='list-group-item' style={{ backgroundColor: '#e6e8e6', borderColor: '#e6e8e6', borderRadius: '8px' }}>
                                            <div className='row align-items-center'>
                                                <div className="col-md-9">
                                                    <div className="d-flex align-items-center">
                                                        <FontAwesomeIcon onClick={() => toggleAppDescription(app._id)} style={{ cursor: 'pointer' }} icon={expandedApp === app._id ? faChevronDown : faChevronRight} className="me-2" />
                                                        <span
                                                            className='ms-2'
                                                            onClick={() => navigate(`/apps/${app._id}`)}
                                                            style={{ cursor: 'pointer', textDecoration: 'none' }}
                                                            onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                                                            onMouseLeave={(e) => e.target.style.textDecoration = 'none'}>
                                                            {app.name}
                                                        </span>
                                                        {/* App details such as 'last started' and 'created at' */}
                                                        <div className="d-flex align-items-center mt-1">
                                                            <label className='ms-4 tiny-label' style={{ fontSize: '10px', color: 'gray' }}><FontAwesomeIcon icon={faClock} /><span className='ms-1'>Last updated: {app.dateUpdated ? parseDate(app.dateUpdated) : 'Never'}</span></label>
                                                            <label className='ms-3 tiny-label' style={{ fontSize: '10px', color: 'gray' }}><FontAwesomeIcon icon={faFolderPlus} /><span className='ms-1'>Created at: </span> {formatDate(app.dateCreated)}</label>
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* [[Unused]] App status button 
                                                <div className='col-md-3'>
                                                    <div className='d-flex align-items-center justify-content-end'>
                                                        <FontAwesomeIcon onClick={() => handleAppStatus(app._id, app.status)} icon={app.status ? faPause : faPlay} size="2x" style={{ cursor: 'pointer', display: 'flex', justifyContent: 'center' }} />
                                                    </div>
                                                </div>
                                                */}
                                            </div>
                                            {/* App description */}
                                            {expandedApp === app._id && (
                                                <p className="mt-2 mb-1">{app.description}</p>
                                            )}
                                        </div>
                                        {/* Instances List Associated to app (show if app is expanded) */}
                                        {expandedApp === app._id && (
                                            <div className='row d-flex justify-content-end'>
                                                <div className='col-11'>
                                                    {/* Conditional rendering based on whether the app has instances */}
                                                    {app.instances.length > 0 ? (
                                                        // Render instances if there are any associated
                                                        app.instances.map((instance, index) => (
                                                            <li key={index} className="list-group-item mt-1 mb-1" style={{ backgroundColor: '#F5F6F5', borderRadius: '8px' }}>
                                                                {/* Instance details */}
                                                                <div className="d-flex align-items-center">
                                                                    <div className='col-md-9'>
                                                                        <div className='d-flex align-items-center'>
                                                                            {/* Instance name */}
                                                                            <span
                                                                                className='ms-2'
                                                                                onClick={() => navigate(`/instances/${instance._id}`)}
                                                                                style={{ cursor: 'pointer', textDecoration: 'none' }}
                                                                                onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                                                                                onMouseLeave={(e) => e.target.style.textDecoration = 'none'}>
                                                                                {instance.name}
                                                                            </span>
                                                                            {/* Instance details such as 'last started' and 'created at' */}
                                                                            <label className='ms-4 tiny-label' style={{ fontSize: '10px', color: 'gray' }}><FontAwesomeIcon icon={faClock} /><span className='ms-1'>Last started: {instance.dateLastStarted ? parseDate(instance.dateLastStarted) : 'Never'}</span></label>
                                                                            <label className='ms-3 tiny-label' style={{ fontSize: '10px', color: 'gray' }}><FontAwesomeIcon icon={faFolderPlus} /><span className='ms-1'>Created at: </span> {formatDate(instance.dateCreated)}</label>
                                                                        </div>
                                                                    </div>
                                                                    {/* Instance status */}
                                                                    <div className='col-md-3'>
                                                                        <div className='d-flex align-items-center justify-content-end'>
                                                                            <div className="form-check form-switch" style={{ transform: 'scale(1.25)' }}>
                                                                                <input
                                                                                    className="form-check-input"
                                                                                    type="checkbox"
                                                                                    id={`switch-${instance._id}`}
                                                                                    checked={instanceStatus[instance._id]}
                                                                                    onChange={() => handleToggle(instance._id)}
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </li>
                                                        ))
                                                    ) : (
                                                        // Render message if there are no instances associated
                                                        <p className="mt-2 mb-1" style={{ fontSize: '14px', color: 'gray' }}>There are no instances associated with this app yet.</p>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default Apps;