const express = require('express');
const mongoose = require('mongoose');
const projectsRoutes = require('./routes/projectsRoutes');
const streamsRoutes = require('./routes/streamsRoutes');
const logsRoutes = require('./routes/logsRoutes');
const appRoutes = require('./routes/appRoutes');
const dataSourcesRoutes = require('./routes/dataSourcesRoutes');
const cors = require('cors');

// Configuring Express
const app = express();
const PORT = process.env.PORT || 3001;

// MongoDB connection
mongoose.connect('mongodb://mongodb_server:27017/Multiflow', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

//mongoose.connect('mongodb://127.0.0.1:27017/Multiflow', {
//mongoose.connect('mongodb://mongodb_server:27017/Multiflow', {

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'There was a error conecting with MongoDB:'));
db.once('open', () => {
  console.log('Connection with MongoDB established with success.');
});

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use('/projects', projectsRoutes);
app.use('/streams', streamsRoutes);
app.use('/logs', logsRoutes);
app.use('/dataSources', dataSourcesRoutes);
app.use('/app', appRoutes);

// Starting the server
app.listen(PORT, () => {
  console.log(`Server On in port ${PORT}`);
});