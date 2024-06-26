const express = require('express');
const router = express.Router();
const Instance = require('../models/instances'); // Corrected import
const App = require('../models/apps'); // Assuming this is correctly imported in your models
const Logs = require('../models/logs');

// Function to create a log entry
const createLog = async (type, action, instanceId, instanceName) => {
    const timestamp = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, ''); // Format timestamp
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
        // Extracting the search query parameters from the request
        const { query } = req.query;

        // Logging: Indicating that we are searching for instances
        console.log(`Searching for instances matching query: ${query}`);

        // Finding instances that match the search query in the name or description fields
        const instances = await Instance.find({
            $or: [
                { name: { $regex: query, $options: 'i' } },
                { description: { $regex: query, $options: 'i' } }
            ]
        });

        // Sending the matching instances as a JSON response
        res.status(200).json(instances);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Endpoint to fetch all Instances
router.get('/', async (req, res) => {

    // Logging: Indicating that we are fetching the list of instances
    console.log("Fetching list of instances.");

    try {
        // Query the database to get all instances
        const instances = await Instance.find();
        res.status(200).json(instances);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Endpoint to get an Instance by ID
router.get('/:id', async (req, res) => {
    try {
        // Logging: Indicating that we are fetching an instance by its ID
        console.log(`Fetching instance with ID ${req.params.id}.`);

        const instance = await Instance.findById(req.params.id);

        // If instance is not found
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
    // Logging: Indicating that a new instance is being created
    console.log("Creating a new instance.");

    const { name, description, appId, customFields } = req.body;

    // Extract instance information from the request body
    const newInstance = new Instance({
        name,
        description,
        appId,
        customFields
    });

    try {
        // Save the new instance to the database
        const savedInstance = await newInstance.save();

        // Associate the instance with the app
        await App.findByIdAndUpdate(appId, { $push: { instances: savedInstance._id } });

        // Create a log for creating the instance
        await createLog("Instance", "Created", savedInstance._id, savedInstance.name);

        res.status(201).json(savedInstance);
    } catch (err) {
        // Log the error
        await createLog("Error", err.message, "", "");
        res.status(400).json({ message: err.message });
    }
});

// Endpoint to update an Instance by ID
router.put('/:id', async (req, res) => {
    // Logging: Indicating that we are updating the instance with its ID
    console.log(`Updating instance ${req.params.id}.`);

    // Extracting instance information to update from the request body
    const { name, description, customFields, status } = req.body;

    // Constructing the update object with allowed fields
    const updateObject = {};
    if (name) updateObject.name = name;
    if (description) updateObject.description = description;
    if (customFields) updateObject.customFields = customFields;
    if (status !== undefined) updateObject.status = status; // handle boolean status explicitly
    updateObject.dateUpdated = Date.now();

    try {
        const updatedInstance = await Instance.findByIdAndUpdate(req.params.id, updateObject, { new: true });
        if (!updatedInstance) {
            return res.status(404).json({ message: "Instance not found" });
        }

        // Create a log for updating the instance
        await createLog("Instance", "Updated", updatedInstance._id, updatedInstance.name);

        res.status(200).json(updatedInstance);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Endpoint to delete an Instance by ID
router.delete('/:id', async (req, res) => {
    try {
        // Logging: Indicating that we are deleting an instance by its ID
        console.log(`Deleting instance with ID ${req.params.id}.`);

        // Find the instance by its ID and delete it
        const deletedInstance = await Instance.findByIdAndDelete(req.params.id);

        // If instance is not found
        if (!deletedInstance) {
            return res.status(404).json({ message: "Instance not found" });
        }

        // Update the associated app to remove the instance reference
        const app = await App.findById(deletedInstance.appId);
        if (app) {
            app.instances.pull(deletedInstance._id);
            await app.save();
        }

        // Create a log for deleting the instance
        await createLog("Instance", "Deleted", deletedInstance._id, deletedInstance.name);

        res.status(200).json({ message: "Instance deleted successfully" });
    } catch (err) {
        // Log the error
        await createLog("Error", err.message, req.params.id, "");
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;