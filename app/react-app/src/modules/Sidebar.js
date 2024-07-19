import React from 'react';
import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDiagramProject, faCube, faDatabase, faChartLine, faTerminal, faCaretSquareLeft } from '@fortawesome/free-solid-svg-icons';
import logo from './logo.png';
import minLogo from './minLogo.png';
import { NavLink } from 'react-router-dom';

function Sidebar() {
    const [collapsed, setCollapsed] = useState(false);
    const [delayRender, setDelayRender] = useState(false);

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

    // Toggles between collapsed and extended side bar
    const handleToggle = () => {
        setCollapsed(!collapsed);
    };

    // Sets the Side Bar CSS style
    const sidebarStyle = {
        width: collapsed ? '80px' : '250px',
        height: '100vh',
        transition: 'width .5s',
        backgroundColor: '#343a40',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: '0',
        padding: '1rem',
    };

    // Sets the Logo CSS style
    const logoStyle = {
        maxWidth: collapsed ? '40px' : '95%',
        maxHeight: collapsed ? '40px' : '95%',
        width: 'auto',
        height: 'auto',
    };

    // Sets the Icons CSS style
    const iconStyle = {
        color: 'white',
        transition: 'transform 0.3s',
        transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)',
        fontSize: '18px'
    };

    return (
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
                        {!collapsed && delayRender && <label className="ms-3" >Projects</label>}
                    </NavLink>
                </li>
                <li>
                    <NavLink to="/apps" className="nav-link text-white sidebar-option" activeClassName="active">
                        <FontAwesomeIcon icon={faCube} />
                        {!collapsed && delayRender && <label className="ms-3" >Apps</label>}
                    </NavLink>
                </li>
                <li>
                    <NavLink to="/dataSources" className="nav-link text-white sidebar-option" activeClassName="active">
                        <FontAwesomeIcon icon={faDatabase} />
                        {!collapsed && delayRender && <label className="ms-3" >Data Sources</label>}
                    </NavLink>
                </li>
                <li>
                    <NavLink to="/dashboards" className="nav-link text-white sidebar-option" activeClassName="active">
                        <FontAwesomeIcon icon={faChartLine} />
                        {!collapsed && delayRender && <label className="ms-3" >Dashboards</label>}
                    </NavLink>
                </li>
                <li>
                    <NavLink to="/logs" className="nav-link text-white sidebar-option" activeClassName="active">
                        <FontAwesomeIcon icon={faTerminal} />
                        {!collapsed && delayRender && <label className="ms-3" >Logs</label>}
                    </NavLink>
                </li>
            </ul>
            <hr />
            {/* Collapse and Extend Button */}
            <div className='d-flex ps-2 align-items-center'>
                <button className="mb-3" onClick={handleToggle} style={{ backgroundColor: 'transparent', border: 'none', color: 'white' }}>
                    <FontAwesomeIcon icon={faCaretSquareLeft} style={iconStyle} />
                    {!collapsed && delayRender && <span className="ms-2" >Collapse Menu</span>}
                </button>
            </div>
        </div>
    );
}

export default Sidebar;