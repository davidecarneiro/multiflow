import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function AddApp() {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [filePath, setFilePath] = useState('');
    const [files, setFiles] = useState([]);

    // Fetch the list of Python files when the component mounts
    useEffect(() => {
        const fetchFiles = async () => {
            try {
                const response = await axios.get('http://localhost:3001/apps/code');
                setFiles(response.data);
            } catch (error) {
                console.error('Error fetching files:', error);
            }
        };

        fetchFiles();
    }, []);

    // Handle form submission to create a new app
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const postData = {
                name,
                description,
                filePath
            };

            await axios.post('http://localhost:3001/apps', postData);

            // Redirect the user to the apps page after adding the app
            navigate('/apps');
        } catch (error) {
            console.error('Error adding app:', error);
        }
    };

    // Handle cancel button click to navigate back to the apps page
    const handleCancel = () => {
        navigate('/apps');
    };

    return (
        <div className="container-fluid">
            {/* Page header */}
            <div className='page-header mt-2'>
                <h1 className='page-title'>Add new app</h1>
            </div>

            {/* Form */}
            <div className='panel-content mt-2' style={{ backgroundColor: '#E6E8E6', borderRadius: '8px' }}>
                <div className='container ps-4 pe-4 pt-3 pb-4'>
                    <div className='col-12'>
                        <form onSubmit={handleSubmit}>
                            <div className="mb-3">
                                <label htmlFor="name" className="form-label">App Name</label>
                                <input type="text" className="form-control" id="name" placeholder='Enter the app name' value={name} onChange={(e) => setName(e.target.value)} required />
                            </div>
                            <div className="mb-3">
                                <label htmlFor="description" className="form-label">App Description</label>
                                <textarea className="form-control" id="description" placeholder='Enter the description' value={description} onChange={(e) => setDescription(e.target.value)}></textarea>
                            </div>
                            <div className="mb-3 col-4">
                                <label htmlFor="filePath" className="form-label">File Path</label>
                                <select className="form-select" id="filePath" value={filePath} onChange={(e) => setFilePath(e.target.value)} required>
                                    <option value="">Select a file</option>
                                    {files.map((file) => (
                                        <option key={file} value={file}>{file}</option>
                                    ))}
                                </select>
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

export default AddApp;