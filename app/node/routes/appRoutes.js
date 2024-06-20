const express = require('express');
const router = express.Router();
const Apps = require('../models/apps');
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

        // Filter to include only Python files and exclude unwanted files/directories
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

        // Logging: Indicating that we are searching for Apps
        console.log(`Searching for Apps matching query: ${query}`);

        // Finding Apps that match the search query in the name or description fields
        const apps = await Apps.find({
            $or: [
                { name: { $regex: new RegExp(query, 'i') } }, // Case-insensitive regex match for name
                { description: { $regex: new RegExp(query, 'i') } }, // Case-insensitive regex match for description
                { filePath: { $regex: new RegExp(query, 'i') } } // Case-insensitive regex match for file path
            ]
        });

        // Sending the matching Apps as a JSON response
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
        // Query the database to get all Apps
        const apps = await Apps.find();
        res.status(200).json(apps);
    } catch (err) {
        // Log the error
        await createLog("Error", err.message, "", "");
        res.status(500).json({ message: err.message });
    }
});

// Endpoint to get an App by ID
router.get('/:id', async (req, res) => {
    try {
        // Logging: Indicating that we are fetching an App by its ID
        console.log(`Fetching App with ID ${req.params.id}.`);

        const app = await Apps.findById(req.params.id);
        // If app is not found
        if (!app) {
            return res.status(404).json({ message: "App not found" });
        }
        res.status(200).json(app);
    } catch (err) {
        // Log the error
        await createLog("Error", err.message, "", "");
        res.status(400).json({ message: err.message });
    }
});

// Function to create a log entry
const createLog = async (type, action, appId, appName) => {
    const timestamp = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, ''); // Format timestamp
    const logContent = `[${timestamp}] [${type}] [${action}] App '${appName}' (ID: ${appId})`;
    const newLog = new Logs({
        type,
        content: logContent
    });
    await newLog.save();
};

// Endpoint to create a new App
router.post('/', async (req, res) => {
    // Logging: Indicating that a new App is being created
    console.log("Creating a new App.");

    // Extract App information from the request body
    const newApp = new Apps({
        name: req.body.name,
        description: req.body.description,
        filePath: req.body.filePath
    });

    try {
        // Save the new App to the database
        const savedApp = await newApp.save();

        // Create a log for the App creation
        await createLog("App", "Created", savedApp._id, savedApp.name);

        res.status(201).json(savedApp);
    } catch (err) {
        // Log the error
        await createLog("Error", err.message, "", "");
        res.status(400).json({ message: err.message });
    }
});

// Endpoint to update an App by ID
router.put('/:id', async (req, res) => {
    try {
        // Logging: Indicating that we are updating the App with its ID
        console.log(`Updating App ${req.params.id}.`);

        // Extracting App information to update from the request body
        const { name, description, filePath } = req.body;

        // Constructing the update object with allowed fields
        const updateObject = {};
        if (name) {
            updateObject.name = name;
        }
        if (description) {
            updateObject.description = description;
        }
        if (filePath) {
            updateObject.filePath = filePath;
        }

        // Setting the "dateUpdated" field to the current time
        updateObject.dateUpdated = Date.now();

        // Finding and updating the App by its ID
        const updatedApp = await Apps.findByIdAndUpdate(
            req.params.id, // ID of the App to update
            updateObject, // Update object containing allowed fields
            { new: true } // Return the updated App after update
        );
        if (!updatedApp) {
            return res.status(404).json({ message: "App not found" });
        }

        // Create a log for the App update
        await createLog("App", `Updated`, updatedApp._id, updatedApp.name);

        res.status(200).json(updatedApp);
    } catch (err) {
        // Log the error
        await createLog("Error", err.message, req.params.id, "");
        res.status(400).json({ message: err.message });
    }
});

// Endpoint to delete an App by ID
router.delete('/:id', async (req, res) => {
    try {
        // Logging: Indicating that we are deleting an App by its ID
        console.log(`Deleting App with ID ${req.params.id}.`);

        // Find the App by its ID and delete it
        const deletedApp = await Apps.findByIdAndDelete(req.params.id);

        // If App is not found
        if (!deletedApp) {
            return res.status(404).json({ message: "App not found" });
        }

        // Create a log for the App deletion
        await createLog("App", `Deleted`, deletedApp._id, deletedApp.name);

        res.status(200).json({ message: "App deleted successfully" });
    } catch (err) {
        // Log the error
        await createLog("Error", err.message, req.params.id, "");
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;