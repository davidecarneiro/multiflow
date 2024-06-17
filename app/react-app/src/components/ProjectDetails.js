import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDiagramProject, faClock, faFolderPlus, faPause, faPlay, faPenToSquare, faTrash, faPlus } from '@fortawesome/free-solid-svg-icons';

function ProjectDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [totalPercentage, setTotalPercentage] = useState(0);

    // Get project details
    useEffect(() => {
        fetchProjectDetails();
    }, [id]);

    // Endpoint to get project details
    const fetchProjectDetails = async () => {
        try {
            const response = await axios.get(`http://localhost:3001/projects/${id}`);
            setProject(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching project details:', error);
            setLoading(false);
        }
    };
    fetchProjectDetails();

    // Function to start and stop project (using endpoints)
    const handleProjectStatus = async (projectId, status) => {
        try {
            if (status) {
                // Stop project
                await axios.put(`http://localhost:3001/projects/stop/${projectId}`);
                console.log("--> Stop Project");
            } else {
                // Start project
                await axios.put(`http://localhost:3001/projects/start/${projectId}`);
                console.log("--> Play Project");
                const ws = new WebSocket('ws://localhost:8082');

                // Event listeners for WebSocket events
                ws.onopen = () => {
                    console.log('WebSocket connection established');
                    ws.send(projectId);
                };

                ws.onmessage = (event) => {
                    console.log('Message received from server:', event.data);
                    const data = JSON.parse(event.data);
                    setTotalPercentage(prev => prev + data.percentage);
                    console.log('Message received from server:', data);
                    //setStatus(event.data);
                };

                ws.onclose = () => {
                    console.log('WebSocket connection closed');
                };

                ws.onerror = (error) => {
                    console.error('WebSocket error:', error);
                };
            }
            // Refresh project list after updating status
            fetchProjectDetails(id);
        } catch (error) {
            console.error('Error updating project status:', error);
        }
    };

    // Function to handle click event of "Add Stream" button
    const handleAddStreamClick = () => {
        navigate(`/add-stream?projectId=${project._id}`); // Pass projectId as URL parameter
    };

    // Endpoint to delete the project
    const handleDelete = async () => {
        // Asking the user for confirmation before deleting
        const confirmDelete = window.confirm("Are you sure you want to delete this project?");
        if (!confirmDelete) {
            return; // If the user cancels the deletion, exit the function
        }

        try {
            await axios.delete(`http://localhost:3001/projects/${project._id}`);
            // Redirecting the user to the projects page after successful deletion
            navigate('/');
        } catch (error) {
            console.error('Error deleting project:', error);
        }
    };

    // To update the project details
    const handleEdit = () => {
        navigate(`/edit-project/${id}`);
    };

    // To show up when loading projects
    if (loading) {
        return <div className='container'><div className='page-header mt-2'><h4 className='page-title'>Loading project details...</h4></div></div>;
    }
    // To show up when 404 error
    if (!project) {
        return <div className='container'><div className='page-header mt-2'><h4 className='page-title'>Project not found</h4></div></div>;
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

    // Function to copy project ID to clipboard and show confirmation message
    const copyProjectId = () => {
        navigator.clipboard.writeText(project._id);
        setCopied(true);
        setTimeout(() => {
            setCopied(false);
        }, 1000); // Hide the confirmation message after 1 second
    };

    return (
        <div className="container">
            {/* Page header */}
            <div className='page-header mt-2'>
                <h1 className='page-title'>{project.name}</h1>
            </div>
            {/* Project details such as id, 'last started' and 'created at' */}
            <div className='d-flex justify-content-start'>
                <label className='tiny-label' style={{ fontSize: '10px', color: 'gray' }} onClick={copyProjectId}>
                    <FontAwesomeIcon icon={faDiagramProject} />
                    <span className='ms-1' style={{ cursor: 'pointer' }}>Id: {project._id}</span>
                    {copied && <span style={{ marginLeft: '5px', color: 'green' }}>Project ID Copied!</span>}
                </label>
                <label className='ms-4 tiny-label' style={{ fontSize: '10px', color: 'gray' }}><FontAwesomeIcon icon={faClock} /><span className='ms-1'>Last started: {project.dateLastStarted ? parseDate(project.dateLastStarted) : 'Never'}</span></label>
                <label className='ms-3 tiny-label' style={{ fontSize: '10px', color: 'gray' }}><FontAwesomeIcon icon={faFolderPlus} /><span className='ms-1'>Created at: </span> {formatDate(project.dateCreated)}</label>
            </div>
            {/* Project Details */}
            <div className='col-12 mt-3'>
                {/* Description */}
                <h5 style={{ fontWeight: '650' }}>Description</h5>
                <h6>{project.description ? project.description : "This project has no description."}</h6>

                {/* Streams list */}
                <div className='col-12 mt-3'>
                    <div className='page-header mt-2 mb-2 d-flex justify-content-between align-items-center'>
                        <h5 style={{ fontWeight: '650' }}>Streams associated</h5>
                        <button className="btn btn-sm btn-primary" onClick={handleAddStreamClick}>
                            <FontAwesomeIcon icon={faPlus} className="me-2" />
                            <span>Add Stream</span>
                        </button>
                    </div>
                    {/* Streams Cards */}
                    <div className='row'>
                        {project.streams.length === 0 ? (
                            <p className='text-muted'>There are no streams associated with this project yet.</p>
                        ) : (
                            <>
                                {project.streams.map((stream, index) => (
                                    <div key={stream._id} className={`col-md-${Math.ceil(12 / Math.min(project.streams.length, 5))} mb-3`}>
                                        <div className='card' style={{ backgroundColor: '#F5F6F5', borderRadius: '8px' }}>
                                            <div className='card-body d-flex justify-content-between align-items-center'>
                                                <div className='col-10'>
                                                    {/* Stream topic */}
                                                    <span
                                                        onClick={() => navigate(`/streams/${stream._id}`)}
                                                        style={{ cursor: 'pointer', textDecoration: 'none' }}
                                                        onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                                                        onMouseLeave={(e) => e.target.style.textDecoration = 'none'}>
                                                        {stream.topic}
                                                    </span>
                                                    <div className='d-flex justify-content-start align-items-center mt-2'>
                                                        {/* Stream details such as 'last started' and 'created at' */}
                                                        <label className='tiny-label' style={{ fontSize: '10px', color: 'gray' }}><FontAwesomeIcon icon={faClock} /><span className='ms-1'>{stream.dateLastStarted ? parseDate(stream.dateLastStarted) : 'Never'}</span></label>
                                                        <label className='ms-3 tiny-label' style={{ fontSize: '10px', color: 'gray' }}><FontAwesomeIcon icon={faFolderPlus} /><span className='ms-1'></span> {formatDate(stream.dateCreated)}</label>
                                                    </div>
                                                </div>
                                                <FontAwesomeIcon className='me-1' onClick={() => handleProjectStatus(stream._id, stream.status)} icon={stream.status ? faPause : faPlay} style={{ cursor: 'pointer', fontSize: '30px', display: 'flex', justifyContent: 'center' }} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {/* Fill remaining spaces in the row */}
                                {Array.from({ length: 5 - (project.streams.length % 5) }, (_, i) => (
                                    <div key={i} className={`col-md-${Math.ceil(12 / Math.min(project.streams.length, 5))} mb-3`} />
                                ))}
                            </>
                        )}
                    </div>
                </div>

                {/* Project status */}
                <h5 className='mt-3' style={{ fontWeight: '650' }}>Project Status</h5>
                <div className='card mt-2 col-4' style={{ backgroundColor: '#F5F6F5', borderRadius: '8px' }}>
                    <div className='card-body d-flex align-items-center'>
                        <FontAwesomeIcon onClick={() => handleProjectStatus(project._id, project.status)} icon={project.status ? faPause : faPlay} size="2x" style={{ cursor: 'pointer' }} />
                        <span className='ms-4'>{project.status ? 'Project is currently running' : 'Project is currently paused'}</span>
                    </div>
                </div>

                {/* Project Edit and Delete Buttons */}
                <div className="d-flex justify-content-end">
                    <button className="btn btn-warning me-2" style={{ fontWeight: '500' }} onClick={handleEdit}><FontAwesomeIcon icon={faPenToSquare} /> Edit</button>
                    <button className="btn btn-danger" style={{ fontWeight: '500' }} onClick={handleDelete}><FontAwesomeIcon icon={faTrash} /> Delete</button>
                </div>
            </div>
        </div>
    );
}

export default ProjectDetails;