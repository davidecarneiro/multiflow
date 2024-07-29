const express = require('express');
const router = express.Router();
const axios = require('axios');
const Instance = require('../models/instances');
const App = require('../models/apps');
const Logs = require('../models/logs');

// Function to create a log entry
const createLog = async (type, action, instanceId, instanceName) => {
    const timestamp = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
    const logContent = `[${timestamp}] [${type}] [${action}] Instance '${instanceName}' (ID: ${instanceId})`;
    const newLog = new Logs({
        type,
        content: logContent
    });
    await newLog.save();
};

// Endpoint to search Instances by name or description
router.get('/search', async (req, res) => {
    try {
        const { query } = req.query;
        console.log(`Searching for instances matching query: ${query}`);
        const instances = await Instance.find({
            $or: [
                { name: { $regex: query, $options: 'i' } },
                { description: { $regex: query, $options: 'i' } }
            ]
        });
        res.status(200).json(instances);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Endpoint to fetch all Instances
router.get('/', async (req, res) => {
    console.log("Fetching list of instances.");
    try {
        const instances = await Instance.find();
        res.status(200).json(instances);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Endpoint to get an Instance by ID
router.get('/:id', async (req, res) => {
    try {
        console.log(`Fetching instance with ID ${req.params.id}.`);
        const instance = await Instance.findById(req.params.id);
        if (!instance) {
            return res.status(404).json({ message: "Instance not found" });
        }
        res.status(200).json(instance);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Endpoint to create a new Instance
router.post('/', async (req, res) => {
    console.log("Creating a new instance.");
    const { name, description, appId, port, customFields } = req.body;
    try {
        // Check if the port is already in use
        const existingInstance = await Instance.findOne({ port });
        if (existingInstance) {
            return res.status(400).json({ message: "Port is already in use" });
        }

        // Fetch the app to validate customFieldIds
        const app = await App.findById(appId);
        if (!app) {
            return res.status(404).json({ message: "Parent app not found" });
        }
        // Validate customFields against app's customFields
        const validCustomFields = customFields.every(customField => {
            return app.customFields.some(appField => appField._id.equals(customField.customFieldId));
        });
        if (!validCustomFields) {
            return res.status(400).json({ message: "Invalid customFieldIds" });
        }
        // Create a new Instance
        const newInstance = new Instance({
            name,
            description,
            appId,
            port,
            customFields: customFields.map(field => ({
                customFieldId: field.customFieldId,
                value: field.value
            }))
        });
        // Save the new Instance to the database
        const savedInstance = await newInstance.save();
        // Link the instance to the parent app
        await App.findByIdAndUpdate(appId, { $push: { instances: savedInstance._id } });
        // Create a log for the instance creation
        await createLog("Instance", "Created", savedInstance._id, savedInstance.name);
        // Respond with the saved instance object
        res.status(201).json(savedInstance);
    } catch (err) {
        if (err.code === 11000) { // MongoDB duplicate key error code
            res.status(400).json({ message: "Port must be unique" });
        } else {
            await createLog("Error", err.message, "", "");
            res.status(400).json({ message: err.message });
        }
    }
});

// Endpoint to update an Instance by ID
router.put('/:id', async (req, res) => {
    console.log(`Updating instance ${req.params.id}.`);
    const { name, description, customFields, status, port } = req.body;
    try {
        const updatedInstance = await Instance.findById(req.params.id);
        if (!updatedInstance) {
            return res.status(404).json({ message: "Instance not found" });
        }
        // Check if the port is already in use by another instance
        if (port && port !== updatedInstance.port) {
            const existingInstance = await Instance.findOne({ port });
            if (existingInstance) {
                return res.status(400).json({ message: "Port is already in use" });
            }
        }

        // Fetch the app to validate customFieldIds
        const app = await App.findById(updatedInstance.appId);
        if (!app) {
            return res.status(404).json({ message: "Parent app not found" });
        }
        // Verify customFields against app's customFields
        const validCustomFields = customFields.every(field => {
            return app.customFields.some(appField => appField._id.equals(field.customFieldId));
        });
        if (!validCustomFields) {
            return res.status(400).json({ message: "Invalid customFieldIds" });
        }
        // Update instance fields
        if (name) updatedInstance.name = name;
        if (description) updatedInstance.description = description;
        if (customFields) updatedInstance.customFields = customFields;
        if (status !== undefined) updatedInstance.status = status;
        if (port) updatedInstance.port = port; // Update the port
        updatedInstance.dateUpdated = Date.now();
        const savedInstance = await updatedInstance.save();
        await createLog("Instance", "Updated", savedInstance._id, savedInstance.name);
        res.status(200).json(savedInstance);
    } catch (err) {
        if (err.code === 11000) { // MongoDB duplicate key error code
            res.status(400).json({ message: "Port must be unique" });
        } else {
            res.status(400).json({ message: err.message });
        }
    }
});

// Endpoint to delete an Instance by ID
router.delete('/:id', async (req, res) => {
    console.log(`Deleting instance with ID ${req.params.id}.`);
    try {
        const deletedInstance = await Instance.findByIdAndDelete(req.params.id);
        if (!deletedInstance) {
            return res.status(404).json({ message: "Instance not found" });
        }
        const app = await App.findById(deletedInstance.appId);
        if (app) {
            app.instances.pull(deletedInstance._id);
            await app.save();
        }
        await createLog("Instance", "Deleted", deletedInstance._id, deletedInstance.name);
        res.status(200).json({ message: "Instance deleted successfully" });
    } catch (err) {
        await createLog("Error", err.message, req.params.id, "");
        res.status(400).json({ message: err.message });
    }
});


// Endpoint to start a specific Application Faust
router.post('/start/:id', async (req, res) => {
    try {
        // Find the instance by its ID
        const instance = await Instance.findById(req.params.id);

        if (!instance) {
            return res.status(404).json({ message: "Instance not found" });
        }

        // Find the app by its ID
        const app = await App.findById(instance.appId);

        if (!app) {
            return res.status(404).json({ message: "App not found" });
        }

        console.log(`Fetching App with ID ${app._id}.`);

        // Remove the '.py' extension from the filePath if it exists
        let filePath = app.filePath;
        if (filePath.endsWith('.py')) {
            filePath = filePath.slice(0, -3);
        }

        // Construct the command string with custom field values from the instance
        let command = `faust -A ${filePath} worker -l info`;

        // Append custom field values as environment variables
        instance.customFields.forEach(field => {
            const appField = app.customFields.find(f => f._id.toString() === field.customFieldId);
            if (appField) {
                command = `${appField.name}=${field.value} ${command}`;
            }
        });

        console.log(`Command to run: ${command}`);

        // Create the body object for the Flask API call
        const body = {
            command: "Name=" + instance.name + " Port=" + instance.port + " " + command,
            instanceId: instance._id,
            instanceName: instance.name
        };

        console.log(body);
        
        // Call the Flask endpoint to run the Python script
        const response = await axios.post('http://faust_server:5010/start-faust', body);

        if (response.data.error) {
            console.error(`Error running the script: ${response.data.error}`);
            return res.status(500).json({ error: "Error running the script" });
        }

        if (response.data.pid) {
            console.log(`Script PID: ${response.data.pid}`);
            instance.pid = response.data.pid;
        } else {
            console.error(`Error running the script: ${response.data.error}`);
            return res.status(500).json({ error: "Error PID" });
        }

        // Setting the instance's status to true (started) and updating the dateLastStarted
        instance.status = true;
        instance.dateLastStarted = Date.now();
        const updatedInstance = await instance.save();

        await createLog("Instance", "Started", updatedInstance._id, updatedInstance.name);

        res.status(200).json({ message: "Faust application started successfully", output: response.data.message });
    } catch (err) {
        console.error(err.message);
        await createLog("Error", err.message, req.params.id, "");
        res.status(400).json({ message: err.message });
    }
});

// Endpoint to stop a specific Application Faust
router.post('/stop/:id', async (req, res) => {
    try {
        // Find the instance by its ID
        const instance = await Instance.findById(req.params.id);

        if (!instance) {
            return res.status(404).json({ message: "Instance not found" });
        }

        if (!instance.pid) {
            return res.status(400).json({ message: "Instance is not running" });
        }

        // Send a request to the Flask endpoint to stop the Faust application
        const body = {
            pid: instance.pid
        };

        const response = await axios.post('http://faust_server:5010/stop-faust', body);

        if (response.data.status !== "Stopped") {
            console.error(`Error stopping the process: ${response.data.message}`);
            return res.status(500).json({ message: "Error stopping the process" });
        }

        // Update the instance status and remove the pid
        instance.status = false;
        instance.pid = null;
        instance.dateLastStarted = null;
        await instance.save();

        await createLog("Instance", "Stopped", instance._id, instance.name);

        res.status(200).json({ message: "Faust application stopped successfully" });
    } catch (err) {
        console.error(err.message);
        await createLog("Error", err.message, req.params.id, "");
        res.status(400).json({ message: err.message });
    }
});




module.exports = router;