
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

function getDataFromDatabase() {
  const maxCount = 6;
  const minCount = 0;
  const dataPointsPerHour = 2;
  const totalDataPoints = 24 * dataPointsPerHour;

  const chartData = [];
  const currentTime = new Date();

  for (let i = 0; i < totalDataPoints; i++) {
    const time = new Date(currentTime.getTime() - i * 1000 * 60 * 60 / dataPointsPerHour);
    const count = Math.floor(Math.random() * (maxCount - minCount + 1) + minCount);
    console.log(time, count);

    chartData.unshift({
      x: time,
      y: count
    });
  }

  const options = {
    chart: {
      height: 350,
      type: 'area',
      toolbar: {
        show: false
      },
    },
    series: [{
      name: 'People',
      data: chartData,
    }],
    markers: {
      size: 3
    },
    colors: ['#4154f1'],
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.3,
        opacityTo: 0.4,
        stops: [0, 90, 100]
      }
    },
    dataLabels: {
      enabled: false
    },
    stroke: {
      curve: 'stepline',
      width: 1
    },
    xaxis: {
      type: 'datetime',
      categories: chartData.map(item => item.x.toISOString()),
    },
    yaxis: {
      tickAmount: 5,
      labels: {
        formatter: function (val) {
          return val.toFixed(0)
        }
      },
      opposite: true,
      max: 8, // Set the maximum value for y-axis
      min: 0, // Set the minimum value for y-axis
    },
    tooltip: {
      x: {
        format: 'dd/MM/yy HH:mm'
      },
    }
  };

  const chart = new ApexCharts(document.getElementById('reportsChart'), options);
  chart.render();
}

updateReading();
getDataFromDatabase();

// Update the reading every 2 second
setInterval(updateReading, 5000);