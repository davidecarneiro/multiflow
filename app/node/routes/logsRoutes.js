const express = require('express');
const router = express.Router();
const Logs = require('../models/logs');

// Endpoint to search logs by name or descripFtion
router.get('/search', async (req, res) => {
    try {
        // Extracting the search query parameters from the request
        const { query } = req.query;

        // Logging: Indicating that we are searching for logs
        console.log(`Searching for logs matching query: ${query}`);

        // Finding logs that match the search query in the name or description fields
        const logs = await Logs.find({
            $or: [
                { content: { $regex: new RegExp(query, 'i') } }, // Case-insensitive regex match for content
            ]
        });

        // Sending the matching logs as a JSON response
        res.status(200).json(logs);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Endpoint to fetch all logs
router.get('/', async (req, res) => {
    // Logging: Indicating that we are fetching the list of logs
    console.log("Fetching list of logs.");

    try {
        // Query the database to get all logs
        const logs = await Logs.find();
        res.status(200).json(logs);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Endpoint to create a new log
router.post('/', async (req, res) => {
    // Logging: Indicating that a new log is being created
    console.log("Creating a new log.");

    // Extract log information from the request body
    const newLog = new Logs({
        type: req.body.type,
        content: req.body.content
    });

    try {
        // Save the new log to the database
        const savedLog = await newLog.save();
        res.status(201).json(savedLog);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;