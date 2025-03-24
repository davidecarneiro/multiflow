import axios from 'axios';
import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faSearch, faChevronRight, faClock, faFolderPlus, faStop, faPlay } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import { ProgressBar } from 'react-bootstrap';
import { ProgressContext } from './ProgressContext';
import { useRefresh } from './RefreshContext';

function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedProjects, setExpandedProjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingProjects, setLoadingProjects] = useState({});
  const navigate = useNavigate();
  const { projectPercentages, setProjectPercentages, streamPercentages, setStreamPercentages } = useContext(ProgressContext);
  const { triggerRefresh } = useRefresh();
  const handleProjectStatusRef = useRef();
  const [stoppingInProgress, setStoppingInProgress] = useState({});
  const wsSetupCompleteRef = useRef({});

  // Get all projects
  useEffect(() => {
    fetchProjects();
  }, []);

  // Endpoint to get all projects
  const fetchProjects = async () => {
    try {
      const response = await axios.get('http://localhost:3001/projects');
      setProjects(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching projects:', error);
      setLoading(false);
    }
  };

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

  // Function to start and stop project (using endpoints)
  const handleProjectStatus = async (projectId, status) => {
    try {
      console.log(`handleProjectStatus called with projectId=${projectId}, status=${status}`);
      
      // Check if it is already in the stopping process
      if (stoppingInProgress[projectId]) {
        console.log(`Project ${projectId} is already being stopped`);
        return;
      }
      
      if (status) {
        setStoppingInProgress(prev => ({ ...prev, [projectId]: true }));
      }
      
      setLoadingProjects(prev => ({ ...prev, [projectId]: true }));
      
      if (status) {
        console.log("--> Stop Project:", projectId);
        
        // Mark the project as not completed when stopping it manually
        removeCompletedProject(projectId);
        
        // Send stop command to WebSocket
        if (window.projectWebSockets && window.projectWebSockets[projectId]) {
          const ws = window.projectWebSockets[projectId];
          
          if (ws.readyState === WebSocket.OPEN) {
            console.log("Sending STOP command to WebSocket");
            ws.send(`STOP:${projectId}`);
            
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
              
              setTimeout(() => {
                ws.removeEventListener('message', messageHandler);
                resolve({ status: 'timeout', projectId });
              }, 5000);
            });
            
            console.log('Stop confirmation received:', stopConfirmation);
          }
          
          // Close the WebSocket when the project is stopped
          ws.close();
          delete window.projectWebSockets[projectId];
          console.log(`WebSocket connection for project ${projectId} closed`);
        }
        
        // Call the API to stop the project
        await axios.put(`http://localhost:3001/projects/stop/${projectId}`)
          .then(() => {
            console.log('API call to stop project successful');
          })
          .catch(error => {
            console.error('API call to stop project failed:', error);
            throw error;
          });
        
        // Stop all streams associated with the project
        const project = projects.find(p => p._id === projectId);
        if (project) {
          for (const stream of project.streams) {
            await stopStream(stream._id);
          }
        }
        
        // Update the local project state
        setProjects(prevProjects => 
          prevProjects.map(p => 
            p._id === projectId ? { ...p, status: false } : p
          )
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
        
        // Reset the WebSocket setup flag for this project
        wsSetupCompleteRef.current = {
          ...wsSetupCompleteRef.current,
          [projectId]: false
        };
        
        triggerRefresh();
        
      } else {
        console.log("--> Play Project:", projectId);
        
        // Call the API to start the project
        await axios.put(`http://localhost:3001/projects/start/${projectId}`);
        
        // Start all streams associated with the project
        const project = projects.find(p => p._id === projectId);
        if (project) {
          for (const stream of project.streams) {
            await startStream(stream._id);
          }
        }
        
        // Update the local project state
        setProjects(prevProjects => 
          prevProjects.map(p => 
            p._id === projectId ? { ...p, status: true, dateLastStarted: new Date() } : p
          )
        );

        // Check if a WebSocket already exists for this project
        if (window.projectWebSockets && window.projectWebSockets[projectId]) {
          // Close existing connection if there is one
          const existingWs = window.projectWebSockets[projectId];
          if (existingWs.readyState === WebSocket.OPEN) {
            existingWs.close();
          }
          delete window.projectWebSockets[projectId];
        }
        
        // Initialize the global WebSocket container if it doesn't exist
        if (!window.projectWebSockets) {
          window.projectWebSockets = {};
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
          // Reset the WebSocket setup flag when connection is closed
          wsSetupCompleteRef.current = {
            ...wsSetupCompleteRef.current,
            [projectId]: false
          };
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          alert('WebSocket connection error. Check the console for more details.');
        };
        
        // Mark WebSocket setup as complete for this project
        wsSetupCompleteRef.current = {
          ...wsSetupCompleteRef.current,
          [projectId]: true
        };
        
        triggerRefresh();
      }

      // Update the list of projects
      await fetchProjects();
    } catch (error) {
      console.error('Error updating project status:', error);
      alert(`Error ${status ? 'stopping' : 'starting'} the project: ${error.message}`);
    } finally {
      setLoadingProjects(prev => {
        const newLoading = { ...prev };
        delete newLoading[projectId];
        return newLoading;
      });
      
      if (status) {
        setStoppingInProgress(prev => {
          const newStopping = { ...prev };
          delete newStopping[projectId];
          return newStopping;
        });
      }
    }
  };

  // Update the handleProjectStatus function reference
  useEffect(() => {
    handleProjectStatusRef.current = handleProjectStatus;
  }, [projects, setProjectPercentages, setStreamPercentages, triggerRefresh]);

  // Handle WebSocket messages
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

        // If the project reaches or exceeds 100%, stop the project and update the visual state immediately
        if (minPercentage >= 100) {
          console.log('Project completed! Stopping project...');
          
          // Mark the project as completed in localStorage
          saveCompletedProject(projectId);
          
          // Update the visual state IMMEDIATELY before calling the API
          setProjects(prevProjects => 
            prevProjects.map(p => 
              p._id === projectId ? { ...p, status: false } : p
            )
          );
          
          // Stop the project via the API if it is not already in the process of being stopped
          if (!stoppingInProgress[projectId] && handleProjectStatusRef.current) {
            setStoppingInProgress(prev => ({ ...prev, [projectId]: true }));
            
            // Call the API to stop the project using the ref to the current function
            handleProjectStatusRef.current(projectId, true);
          }
        }
      } else if (parsedData.status === 'stopped' && parsedData.projectId === projectId) {
        console.log(`Received confirmation that project ${projectId} was stopped`);
        
        // Update the visual state
        setProjects(prevProjects => 
          prevProjects.map(p => 
            p._id === projectId ? { ...p, status: false } : p
          )
        );
        
        // Clear the percentages
        setProjectPercentages(prev => {
          const newPercentages = { ...prev };
          delete newPercentages[projectId];
          return newPercentages;
        });
        
        setStreamPercentages(prev => {
          const newPercentages = { ...prev };
          const project = projects.find(p => p._id === projectId);
          if (project) {
            project.streams.forEach(stream => {
              delete newPercentages[stream._id];
            });
          }
          return newPercentages;
        });
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  }, [projects, setProjectPercentages, setStreamPercentages, stoppingInProgress]);

  // Modify useEffect for WebSockets management
  useEffect(() => {
    // Initialize the global WebSocket container if it doesn't exist
    if (!window.projectWebSockets) {
      window.projectWebSockets = {};
    }
    
    // For each active project, check if it already has a WebSocket and create it if it doesn't
    projects.forEach(async (project) => {
      // Check if the project is active AND if it does not have a WebSocket already established
      // AND if the WebSocket setup hasn't been completed for this project
      if (project.status && 
          !window.projectWebSockets[project._id] && 
          !wsSetupCompleteRef.current[project._id]) {
        
        console.log('Checking if project is completed before creating WebSocket', project._id);
        
        // Check if the project has already been marked as completed
        if (isProjectCompleted(project._id)) {
          console.log('Project marked as completed in localStorage, not creating WebSocket');
          
          // Update the project state to stopped
          setProjects(prevProjects => 
            prevProjects.map(p => 
              p._id === project._id ? { ...p, status: false } : p
            )
          );
          
          // Update the backend to reflect that the project is stopped
          try {
            await axios.put(`http://localhost:3001/projects/stop/${project._id}`);
            console.log('API call to stop completed project successful');
            
            // Stop all streams associated with the project
            for (const stream of project.streams) {
              await stopStream(stream._id);
            }
          } catch (error) {
            console.error('Error stopping completed project:', error);
          }
          
          // Mark WebSocket setup as complete for this project to prevent repeated attempts
          wsSetupCompleteRef.current = {
            ...wsSetupCompleteRef.current,
            [project._id]: true
          };
          
          return;
        }
        
        // If the project is not marked as completed, create WebSocket normally
        console.log('Creating new WebSocket for project', project._id);
        const ws = new WebSocket('ws://localhost:8082');
        window.projectWebSockets[project._id] = ws;
        
        ws.onopen = () => {
          console.log('WebSocket connection established for project', project._id);
          ws.send(project._id);
        };
        
        ws.onmessage = (event) => {
          console.log('Message received from server:', event.data);
          handleWebSocketMessage(project._id, event.data);
          
          // Check if the message indicates that the project is completed
          try {
            const parsedData = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
            
            if (Array.isArray(parsedData.streams) && parsedData.streams.length > 0) {
              const minPercentage = Math.min(...parsedData.streams.map(stream => parseFloat(stream.percentage)));
              
              // If the project reaches 100%, mark as completed in localStorage
              if (minPercentage >= 100) {
                console.log('Marking project as completed in localStorage');
                saveCompletedProject(project._id);
              }
            }
          } catch (error) {
            console.error('Error processing WebSocket message for completion check:', error);
          }
        };
        
        ws.onclose = () => {
          console.log('WebSocket connection closed for project', project._id);
          // Only remove the reference if it's the same WebSocket
          if (window.projectWebSockets[project._id] === ws) {
            delete window.projectWebSockets[project._id];
          }
          // Reset the WebSocket setup flag when connection is closed
          wsSetupCompleteRef.current = {
            ...wsSetupCompleteRef.current,
            [project._id]: false
          };
        };
        
        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
        };
        
        // Mark WebSocket setup as complete for this project
        wsSetupCompleteRef.current = {
          ...wsSetupCompleteRef.current,
          [project._id]: true
        };
      } else if (project.status && window.projectWebSockets[project._id]) {
        console.log('Using existing WebSocket for project', project._id);
        
        // Add event listener to the existing WebSocket to ensure this component
        // receives and processes messages
        const existingWs = window.projectWebSockets[project._id];
        
        // Only add the event listener if the WebSocket is open
        if (existingWs.readyState === WebSocket.OPEN && !wsSetupCompleteRef.current[project._id]) {
          const messageHandler = (event) => {
            handleWebSocketMessage(project._id, event.data);
          };
          
          // Add the message handler
          existingWs.addEventListener('message', messageHandler);
          
          // Mark WebSocket setup as complete for this project
          wsSetupCompleteRef.current = {
            ...wsSetupCompleteRef.current,
            [project._id]: true
          };
          
          // We don't remove this event listener when the component unmounts
          // because we want the WebSocket to continue functioning across page navigations
        }
      }
    });

    // Don't close WebSockets when unmounting the component
    return () => {};
  }, [projects, handleWebSocketMessage, stopStream]);

  // Function to expand and collapse the project item
  const toggleProjectDescription = (projectId) => {
    setExpandedProjects((prev) =>
      prev.includes(projectId)
        ? prev.filter((id) => id !== projectId) // Remove the project if it's already expanded
        : [...prev, projectId]                 // Add the project if it's not expanded
    );
  };

  // Function to search button and search query
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  // Endpoint to search for project based on the search query
  const handleSearch = async () => {
    try {
      const response = await axios.get(`http://localhost:3001/projects/search?query=${searchQuery}`);
      setProjects(response.data);
    } catch (error) {
      console.error('Error searching projects:', error);
    }
  };

  // Function to make Enter key to execute the search function
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
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

  // Function to handle click event of "Add Project" button
  const handleAddProjectClick = () => {
    navigate('/add-project'); // Navigate to add project page
  };

  // Styles for animations
  const styles = {
    chevron: (isExpanded) => ({
      transition: 'transform 0.3s ease',
      transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
      cursor: 'pointer'
    })
  };

  return (
    <div className='container-fluid'>
      {/* Page header (title and btn) */}
      <div className='page-header mt-2 d-flex justify-content-between align-items-center'>
        <h1 className='page-title'>Projects</h1>
        <button className="btn btn-primary" onClick={handleAddProjectClick}>
          <FontAwesomeIcon icon={faPlus} className="me-2" />
          <span>Add Project</span>
        </button>
      </div>
      <div className='panel-content mt-2'>
        {/* Search bar */}
        <div className='col-6'>
          <div className="form-group d-flex justify-content-between align-items-center">
            <label htmlFor="search" className="sr-only">Search</label>
            <input type="text" className="form-control" name="search" id="search" placeholder="Search for projects" value={searchQuery} onChange={handleSearchChange} onKeyPress={handleKeyPress} />
            <button className='ms-2 btn btn-secondary' style={{ backgroundColor: '#E6E8E6', border: 'none' }} onClick={handleSearch}><span><FontAwesomeIcon icon={faSearch} className='me-2 ms-2' style={{ color: '#000' }} /></span></button>
          </div>
        </div>
        {/* Projects list */}
        {loading ? (
          <h4>Loading projects...</h4>
        ) : (
          <div className='col-12 mt-4'>
            {projects.length === 0 ? (
              <h4>There are no projects that match your search.</h4>
            ) : (
              <ul className="list-group">
                {projects.map((project) => (
                  <div key={project._id} className="mt-1 mb-1">
                    {/* Project Item List */}
                    <div
                      className="list-group-item"
                      style={{
                        backgroundColor: "#e6e8e6",
                        borderColor: "#e6e8e6",
                        borderRadius: "8px",
                      }}
                    >
                      <div className="row align-items-center">
                        <div className="col-md-6">
                          <div className="d-flex align-items-center">
                            <FontAwesomeIcon
                              onClick={() => toggleProjectDescription(project._id)}
                              style={styles.chevron(expandedProjects.includes(project._id))}
                              icon={faChevronRight}
                              className="me-2"
                            />
                            <span
                              className="ms-2"
                              onClick={() => navigate(`/projects/${project._id}`)}
                              style={{
                                cursor: "pointer",
                                textDecoration: "none",
                              }}
                              onMouseEnter={(e) => (e.target.style.textDecoration = "underline")}
                              onMouseLeave={(e) => (e.target.style.textDecoration = "none")}
                            >
                              {project.name}
                            </span>
                            <div className="d-flex align-items-center mt-1">
                              <label
                                className="ms-4 tiny-label"
                                style={{ fontSize: "10px", color: "gray" }}
                              >
                                <FontAwesomeIcon icon={faClock} />
                                <span className="ms-1">
                                  Last started:{" "}
                                  {project.dateLastStarted
                                    ? parseDate(project.dateLastStarted)
                                    : "Never"}
                                </span>
                              </label>
                              <label
                                className="ms-3 tiny-label"
                                style={{ fontSize: "10px", color: "gray" }}
                              >
                                <FontAwesomeIcon icon={faFolderPlus} />
                                <span className="ms-1">Created at: </span>{" "}
                                {formatDate(project.dateCreated)}
                              </label>
                            </div>
                          </div>
                        </div>
                        {project.streams.length > 0 && (
                          <div className="col-md-6">
                            <div className="d-flex align-items-center justify-content-center w-100">
                              <ProgressBar
                                now={projectPercentages[project._id] || 0}
                                label={`${projectPercentages[project._id]
                                  ? projectPercentages[project._id].toFixed(0)
                                  : 0
                                  }%`}
                                style={{ width: "80%", height: "20px" }}
                              />
                              <div className="col-md-2 d-flex align-items-center justify-content-end">
                                {loadingProjects[project._id] ? (
                                  <div className="spinner-border spinner-border-sm" role="status">
                                    <span className="visually-hidden">Loading...</span>
                                  </div>
                                ) : (
                                  <FontAwesomeIcon
                                    onClick={() => handleProjectStatus(project._id, project.status)}
                                    icon={project.status ? faStop : faPlay}
                                    size="2x"
                                    style={{
                                      cursor: "pointer",
                                      display: "flex",
                                      justifyContent: "center",
                                    }}
                                  />
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      {/* Description */}
                      {expandedProjects.includes(project._id) && (
                        <p className="mt-2 mb-1">{project.description}</p>
                      )}
                    </div>
                    {/* Streams List */}
                    {expandedProjects.includes(project._id) && (
                      <div className="row d-flex justify-content-end">
                        <div className="col-11">
                          {projects.find((proj) => proj._id === project._id)?.streams
                            .length > 0 ? (
                            projects
                              .find((proj) => proj._id === project._id)
                              .streams.map((stream, index) => (
                                <li
                                  key={index}
                                  className="list-group-item mt-1 mb-1"
                                  style={{
                                    backgroundColor: "#F5F6F5",
                                    borderRadius: "8px",
                                  }}
                                >
                                  <div className="d-flex align-items-center">
                                    <div className="col-md-8">
                                      <div className="d-flex align-items-center">
                                        {/* Stream Topic (with nav/routing link) */}
                                        <span
                                          className="ms-2"
                                          onClick={() => navigate(`/streams/${stream._id}`)}
                                          style={{
                                            cursor: "pointer",
                                            textDecoration: "none",
                                          }}
                                          onMouseEnter={(e) =>
                                            (e.target.style.textDecoration = "underline")
                                          }
                                          onMouseLeave={(e) =>
                                            (e.target.style.textDecoration = "none")
                                          }
                                        >
                                          {stream.topic}
                                        </span>
                                        {/* Stream Details (Last started and Date Created) */}
                                        <label
                                          className="ms-4 tiny-label"
                                          style={{
                                            fontSize: "10px",
                                            color: "gray",
                                          }}
                                        >
                                          <FontAwesomeIcon icon={faClock} />
                                          <span className="ms-1">
                                            Last started:{" "}
                                            {stream.dateLastStarted
                                              ? parseDate(stream.dateLastStarted)
                                              : "Never"}
                                          </span>
                                        </label>
                                        <label
                                          className="ms-3 tiny-label"
                                          style={{
                                            fontSize: "10px",
                                            color: "gray",
                                          }}
                                        >
                                          <FontAwesomeIcon icon={faFolderPlus} />
                                          <span className="ms-1">Created at: </span>{" "}
                                          {formatDate(stream.dateCreated)}
                                        </label>
                                      </div>
                                    </div>
                                    {/* Progress Bar Indicator */}
                                    {stream.playbackConfigType !== "realTime" && (
                                      <div className="col-md-4">
                                        <div className="d-flex align-items-center justify-content-end me-1 w-100">
                                          <ProgressBar
                                            now={streamPercentages[stream._id] || 0}
                                            label={`${streamPercentages[stream._id]
                                              ? streamPercentages[stream._id].toFixed(0)
                                              : 0
                                              }%`}
                                            style={{
                                              width: "80%",
                                              height: "20px",
                                            }}
                                          />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </li>
                              ))
                          ) : (
                            <p
                              className="mt-2 mb-1"
                              style={{ fontSize: "14px", color: "gray" }}
                            >
                              There are no streams associated with this project yet.
                            </p>
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

export default Projects;

