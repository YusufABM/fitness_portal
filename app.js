const path = require('path');
const fs = require('fs');
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const sqlite3 = require('sqlite3').verbose();

// Initialize Express app
const app = express();
const port = 2095;
const server = http.createServer(app);

// Initialize WebSocket server
const wss = new WebSocket.Server({ server });

// Connect to SQLite database
const db = new sqlite3.Database('data/.data.db');
let latestMessage = " ";

// Directories setup
let clientDir = path.join(__dirname, 'public');
let staticDir = path.join(__dirname, 'public');

// Time variables
var count = " ";
var lastCount = " ";
var timeMatch = " ";
var dayOfWeek = " ";
var date = " ";
var hour = " ";
var minute = " ";
var timestamp = " ";
var lastTimestamp = new Date(`2024-05-11T22:22:00Z`);

// Express middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(staticDir));

// Ensure database is created and table is initialized
db.serialize(() => {
  db.run('CREATE TABLE IF NOT EXISTS readings (count INTEGER, day TEXT, timestamp TEXT)');
});

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('Client connected');

  // Send the latest message to newly connected clients
  if (latestMessage !== " ") {
    ws.send(latestMessage);
  }

  // Handle incoming messages from door sensor
  ws.on('message', (message) => {
    handleDoorTriggerMessage(message);
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Function to handle door trigger messages
function handleDoorTriggerMessage(message) {
  latestMessage = message.toString();
  var messageString = message.toString();

  // Parse the message to extract count, day, date, and time
  timeMatch = messageString.match(/Time: (\w+), (\d{2}).(\d{2}).(\d{2}), (\d{2}):(\d{2}):(\d{2})/);
  if (timeMatch == null) return console.error('Invalid message format');

  dayOfWeek = timeMatch[1];
  date = `${timeMatch[2]}.${timeMatch[3]}.${timeMatch[4]}`;
  hour = timeMatch[5];
  minute = timeMatch[6];
  second = timeMatch[7];
  timestamp = new Date(`20${timeMatch[4]}-${timeMatch[2]}-${timeMatch[3]}T${hour}:${minute}:${second}Z`);
  time = `${hour}:${minute}`;
  check = messageString.match(/Count: (\d+)/);
  count = parseInt(check[1] || 0);

  // Insert data into the database if the count has changed or if the last reading was more than 30 min ago
  if (count != lastCount || (timestamp.getTime() - lastTimestamp.getTime()) > (1800000)) {
    insertData();
  }

  // Broadcast the message to all connected clients
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(latestMessage);
    }
  });
}

// Insert data into the database
function insertData() {
  lastTimestamp = timestamp;
  db.run('INSERT INTO readings (count, day, timestamp) VALUES (?, ?, ?)', [count, dayOfWeek, timestamp.toISOString()], function(err) {
    if (err) {
      console.error('Error inserting data into database:', err);
    } else {
      lastCount = count;
    }
  });
}

// App routes
app.get('/', (request, response) => {
  response.sendFile(path.join(staticDir, "index.html"), (err) => {
    if (err) {
      console.error("Error sending file", err);
      response.status(err.status || 500).send("Error sending file");
    }
  });
});

// Send the latest reading to the client via HTTP if needed
app.get('/latest', function (req, res) {
  res.send(latestMessage);
});

// Start the server
server.listen(port, () => {
  console.log(`Vilhelm Kiers Motionsrum page is running on port ${port}`);
  console.log(`WebSocket server available at wss://vkmotion.site`);
});

app.get('/database', function (req, res) {
  db.all('SELECT * FROM readings ORDER BY timestamp DESC', function(err, rows) {
    if (err) {
      console.error('Error getting readings from database:', err);
      res.status(500).send('Error getting readings from database');
    }
    res.json(rows);
  });
});

//Get data for monday database entries
app.get('/monday', function (req, res) {
  // Mock data for Tuesday when there's no actual data available
  const mockData = [
    {"count":0,"day":"Tuesday","timestamp":"2024-05-17T08:50:29.000Z"},
    {"count":1,"day":"Tuesday","timestamp":"2024-05-17T09:58:49.000Z"},
    {"count":3,"day":"Tuesday","timestamp":"2024-05-17T09:50:29.000Z"},
    {"count":1,"day":"Tuesday","timestamp":"2024-05-17T14:58:49.000Z"},
    {"count":2,"day":"Tuesday","timestamp":"2024-05-17T15:50:29.000Z"},
    {"count":6,"day":"Tuesday","timestamp":"2024-05-17T17:58:49.000Z"},
    {"count":6,"day":"Tuesday","timestamp":"2024-05-17T18:50:29.000Z"},
    {"count":1,"day":"Tuesday","timestamp":"2024-05-17T20:58:49.000Z"},
    {"count":1,"day":"Tuesday","timestamp":"2024-05-17T21:50:29.000Z"},
    {"count":0,"day":"Tuesday","timestamp":"2024-05-17T23:58:49.000Z"}
  ];

  res.json(mockData);
});

