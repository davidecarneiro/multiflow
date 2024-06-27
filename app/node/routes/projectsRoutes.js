const express = require('express');
const router = express.Router();
const Projects = require('../models/projects');
const Streams = require('../models/streams');
const Logs = require('../models/logs');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Function to create a log entry
const createLog = async (type, action, entityId, entityName) => {
    const timestamp = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, ''); // Format timestamp
    const logContent = `[${timestamp}] [${type}] [${action}] ${entityName} (ID: ${entityId})`;
    const newLog = new Logs({
        type,
        content: logContent
    });
    await newLog.save();
};

// Endpoint to search projects by name or description
router.get('/search', async (req, res) => {
    try {
        // Extracting the search query parameters from the request
        const { query } = req.query;

        // Logging: Indicating that we are searching for projects
        console.log(`Searching for projects matching query: ${query}`);

        // Finding projects that match the search query in the name or description fields
        const projects = await Projects.find({
            $or: [
                { name: { $regex: new RegExp(query, 'i') } }, // Case-insensitive regex match for name
                { description: { $regex: new RegExp(query, 'i') } } // Case-insensitive regex match for description
            ]
        }).populate('streams');

        // Sending the matching projects as a JSON response
        res.status(200).json(projects);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Endpoint to fetch all projects with associated streams
router.get('/', async (req, res) => {
    // Logging: Indicating that we are fetching the list of projects
    console.log("Fetching list of projects with associated streams.");

    try {
        // Query the database to get all projects and populate streams
        const projects = await Projects.find().populate('streams');
        res.status(200).json(projects);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Endpoint to get a project by ID
router.get('/:id', async (req, res) => {
    try {
        // Logging: Indicating that we are fetching a project by its ID
        console.log(`Fetching project with ID ${req.params.id}.`);

        const project = await Projects.findById(req.params.id).populate('streams');
        // If project is not found
        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }
        res.status(200).json(project);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Endpoint to start a project by ID
router.put('/start/:id', async (req, res) => {
    try {
        // Logging: Indicating that we are starting a project by its ID
        console.log(`Starting project with ID ${req.params.id}.`);

        // Find the project by its ID
        const project = await Projects.findById(req.params.id);

        // If project is not found
        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        // Setting the project's status to true (started) and updating the dateLastStarted
        project.status = true;
        project.dateLastStarted = Date.now();
        const updatedProject = await project.save();

        // Create a log for starting the project
        await createLog("Project", "Started", updatedProject._id, updatedProject.name);

        res.status(200).json(updatedProject);
    } catch (err) {
        // Log the error
        await createLog("Error", err.message, req.params.id, "");
        res.status(400).json({ message: err.message });
    }
});

// Endpoint to stop a project by ID
router.put('/stop/:id', async (req, res) => {
    try {
        // Logging: Indicating that we are stopping a project by its ID
        console.log(`Stopping project with ID ${req.params.id}.`);

        // Find the project by its ID
        const project = await Projects.findById(req.params.id);

        // If project is not found
        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        // Set the project's status to false (stopped)
        project.status = false;
        const updatedProject = await project.save();

        // Create a log for stopping the project
        await createLog("Project", "Stopped", updatedProject._id, updatedProject.name);

        res.status(200).json(updatedProject);
    } catch (err) {
        // Log the error
        await createLog("Error", err.message, req.params.id, "");
        res.status(400).json({ message: err.message });
    }
});

// Endpoint to create a new project
router.post('/', async (req, res) => {
    // Logging: Indicating that a new project is being created
    console.log("Creating a new project.");

    // Extract project information from the request body
    const newProject = new Projects({
        name: req.body.name,
        description: req.body.description
    });

    try {
        // Save the new project to the database
        const savedProject = await newProject.save();

        // Create a log for the project creation
        await createLog("Project", "Created", savedProject._id, savedProject.name);

        res.status(201).json(savedProject);
    } catch (err) {
        // Log the error
        await createLog("Error", err.message, "", "");
        res.status(400).json({ message: err.message });
    }
});

// Endpoint to update a project by ID
router.put('/:id', async (req, res) => {
    try {
        // Logging: Indicating that we are updating the project with its ID
        console.log(`Updating project ${req.params.id}.`);

        // Extracting project information to update from the request body
        const { name, description } = req.body;

        // Constructing the update object with allowed fields
        const updateObject = {};
        if (name) {
            updateObject.name = name;
        }
        if (description) {
            updateObject.description = description;
        }

        // Setting the "lastUpdated" field to the current time
        updateObject.dateUpdated = Date.now();

        // Finding and updating the project by its ID
        const updatedProject = await Projects.findByIdAndUpdate(
            req.params.id, // ID of the project to update
            updateObject, // Update object containing allowed fields
            { new: true } // Return the updated project after update
        );
        if (!updatedProject) {
            return res.status(404).json({ message: "Project not found" });
        }

        // Create a log for the project update
        await createLog("Project", `Updated`, updatedProject._id, updatedProject.name);

        res.status(200).json(updatedProject);
    } catch (err) {
        // Log the error
        await createLog("Error", err.message, req.params.id, "");
        res.status(400).json({ message: err.message });
    }
});

// Endpoint to delete a project by ID
router.delete('/:id', async (req, res) => {
    try {
        // Logging: Indicating that we are deleting a project by its ID
        console.log(`Deleting project with ID ${req.params.id}.`);

        // Find the project by its ID and delete it
        const deletedProject = await Projects.findByIdAndDelete(req.params.id);

        // If project is not found
        if (!deletedProject) {
            return res.status(404).json({ message: "Project not found" });
        }

        // Fetch related streams
        const streams = await Streams.find({ projectId: req.params.id });

        // Delete each stream directly
        for (const stream of streams) {
            try {
                const deletedStream = await Streams.findByIdAndDelete(stream._id);
                if (!deletedStream) {
                    console.error(`Stream with ID ${stream._id} not found`);
                    continue;
                }

                await createLog("Stream", "Deleted", deletedStream._id, deletedStream.topic);
            } catch (err) {
                console.error(`Failed to delete stream with ID ${stream._id}: ${err.message}`);
                await createLog("Error", `Failed to delete stream ${stream._id}`, req.params.id, deletedProject.name);
            }
        }

        // Create a log for the project deletion
        await createLog("Project", `Deleted`, deletedProject._id, deletedProject.name);

        res.status(200).json({ message: "Project and related streams deleted successfully" });
    } catch (err) {
        // Log the error
        await createLog("Error", err.message, req.params.id, "");
        res.status(400).json({ message: err.message });
    }
});

// Endpoint to delete a stream by ID
router.delete('/streams/:id', async (req, res) => {
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