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

// Endpoint to search Apps by name, description, or filePath
router.get('/search', async (req, res) => {
    try {
        const { query } = req.query;

        console.log(`Searching for Apps matching query: ${query}`);

        const apps = await Apps.find({
            $or: [
                { name: { $regex: new RegExp(query, 'i') } },
                { description: { $regex: new RegExp(query, 'i') } },
                { filePath: { $regex: new RegExp(query, 'i') } }
            ]
        }).populate('instances');

        res.status(200).json(apps);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Endpoint to fetch all Apps
router.get('/', async (req, res) => {
    console.log("Fetching list of Apps.");

    try {
        const apps = await Apps.find().populate('instances');
        res.status(200).json(apps);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Endpoint to get an App by ID
router.get('/:id', async (req, res) => {
    try {
        console.log(`Fetching App with ID ${req.params.id}.`);

        const app = await Apps.findById(req.params.id).populate('instances');

        if (!app) {
            return res.status(404).json({ message: "App not found" });
        }

        res.status(200).json(app);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Endpoint to create a new App
router.post('/', async (req, res) => {
    console.log("Creating a new App.");

    const { name, description, filePath, customFields } = req.body;

    try {
        const newApp = new Apps({
            name,
            description,
            filePath,
            customFields
        });

        const savedApp = await newApp.save();

        await createLog("App", "Created", savedApp._id, savedApp.name);

        res.status(201).json(savedApp);
    } catch (err) {
        await createLog("Error", err.message, "", "");
        res.status(400).json({ message: err.message });
    }
});

// Helper function to remove fields from instances
const removeFieldsFromInstances = async (appId, removedFields) => {
    try {
        const instances = await Instances.find({ appId });
        console.log(`Found ${instances.length} instances for appId ${appId}`);

        for (const instance of instances) {
            let modified = false;
            removedFields.forEach(removedField => {
                const fieldIndex = instance.customFields.findIndex(field => field.customFieldId === removedField._id.toString());
                if (fieldIndex !== -1) {
                    console.log(`Removing field ${removedField.name} from instance ${instance.name}`);
                    instance.customFields.splice(fieldIndex, 1);
                    modified = true;
                }
            });
            if (modified) {
                await instance.save();
                console.log(`Instance ${instance.name} updated successfully.`);
            }
        }
    } catch (err) {
        console.error('Error removing fields from instances:', err.message);
    }
};

// Helper function to update instances with new custom fields
const updateInstancesWithNewField = async (appId, newFields) => {
    try {
        const instances = await Instances.find({ appId });
        console.log(`Found ${instances.length} instances for appId ${appId}`);

        for (const instance of instances) {
            let modified = false;
            newFields.forEach(newField => {
                const fieldExists = instance.customFields.some(field => field.customFieldId === newField._id.toString());
                if (!fieldExists) {
                    console.log(`Adding new field ${newField.name} to instance ${instance.name}`);
                    instance.customFields.push({
                        customFieldId: newField._id.toString(),
                        value: null
                    });
                    modified = true;
                }
            });
            if (modified) {
                await instance.save();
                console.log(`Instance ${instance.name} updated successfully.`);
            }
        }
    } catch (err) {
        console.error('Error updating instances with new custom fields:', err.message);
    }
};

// Endpoint to update an App by ID
router.put('/:id', async (req, res) => {
    try {
        console.log(`Updating App ${req.params.id}.`);

        const { name, description, filePath, customFields } = req.body;

        const updateObject = {};
        if (name) updateObject.name = name;
        if (description) updateObject.description = description;
        if (filePath) updateObject.filePath = filePath;
        if (customFields) updateObject.customFields = customFields;

        updateObject.dateUpdated = Date.now();

        // Fetch the current state of the app to compare custom fields
        const currentApp = await Apps.findById(req.params.id);
        
        if (!currentApp) {
            return res.status(404).json({ message: "App not found" });
        }

        // Update the App document
        const updatedApp = await Apps.findByIdAndUpdate(req.params.id, updateObject, { new: true });

        // Log the update
        await createLog("App", `Updated`, updatedApp._id, updatedApp.name);

        // If customFields are updated, update the related instances
        if (customFields) {
            // Fetch the updated fields from the updatedApp
            const updatedFields = updatedApp.customFields.map(field => field._id.toString());

            await updateInstancesWithNewField(req.params.id, updatedApp.customFields);

            // Find removed fields
            const removedFields = currentApp.customFields.filter(field => !updatedFields.includes(field._id.toString()));

            if (removedFields.length > 0) {
                await removeFieldsFromInstances(req.params.id, removedFields);
            }
        }

        res.status(200).json(updatedApp);
    } catch (err) {
        console.error('Error updating app:', err);

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

        const instances = await Instances.find({ appId: req.params.id });

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

        await Apps.findByIdAndDelete(req.params.id);

        await createLog("App", `Deleted`, app._id, app.name);
        res.status(200).json({ message: "App and related instances deleted successfully" });
    } catch (err) {
        await createLog("Error", err.message, req.params.id, "");
        res.status(400).json({ message: err.message });
    }
});

// Endpoint to run a specific Python file
router.post('/run/:filename', async (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(codeFolder, filename);

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