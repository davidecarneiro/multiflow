import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function AddProject() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:3001/projects', { name, description });
      // Redirect the user to the projects page after adding the project
      navigate('/');
    } catch (error) {
      console.error('Error adding project:', error);
    }
  };

  const handleCancel = () => {
    // Navigate back to the projects page
    navigate('/');
  };

  return (
    <div className="container-fluid">
      {/* Page header */}
      <div className='page-header mt-2'>
        <h1 className='page-title'>Add new project</h1>
      </div>

      {/* Form */}
      <div className='panel-content mt-2' style={{ backgroundColor: '#E6E8E6', borderRadius: '8px' }}>
        <div className='container ps-4 pe-4 pt-3 pb-4'>
          <div className='col-12'>
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="name" className="form-label">Project Name</label>
                <input type="text" className="form-control" id="name" placeholder='Enter the project name' value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="mb-3">
                <label htmlFor="description" className="form-label">Project Description</label>
                <textarea className="form-control" id="description" placeholder='Enter the description' value={description} onChange={(e) => setDescription(e.target.value)}></textarea>
              </div>
              <div className="d-flex justify-content-end">
                <button type="button" className="btn btn-danger me-2" style={{ fontWeight: '500' }} onClick={handleCancel}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ fontWeight: '500' }}>Create</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AddProject;
