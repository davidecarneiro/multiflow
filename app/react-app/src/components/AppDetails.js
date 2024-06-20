import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFile, faClock, faFolderPlus, faPen, faTrash } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';

function AppDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [app, setApp] = useState(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [copiedPath, setCopiedPath] = useState(false);

    // Fetch app details when the component mounts
    useEffect(() => {
        const fetchAppDetails = async () => {
            try {
                const response = await axios.get(`http://localhost:3001/apps/${id}`);
                setApp(response.data);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching app details:', error);
                setLoading(false);
            }
        };

        fetchAppDetails();
    }, [id]);

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

    // Function to copy text to clip
    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setCopiedPath(true);
        setTimeout(() => {
            setCopiedPath(false);
        }, 1000); // Hide the confirmation message after 1 second
    };

    return (
        <div className="container-fluid">
            {/* Page header */}
            <div className='page-header mt-2'>
                <h1 className='page-title'>{app.name}</h1>
            </div>
            {/* Appp details such as id, 'type' and 'created at' */}
            <div className='d-flex justify-content-start'>
                <label className='tiny-label' style={{ fontSize: '10px', color: 'gray' }} onClick={copyAppId}>
                    <FontAwesomeIcon icon={faFile} />
                    <span className='ms-1' style={{ cursor: 'pointer' }}>Id: {app._id}</span>
                    {copied && <span style={{ marginLeft: '5px', color: 'green' }}>App ID Copied!</span>}
                </label>
                <label className='ms-4 tiny-label' style={{ fontSize: '10px', color: 'gray' }}><FontAwesomeIcon icon={faClock} /><span className='ms-1'>Last started: {app.dateLastStarted ? parseDate(app.dateLastStarted) : 'Never'}</span></label>
                <label className='ms-3 tiny-label' style={{ fontSize: '10px', color: 'gray' }}><FontAwesomeIcon icon={faFolderPlus} /><span className='ms-1'>Created at: </span> {formatDate(app.dateCreated)}</label>
                <label className='ms-3 tiny-label' style={{ fontSize: '10px', color: 'gray' }}><FontAwesomeIcon icon={faClock} /><span className='ms-1'>Last updated: {app.dateUpdated ? parseDate(app.dateUpdated) : 'Never'}</span></label>
            </div>

            {/* App details */}
            <div className='col-12 mt-3'>
                <h5 style={{ fontWeight: '650' }}>Description</h5>
                <h6>{app.description ? app.description : "This app has no description."}</h6>
                <h5 className='mt-3' style={{ fontWeight: '650' }}>App Details</h5>

                {/* Display app details */}
                <div className='d-flex justify-content-start align-items-center'>
                    <span className='me-2'>File Name:</span>
                    <div className='btn btn-light me-2' style={{ backgroundColor: '#e6e8e6', borderRadius: '8px', cursor: 'default' }}>
                        {app.filePath}
                    </div>
                </div>

                {/* Action buttons */}
                <div className="d-flex justify-content-end mt-3">
                    <button className="btn btn-primary me-2" style={{ fontWeight: '500' }} onClick={handleEdit}><FontAwesomeIcon icon={faPen} /> Edit</button>
                    <button className="btn btn-danger" style={{ fontWeight: '500' }} onClick={handleDelete}><FontAwesomeIcon icon={faTrash} /> Delete</button>
                </div>
            </div>
        </div>
    );
}

export default AppDetails;