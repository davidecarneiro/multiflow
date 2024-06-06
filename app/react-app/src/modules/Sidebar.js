import React from 'react';
import './Sidebar.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDiagramProject, faCube, faDatabase, faChartLine, faTerminal } from '@fortawesome/free-solid-svg-icons';
import logo from './logo.png';
import { NavLink } from 'react-router-dom';

function Sidebar() {
    return (
        <div className="d-flex flex-column flex-shrink-0 p-3 text-white bg-dark" style={{ width: '250px', height: '100vh' }}>
            <NavLink exact to="/" className="text-center">
                <img src={logo} alt="MultiFlow Logo" style={{ maxWidth: '95%', maxHeight: '95%', width: 'auto', height: 'auto' }} />
            </NavLink>
            <hr />
            <ul className="nav nav-pills flex-column mb-auto mt-2">
                <li className="nav-item">
                    <NavLink exact to="/" className="nav-link text-white sidebar-option" activeClassName="active">
                        <FontAwesomeIcon icon={faDiagramProject} className="me-3" />
                        Projects
                    </NavLink>
                </li>
                <li>
                    <NavLink to="/apps" className="nav-link text-white sidebar-option" activeClassName="active">
                        <FontAwesomeIcon icon={faCube} className="me-3" />
                        Apps
                    </NavLink>
                </li>
                <li>
                    <NavLink to="/dataSources" className="nav-link text-white sidebar-option" activeClassName="active">
                        <FontAwesomeIcon icon={faDatabase} className="me-3" />
                        Data Sources
                    </NavLink>
                </li>
                <li>
                    <NavLink to="/dashboards" className="nav-link text-white sidebar-option" activeClassName="active">
                        <FontAwesomeIcon icon={faChartLine} className="me-3" />
                        Dashboards
                    </NavLink>
                </li>
                <li>
                    <NavLink to="/logs" className="nav-link text-white sidebar-option" activeClassName="active">
                        <FontAwesomeIcon icon={faTerminal} className="me-3" />
                        Logs
                    </NavLink>
                </li>
            </ul>
        </div>
    );
}

export default Sidebar;
