import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

function EditDataSource() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [dataSourceType, setDataSourceType] = useState('');
    const [additionalField, setAdditionalField] = useState('');
    const [files, setFiles] = useState([]);

    // Fetching data source details and datasets on component mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get(`http://localhost:3001/dataSources/${id}`);
                const { name, description, dataSourceType, connectionString, filePath } = response.data;
                setName(name);
                setDescription(description);
                setDataSourceType(dataSourceType);
                setAdditionalField(dataSourceType === 'SQL' ? connectionString : filePath);
                if (dataSourceType === 'File') {
                    fetchFiles();
                }
            } catch (error) {
                console.error('Error fetching data source:', error);
            }
        };

        fetchData();
    }, [id]);

    // Function to get the list of all datasets in datasets folder
    const fetchFiles = async () => {
        try {
            const response = await axios.get('http://localhost:3001/dataSources/datasets');
            setFiles(response.data);
        } catch (error) {
            console.error('Error fetching files:', error);
        }
    };

    const handleAdditionalFieldChange = (e) => {
        setAdditionalField(e.target.value);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            let postData = { name, description, dataSourceType };
            if (dataSourceType === 'SQL') {
                postData.connectionString = additionalField;
            } else if (dataSourceType === 'File') {
                postData.filePath = additionalField;
            }
            await axios.put(`http://localhost:3001/dataSources/${id}`, postData);
            navigate('/dataSources');
        } catch (error) {
            console.error('Error updating data source:', error);
        }
    };

    const handleCancel = () => {
        navigate('/dataSources');
    };

    return (
        <div className="container-fluid">
            <div className='page-header mt-2'>
                <h1 className='page-title'>Edit Data Source</h1>
            </div>

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
                                    <select className="form-select" id="dataSourceType" value={dataSourceType} onChange={(e) => {
                                        setDataSourceType(e.target.value);
                                        setAdditionalField(''); // Reseting additionalField on dataSourceType change
                                        if (dataSourceType !== 'File') {
                                            fetchFiles();
                                        }
                                    }}>
                                        <option value="">Select Data Source Type</option>
                                        <option value="SQL">SQL</option>
                                        <option value="File">File</option>
                                    </select>
                                </div>
                                {/* Rendering additional field based on selected dataSourceType */}
                                {dataSourceType === 'SQL' && (
                                    <div className="mb-3 col-3">
                                        <label htmlFor="connectionString" className="form-label">Connection String</label>
                                        <input type="text" className="form-control" id="connectionString" value={additionalField} onChange={handleAdditionalFieldChange} />
                                    </div>
                                )}
                                {dataSourceType === 'File' && (
                                    <div className="mb-3 col-3">
                                        <label htmlFor="filePath" className="form-label">File Path</label>
                                        <select className="form-select" id="filePath" value={additionalField} onChange={handleAdditionalFieldChange}>
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
                                <button type="submit" className="btn btn-primary" style={{ fontWeight: '500' }}>Update</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default EditDataSource;