const express = require('express');
const router = express.Router();
const Apps = require('../models/apps');
const Instances = require('../models/instances');
const Logs = require('../models/logs');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const codeFolder = path.resolve(__dirname, '../code');
console.log('Code folder path:', codeFolder);

// Endpoint to get the list of Python files in the code folder
router.get('/code', (req, res) => {
    fs.readdir(codeFolder, (err, files) => {
        if (err) {
            console.error('Error reading code folder:', err);
            return res.status(500).json({ message: 'Error reading code folder', error: err.message });
        }

        const pythonFiles = files.filter(file => {
            const filePath = path.join(codeFolder, file);
            return fs.statSync(filePath).isFile() && path.extname(file) === '.py';
        });

        res.status(200).json(pythonFiles);
    });
});

// Endpoint to search Apps by name or description
router.get('/search', async (req, res) => {
    try {
        // Extracting the search query parameters from the request
        const { query } = req.query;

        // Logging: Indicating that we are searching for apps
        console.log(`Searching for Apps matching query: ${query}`);

        // Finding apps that match the search query in the name or description fields
        const apps = await Apps.find({
            $or: [
                { name: { $regex: new RegExp(query, 'i') } },
                { description: { $regex: new RegExp(query, 'i') } },
                { filePath: { $regex: new RegExp(query, 'i') } }
            ]
        }).populate('instances');

        // Sending the matching apps as a JSON response
        res.status(200).json(apps);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Endpoint to fetch all Apps
router.get('/', async (req, res) => {
    // Logging: Indicating that we are fetching the list of apps
    console.log("Fetching list of Apps.");

    try {
        // Query the database to get all apps and populate instances
        const apps = await Apps.find().populate('instances');
        res.status(200).json(apps);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Endpoint to get an App by ID
router.get('/:id', async (req, res) => {
    try {
        // Logging: Indicating that we are fetching a app by its ID
        console.log(`Fetching App with ID ${req.params.id}.`);

        const app = await Apps.findById(req.params.id).populate('instances');

        // If app is not found
        if (!app) {
            return res.status(404).json({ message: "App not found" });
        }

        const instances = await Instances.find({ appId: req.params.id });
        res.status(200).json({ app, instances });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Function to create a log entry
const createLog = async (type, action, appId, appName) => {
    const timestamp = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
    const logContent = `[${timestamp}] [${type}] [${action}] App '${appName}' (ID: ${appId})`;
    const newLog = new Logs({
        type,
        content: logContent
    });
    await newLog.save();
};

// Endpoint to create a new App
router.post('/', async (req, res) => {
    // Logging: Indicating that a new app is being created
    console.log("Creating a new App.");

    // Extract app information from the request body
    const newApp = new Apps({
        name: req.body.name,
        description: req.body.description,
        filePath: req.body.filePath,
        customFields: req.body.customFields
    });

    try {
        // Save the new app to the database
        const savedApp = await newApp.save();

        // Create a log for the app creation
        await createLog("App", "Created", savedApp._id, savedApp.name);

        res.status(201).json(savedApp);
    } catch (err) {
        await createLog("Error", err.message, "", "");
        res.status(400).json({ message: err.message });
    }
});

// Endpoint to update an App by ID
router.put('/:id', async (req, res) => {
    try {
        // Logging: Indicating that we are updating the app with its ID
        console.log(`Updating App ${req.params.id}.`);

        // Extracting app information to update from the request body
        const { name, description, filePath, customFields } = req.body;

        // Logging the request body for debugging
        console.log('Request body:', req.body);

        // Validate the incoming data
        if (!name && !description && !filePath && !customFields) {
            return res.status(400).json({ message: "No valid fields to update" });
        }

        // Constructing the update object with allowed fields
        const updateObject = {};
        if (name) updateObject.name = name;
        if (description) updateObject.description = description;
        if (filePath) updateObject.filePath = filePath;
        if (customFields) updateObject.customFields = customFields;

        // Setting the "lastUpdated" field to the current time
        updateObject.dateUpdated = Date.now();

        // Finding and updating the app by its ID
        const updatedApp = await Apps.findByIdAndUpdate(req.params.id, updateObject, { new: true });
        if (!updatedApp) {
            return res.status(404).json({ message: "App not found" });
        }

        // Create a log for the app update
        await createLog("App", `Updated`, updatedApp._id, updatedApp.name);

        res.status(200).json(updatedApp);
    } catch (err) {
        // Logging the error for debugging
        console.error('Error updating app:', err);

        // Create a log for the error
        await createLog("Error", err.message, req.params.id, "");

        res.status(400).json({ message: err.message });
    }
});

// Endpoint to delete an App by ID
router.delete('/:id', async (req, res) => {
    try {
        console.log(`Deleting App with ID ${req.params.id}.`);

        const app = await Apps.findById(req.params.id);
        if (!app) {
            return res.status(404).json({ message: "App not found" });
        }

        // Fetch related instances
        const instances = await Instances.find({ appId: req.params.id });

        // Delete each instance directly
        for (const instance of instances) {
            try {
                const deletedInstance = await Instances.findByIdAndDelete(instance._id);
                if (!deletedInstance) {
                    console.error(`Instance with ID ${instance._id} not found`);
                    continue;
                }

                app.instances.pull(deletedInstance._id);
                await createLog("Instance", "Deleted", deletedInstance._id, deletedInstance.name);
            } catch (err) {
                console.error(`Failed to delete instance with ID ${instance._id}: ${err.message}`);
                await createLog("Error", `Failed to delete instance ${instance._id}`, req.params.id, app.name);
            }
        }

        await app.save();

        // Finally, delete the app
        await Apps.findByIdAndDelete(req.params.id);

        await createLog("App", `Deleted`, app._id, app.name);
        res.status(200).json({ message: "App and related instances deleted successfully" });
    } catch (err) {
        await createLog("Error", err.message, req.params.id, "");
        res.status(400).json({ message: err.message });
    }
});

// Endpoint to delete an Instance by ID
router.delete('/instances/:id', async (req, res) => {
    try {
        const deletedInstance = await Instances.findByIdAndDelete(req.params.id);
        if (!deletedInstance) {
            return res.status(404).json({ message: "Instance not found" });
        }

        // Update the associated app to remove the instance
        const app = await Apps.findById(deletedInstance.appId);
        app.instances.pull(deletedInstance._id);
        await app.save();

        // Create a log for deleting the instance
        await createLog("Instance", "Deleted", deletedInstance._id, deletedInstance.name);

        res.status(200).json({ message: "Instance deleted successfully" });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Endpoint to run a specific Python file
router.post('/run/:filename', async (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(codeFolder, filename);

    // Check if the file exists before executing it
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'File not found' });
    }

    exec(`python ${filePath}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error executing script: ${error.message}`);
            return res.status(500).json({ message: `Error executing script: ${error.message}` });
        }

        if (stderr) {
            console.error(`Script error output: ${stderr}`);
            return res.status(500).json({ message: `Script error output: ${stderr}` });
        }

        console.log(`Script output: ${stdout}`);
        res.status(200).json({ output: stdout });
    });
});

module.exports = router;