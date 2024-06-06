const express = require('express');
const router = express.Router();
const DataSources = require('../models/dataSources')
const Logs = require('../models/logs');

// Endpoint to search Data Sources by name or description
router.get('/search', async (req, res) => {
    try {
        // Extracting the search query parameters from the request
        const { query } = req.query;

        // Logging: Indicating that we are searching for Data Sources
        console.log(`Searching for Data Sources matching query: ${query}`);

        // Finding Data Sources that match the search query in the name or description fields
        const dataSources = await DataSources.find({
            $or: [
                { name: { $regex: new RegExp(query, 'i') } }, // Case-insensitive regex match for name
                { description: { $regex: new RegExp(query, 'i') } } // Case-insensitive regex match for description
            ]
        });

        // Sending the matching Data Sources as a JSON response
        res.status(200).json(dataSources);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Endpoint to fetch all Data Sources
router.get('/', async (req, res) => {
    // Logging: Indicating that we are fetching the list of dataSources
    console.log("Fetching list of Data Sources.");

    try {
        // Query the database to get all Data Sources
        const dataSources = await DataSources.find();
        res.status(200).json(dataSources);
    } catch (err) {
        // Log the error
        await createLog("Error", err.message, "", "");
        res.status(500).json({ message: err.message });
    }
});

// Endpoint to get a Data Source by ID
router.get('/:id', async (req, res) => {
    try {
        // Logging: Indicating that we are fetching a Data Source by its ID
        console.log(`Fetching Data Source with ID ${req.params.id}.`);

        const dataSource = await DataSources.findById(req.params.id);
        // If dataSource is not found
        if (!dataSource) {
            return res.status(404).json({ message: "Data Source not found" });
        }
        res.status(200).json(dataSource);
    } catch (err) {
        // Log the error
        await createLog("Error", err.message, "", "");
        res.status(400).json({ message: err.message });
    }
});

// Function to create a log entry
const createLog = async (type, action, dataSourceId, dataSourceName) => {
    const timestamp = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, ''); // Format timestamp
    const logContent = `[${timestamp}] [${type}] [${action}] Data Source '${dataSourceName}' (ID: ${dataSourceId})`;
    const newLog = new Logs({
        type,
        content: logContent
    });
    await newLog.save();
};

// Endpoint to create a new Data Source
router.post('/', async (req, res) => {
    // Logging: Indicating that a new Data Source is being created
    console.log("Creating a new Data Source.");

    // Extract Data Source information from the request body
    const newDataSource = new DataSources({
        name: req.body.name,
        description: req.body.description,
        dataSourceType: req.body.dataSourceType,
        filePath: req.body.filePath,
        connectionString: req.body.connectionString
    });

    try {
        // Save the new Data Source to the database
        const savedDataSource = await newDataSource.save();

        // Create a log for the Data Source creation
        await createLog("Data Source", "Created", savedDataSource._id, savedDataSource.name);

        res.status(201).json(savedDataSource);
    } catch (err) {
        // Log the error
        await createLog("Error", err.message, "", "");
        res.status(400).json({ message: err.message });
    }
});

// Endpoint to update a Data Source by ID
router.put('/:id', async (req, res) => {
    try {
        // Logging: Indicating that we are updating the Data Source with its ID
        console.log(`Updating Data Source ${req.params.id}.`);

        // Extracting Data Source information to update from the request body
        const { name, description, dataSourceType, filePath, connectionString } = req.body;

        // Constructing the update object with allowed fields
        const updateObject = {};
        if (name) {
            updateObject.name = name;
        }
        if (description) {
            updateObject.description = description;
        }
        if (dataSourceType) {
            updateObject.dataSourceType = dataSourceType;
        }
        if (filePath) {
            updateObject.filePath = filePath;
        }
        if (connectionString) {
            updateObject.connectionString = connectionString;
        }

        // Setting the "lastUpdated" field to the current time
        updateObject.dateUpdated = Date.now();

        // Finding and updating the Data Source by its ID
        const updatedDataSource = await DataSources.findByIdAndUpdate(
            req.params.id, // ID of the Data Source to update
            updateObject, // Update object containing allowed fields
            { new: true } // Return the updated Data Source after update
        );
        if (!updatedDataSource) {
            return res.status(404).json({ message: "Data Source not found" });
        }

        // Create a log for the dataSource update
        await createLog("Data Source", `Updated`, updatedDataSource._id, updatedDataSource.name);

        res.status(200).json(updatedDataSource);
    } catch (err) {
        // Log the error
        await createLog("Error", err.message, req.params.id, "");
        res.status(400).json({ message: err.message });
    }
});

// Endpoint to delete a Data Source by ID
router.delete('/:id', async (req, res) => {
    try {
        // Logging: Indicating that we are deleting a Data Source by its ID
        console.log(`Deleting Data Source with ID ${req.params.id}.`);

        // Find the Data Source by its ID and delete it
        const deletedDataSource = await DataSources.findByIdAndDelete(req.params.id);

        // If Data Source is not found
        if (!deletedDataSource) {
            return res.status(404).json({ message: "Data Source not found" });
        }

        // Create a log for the Data Source deletion
        await createLog("Data Source", `Deleted`, deletedDataSource._id, deletedDataSource.name);

        res.status(200).json({ message: "Data Source deleted successfully" });
    } catch (err) {
        // Log the error
        await createLog("Error", err.message, req.params.id, "");
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;