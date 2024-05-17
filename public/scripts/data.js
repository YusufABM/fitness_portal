

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


var options = {
  series: [{
    name: 'People',
    data: []
  }],
  chart: {
    toolbar: {
      show: false
    },
    id: 'area-datetime',
    type: 'area',
    height: 350,
  },
  dataLabels: {
    enabled: false
  },
  stroke: {
    curve: 'stepline',
    width: 2
  },
  xaxis: {
    type: 'category',
    categories: ['08-11', '11-14', '14-17', '17-20', '20-23']
  },
  tooltip: {
    x: {
      format: 'HH:mm'
    }
  },
  yaxis: {
    tickAmount: 5,
    labels: {
      formatter: function (val) {
        return val.toFixed(0)
      }
    },
    max: 6, // Set the maximum value for y-axis
    min: 0, // Set the minimum value for y-axis
  },
};

var chart = new ApexCharts(document.querySelector("#chart-timeline"), options);
chart.render();

// Function to fetch data for a specific day and update the chart with 3-hour block averages
var fetchData = function (day) {
  // Fetch data for the specified day from the database
  fetch('/' + day)
    .then(response => response.json())
    .then(data => {
      // Arrays to store the isolated values
      var counts = [];
      var timestamps = [];

      // Iterate over the fetched data
      data.forEach(item => {
        var count = item.count;
        var timestamp = item.timestamp;

        counts.push(count);

        var date = new Date(timestamp);
        var hour = date.getHours();

        timestamps.push(hour);
      });

      // Group data into 3-hour blocks and calculate averages
      var blockCounts = [[], [], [], [], []];
      timestamps.forEach((hour, index) => {
        var blockIndex = Math.floor((hour - 8) / 3);
        if (blockIndex >= 0 && blockIndex < 5) {
          blockCounts[blockIndex].push(counts[index]);
        }
      });

      var averageCounts = blockCounts.map(block => {
        if (block.length > 0) {
          var sum = block.reduce((a, b) => a + b, 0);
          return sum / block.length;
        } else {
          return 0;
        }
      });

      // Create an array of objects with x (3-hour block) and y (average count) values
      var seriesData = averageCounts.map((avg, index) => ({
        x: options.xaxis.categories[index],
        y: avg
      }));

      // Update the chart series with the new data
      chart.updateSeries([{
        data: seriesData
      }]);
    });
}

var daysOfWeek = ['monday', 'tuesday', 'wedensday', 'thursday', 'friday', 'saturday', 'sunday'];

// Add event listeners for each day of the week
daysOfWeek.forEach(function (day) {
  document.querySelector('#' + day).addEventListener('click', function (e) {
   // resetCssClasses(e);
    fetchData(day.charAt(0).toUpperCase() + day.slice(1)); // Capitalize the first letter of the day
  });
});

updateReading();

// Update the reading every 5 second
setInterval(updateReading, 5000);

// Load data for Monday by default when the page loads
document.addEventListener('DOMContentLoaded', function() {
  fetchData('Monday');
});