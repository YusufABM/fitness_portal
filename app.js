const path = require('path')

const express = require('express')
const app = express()
const port = 8080
const mqtt = require('mqtt');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('.data.db');
let latestMessage = " ";


let clientDir = path.join(__dirname, 'public')
let staticDir = path.join(__dirname,'public')

//Time variables
var count = " "
var timeMatch = " "
var dayOfWeek = " "
var date = " "
var hour = " "
var minute = " "
var timestamp = " "

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.static(staticDir))

// Ensure database is created and table is initialized
db.serialize(() => {
  db.run('CREATE TABLE IF NOT EXISTS readings ( count INTEGER, day TEXT, timestamp TEXT)');
});

// Connect to the MQTT broker and subscribe to the topic
const client  = mqtt.connect('tcp://test.mosquitto.org:1883');
client.on('connect', function () {
  client.subscribe('/doorTrigger', function (err) {
    if (err) console.error(err);
  });
});

// When a message is received, update the latestMessage variable and insert data into the database
client.on('message', function (topic, message) {
  latestMessage = message.toString();
  var messageString = message.toString();

  // Parse the message to extract count, day, date, and time
  count = parseInt(messageString.match(/Count: (\d+)/)[1]);
  timeMatch = messageString.match(/Time: (\w+), (\d{2}).(\d{2}).(\d{2}), (\d{2}):(\d{2})/);
  dayOfWeek = timeMatch[1];
  date = `${timeMatch[2]}.${timeMatch[3]}.${timeMatch[4]}`;
  hour = timeMatch[5];
  minute = timeMatch[6];
  timestamp = new Date(`20${timeMatch[4]}-${timeMatch[3]}-${timeMatch[2]}T${hour}:${minute}`);
  time = `${hour}:${minute}`;

  console.log( "Parser "+ count, dayOfWeek, date, timestamp);

  // Insert data into the database
  db.run('INSERT INTO readings (count, day, date, timestamp) VALUES (?, ?, ?, ?)', [count, dayOfWeek, date, timestamp.toISOString()], function(err) {
      if (err) {
          console.error('Error inserting data into database:', err);
      } else {
          console.log('Data inserted into database successfully');
      }
  });
});



//app root
app.get('/', rootHandler)

function rootHandler(request, response) {
  //Need to add an error check!
  response.sendFile(path.join(staticDir, "index.html"), (err) => {
      if (err) {
          console.error("Error sending file", err);
          response.status(err.status || 500).send("Error sending file");
      }
  });
}

app.listen(port, () => {
  console.log(`Vilhelm Kiers Motionsrum page is running on ${port}`)
})


// Send the latest reading to the client
app.get('/latest', function (req, res) {
  res.send(latestMessage);
});

// Save the latest reading to the database

