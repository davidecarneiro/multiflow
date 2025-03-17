import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Projects from './components/Projects';
import AddProject from './components/AddProject';
import ProjectDetails from './components/ProjectDetails';
import EditProject from './components/EditProject';
import Apps from './components/Apps';
import AppDetails from './components/AppDetails';
import AddApp from './components/AddApp';
import EditApp from './components/EditApp';
import Datasources from './components/Datasources';
import DatasourcesDetails from './components/DatasourcesDetails';
import AddDataSource from './components/AddDatasource';
import EditDataSource from './components/EditDatasource';
import AddInstance from './components/AddInstance';
import InstanceDetails from './components/InstanceDetails';
import EditInstance from './components/EditInstance';
import Dashboards from './components/Dashboards';
import Logs from './components/Logs';
import './App.css';
import Sidebar from './modules/Sidebar';
import 'bootstrap/dist/css/bootstrap.min.css';
import StreamDetails from './components/StreamDetails';
import AddStream from './components/AddStream';
import EditStream from './components/EditStream';

import { ProgressProvider } from './components/ProgressContext';
import { RefreshProvider } from './components/RefreshContext'; // Import here

function App() {
  return (
    <ProgressProvider>
      <RefreshProvider>
        <Router>
          <div className="d-flex">
            {/* Sidebar */}
            <Sidebar />

            {/* Main content */}
            <div className="container-fluid">
              <Routes>
                {/* Projects */}
                <Route path="/" element={<Projects />} />
                <Route exact path="/add-project" element={<AddProject />} />
                <Route path="/projects/:id" element={<ProjectDetails />} />
                <Route path="/edit-project/:id" element={<EditProject />} />
                <Route path='/add-stream' element={<AddStream />} />
                <Route path='/edit-stream/:id' element={<EditStream />} />
                <Route path='/streams/:id' element={<StreamDetails />} />
                {/* Apps */}
                <Route path="/apps" element={<Apps />} />
                <Route path="/apps/:id" element={<AppDetails />} />
                <Route path="/add-app" element={<AddApp />} />
                <Route path="/edit-app/:id" element={<EditApp />} />
                <Route path="/add-instance" element={<AddInstance />} />
                <Route path="/instances/:id" element={<InstanceDetails />} />
                <Route path='/edit-instance/:id' element={<EditInstance />} />
                {/* Datasources */}
                <Route path="/dataSources" element={<Datasources />} />
                <Route path="/dataSources/:id" element={<DatasourcesDetails />} />
                <Route path="/add-data-source" element={<AddDataSource />} />
                <Route path="/edit-data-source/:id" element={<EditDataSource />} />
                {/* Dashboards */}
                <Route path="/dashboards" element={<Dashboards />} />
                {/* Logs */}
                <Route path="/logs" element={<Logs />} />
              </Routes>
            </div>
          </div>
        </Router>
      </RefreshProvider>
    </ProgressProvider>
  );
}

export default App;