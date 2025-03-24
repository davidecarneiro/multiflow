import React, { useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDiagramProject, faClock, faFolderPlus, faStop, faPlay, faPenToSquare, faTrash, faPlus } from '@fortawesome/free-solid-svg-icons';
import ProgressBar from 'react-bootstrap/ProgressBar';
import { ProgressContext } from './ProgressContext';
import { useRefresh } from './RefreshContext';

function ProjectDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [loadingProject, setLoadingProject] = useState(false);
    const [stoppingInProgress, setStoppingInProgress] = useState(false);
    const { projectPercentages, setProjectPercentages, streamPercentages, setStreamPercentages } = useContext(ProgressContext);
    const { triggerRefresh } = useRefresh();  

    // Functions to manage completed projects in localStorage
    const loadCompletedProjects = () => {
        try {
            const completedProjectsJSON = localStorage.getItem('completedProjects');
            return completedProjectsJSON ? JSON.parse(completedProjectsJSON) : {};
        } catch (error) {
            console.error('Error loading completed projects from localStorage:', error);
            return {};
        }
    };
    
    const saveCompletedProject = (projectId) => {
        try {
            const completedProjects = loadCompletedProjects();
            completedProjects[projectId] = true;
            localStorage.setItem('completedProjects', JSON.stringify(completedProjects));
            console.log(`Project ${projectId} marked as completed in localStorage`);
        } catch (error) {
            console.error('Error saving completed project to localStorage:', error);
        }
    };
    
    const isProjectCompleted = (projectId) => {
        const completedProjects = loadCompletedProjects();
        return completedProjects[projectId] === true;
    };

    const removeCompletedProject = (projectId) => {
        try {
            const completedProjects = loadCompletedProjects();
            delete completedProjects[projectId];
            localStorage.setItem('completedProjects', JSON.stringify(completedProjects));
            console.log(`Project ${projectId} removed from completed projects in localStorage`);
        } catch (error) {
            console.error('Error updating completed projects in localStorage:', error);
        }
    };

    // Get project details
    const fetchProjectDetails = useCallback(async () => {
        try {
            const response = await axios.get(`http://localhost:3001/projects/${id}`);
            setProject(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching project details:', error);
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchProjectDetails();
    }, [fetchProjectDetails]);


    // Function to start a stream
    const startStream = async (streamId) => {
        try {
            await axios.put(`http://localhost:3001/streams/start/${streamId}`);
            console.log(`Stream ${streamId} started`);
        } catch (error) {
            console.error(`Error starting stream ${streamId}:`, error);
        }
    };

    // Function to stop a stream
    const stopStream = async (streamId) => {
        try {
            await axios.put(`http://localhost:3001/streams/stop/${streamId}`);
            console.log(`Stream ${streamId} stopped`);
        } catch (error) {
            console.error(`Error stopping stream ${streamId}:`, error);
        }
    };

    // useEffect to monitor percentages
    useEffect(() => {
        // If the project is loaded and the percentage is 100%
        if (project && project.status && projectPercentages[project._id] >= 100) {
            console.log('Project reached 100% - stopping automatically');
            
            // Mark the project as completed in localStorage
            saveCompletedProject(project._id);
            
            // Stop the project
            handleProjectStatus(project._id, true);
        }
    }, [project, projectPercentages]);

  
    // Function to handle WebSocket messages
    const handleWebSocketMessage = useCallback((projectId, data) => {
        try {
            const parsedData = typeof data === 'string' ? JSON.parse(data) : data;

            if (Array.isArray(parsedData.streams) && parsedData.streams.length > 0) {
                const minPercentage = Math.min(...parsedData.streams.map(stream => parseFloat(stream.percentage)));
                console.log('Minimum percentage:', minPercentage);

                setProjectPercentages((prev) => ({
                    ...prev,
                    [projectId]: parseFloat(minPercentage),
                }));

                const newStreamPercentages = {};
                parsedData.streams.forEach(stream => {
                    newStreamPercentages[stream.streamId] = parseFloat(stream.percentage);
                });

                setStreamPercentages(prev => ({
                    ...prev,
                    ...newStreamPercentages,
                }));

                // If the project reaches 100%, stop the project
                if (minPercentage >= 100) {
                    console.log('Project completed! Stopping project...');
                    
                    // Mark the project as completed in localStorage
                    saveCompletedProject(projectId);
                    
                    // Avoid multiple calls to stop the project
                    if (!stoppingInProgress) {
                        setStoppingInProgress(true);
                        
                        // Update the visual state IMMEDIATELY before calling the API
                        setProject(prevProject => {
                            if (prevProject && prevProject._id === projectId) {
                                return { ...prevProject, status: false };
                            }
                            return prevProject;
                        });
                        
                        // Call the API to stop the project
                        axios.put(`http://localhost:3001/projects/stop/${projectId}`)
                            .then(() => {
                                console.log('Project stopped successfully after completion');
                                
                                // Stop all streams associated with the project
                                if (project) {
                                    project.streams.forEach(stream => {
                                        stopStream(stream._id);
                                    });
                                }
                                
                                // Close the WebSocket
                                if (window.projectWebSockets && window.projectWebSockets[projectId]) {
                                    const ws = window.projectWebSockets[projectId];
                                    if (ws.readyState === WebSocket.OPEN) {
                                        ws.close();
                                    }
                                    delete window.projectWebSockets[projectId];
                                }
                                
                                // Clear the percentages
                                setProjectPercentages(prev => {
                                    const newPercentages = { ...prev };
                                    delete newPercentages[projectId];
                                    return newPercentages;
                                });
                                
                                setStreamPercentages(prev => {
                                    const newPercentages = { ...prev };
                                    if (project) {
                                        project.streams.forEach(stream => {
                                            delete newPercentages[stream._id];
                                        });
                                    }
                                    return newPercentages;
                                });
                                
                                // Update project details
                                fetchProjectDetails();
                            })
                            .catch(error => {
                                console.error('Error stopping project after completion:', error);
                            })
                            .finally(() => {
                                setStoppingInProgress(false);
                            });
                    }
                }
            } else if (parsedData.status === 'stopped' && parsedData.projectId === projectId) {
                console.log(`Received confirmation that project ${projectId} was stopped`);
                
                // Update the local project state
                setProject(prevProject => 
                    prevProject && prevProject._id === projectId ? { ...prevProject, status: false } : prevProject
                );
                
                // Clear the percentages
                setProjectPercentages(prev => {
                    const newPercentages = { ...prev };
                    delete newPercentages[projectId];
                    return newPercentages;
                });
                
                setStreamPercentages(prev => {
                    const newPercentages = { ...prev };
                    if (project) {
                        project.streams.forEach(stream => {
                            delete newPercentages[stream._id];
                        });
                    }
                    return newPercentages;
                });
            } else {
                console.log('No streams available or different message format:', parsedData);
            }
        } catch (error) {
            console.error('Error processing WebSocket message:', error);
        }
    }, [setProjectPercentages, setStreamPercentages, project, fetchProjectDetails, stopStream, stoppingInProgress]);


    // Modify useEffect for WebSockets management
    useEffect(() => {
        if (!window.projectWebSockets) {
            window.projectWebSockets = {};
        }
        
        // Only set up WebSocket when the project is loaded, active
        // and there is NO WebSocket connection already established for this project
        if (project && project.status && !window.projectWebSockets[id]) {
            console.log('Checking if project is completed before creating WebSocket', id);
            
            // Check if the project has already been marked as completed
            if (isProjectCompleted(id)) {
                console.log('Project marked as completed in localStorage, not creating WebSocket');
                
                // Update the project state to stopped
                setProject(prevProject => {
                    if (prevProject) {
                        return { ...prevProject, status: false };
                    }
                    return prevProject;
                });
                
                // Update the backend to reflect that the project is stopped
                axios.put(`http://localhost:3001/projects/stop/${id}`)
                    .then(() => {
                        console.log('API call to stop completed project successful');
                        
                        // Stop all streams associated with the project
                        if (project) {
                            project.streams.forEach(stream => {
                                stopStream(stream._id);
                            });
                        }
                        
                        // Update project details
                        fetchProjectDetails();
                    })
                    .catch(error => {
                        console.error('Error stopping completed project:', error);
                    });
                
                return;
            }
            
            console.log('Creating new WebSocket for project', id);
            const ws = new WebSocket('ws://localhost:8082');
            window.projectWebSockets[id] = ws;
            
            ws.onopen = () => {
                console.log('WebSocket connection established for project', id);
                ws.send(id);
            };
            
            ws.onmessage = (event) => {
                console.log('Message received from server:', event.data);
                handleWebSocketMessage(id, event.data);
                
                // Check if the message indicates that the project is completed
                try {
                    const parsedData = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
                    
                    if (Array.isArray(parsedData.streams) && parsedData.streams.length > 0) {
                        const minPercentage = Math.min(...parsedData.streams.map(stream => parseFloat(stream.percentage)));
                        
                        // If the project reaches 100%, mark as completed in localStorage
                        if (minPercentage >= 100) {
                            console.log('Marking project as completed in localStorage');
                            saveCompletedProject(id);
                        }
                    }
                } catch (error) {
                    console.error('Error processing WebSocket message for completion check:', error);
                }
            };
            
            ws.onclose = () => {
                console.log('WebSocket connection closed for project', id);
                if (window.projectWebSockets[id] === ws) {
                    delete window.projectWebSockets[id];
                }
            };
            
            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
            };
        } else if (project && project.status) {
            console.log('Using existing WebSocket for project', id);
        }
        
        // Don't automatically close WebSockets when unmounting
        return () => {};
    }, [id, project, setProjectPercentages, setStreamPercentages, handleWebSocketMessage, stopStream, fetchProjectDetails]);


    // Function to start and stop project (using endpoints)
    const handleProjectStatus = async (projectId, status) => {
        try {
            setLoadingProject(true);
            
            if (status) { // If status is true, we are stopping the project
                console.log("--> Stop Project:", projectId);
                
                // Mark the project as not completed when stopping it manually
                removeCompletedProject(projectId);
                
                // Use the correct endpoint to stop the project
                await axios.put(`http://localhost:3001/projects/stop/${projectId}`);
                
                if (window.projectWebSockets && window.projectWebSockets[projectId]) {
                    const ws = window.projectWebSockets[projectId];
                    
                    if (ws.readyState === WebSocket.OPEN) {
                        console.log("Sending STOP command to WebSocket");
                        ws.send(`STOP:${projectId}`);
                        
                        // Wait for stop confirmation
                        const stopConfirmation = await new Promise((resolve) => {
                            const messageHandler = (event) => {
                                try {
                                    const data = JSON.parse(event.data);
                                    console.log("Message received after STOP command:", data);
                                    
                                    if (data.status === 'stopped' && data.projectId === projectId) {
                                        ws.removeEventListener('message', messageHandler);
                                        resolve(data);
                                    }
                                } catch (error) {
                                    console.error('Error processing WebSocket message:', error);
                                }
                            };
                            
                            ws.addEventListener('message', messageHandler);
                            
                            // Timeout in case confirmation is not received
                            setTimeout(() => {
                                ws.removeEventListener('message', messageHandler);
                                resolve({ status: 'timeout', projectId });
                            }, 5000);
                        });
                        
                        console.log('Stop confirmation received:', stopConfirmation);
                    }
                    
                    ws.close();
                    delete window.projectWebSockets[projectId];
                    console.log(`WebSocket connection for project ${projectId} closed`);
                }
                
                // Stop all streams associated with the project
                if (project) {
                    for (const stream of project.streams) {
                        await stopStream(stream._id);
                    }
                }
                
                // Update the local project state
                setProject(prevProject => ({
                    ...prevProject,
                    status: false
                }));
                
                // Clear the percentages
                setProjectPercentages(prev => {
                    const newPercentages = { ...prev };
                    delete newPercentages[projectId];
                    return newPercentages;
                });
                
                setStreamPercentages(prev => {
                    const newPercentages = { ...prev };
                    if (project) {
                        project.streams.forEach(stream => {
                            delete newPercentages[stream._id];
                        });
                    }
                    return newPercentages;
                });
                
            } else { // If status is false, we are starting the project
                console.log("--> Play Project:", projectId);
                
                // Use the correct endpoint to start the project
                await axios.put(`http://localhost:3001/projects/start/${projectId}`);
                
                // Start all streams associated with the project
                if (project) {
                    for (const stream of project.streams) {
                        await startStream(stream._id);
                    }
                }
                
                // Update the local project state
                setProject(prevProject => ({
                    ...prevProject,
                    status: true,
                    dateLastStarted: new Date().toISOString()
                }));
                
                // Check if a WebSocket already exists for this project
                if (window.projectWebSockets[projectId]) {
                    // Close existing connection if there is one
                    const existingWs = window.projectWebSockets[projectId];
                    if (existingWs.readyState === WebSocket.OPEN) {
                        existingWs.close();
                    }
                }
                
                // Create a new WebSocket
                const ws = new WebSocket('ws://localhost:8082');
                window.projectWebSockets[projectId] = ws;

                ws.onopen = () => {
                    console.log('WebSocket connection established');
                    ws.send(projectId);
                };

                ws.onmessage = (event) => {
                    console.log('Message received from server:', event.data);
                    handleWebSocketMessage(projectId, event.data);
                };

                ws.onclose = () => {
                    console.log('WebSocket connection closed');
                    if (window.projectWebSockets[projectId] === ws) {
                        delete window.projectWebSockets[projectId];
                    }
                };

                ws.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    alert('WebSocket connection error. Check the console for more details.');
                };
            }

            // Refresh project details after updating status
            await fetchProjectDetails();
        } catch (error) {
            console.error('Error updating project status:', error);
            alert(`Error ${status ? 'stopping' : 'starting'} the project: ${error.message}`);
        } finally {
            setLoadingProject(false);
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
            // Close WebSocket if it's open
            if (window.projectWebSockets && window.projectWebSockets[id]) {
                const ws = window.projectWebSockets[id];
                if (ws.readyState === WebSocket.OPEN) {
                    ws.close();
                }
                delete window.projectWebSockets[id];
            }
            
            // Remove the project from the list of completed projects
            removeCompletedProject(id);
            
            await axios.delete(`http://localhost:3001/projects/${project._id}`);
            // Redirecting the user to the projects page after successful deletion
            navigate('/');
        } catch (error) {
            console.error('Error deleting project:', error);
            alert(`Error deleting the project: ${error.message}`);
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
        <div className="container-fluid">
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

                {/* Project status */}
                {project.streams.length === 0 ? (
                    <></> // No content to show if there are no streams related
                ) : (
                    <> {/* Show if there are streams related */}
                        <h5 className='mt-3' style={{ fontWeight: '650' }}>Project Status</h5>
                        <div className='card mt-2 col-md-12' style={{ backgroundColor: '#F5F6F5', borderRadius: '8px' }}>
                            <div className='card-body d-flex align-items-center'>
                                {loadingProject ? (
                                    <div className="spinner-border spinner-border-sm" role="status">
                                        <span className="visually-hidden">Loading...</span>
                                    </div>
                                ) : (
                                    <FontAwesomeIcon 
                                        onClick={() => handleProjectStatus(project._id, project.status)} 
                                        icon={project.status ? faStop : faPlay} 
                                        size="2x" 
                                        style={{ cursor: 'pointer' }} 
                                    />
                                )}
                                <span className='ms-4'>{project.status ? 'Project is currently running' : 'Project is currently paused'}</span>
                                {/* Progress bar for project completion */}
                                <div className='ms-auto' style={{ width: '60%' }}>
                                    <ProgressBar
                                        now={projectPercentages[project._id] || 0}
                                        label={`${projectPercentages[project._id] ? projectPercentages[project._id].toFixed(0) : 0}%`}
                                        style={{ width: '100%', height: '20px' }}
                                    />
                                </div>
                            </div>
                        </div>
                    </>
                )}

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
                                                <div className='col-12'>
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
                                                    <div className='d-flex justify-content-start align-items-center mt-2'>
                                                        {/* Conditionally render the progress bar */}
                                                        {stream.playbackConfigType !== 'realTime' && (
                                                            <ProgressBar
                                                                now={streamPercentages[stream._id] || 0}
                                                                label={`${streamPercentages[stream._id] ? streamPercentages[stream._id].toFixed(0) : 0}%`}
                                                                style={{ width: '100%', height: '20px' }}
                                                            />
                                                        )}
                                                    </div>
                                                </div>
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

                {/* Project Edit and Delete Buttons */}
                <div className="d-flex justify-content-end mb-4">
                    <button className="btn btn-warning me-2" style={{ fontWeight: '500' }} onClick={handleEdit}><FontAwesomeIcon icon={faPenToSquare} /> Edit</button>
                    <button className="btn btn-danger" style={{ fontWeight: '500' }} onClick={handleDelete}><FontAwesomeIcon icon={faTrash} /> Delete</button>
                </div>
            </div>
        </div>
    );
}

export default ProjectDetails;
