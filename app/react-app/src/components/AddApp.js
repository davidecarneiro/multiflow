import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMinus, faPlus } from '@fortawesome/free-solid-svg-icons';

function AddApp() {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [filePath, setFilePath] = useState('');
    const [files, setFiles] = useState([]);
    const [customFields, setCustomFields] = useState([{ name: '', type: '' }]);

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
                filePath,
                customFields
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

    // Handle adding a new custom field
    const handleAddCustomField = () => {
        setCustomFields([...customFields, { name: '', type: '' }]);
    };

    // Handle removing a custom field
    const handleRemoveCustomField = (index) => {
        const fields = [...customFields];
        fields.splice(index, 1);
        setCustomFields(fields);
    };

    // Handle custom field input changes
    const handleCustomFieldChange = (index, event) => {
        const { name, value } = event.target;
        const fields = [...customFields];
        fields[index][name] = value;
        setCustomFields(fields);
    };

    return (
        <div className="container-fluid">
            {/* Page header */}
            <div className='page-header mt-2'>
                <h1 className='page-title'>Add new app</h1>
            </div>

            {/* Form */}
            <div className='panel-content mt-2' style={{ backgroundColor: '#E6E8E6', borderRadius: '8px' }}>
                <div className='container-fluid ps-4 pe-4 pt-3 pb-4'>
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

                            {/* Custom Fields */}
                            <div className="mb-3">
                                <label className="form-label">Custom Fields</label>
                                {customFields.map((field, index) => (
                                    <div key={index} className="mb-3 row">
                                        {/* Parameter name */}
                                        <div className="col-5">
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="Name"
                                                name="name"
                                                value={field.name}
                                                onChange={(e) => handleCustomFieldChange(index, e)} />
                                        </div>
                                        {/* Type of variable selection */}
                                        <div className="col-5">
                                            <select
                                                className="form-select"
                                                name="type"
                                                value={field.type}
                                                onChange={(e) => handleCustomFieldChange(index, e)}>
                                                <option value="">Type</option>
                                                <option value="str">String</option>
                                                <option value="int">Integer</option>
                                                <option value="float">Float</option>
                                                <option value="complex">Complex</option>
                                                <option value="bool">Boolean</option>
                                            </select>
                                        </div>
                                        <div className="col-2 d-flex align-items-center">
                                            <button type="button" className="btn btn-sm btn-danger" onClick={() => handleRemoveCustomField(index)}><FontAwesomeIcon icon={faMinus} /></button>
                                        </div>
                                    </div>
                                ))}
                                <div><button type="button" className="btn btn-sm btn-primary" onClick={handleAddCustomField}><FontAwesomeIcon icon={faPlus} /> Add Custom Field</button></div>
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