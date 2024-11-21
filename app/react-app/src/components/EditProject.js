import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

function EditProject() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    // Getting project details to prepopulate forms
    useEffect(() => {
        const fetchProject = async () => {
            try {
                const response = await axios.get(`http://localhost:3001/projects/${id}`);
                const { name, description } = response.data;
                setName(name);
                setDescription(description);
            } catch (error) {
                console.error('Error fetching project:', error);
            }
        };

        fetchProject();
    }, [id]);

    // Endpoint to update project details
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.put(`http://localhost:3001/projects/${id}`, { name, description });
            // Redirect the user to the project details page after updating the project
            navigate(`/projects/${id}`);
        } catch (error) {
            console.error('Error updating project:', error);
        }
    };

    // To cancel the project update
    const handleCancel = () => {
        // Navigate back to the project details page
        navigate(`/projects/${id}`);
    };

    return (
        <div className="container-fluid">
            {/* Page header */}
            <div className='page-header mt-2'>
                <h1 className='page-title'>Edit Project</h1>
            </div>

            {/* Form */}
            <div className='panel-content mt-2 mb-4' style={{ backgroundColor: '#E6E8E6', borderRadius: '8px' }}>
                <div className='container-fluid ps-4 pe-4 pt-3 pb-4'>
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
                                <button type="submit" className="btn btn-primary" style={{ fontWeight: '500' }}>Update</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default EditProject;
