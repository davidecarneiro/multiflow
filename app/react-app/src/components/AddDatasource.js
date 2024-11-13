import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function AddDatasource() {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [dataSourceType, setDataSourceType] = useState('');
    const [connectionString, setConnectionString] = useState('');
    const [filePath, setFilePath] = useState('');
    const [files, setFiles] = useState([]);

    // Endpoint to get all files in the datasets folder
    useEffect(() => {
        const fetchFiles = async () => {
            try {
                const response = await axios.get('http://localhost:3001/dataSources/datasets');
                setFiles(response.data);
            } catch (error) {
                console.error('Error fetching files:', error);
            }
        };

        if (dataSourceType === 'File') {
            fetchFiles();
        }
    }, [dataSourceType]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const postData = {
                name,
                description,
                dataSourceType,
                connectionString: dataSourceType === 'SQL' ? connectionString : undefined,
                filePath: dataSourceType === 'File' ? filePath : undefined,
            };

            await axios.post('http://localhost:3001/dataSources', postData);

            // Redirect the user to the data sources page after adding the data source
            navigate('/dataSources');
        } catch (error) {
            console.error('Error adding data source:', error);
        }
    };

    const handleCancel = () => {
        // Navigate back to the data sources page
        navigate('/dataSources');
    };

    return (
        <div className="container-fluid">
            {/* Page header */}
            <div className='page-header mt-2'>
                <h1 className='page-title'>Add new data source</h1>
            </div>

            {/* Form */}
            <div className='panel-content mt-2' style={{ backgroundColor: '#E6E8E6', borderRadius: '8px' }}>
                <div className='container ps-4 pe-4 pt-3 pb-4'>
                    <div className='col-12'>
                        <form onSubmit={handleSubmit}>
                            <div className="mb-3">
                                <label htmlFor="name" className="form-label">Data Source Name</label>
                                <input type="text" className="form-control" id="name" placeholder='Enter the data source name' value={name} onChange={(e) => setName(e.target.value)} />
                            </div>
                            <div className="mb-3">
                                <label htmlFor="description" className="form-label">Data Source Description</label>
                                <textarea className="form-control" id="description" placeholder='Enter the description' value={description} onChange={(e) => setDescription(e.target.value)}></textarea>
                            </div>
                            <div className='d-flex justify-content-start align-items-center'>
                                <div className="mb-3 col-3 me-4">
                                    <label htmlFor="dataSourceType" className="form-label">Data Source Type</label>
                                    <select className="form-select" id="dataSourceType" value={dataSourceType} onChange={(e) => setDataSourceType(e.target.value)}>
                                        <option value="">Select Data Source Type</option>
                                        <option value="SQL">SQL</option>
                                        <option value="File">File</option>
                                    </select>
                                </div>
                                {/* Render additional field based on selected dataSourceType */}
                                {dataSourceType === 'SQL' && (
                                    <div className="mb-3 col-3">
                                        <label htmlFor="connectionString" className="form-label">Connection String</label>
                                        <input type="text" className="form-control" id="connectionString" value={connectionString} onChange={(e) => setConnectionString(e.target.value)} />
                                    </div>
                                )}
                                {dataSourceType === 'File' && (
                                    <div className="mb-3 col-3">
                                        <label htmlFor="filePath" className="form-label">File Path</label>
                                        <select className="form-select" id="filePath" value={filePath} onChange={(e) => setFilePath(e.target.value)}>
                                            <option value="">Select a file</option>
                                            {files.map((file) => (
                                                <option key={file} value={`datasets/${file}`}>{file}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
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

export default AddDatasource;