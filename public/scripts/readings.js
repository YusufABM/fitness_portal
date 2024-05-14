function updateReading() {
  fetch('/latest')
    .then(response => response.text())
    .then(data => {
      // Parse the MQTT message
      const countRegex = /Count: (\d+)/;
      const timeRegex = /Time: (.+)/;
      const countMatch = data.match(countRegex);
      const timeMatch = data.match(timeRegex);
      const count = countMatch ? countMatch[1] : '';
      const time = timeMatch ? timeMatch[1] : '';

      // Update the HTML elements
      document.getElementById('mqttReading').textContent = count;
      document.getElementById('lastUpdated').textContent = 'LAST UPDATED: ' + time;
    });
}
// Update the reading every second
setInterval(updateReading, 1000);