import axios from 'axios';
import React, { useState, useEffect, useContext, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faSearch, faChevronRight, faClock, faFolderPlus, faStop, faPlay } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import { ProgressBar } from 'react-bootstrap';
import { ProgressContext } from './ProgressContext';

function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedProjects, setExpandedProjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingProjects, setLoadingProjects] = useState({}); // Para controlar o estado de loading de cada projeto
  const navigate = useNavigate();
  const { projectPercentages, setProjectPercentages, streamPercentages, setStreamPercentages } = useContext(ProgressContext);

  // Inicializar o objeto global para armazenar as conexões WebSocket
  useEffect(() => {
    if (!window.projectWebSockets) {
      window.projectWebSockets = {};
    }

    // Limpar todas as conexões WebSocket ao desmontar o componente
    return () => {
      if (window.projectWebSockets) {
        Object.keys(window.projectWebSockets).forEach(projectId => {
          const ws = window.projectWebSockets[projectId];
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.close();
          }
        });
      }
    };
  }, []);

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
  // Declarar a função handleProjectStatus antes de usá-la em handleWebSocketMessage
  const handleProjectStatus = async (projectId, status) => {
    try {
      setLoadingProjects(prev => ({ ...prev, [projectId]: true }));
      
      if (status) {
        // PARAR O PROJETO
        console.log("--> Stop Project:", projectId);
        
        // 1. Enviar comando para parar as streams no WebSocket
        if (window.projectWebSockets && window.projectWebSockets[projectId]) {
          const ws = window.projectWebSockets[projectId];
          
          if (ws.readyState === WebSocket.OPEN) {
            console.log("Enviando comando STOP para o WebSocket");
            ws.send(`STOP:${projectId}`);
            
            // Aguardar a confirmação de que as streams foram paradas
            const stopConfirmation = await new Promise((resolve) => {
              const messageHandler = (event) => {
                try {
                  const data = JSON.parse(event.data);
                  console.log("Mensagem recebida após comando STOP:", data);
                  
                  if (data.status === 'stopped' && data.projectId === projectId) {
                    ws.removeEventListener('message', messageHandler);
                    resolve(data);
                  }
                } catch (error) {
                  console.error('Erro ao processar mensagem do WebSocket:', error);
                }
              };
              
              ws.addEventListener('message', messageHandler);
              
              // Timeout para não ficar esperando indefinidamente
              setTimeout(() => {
                ws.removeEventListener('message', messageHandler);
                resolve({ status: 'timeout', projectId });
              }, 5000);
            });
            
            console.log('Confirmação de parada recebida:', stopConfirmation);
          }
          
          // Fechar a conexão WebSocket
          ws.close();
          delete window.projectWebSockets[projectId];
          console.log(`WebSocket connection for project ${projectId} closed`);
        }
        
        // 2. Atualizar o status do projeto no backend
        await axios.put(`http://localhost:3001/projects/stop/${projectId}`);
        
        // 3. Parar todas as streams relacionadas a este projeto no backend
        const project = projects.find(p => p._id === projectId);
        if (project) {
          for (const stream of project.streams) {
            await stopStream(stream._id);
          }
        }
        
        // 4. Atualizar o estado local
        setProjects(prevProjects => 
          prevProjects.map(p => 
            p._id === projectId ? { ...p, status: false } : p
          )
        );
        
        // 5. Limpar os dados de progresso
        setProjectPercentages(prev => {
          const newPercentages = { ...prev };
          delete newPercentages[projectId];
          return newPercentages;
        });
        
        setStreamPercentages(prev => {
          const newPercentages = { ...prev };
          // Remover todas as streams associadas a este projeto
          if (project) {
            project.streams.forEach(stream => {
              delete newPercentages[stream._id];
            });
          }
          return newPercentages;
        });
        
      } else {
        // INICIAR O PROJETO
        console.log("--> Play Project:", projectId);
        
        // 1. Atualizar o status do projeto no backend
        await axios.put(`http://localhost:3001/projects/start/${projectId}`);
        
        // 2. Iniciar todas as streams relacionadas a este projeto no backend
        const project = projects.find(p => p._id === projectId);
        if (project) {
          for (const stream of project.streams) {
            await startStream(stream._id);
          }
        }
        
        // 3. Atualizar o estado local
        setProjects(prevProjects => 
          prevProjects.map(p => 
            p._id === projectId ? { ...p, status: true, dateLastStarted: new Date() } : p
          )
        );

        // 4. Iniciar a conexão WebSocket
        if (window.projectWebSockets[projectId]) {
          // Fechar conexão existente se houver
          const existingWs = window.projectWebSockets[projectId];
          if (existingWs.readyState === WebSocket.OPEN) {
            existingWs.close();
          }
        }
        
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
          alert('Erro na conexão WebSocket. Verifique o console para mais detalhes.');
        };
      }

      // Refresh project list after updating status
      await fetchProjects();
    } catch (error) {
      console.error('Error updating project status:', error);
      alert(`Erro ao ${status ? 'parar' : 'iniciar'} o projeto: ${error.message}`);
    } finally {
      setLoadingProjects(prev => {
        const newLoading = { ...prev };
        delete newLoading[projectId];
        return newLoading;
      });
    }
  };

  // Agora que handleProjectStatus já foi declarado, podemos usar no handleWebSocketMessage
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

        if (minPercentage === 100) {
          handleProjectStatus(projectId, true);
        }
      } else if (parsedData.status === 'stopped' && parsedData.projectId === projectId) {
        console.log(`Received confirmation that project ${projectId} was stopped`);
        
        // Atualizar o estado local para refletir que o projeto foi parado
        setProjects(prevProjects => 
          prevProjects.map(p => 
            p._id === projectId ? { ...p, status: false } : p
          )
        );
        
        // Limpar os dados de progresso
        setProjectPercentages(prev => {
          const newPercentages = { ...prev };
          delete newPercentages[projectId];
          return newPercentages;
        });
        
        setStreamPercentages(prev => {
          const newPercentages = { ...prev };
          // Remover todas as streams associadas a este projeto
          const project = projects.find(p => p._id === projectId);
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
  }, [setProjectPercentages, setStreamPercentages, projects]);

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
                                    onClick={() =>
                                      handleProjectStatus(project._id, project.status)
                                    }
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
