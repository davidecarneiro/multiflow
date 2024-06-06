import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDatabase, faClock, faFolderPlus, faPenToSquare, faTrash, faCopy } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';

function DatasourcesDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [dataSource, setDataSource] = useState(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [copiedPath, setCopiedPath] = useState(false);

    // Endpoint to get data source details
    useEffect(() => {
        const fetchDataSourcesDetails = async () => {
            try {
                const response = await axios.get(`http://localhost:3001/dataSources/${id}`);
                setDataSource(response.data);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching data source details:', error);
                setLoading(false);
            }
        };

        fetchDataSourcesDetails();
    }, [id]);

    // Endpoint to delete the data source
    const handleDelete = async () => {
        // Asking the user for confirmation before deleting
        const confirmDelete = window.confirm("Are you sure you want to delete this data source?");
        if (!confirmDelete) {
            return; // If the user cancels the deletion, exit the function
        }

        try {
            await axios.delete(`http://localhost:3001/dataSources/${dataSource._id}`);
            // Redirecting the user to the data sources page after successful deletion
            navigate('/dataSources');
        } catch (error) {
            console.error('Error deleting data source:', error);
        }
    };

    // To update the data source details
    const handleEdit = () => {
        navigate(`/edit-data-source/${id}`);
    };

    // To show up when loading data sources
    if (loading) {
        return <div className='container'><div className='page-header mt-2'><h4 className='page-title'>Loading data source details...</h4></div></div>;
    }
    // To show up when 404 error
    if (!dataSource) {
        return <div className='container'><div className='page-header mt-2'><h4 className='page-title'>Data source not found</h4></div></div>;
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
    const copyDataSourceId = () => {
        navigator.clipboard.writeText(dataSource._id);
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
        <div className="container">
            {/* Page header */}
            <div className='page-header mt-2'>
                <h1 className='page-title'>{dataSource.name}</h1>
            </div>
            {/* Data Source details such as id, 'type' and 'created at' */}
            <div className='d-flex justify-content-start'>
                <label className='tiny-label' style={{ fontSize: '10px', color: 'gray' }} onClick={copyDataSourceId}>
                    <FontAwesomeIcon icon={faDatabase} />
                    <span className='ms-1' style={{ cursor: 'pointer' }}>Id: {dataSource._id}</span>
                    {copied && <span style={{ marginLeft: '5px', color: 'green' }}>Data Source ID Copied!</span>}
                </label>
                <label className='ms-3 tiny-label' style={{ fontSize: '10px', color: 'gray' }}><FontAwesomeIcon icon={faClock} /><span className='ms-1'>Last updated: {dataSource.dateUpdated ? parseDate(dataSource.dateUpdated) : 'Never'}</span></label>
                <label className='ms-3 tiny-label' style={{ fontSize: '10px', color: 'gray' }}><FontAwesomeIcon icon={faFolderPlus} /><span className='ms-1'>Created at: </span> {formatDate(dataSource.dateCreated)}</label>
            </div>
            {/* Data Source Details */}
            <div className='col-12 mt-3'>
                <h5 style={{ fontWeight: '650' }}>Description</h5>
                <h6>{dataSource.description ? dataSource.description : "This data source has no description."}</h6>
                <h5 className='mt-3' style={{ fontWeight: '650' }}>Data Source</h5>

                {/* Display dataSourceType and details */}
                <div className='d-flex justify-content-start align-items-center'>
                    <span className='me-2'>Type:</span>
                    <div className='btn btn-light me-2' style={{ backgroundColor: '#e6e8e6', borderRadius: '8px', cursor: 'default' }}>
                        {dataSource.dataSourceType === 'SQL' ? (
                            <span>SQL</span>
                        ) : (
                            <span>File</span>
                        )}
                    </div>
                    <span className='me-2'>
                        {dataSource.dataSourceType === 'SQL' ? (
                            <span>Connection String:</span>
                        ) : (
                            <span>Path:</span>
                        )}
                    </span>
                    <div className='btn btn-light me-2' style={{ backgroundColor: '#e6e8e6', borderRadius: '8px', cursor: 'text' }}>
                        {dataSource.dataSourceType === 'SQL' ? dataSource.connectionString : dataSource.filePath}
                        <FontAwesomeIcon icon={faCopy} className="ms-3" onClick={() => copyToClipboard(dataSource.dataSourceType === 'SQL' ? dataSource.connectionString : dataSource.filePath)} style={{ cursor: 'pointer' }} />
                        {copiedPath && <span className="ms-2" style={{ color: 'green' }}>Copied!</span>}
                    </div>
                </div>

                <div className="d-flex justify-content-end mt-3">
                    <button className="btn btn-warning me-2" style={{ fontWeight: '500' }} onClick={handleEdit}><FontAwesomeIcon icon={faPenToSquare} /> Edit</button>
                    <button className="btn btn-danger" style={{ fontWeight: '500' }} onClick={handleDelete}><FontAwesomeIcon icon={faTrash} /> Delete</button>
                </div>
            </div>
        </div>
    );
}

export default DatasourcesDetails;
