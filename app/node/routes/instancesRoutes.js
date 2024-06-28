const express = require('express');
const router = express.Router();
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

    const { name, description, appId, customFields } = req.body;

    try {
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
        // Handle any errors
        await createLog("Error", err.message, "", "");
        res.status(400).json({ message: err.message });
    }
});

// Endpoint to update an Instance by ID
router.put('/:id', async (req, res) => {
    console.log(`Updating instance ${req.params.id}.`);

    const { name, description, customFields, status } = req.body;

    try {
        const updatedInstance = await Instance.findById(req.params.id);

        if (!updatedInstance) {
            return res.status(404).json({ message: "Instance not found" });
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

        updatedInstance.dateUpdated = Date.now();

        const savedInstance = await updatedInstance.save();

        await createLog("Instance", "Updated", savedInstance._id, savedInstance.name);

        res.status(200).json(savedInstance);
    } catch (err) {
        res.status(400).json({ message: err.message });
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

module.exports = router;