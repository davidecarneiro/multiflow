const express = require('express');
const router = express.Router();
const Streams = require('../models/streams');
const Projects = require('../models/projects');
const Logs = require('../models/logs');
const fs = require('fs');
const path = require('path');

const datasetsFolder = path.resolve(__dirname, '../datasets');
console.log('Datasets folder path:', datasetsFolder);

// Endpoint to get the list of datasets
router.get('/datasets', (req, res) => {
    fs.readdir(datasetsFolder, (err, files) => {
        if (err) {
            console.error('Error reading datasets folder:', err);
            return res.status(500).json({ message: 'Error reading datasets folder', error: err.message });
        }
        res.status(200).json(files);
    });
});

// Endpoint to search streams by topic or description
router.get('/search', async (req, res) => {
    try {
        // Extracting the search query parameters from the request
        const { query } = req.query;

        // Logging: Indicating that we are searching for streams
        console.log(`Searching for streams matching query: ${query}`);

        // Finding streams that match the search query in the topic or description fields
        const streams = await Streams.find({
            $or: [
                { topic: { $regex: new RegExp(query, 'i') } }, // Case-insensitive regex match for topic
                { description: { $regex: new RegExp(query, 'i') } } // Case-insensitive regex match for description
            ]
        });

        // Sending the matching streams as a JSON response
        res.status(200).json(streams);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Endpoint to fetch all streams
router.get('/', async (req, res) => {
    // Logging: Indicating that we are fetching the list of streams
    console.log("Fetching list of streams.");

    try {
        // Query the database to get all streams
        const streams = await Streams.find();
        res.status(200).json(streams);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get all stream topics
router.get('/topics', async (req, res) => {
    try {
        // Fetching all stream topics from the Streams model
        const topics = await Streams.find({}, 'topic').lean(); // Fixed model name
        console.log('Fetched topics:', topics); // Debugging output
        res.json(topics.map(stream => stream.topic?.toLowerCase())); // Normalized to lowercase
    } catch (error) {
        console.error('Error fetching stream topics:', error.message, error.stack); // Improved logging
        res.status(500).json({ error: 'Failed to fetch stream topics' });
    }
});


// Endpoint to get a stream by ID
router.get('/:id', async (req, res) => {
    try {
        // Logging: Indicating that we are fetching a stream by its ID
        console.log(`Fetching stream with ID ${req.params.id}.`);

        const stream = await Streams.findById(req.params.id);
        // If stream is not found
        if (!stream) {
            return res.status(404).json({ message: "Stream not found" });
        }
        res.status(200).json(stream);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Function to create a log entry
const createLog = async (type, action, streamId, streamTopic) => {
    const timestamp = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, ''); // Format timestamp
    const logContent = `[${timestamp}] [${type}] [${action}] Stream '${streamTopic}' (ID: ${streamId})`;
    const newLog = new Logs({
        type,
        content: logContent
    });
    await newLog.save();
};

// Endpoint to start a stream by ID
router.put('/start/:id', async (req, res) => {
    try {
        // Logging: Indicating that we are starting a stream by its ID
        console.log(`Starting stream with ID ${req.params.id}.`);

        // Find the stream by its ID
        const stream = await Streams.findById(req.params.id);

        // If stream is not found
        if (!stream) {
            return res.status(404).json({ message: "Stream not found" });
        }

        // Setting the stream's status to true (started) and updating the dateLastStarted
        stream.status = true;
        stream.dateLastStarted = Date.now();
        const updatedStream = await stream.save();

        res.status(200).json(updatedStream);
    } catch (err) {
        // Log the error
        await createLog("Error", err.message, req.params.id, "");
        res.status(400).json({ message: err.message });
    }
});

// Endpoint to stop a stream by ID
router.put('/stop/:id', async (req, res) => {
    try {
        // Logging: Indicating that we are stopping a stream by its ID
        console.log(`Stopping stream with ID ${req.params.id}.`);

        // Find the stream by its ID
        const stream = await Streams.findById(req.params.id);

        // If stream is not found
        if (!stream) {
            return res.status(404).json({ message: "Stream not found" });
        }

        // Set the stream's status to false (stopped)
        stream.status = false;
        const updatedStream = await stream.save();

        res.status(200).json(updatedStream);
    } catch (err) {
        // Log the error
        await createLog("Error", err.message, req.params.id, "");
        res.status(400).json({ message: err.message });
    }
});

// Endpoint to create a new stream
router.post('/', async (req, res) => {
    // Logging: Indicating that a new stream is being created
    console.log("Creating a new stream.");

    // Extract stream information from the request body
    const newStream = new Streams({
        projectId: req.body.projectId,
        topic: req.body.topic,
        description: req.body.description,
        dataSourceType: req.body.dataSourceType,
        dataSourceId: req.body.dataSourceId,
        filePath: req.body.filePath,
        connectionString: req.body.connectionString,
        playbackConfigType: req.body.playbackConfigType,
        linesPerSecond: req.body.linesPerSecond,
        allInSeconds: req.body.allInSeconds,
        realTime: req.body.realTime
    });

    try {
        // Save the new stream to the database
        const savedStream = await newStream.save();

        // Associate the stream with the project
        await Projects.findByIdAndUpdate(req.body.projectId, { $push: { streams: savedStream._id } });

        res.status(201).json(savedStream);
    } catch (err) {
        // Log the error
        await createLog("Error", err.message, "", "");
        res.status(400).json({ message: err.message });
    }
});

// Endpoint to update a stream by ID
router.put('/:id', async (req, res) => {
    try {
        console.log(`Updating stream ${req.params.id}.`);

        const {
            projectId,
            topic,
            description,
            dataSourceType,
            dataSourceId,
            filePath,
            connectionString,
            playbackConfigType,
            linesPerSecond,
            allInSeconds,
            realTime,
        } = req.body;

        const updateObject = {};

        if (projectId) updateObject.projectId = projectId;
        if (topic) updateObject.topic = topic;
        if (description) updateObject.description = description;
        if (dataSourceType) updateObject.dataSourceType = dataSourceType;
        if (dataSourceId) updateObject.dataSourceId = dataSourceId;
        if (filePath) updateObject.filePath = filePath;
        if (connectionString) updateObject.connectionString = connectionString;
        if (playbackConfigType) updateObject.playbackConfigType = playbackConfigType;

        // Handle playbackConfigType and playbackConfigValue
        if (playbackConfigType === 'linesPerSecond') {
            updateObject.linesPerSecond = parseFloat(linesPerSecond);
            updateObject.allInSeconds = null;
            updateObject.realTime = false;
        } else if (playbackConfigType === 'allInSeconds') {
            updateObject.allInSeconds = parseFloat(allInSeconds);
            updateObject.linesPerSecond = null;
            updateObject.realTime = false;
        } else if (playbackConfigType === 'realTime') {
            updateObject.realTime = true;
            updateObject.linesPerSecond = null;
            updateObject.allInSeconds = null;
        }

        updateObject.dateUpdated = Date.now();

        const updatedStream = await Streams.findByIdAndUpdate(
            req.params.id,
            updateObject,
            { new: true }
        );

        if (!updatedStream) {
            return res.status(404).json({ message: "Stream not found" });
        }

        await createLog("Stream", `Updated`, updatedStream._id, updatedStream.topic);

        res.status(200).json(updatedStream);
    } catch (err) {
        await createLog("Error", err.message, req.params.id, "");
        res.status(400).json({ message: err.message });
    }
});

// Endpoint to delete a stream by ID
router.delete('/:id', async (req, res) => {
    try {
        // Logging: Indicating that we are deleting a stream by its ID
        console.log(`Deleting stream with ID ${req.params.id}.`);

        // Find the stream by its ID and delete it
        const deletedStream = await Streams.findByIdAndDelete(req.params.id);

        // If stream is not found
        if (!deletedStream) {
            return res.status(404).json({ message: "Stream not found" });
        }

        // Create a log for the stream deletion
        await createLog("Stream", `Deleted`, deletedStream._id, deletedStream.topic);

        res.status(200).json({ message: "Stream deleted successfully" });
    } catch (err) {
        // Log the error
        await createLog("Error", err.message, req.params.id, "");
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;