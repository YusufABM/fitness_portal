const path = require('path')

const express = require('express')
const app = express()
const port = 8080
const mqtt = require('mqtt');

let latestMessage = "";

//let clientDir = path.join(__dirname, 'public')
let staticDir = path.join(__dirname,'public')

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.static(staticDir))

// Connect to the MQTT broker and subscribe to the topic
const client  = mqtt.connect('tcp://test.mosquitto.org:1883');
client.on('connect', function () {
  client.subscribe('/doorTrigger', function (err) {
    if (err) console.error(err);
  });
});

// When a message is received, update the latestReading variable
client.on('message', function (topic, message) {
  latestMessage = message.toString();
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
