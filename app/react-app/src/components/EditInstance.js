import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

function EditInstance() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [app, setApp] = useState(null);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [instanceCustomFields, setInstanceCustomFields] = useState([]);
    const [loading, setLoading] = useState(true);
    const [appId, setAppId] = useState('');

    // Fetch instance details when the component mounts
    useEffect(() => {
        const fetchInstanceDetails = async () => {
            try {
                const response = await axios.get(`http://localhost:3001/instances/${id}`);
                const instanceData = response.data;
                setName(instanceData.name);
                setAppId(instanceData.appId);
                setDescription(instanceData.description);
                setInstanceCustomFields(instanceData.customFields.map(field => ({
                    ...field,
                    value: field.value || ''
                })));
                setLoading(false);
            } catch (error) {
                console.error('Error fetching instance details:', error);
                setLoading(false);
            }
        };

        fetchInstanceDetails();
    }, [id]);

    // Fetch app details when instance is fetched
    useEffect(() => {
        const fetchAppDetails = async () => {
            try {
                const response = await axios.get(`http://localhost:3001/apps/${appId}`);
                setApp(response.data);
            } catch (error) {
                console.error('Error fetching app details:', error);
            }
        };

        if (appId) {
            fetchAppDetails();
        }
    }, [appId]);

    // Handle form submission to update the instance
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const postData = {
                name,
                description,
                customFields: instanceCustomFields
            };

            await axios.put(`http://localhost:3001/instances/${id}`, postData);

            // Redirect the user to the instance details page after updating
            navigate(`/instances/${id}`);
        } catch (error) {
            console.error('Error updating instance:', error);
        }
    };

    // Handle cancel button click to navigate back to the instance details page
    const handleCancel = () => {
        // Navigate back to the instance details page
        navigate(`/instances/${id}`);
    };

    // Handle custom field value change with type validation
    const handleCustomFieldValueChange = (index, event) => {
        const { value } = event.target;
        const fields = [...instanceCustomFields];

        // Checking if the field type is boolean
        const fieldType = app.customFields.find(f => f._id === fields[index].customFieldId)?.type;

        // Converting the value appropriately based on the field type
        switch (fieldType) {
            case 'bool':
                fields[index].value = value === 'true'; // Converting 'true' or 'false' string to boolean
                break;
            case 'int':
                fields[index].value = parseInt(value, 10); // Converting value to integer
                break;
            case 'float':
                fields[index].value = parseFloat(value); // Converting value to float
                break;
            // Adding cases for other field types as needed
            default:
                fields[index].value = value; // Default to setting the value directly
                break;
        }

        // Update the state with the modified fields array
        setInstanceCustomFields(fields);
    };

    // Render input based on field type, considering both app and instance data
    const renderInputField = (field, index) => {
        // Find the corresponding field from app.customFields
        const appField = app.customFields.find(f => f._id === field.customFieldId);

        if (!appField) {
            return null; // Handle case where appField is not found
        }

        switch (appField.type) {
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

    if (loading) {
        return <div className="container"><h4>Loading instance details...</h4></div>;
    }

    return (
        <div className="container-fluid">
            {/* Page header */}
            <div className='page-header mt-2'>
                <h1 className='page-title'>Edit Instance</h1>
            </div>

            {/* Form */}
            <div className='panel-content mt-2' style={{ backgroundColor: '#E6E8E6', borderRadius: '8px' }}>
                <div className='container-fluid ps-4 pe-4 pt-3 pb-4'>
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
                                {app && app.customFields && app.customFields.map((field, index) => (
                                    <div key={index} className="mb-3 row">
                                        {/* Parameter name */}
                                        <div className="col-3">
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="Name"
                                                name={`name-${index}`}
                                                value={field.name}
                                                readOnly
                                                style={{ backgroundColor: '#F5F6F5', border: 'none' }} />
                                        </div>
                                        {/* Type of variable selection */}
                                        <div className="col-3">
                                            <select
                                                className="form-select"
                                                name={`type-${index}`}
                                                value={field.type}
                                                disabled
                                                style={{ backgroundColor: '#F5F6F5', border: 'none' }}>
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
                                            {renderInputField(instanceCustomFields[index], index)}
                                        </div>
                                        {/* Hidden input for customFieldId */}
                                        <input
                                            type="hidden"
                                            name={`customFieldId-${index}`}
                                            value={field.customFieldId} />
                                    </div>
                                ))}
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

export default EditInstance;