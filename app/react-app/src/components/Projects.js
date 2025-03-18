import axios from 'axios';
import React, { useState, useEffect, useContext, useCallback } from 'react';
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
  const navigate = useNavigate();
  const { projectPercentages, setProjectPercentages, streamPercentages, setStreamPercentages } = useContext(ProgressContext);
  const { triggerRefresh } = useRefresh();

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

  // Handle WebSocket messages
  const handleWebSocketMessage = useCallback((projectId, data) => {
    const parsedData = JSON.parse(data);

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

      if (minPercentage === 100) {
        handleProjectStatus(projectId, true);
      }
    } else {
      console.log('No streams available');
    }
  }, [setProjectPercentages, setStreamPercentages]);

  // Establish WebSocket connection
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8082');

    ws.onopen = () => {
      console.log('WebSocket connection established');
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'progress-feedback') {
        const projectId = projects.find(p => p._id); // Find the relevant project ID from the message
        if (projectId) {
          handleWebSocketMessage(projectId, event.data);
        }
      }
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed');
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      ws.close();
    };
  }, [projects, handleWebSocketMessage]);

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
      if (status) {
        // Stop project and its streams
        await axios.put(`http://localhost:3001/projects/stop/${projectId}`);
        console.log("--> Stop Project");
        status = false;

        // Stop all streams related to this project
        const project = projects.find(p => p._id === projectId);
        if (project) {
          for (const stream of project.streams) {
            await stopStream(stream._id);
          }
        }
      } else {
        // Start project and its streams
        await axios.put(`http://localhost:3001/projects/start/${projectId}`);
        console.log("--> Play Project");

        // Trigger a refresh on the Sidebar
        triggerRefresh();

        const ws = new WebSocket('ws://localhost:8082');

        ws.onopen = () => {
          console.log('WebSocket connection established');
          ws.send(projectId);
        };

        ws.onmessage = async (event) => {
          const message = JSON.parse(event.data);
          if (message.type === 'progress-feedback') {
            handleWebSocketMessage(projectId, event.data);
          };
        }

        ws.onclose = () => {
          console.log('WebSocket connection closed');
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
        };

        // Start all streams related to this project
        const project = projects.find(p => p._id === projectId);
        if (project) {
          for (const stream of project.streams) {
            await startStream(stream._id);
          }
        }
      }

      // Refresh project list after updating status
      fetchProjects();
    } catch (error) {
      console.error('Error updating project status:', error);
    }
  };

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
                                <FontAwesomeIcon
                                  onClick={() => { handleProjectStatus(project._id, project.status); triggerRefresh(); }}
                                  icon={project.status ? faStop : faPlay}
                                  size="2x"
                                  style={{
                                    cursor: "pointer",
                                    display: "flex",
                                    justifyContent: "center",
                                  }}
                                />
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