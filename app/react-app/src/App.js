import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Projects from './components/Projects';
import AddProject from './components/AddProject';
import ProjectDetails from './components/ProjectDetails';
import EditProject from './components/EditProject';
import Apps from './components/Apps';
import Datasources from './components/Datasources';
import DatasourcesDetails from './components/DatasourcesDetails';
import AddDataSource from './components/AddDatasource';
import EditDataSource from './components/EditDatasource';
import Dashboards from './components/Dashboards';
import Logs from './components/Logs';
import './App.css';
import Sidebar from './modules/Sidebar';
import 'bootstrap/dist/css/bootstrap.min.css';
import StreamDetails from './components/StreamDetails';
import AddStream from './components/AddStream';
import EditStream from './components/EditStream';

function App() {
  return (
    <Router>
      <div className="d-flex">
        {/* Sidebar */}
        <Sidebar />

        {/* Main content */}
        <div className="container">
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
  );
}

export default App;
