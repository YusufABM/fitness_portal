function updateReading() {
  fetch('/latest')
    .then(response => response.text())
    .then(data => {
      // Parse the MQTT message
      const lines = data.split('\n');
      const count = lines[0].split(': ')[1];
      const time = lines[1];

      // Update the HTML elements
      document.getElementById('mqttReading').textContent = count;
      document.getElementById('lastUpdated').textContent = 'LAST UPDATED: ' + time;
    });
}
// Update the reading every second
setInterval(updateReading, 1000);