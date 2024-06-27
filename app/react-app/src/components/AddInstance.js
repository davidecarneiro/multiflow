import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function AddInstance() {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [customFields, setCustomFields] = useState([]);
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const appId = queryParams.get('appId');

    // Fetch the app details and custom fields when the component mounts
    useEffect(() => {
        const fetchAppDetails = async () => {
            try {
                const response = await axios.get(`http://localhost:3001/apps/${appId}`);
                const app = response.data;
                if (app && app.customFields) {
                    // Initialize customFields state with default values
                    const initialCustomFields = app.customFields.map(field => ({
                        name: field.name,
                        type: field.type,
                        value: ''
                    }));
                    setCustomFields(initialCustomFields);
                }
            } catch (error) {
                console.error('Error fetching app details:', error);
            }
        };

        fetchAppDetails();
    }, [appId]);

    // Handle form submission to create a new instance
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            let postData = { appId, name, description, customFields };

            await axios.post(`http://localhost:3001/instances`, postData);

            // Redirect the user to the instances page after adding the instance
            navigate(`/apps/${appId}`);
        } catch (error) {
            console.error('Error adding instance:', error);
        }
    };

    // Handle cancel button click to navigate back to the instances page
    const handleCancel = () => {
        // Navigate back to the app details page
        navigate(`/apps/${appId}`);
    };

    // Handle custom field value change with type validation
    const handleCustomFieldValueChange = (index, event) => {
        const { value } = event.target;
        const fields = [...customFields];
        const fieldType = fields[index].type;

        // Validate input based on field type
        switch (fieldType) {
            case 'int':
                if (/^-?\d+$/.test(value)) { // Regex for integer
                    fields[index].value = parseInt(value, 10);
                }
                break;
            case 'float':
                if (/^-?\d*\.?\d+$/.test(value)) { // Regex for float
                    fields[index].value = parseFloat(value);
                }
                break;
            case 'bool':
                const lowerCaseValue = value.toLowerCase();
                fields[index].value = lowerCaseValue === 'true' || lowerCaseValue === '1';
                break;
            default:
                fields[index].value = value;
                break;
        }

        setCustomFields(fields);
    };

    // Render input based on field type
    const renderInputField = (field, index) => {
        switch (field.type) {
            case 'int':
                return (
                    <input
                        type="number"
                        className="form-control"
                        placeholder="Value"
                        value={field.value}
                        onChange={(e) => handleCustomFieldValueChange(index, e)}
                        min={Number.MIN_SAFE_INTEGER}
                        max={Number.MAX_SAFE_INTEGER}
                        step="1"
                    />
                );
            case 'float':
                return (
                    <input
                        type="number"
                        className="form-control"
                        placeholder="Value"
                        value={field.value}
                        onChange={(e) => handleCustomFieldValueChange(index, e)}
                        step="any"
                    />
                );
            case 'bool':
                return (
                    <select
                        className="form-select"
                        value={field.value ? 'true' : 'false'}
                        onChange={(e) => handleCustomFieldValueChange(index, e)}
                    >
                        <option value="true">True</option>
                        <option value="false">False</option>
                    </select>
                );
            default:
                return (
                    <input
                        type="text"
                        className="form-control"
                        placeholder="Value"
                        value={field.value}
                        onChange={(e) => handleCustomFieldValueChange(index, e)}
                    />
                );
        }
    };

    return (
        <div className="container-fluid">
            {/* Page header */}
            <div className='page-header mt-2'>
                <h1 className='page-title'>Add new instance</h1>
            </div>

            {/* Form */}
            <div className='panel-content mt-2' style={{ backgroundColor: '#E6E8E6', borderRadius: '8px' }}>
                <div className='container ps-4 pe-4 pt-3 pb-4'>
                    <div className='col-12'>
                        <form onSubmit={handleSubmit}>
                            <div className="mb-3">
                                <label htmlFor="name" className="form-label">Instance Name</label>
                                <input type="text" className="form-control" id="name" placeholder='Enter the instance name' value={name} onChange={(e) => setName(e.target.value)} required />
                            </div>
                            <div className="mb-3">
                                <label htmlFor="description" className="form-label">Instance Description</label>
                                <textarea className="form-control" id="description" placeholder='Enter the description' value={description} onChange={(e) => setDescription(e.target.value)}></textarea>
                            </div>

                            {/* Custom Fields */}
                            <div className="mb-3">
                                <label className="form-label">Custom Fields</label>
                                {customFields.map((field, index) => (
                                    <div key={index} className="mb-3 row">
                                        {/* Parameter name */}
                                        <div className="col-3">
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="Name"
                                                name="name"
                                                value={field.name}
                                                readOnly // Make the name field read-only
                                                style={{ backgroundColor: '#F5F6F5', border: 'none' }} />
                                        </div>
                                        {/* Type of variable selection */}
                                        <div className="col-3">
                                            <select
                                                className="form-select"
                                                name="type"
                                                value={field.type}
                                                disabled // Disable type selection
                                                style={{ backgroundColor: '#F5F6F5', border: 'none' }} >
                                                <option value="">Type</option>
                                                <option value="str">String</option>
                                                <option value="int">Integer</option>
                                                <option value="float">Float</option>
                                                <option value="complex">Complex</option>
                                                <option value="bool">Boolean</option>
                                            </select>
                                        </div>
                                        {/* Field value */}
                                        <div className="col-3">
                                            {renderInputField(field, index)}
                                        </div>
                                    </div>
                                ))}
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

export default AddInstance;