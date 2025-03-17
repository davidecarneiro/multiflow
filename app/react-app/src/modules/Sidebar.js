import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDiagramProject, faCubes, faDatabase, faChartLine, faTerminal, faCaretSquareLeft, faRotate, faChevronDown } from '@fortawesome/free-solid-svg-icons';
import logo from './logo.png';
import minLogo from './minLogo.png';
import { NavLink } from 'react-router-dom';

function Sidebar() {
    const [collapsed, setCollapsed] = useState(false);
    const [delayRender, setDelayRender] = useState(false);
    const [activeInstances, setActiveInstances] = useState([]);
    const [instancesCollapsed, setInstancesCollapsed] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);

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

    // Fetch on component mount
    useEffect(() => {
        fetchActiveInstances();
    }, []);

    // Refresh instances when button is clicked
    const refreshInstances = () => {
        fetchActiveInstances();
    };

    // Toggles between collapsed and extended sidebar
    const handleToggle = () => {
        setCollapsed(!collapsed);
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

    // Logo CSS styles
    const logoStyle = {
        maxWidth: collapsed ? '40px' : '95%',
        maxHeight: collapsed ? '40px' : '95%',
        width: 'auto',
        height: 'auto',
    };

    // Toggle active instances function
    const toggleInstancesVisibility = () => {
        if (instancesCollapsed) {
            // Expanding: Show immediately
            setInstancesCollapsed(false);
            setTimeout(() => setIsAnimating(false), 150); // End animation delay
        } else {
            // Collapsing: First start animation, then hide
            setIsAnimating(true);
            setTimeout(() => setInstancesCollapsed(true), 150); // Delay actual hiding
        }
    };

    // Icon CSS styles
    const iconStyle = {
        color: 'white',
        transition: 'transform 0.3s',
        transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)',
        fontSize: '18px',
    };

    // Main content adjustment
    const sidebarZoneStyle = {
        marginRight: collapsed ? '80px' : '250px',
        transition: 'margin-right .5s',
    };

    return (
        <div style={sidebarZoneStyle}>
            <div className="fluid d-flex flex-column flex-shrink-0 p-3 text-white bg-dark" style={sidebarStyle}>
                {/* Logo display */}
                <NavLink exact to="/" className="text-center">
                    <img src={collapsed ? minLogo : logo} alt="MultiFlow Logo" style={logoStyle} />
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

                {/* Active Instances Display */}
                <div className="mt-4">
                    <div className="d-flex justify-content-between align-items-center">
                        <h6 className="mb-0">Active Instances</h6>

                        {/* Icons for refreshing and collapsing */}
                        <div>
                            {/* Refresh button */}
                            <FontAwesomeIcon
                                icon={faRotate}
                                className="text-white mx-2"
                                onClick={fetchActiveInstances}
                                style={{ cursor: "pointer" }}
                            />
                            {/* Expand and Collapse button */}
                            <FontAwesomeIcon
                                icon={faChevronDown}
                                className="text-white"
                                onClick={toggleInstancesVisibility}
                                style={{
                                    cursor: "pointer",
                                    transition: "transform 0.5s",
                                    transform: isAnimating ? "rotate(-180deg)" : "rotate(0deg)"
                                }}
                            />
                        </div>
                    </div>

                    {/* Smooth transition container */}
                    <div
                        style={{
                            maxHeight: instancesCollapsed ? "0px" : "500px",
                            overflow: "hidden",
                            transition: "max-height 0.5s ease-in-out"
                        }}
                    >
                        <div className="mt-2">
                            {activeInstances.map(instance => (
                                <div
                                    key={instance._id}
                                    style={{
                                        background: "linear-gradient(90deg, #3772FF 0%,rgb(74, 74, 74) 100%)",
                                        padding: "10px",
                                        borderRadius: "5px",
                                        marginBottom: "10px",
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        display: "block",
                                        width: "100%",
                                        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)"
                                    }}
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
                            ))}
                        </div>
                    </div>
                </div>

                <hr />
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