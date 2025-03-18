import React, { useState, useEffect, useContext } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDiagramProject, faCubes, faCube, faDatabase, faChartLine, faTerminal, faCaretSquareLeft, faRotate, faChevronDown, faBarsProgress, faCircleInfo } from '@fortawesome/free-solid-svg-icons';
import logo from './logo.png';
import minLogo from './minLogo.png';
import { NavLink } from 'react-router-dom';
import { useRefresh } from '../components/RefreshContext';
import { ProgressContext } from '../components/ProgressContext';

function Sidebar() {
    const { projectPercentages } = useContext(ProgressContext);
    const [collapsed, setCollapsed] = useState(false);
    const [delayRender, setDelayRender] = useState(false);
    const [activeInstances, setActiveInstances] = useState([]);
    const [instancesCollapsed, setInstancesCollapsed] = useState(false); // Controls Active Instances visibility
    const [isAnimating, setIsAnimating] = useState(false); // Tracks animation state for smooth transitions
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [userToggledInstances, setUserToggledInstances] = useState(false); // Tracks if user manually toggled instances
    const [userToggledProjects, setUserToggledProjects] = useState(false); // Track if the user manually toggled the projects visibility
    const [activeProjects, setActiveProjects] = useState([]);
    const [projectsCollapsed, setProjectsCollapsed] = useState(false);
    const [isAnimatingProjects, setIsAnimatingProjects] = useState(false);
    const [isRefreshingProjects, setIsRefreshingProjects] = useState(false);
    const { refresh } = useRefresh();

    // Delay text rendering for 0.2 seconds after expanding
    useEffect(() => {
        if (!collapsed) {
            const timer = setTimeout(() => {
                setDelayRender(true);
            }, 200);
            return () => clearTimeout(timer);
        } else {
            setDelayRender(false);
        }
    }, [collapsed]);

    // Helper function to fetch active instances from API with debug logging
    const fetchActiveInstances = async () => {
        try {
            const response = await fetch('http://localhost:3001/instances/active');
            const data = await response.json();
            // Sort instances by dateLastStarted (newest first)
            const sortedInstances = data.sort((a, b) =>
                new Date(b.dateLastStarted) - new Date(a.dateLastStarted)
            );
            setActiveInstances(sortedInstances);
        } catch (error) {
            console.error("Error fetching active instances:", error);
        }
    };

    // Fetch active projects from API
    const fetchActiveProjects = async () => {
        try {
            const response = await fetch('http://localhost:3001/projects/active');
            const data = await response.json();
            // Sort projects by dateLastStarted (newest first)
            const sortedProjects = data.sort((a, b) =>
                new Date(b.dateLastStarted) - new Date(a.dateLastStarted)
            );
            setActiveProjects(sortedProjects);
        } catch (error) {
            console.error("Error fetching active projects:", error);
        }
    };

    // Fetch active instances on mount and whenever refresh is triggered
    useEffect(() => {
        fetchActiveInstances();
    }, [refresh]);

    // Fetch on mount, when refresh changes and whenever refresh is triggered
    useEffect(() => {
        fetchActiveProjects();
    }, [refresh]);

    // Fetch on component mount
    useEffect(() => {
        fetchActiveInstances();
        fetchActiveProjects();
    }, []);

    // Toggles between collapsed and extended sidebar
    const handleToggle = () => {
        setCollapsed(!collapsed);
    };

    // Synchronize instancesCollapsed with collapsed state
    useEffect(() => {
        if (collapsed) {
            // Collapse Active Instances when sidebar is collapsed
            setInstancesCollapsed(true);
        } else {
            // Expand Active Instances only if the user hasn't manually collapsed them
            if (!userToggledInstances) {
                setInstancesCollapsed(false);
            }
        }
    }, [collapsed, userToggledInstances]);

    // Synchronize projectsCollapsed with collapsed state
    useEffect(() => {
        if (collapsed) {
            // Collapse Active Projects when sidebar is collapsed
            setProjectsCollapsed(true);
        } else {
            // Expand Active Projects only if the user hasn't manually collapsed them
            if (!userToggledProjects) {
                setProjectsCollapsed(false);
            }
        }
    }, [collapsed, userToggledProjects]);

    // Toggle active instances function
    const toggleInstancesVisibility = () => {
        if (instancesCollapsed) {
            // Expanding: Start animation, then show
            setIsAnimating(true); // Indicate animation start
            setTimeout(() => {
                setInstancesCollapsed(false); // Show the section
                setIsAnimating(false); // End animation
                setUserToggledInstances(false); // Reset user intent
            }, 150); // Match duration of CSS transition
        } else {
            // Collapsing: Start animation, then hide
            setIsAnimating(true); // Indicate animation start
            setTimeout(() => {
                setInstancesCollapsed(true); // Hide the section
                setIsAnimating(false); // End animation
                setUserToggledInstances(true); // Track user intent
            }, 150); // Match duration of CSS transition
        }
    };

    // Toggle active projects function
    const toggleProjectsVisibility = () => {
        if (projectsCollapsed) {
            setIsAnimatingProjects(true); // Indicate animation start
            setTimeout(() => {
                setProjectsCollapsed(false); // Show the section
                setIsAnimatingProjects(false); // End animation
                setUserToggledProjects(false); // Reset user intent
            }, 150); // Match duration of CSS transition
        } else {
            setIsAnimatingProjects(true); // Indicate animation start
            setTimeout(() => {
                setProjectsCollapsed(true); // Hide the section
                setIsAnimatingProjects(false); // End animation
                setUserToggledProjects(true); // Track user intent
            }, 150); // Match duration of CSS transition
        }
    };

    // Active Projects Refresh Logic
    const handleRefreshProjects = () => {
        setIsRefreshingProjects(true); // Start the refresh animation
        fetchActiveProjects(); // Fetch updated active projects
        setTimeout(() => {
            setIsRefreshingProjects(false); // Stop the refresh animation after 500ms
        }, 500);
    };

    // Sidebar CSS styles
    const sidebarStyle = {
        width: collapsed ? '80px' : '250px',
        height: '100vh',
        position: 'fixed',
        transition: 'width .5s',
        backgroundColor: '#343a40',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: '0',
        padding: '1rem',
    };

    // Icon CSS styles
    const iconStyle = {
        color: 'white',
        transition: 'transform 0.3s',
        transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)',
        fontSize: '18px',
    };

    const cardStyle = {
        background: "linear-gradient(90deg, #3772FF 0%, rgb(74, 74, 74) 100%)",
        padding: "10px",
        borderRadius: "5px",
        marginBottom: "10px",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        transition: "all 0.1s ease-in-out",
    };

    const spinStyle = {
        transform: "rotate(360deg)",
        transition: "transform 0.5s",
    };

    return (
        <div style={{ marginRight: collapsed ? '80px' : '250px', transition: 'margin-right .5s' }}>
            <div className="fluid d-flex flex-column flex-shrink-0 p-3 text-white bg-dark" style={sidebarStyle}>
                {/* Logo display */}
                <NavLink exact to="/" className="text-center">
                    <img src={collapsed ? minLogo : logo} alt="MultiFlow Logo" style={{ maxWidth: collapsed ? '40px' : '95%', maxHeight: collapsed ? '40px' : '95%' }} />
                </NavLink>
                <hr />
                {/* Navigation Items */}
                <ul className="nav nav-pills flex-column mb-auto mt-2">
                    <li className="nav-item">
                        <NavLink exact to="/" className="nav-link text-white sidebar-option" activeClassName="active">
                            <FontAwesomeIcon icon={faDiagramProject} />
                            {!collapsed && delayRender && <label className="ms-3">Projects</label>}
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="/apps" className="nav-link text-white sidebar-option" activeClassName="active">
                            <FontAwesomeIcon icon={faCubes} />
                            {!collapsed && delayRender && <label className="ms-3">Apps</label>}
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="/dataSources" className="nav-link text-white sidebar-option" activeClassName="active">
                            <FontAwesomeIcon icon={faDatabase} />
                            {!collapsed && delayRender && <label className="ms-3">Data Sources</label>}
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="/dashboards" className="nav-link text-white sidebar-option" activeClassName="active">
                            <FontAwesomeIcon icon={faChartLine} />
                            {!collapsed && delayRender && <label className="ms-3">Dashboards</label>}
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="/logs" className="nav-link text-white sidebar-option" activeClassName="active">
                            <FontAwesomeIcon icon={faTerminal} />
                            {!collapsed && delayRender && <label className="ms-3">Logs</label>}
                        </NavLink>
                    </li>
                </ul>

                {/* Active Projects Display */}
                <div className="mt-4">
                    <div className="d-flex justify-content-between align-items-center">
                        {/* Project Title */}
                        <div className="d-flex align-items-center" style={{ marginLeft: collapsed ? '15px' : '0px' }}>
                            <FontAwesomeIcon icon={faBarsProgress} className="text-white me-2" />
                            {!collapsed && delayRender && <h6 className="mb-0">Active Projects</h6>}
                        </div>
                        {/* Project Buttons (Refresh and Collapse/Expand) */}
                        {!collapsed && delayRender && (
                            <div>
                                <FontAwesomeIcon
                                    icon={faRotate}
                                    className="text-white mx-2"
                                    onClick={handleRefreshProjects} // Trigger the refresh logic
                                    style={
                                        isRefreshingProjects
                                            ? { ...spinStyle, cursor: "pointer" } // Apply spin animation when refreshing
                                            : { transition: "transform 0.5s", cursor: "pointer" } // Default style
                                    }
                                />
                                <FontAwesomeIcon
                                    icon={faChevronDown}
                                    className="text-white"
                                    onClick={toggleProjectsVisibility}
                                    style={{
                                        cursor: "pointer",
                                        transition: "transform 0.5s",
                                        transform: isAnimatingProjects || projectsCollapsed ? "rotate(-180deg)" : "rotate(0deg)"
                                    }}
                                />
                            </div>
                        )}
                    </div>
                    {/* Project List */}
                    <div style={{
                        maxHeight: projectsCollapsed ? "0px" : "20vh",
                        overflowY: activeProjects.length > 1 ? "auto" : "hidden",
                        transition: "max-height 0.5s ease-in-out",
                        scrollbarWidth: "none",
                        msOverflowStyle: "none",
                    }}>
                        <div className="mt-2">
                            {activeProjects.length === 0 ? (
                                <div className="text-center d-flex justify-content-center align-items-center"
                                style={{
                                    fontSize: '0.65rem',
                                    color: '#fff',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                }}>
                                    <FontAwesomeIcon icon={faCircleInfo} className="me-2" />
                                    No active projects at the moment.
                                </div>
                            ) : (
                                activeProjects.map(project => (
                                    // Project Item
                                    <div key={project._id}
                                        onMouseEnter={(e) => e.currentTarget.style.transform = "scale(0.95)"}
                                        onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                                        style={cardStyle}>
                                        {/* First Line: Project Name and Percentage */}
                                        <div style={{ display: 'flex', width: '100%' }}>
                                            {/* Project Name (3/4 of the width) */}
                                            <div style={{ flex: 3, fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                <NavLink
                                                    to={`/projects/${project._id}`}
                                                    className="text-white text-decoration-none"
                                                    title={project.name}
                                                    style={{ color: "#fff" }}
                                                >
                                                    {project.name}
                                                </NavLink>
                                            </div>

                                            {/* Project Percentage (1/4 of the width) */}
                                            <div style={{
                                                flex: 1,
                                                textAlign: 'center',
                                                color: '#fff',
                                                fontWeight: 'bold',
                                                display: 'flex',
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                            }}>
                                                {`${Math.round(projectPercentages[project._id] || 0)}%`}
                                            </div>
                                        </div>

                                        {/* Second Line: Progress Bar */}
                                        <div style={{ width: '100%', height: '6px', backgroundColor: '#ccc', borderRadius: '3px', marginTop: '5px' }}>
                                            <div
                                                style={{
                                                    width: `${projectPercentages[project._id] || 0}%`,
                                                    height: '100%',
                                                    backgroundColor: '#fff',
                                                    borderRadius: '3px',
                                                }}
                                            ></div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Active Instances Display */}
                <div className="mt-2">
                    {/* Active Instances Header */}
                    <div className="d-flex justify-content-between align-items-center">
                        {/* Conditionally show the "faCube" icon and text */}
                        <div className="d-flex align-items-center" style={{ marginLeft: collapsed ? '15px' : '0px' }}>
                            <FontAwesomeIcon icon={faCube} className="text-white me-2" />
                            {!collapsed && delayRender && (
                                <h6 className="mb-0">Active Instances</h6>
                            )}
                        </div>
                        {/* Conditionally show the refresh and collapse icons */}
                        {!collapsed && delayRender && (
                            <div>
                                <FontAwesomeIcon
                                    icon={faRotate}
                                    className="text-white mx-2"
                                    onClick={() => {
                                        setIsRefreshing(true);
                                        fetchActiveInstances();
                                        setTimeout(() => setIsRefreshing(false), 500);
                                    }}
                                    style={isRefreshing ? { ...spinStyle } : { transition: "transform 0.5s", cursor: "pointer" }}
                                />
                                <FontAwesomeIcon
                                    icon={faChevronDown}
                                    className="text-white"
                                    onClick={toggleInstancesVisibility}
                                    style={{
                                        cursor: "pointer",
                                        transition: "transform 0.5s",
                                        // Rotate icon based on animation or collapsed state
                                        transform: isAnimating || instancesCollapsed ? "rotate(-180deg)" : "rotate(0deg)"
                                    }}
                                />
                            </div>
                        )}
                    </div>
                    {/* Active Instances List */}
                    <div style={{
                        maxHeight: instancesCollapsed ? "0px" : "20vh", // Set a maximum height for the active instances list
                        overflowY: activeInstances.length > 1 ? "auto" : "hidden", // Enable scrolling if there are more than 3 active instances
                        transition: "max-height 0.5s ease-in-out",
                        scrollbarWidth: "none", // Firefox
                        msOverflowStyle: "none", // Internet Explorer 10+
                    }} >
                        <div className="mt-2">
                            {activeInstances.length === 0 ? (
                                <div className="text-center d-flex justify-content-center align-items-center"
                                style={{
                                    fontSize: '0.65rem',
                                    color: '#fff',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                }}>
                                    <FontAwesomeIcon icon={faCircleInfo} className="me-2" />
                                    No active instances at the moment.
                                </div>
                            ) : (
                                activeInstances.map(instance => (
                                    <div
                                        key={instance._id}
                                        onMouseEnter={(e) => e.currentTarget.style.transform = "scale(0.95)"}
                                        onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                                        style={cardStyle}
                                    >
                                        <NavLink
                                            to={`/instances/${instance._id}`}
                                            className="text-white text-decoration-none"
                                            title={instance.name}
                                            style={{
                                                display: "block",
                                                whiteSpace: "nowrap",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                color: "#fff",
                                                fontWeight: "bold",
                                            }}
                                        >
                                            {instance.name}
                                        </NavLink>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <hr /> {/* Separating Line */}

                {/* Collapse and Extend Button */}
                <div className="d-flex ps-2 align-items-center">
                    <button className="mb-3" onClick={handleToggle} style={{ backgroundColor: 'transparent', border: 'none', color: 'white' }}>
                        <FontAwesomeIcon icon={faCaretSquareLeft} style={iconStyle} />
                        {!collapsed && delayRender && <span className="ms-2">Collapse Menu</span>}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Sidebar;