//Get data for tuesday database entries
app.get('/tuesday', function (req, res) {
  // Mock data for Tuesday when there's no actual data available
  const mockData = [
    {"count":2,"day":"Tuesday","timestamp":"2024-05-17T08:50:29.000Z"},
    {"count":4,"day":"Tuesday","timestamp":"2024-05-17T09:58:49.000Z"},
    {"count":6,"day":"Tuesday","timestamp":"2024-05-17T09:50:29.000Z"},
    {"count":4,"day":"Tuesday","timestamp":"2024-05-17T14:58:49.000Z"},
    {"count":6,"day":"Tuesday","timestamp":"2024-05-17T15:50:29.000Z"},
    {"count":2,"day":"Tuesday","timestamp":"2024-05-17T17:58:49.000Z"},
    {"count":1,"day":"Tuesday","timestamp":"2024-05-17T18:50:29.000Z"},
    {"count":2,"day":"Tuesday","timestamp":"2024-05-17T20:58:49.000Z"},
    {"count":1,"day":"Tuesday","timestamp":"2024-05-17T21:50:29.000Z"},
    {"count":2,"day":"Tuesday","timestamp":"2024-05-17T23:58:49.000Z"},
  ];

  res.json(mockData);
});

//Get data for wednesday database entries
app.get('/wedensday', function (req, res) {
  db.all('SELECT * FROM readings WHERE day = "Wednesday" ORDER BY timestamp DESC', function(err, rows) {
    if (err) {
      console.error('Error getting readings from database:', err);
      res.status(500).send('Error getting readings from database');
    }
    res.json(rows);
  });
});

//Get data for thursday database entries
app.get('/thursday', function (req, res) {
  db.all('SELECT * FROM readings WHERE day = "Thursday" ORDER BY timestamp DESC', function(err, rows) {
    if (err) {
      console.error('Error getting readings from database:', err);
      res.status(500).send('Error getting readings from database');
    }
    res.json(rows);
  });
});

//Get data for friday database entries
app.get('/friday', function (req, res) {
  db.all('SELECT * FROM readings WHERE day = "Wednesday" ORDER BY timestamp DESC', function(err, rows) {
    if (err) {
      console.error('Error getting readings from database:', err);
      res.status(500).send('Error getting readings from database');
    }
    res.json(rows);
  });
});

//Get data for saturday database entries
app.get('/saturday', function (req, res) {
  const mockData = [
    {"count":6,"day":"Tuesday","timestamp":"2024-05-17T08:50:29.000Z"},
    {"count":0,"day":"Tuesday","timestamp":"2024-05-17T09:58:49.000Z"},
    {"count":0,"day":"Tuesday","timestamp":"2024-05-17T09:50:29.000Z"},
    {"count":3,"day":"Tuesday","timestamp":"2024-05-17T14:58:49.000Z"},
    {"count":3,"day":"Tuesday","timestamp":"2024-05-17T15:50:29.000Z"},
    {"count":4,"day":"Tuesday","timestamp":"2024-05-17T17:58:49.000Z"},
    {"count":4,"day":"Tuesday","timestamp":"2024-05-17T18:50:29.000Z"},
    {"count":0,"day":"Tuesday","timestamp":"2024-05-17T20:58:49.000Z"},
    {"count":0,"day":"Tuesday","timestamp":"2024-05-17T21:50:29.000Z"},
    {"count":0,"day":"Tuesday","timestamp":"2024-05-17T23:58:49.000Z"},
  ];

  res.json(mockData);
});

//Get data for sunday database entries
app.get('/sunday', function (req, res) {
  db.all('SELECT * FROM readings WHERE day = "Thursday" ORDER BY timestamp DESC', function(err, rows) {
    if (err) {
      console.error('Error getting readings from database:', err);
      res.status(500).send('Error getting readings from database');
    }
    res.json(rows);
  });
});