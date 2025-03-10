import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

function EditInstance() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [app, setApp] = useState(null);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [port, setPort] = useState('');
    const [portError, setPortError] = useState('');
    const [nameError, setNameError] = useState('');
    const [instanceCustomFields, setInstanceCustomFields] = useState([]);
    const [instanceData, setInstanceData] = useState(null);
    const [streams, setStreams] = useState([]); // Store available streams
    const [streamTopic, setStreamTopic] = useState(''); // Store selected stream topic (topic string)
    const [streamTopicId, setStreamTopicId] = useState(''); // Store selected stream topic (ID)
    const [loading, setLoading] = useState(true);
    const [appId, setAppId] = useState('');
    const [isDuplicatePort, setIsDuplicatePort] = useState(false);
    const [hasSpacesInName, setHasSpacesInName] = useState(false);

    const dockerPorts = [5010, 6066, 9092, 8081, 19000, 9092, 3000, 3001, 8082, 3002, 27017, 8036]; // Reserved ports for Docker

    // Debounce function to limit the rate of API calls
    const debounce = (func, delay) => {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func(...args), delay);
        };
    };

    // Function to check if the port is already in use
    const checkPortAvailability = async (newPort) => {
        try {
            const response = await axios.get(`http://localhost:3001/instances`);
            const instances = response.data;
            const existingInstance = instances.find(inst => inst.port === parseInt(newPort) && inst._id !== id);

            if (existingInstance) {
                setPortError('The entered Port is already in use. Please choose a different one.');
                setIsDuplicatePort(true);
            } else {
                setIsDuplicatePort(false);
            }
        } catch (error) {
            console.error('Error checking port availability:', error);
        }
    };

    // Debounced version of the port availability check
    const debouncedCheckPortAvailability = debounce(checkPortAvailability, 300); // 300ms delay

    // Fetching instance details when the component mounts
    useEffect(() => {
        const fetchInstanceDetails = async () => {
            try {
                const response = await axios.get(`http://localhost:3001/instances/${id}`);
                const instanceData = response.data;
                setInstanceData(instanceData);
                setName(instanceData.name);
                setAppId(instanceData.appId);
                setDescription(instanceData.description);
                setPort(instanceData.port);

                // Set streamTopic and streamTopicId
                setStreamTopic(instanceData.streamTopic || '');
                setStreamTopicId(instanceData.streamTopicId || '');

                // Set custom fields with default values if empty
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
    }, [id, streams]);

    // Fetching the list of available streams
    useEffect(() => {
        const fetchStreams = async () => {
            try {
                const response = await axios.get('http://localhost:3001/streams');
                const streams = response.data.map(stream => ({
                    id: stream._id,
                    topic: stream.topic
                }));
                setStreams(streams); // Save only the id and topic
            } catch (error) {
                console.error('Error fetching streams:', error);
            }
        };

        fetchStreams();
    }, []);

    // Fetching app details when instance is fetched
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

    // Handling form submission to update the instance
    const handleSubmit = async (e) => {
        e.preventDefault();
        setPortError('');
        setNameError('');

        // Validating port before submitting
        if (dockerPorts.includes(parseInt(port))) {
            setPortError('The entered Port is reserved for Docker. Please choose a different one.');
            setIsDuplicatePort(true); // Disable the button
            return;
        }

        // Checking if the port is already in use by another instance
        const response = await axios.get(`http://localhost:3001/instances`);
        const instances = response.data;
        const existingInstance = instances.find(inst => inst.port === parseInt(port) && inst._id !== id);

        if (existingInstance) {
            setPortError('The entered Port is already in use. Please choose a different one.');
            setIsDuplicatePort(true); // Disable the button
            return;
        } else {
            setIsDuplicatePort(false); // Enable the button
        }

        // Checking if the name contains spaces
        if (/\s/.test(name)) {
            setNameError('Instance name should not contain spaces.');
            setHasSpacesInName(true); // Disable the button
            return;
        } else {
            setHasSpacesInName(false); // Enable the button
        }

        // Preparing data for submission
        const postData = {
            name,
            description,
            port: parseInt(port),
            streamTopicId: streamTopicId || instanceData.streamTopicId,
            streamTopic: streamTopic || instanceData.streamTopic,
            customFields: instanceCustomFields
        };

        console.log('Submitting data:', postData); // Log the data being submitted

        try {
            await axios.put(`http://localhost:3001/instances/${id}`, postData);

            // Redirecting the user to the instance details page after updating
            navigate(`/instances/${id}`);
        } catch (error) {
            console.error('Error updating instance:', error);
            if (error.response) {
                console.error('Server response:', error.response.data);
            }
        }
    };

    // Handle to update the streamTopic state when the user selects a new value
    const handleStreamChange = (e) => {
        const selectedStreamTopic = e.target.value; // Topic string

        // Find the stream ID based on the selected topic
        const selectedStream = streams.find(stream => stream.topic === selectedStreamTopic);

        if (selectedStream) {
            setStreamTopic(selectedStreamTopic); // Set the topic name
            setStreamTopicId(selectedStream.id); // Set the corresponding stream ID
        } else {
            // If the selected topic is not found, reset the stream topic and ID
            setStreamTopic('');
            setStreamTopicId('');
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

    // Rendering input based on field type, considering both app and instance data
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
            <div className='panel-content mt-2 mb-4' style={{ backgroundColor: '#E6E8E6', borderRadius: '8px' }}>
                <div className='container-fluid ps-4 pe-4 pt-3 pb-4'>
                    <div className='col-12'>
                        <form onSubmit={handleSubmit}>
                            <div className="mb-3">
                                <label htmlFor="name" className="form-label">Instance Name</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    id="name"
                                    placeholder='Enter the instance name'
                                    value={name}
                                    onChange={(e) => {
                                        setName(e.target.value);
                                        setHasSpacesInName(/\s/.test(e.target.value));
                                        if (/\s/.test(e.target.value)) {
                                            setNameError('Instance name should not contain spaces.');
                                        } else {
                                            setNameError('');
                                        }
                                    }}
                                    required
                                />
                                {nameError && <small className="text-danger">{nameError}</small>}
                            </div>
                            <div className="mb-3">
                                <label htmlFor="description" className="form-label">Instance Description</label>
                                <textarea
                                    className="form-control"
                                    id="description"
                                    placeholder='Enter the description'
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                ></textarea>
                            </div>
                            {/* Instance Port */}
                            <div className="col-3 mb-3">
                                <label htmlFor="port" className="form-label">Instance Port</label>
                                <input
                                    type="number"
                                    className={`form-control ${portError ? 'is-invalid' : ''}`}
                                    id="port"
                                    placeholder="Enter the instance port"
                                    value={port}
                                    onChange={async (e) => {
                                        const newPort = e.target.value;
                                        setPort(newPort);
                                        setPortError('');

                                        // Checking if the port is reserved for Docker
                                        if (dockerPorts.includes(parseInt(newPort))) {
                                            setPortError('The entered Port is reserved for Docker. Please choose a different one.');
                                            setIsDuplicatePort(true);
                                            return;
                                        }

                                        // Debounced check for duplicate port
                                        debouncedCheckPortAvailability(newPort);
                                    }}
                                    required
                                />
                                {portError && <div className="invalid-feedback">{portError}</div>}
                            </div>
                            {/* Stream Topic dropdown */}
                            <div className="col-4 mb-3">
                                <label htmlFor="streamTopic" className="form-label">Select Stream Topic</label>
                                <select
                                    id="streamTopic"
                                    className="form-select"
                                    value={streamTopic || ''} // Default to empty if streamTopic doesn't exist
                                    onChange={handleStreamChange}
                                    required>
                                    <option value="" disabled>Select a stream topic</option>
                                    {streams.map((stream) => (
                                        <option key={stream.id} value={stream.topic}>
                                            {stream.topic}
                                        </option>
                                    ))}
                                </select>
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
                                <button type="submit" className="btn btn-primary" style={{ fontWeight: '500' }} disabled={isDuplicatePort || hasSpacesInName || loading}>Update</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default EditInstance;