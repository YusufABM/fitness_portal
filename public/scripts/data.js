// Add gradient color functionality based on count value
function getColorForCount(count, max = 6) {
  // Define color stops for our gradient (blue -> purple -> red)
  const colorStops = [
    { value: 0, color: '#012970' },   // Blue
    { value: max/2, color: '#8A2BE2' }, // Purple
    { value: max, color: '#FF0000' }  // Red
  ];

  // Find the two color stops that our count falls between
  let lowerStop = colorStops[0];
  let upperStop = colorStops[colorStops.length - 1];

  for (let i = 0; i < colorStops.length - 1; i++) {
    if (count >= colorStops[i].value && count <= colorStops[i + 1].value) {
      lowerStop = colorStops[i];
      upperStop = colorStops[i + 1];
      break;
    }
  }

  // Calculate interpolation factor
  const range = upperStop.value - lowerStop.value;
  const factor = range === 0 ? 0 : (count - lowerStop.value) / range;

  // Interpolate RGB components
  const lowerRGB = hexToRgb(lowerStop.color);
  const upperRGB = hexToRgb(upperStop.color);

  const r = Math.round(lowerRGB.r + factor * (upperRGB.r - lowerRGB.r));
  const g = Math.round(lowerRGB.g + factor * (upperRGB.g - lowerRGB.g));
  const b = Math.round(lowerRGB.b + factor * (upperRGB.b - lowerRGB.b));

  return `rgb(${r}, ${g}, ${b})`;
}

// Helper function to convert hex color to RGB
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

// Centralized function to fetch and process data
function updateReading() {
  fetch('/latest')
    .then(response => response.text())
    .then(data => {
      // Parse the MQTT message
      const countRegex = /Count: (\d+)/;
      const timeRegex = /Time: (.+)/;
      const countMatch = data.match(countRegex);
      const timeMatch = data.match(timeRegex);
      const count = countMatch ? countMatch[1] : '0';
      const time = timeMatch ? timeMatch[1] : '';

      // Update UI elements and progress circle with the time from data
      updatePeopleCount(parseInt(count), time);
    })
    .catch(error => console.error('Error fetching latest data:', error));
}

// Combined function to update count and time display
function updatePeopleCount(count, time) {
  const max = 6;
  const circle = document.querySelector('.circular-progress .progress');
  const countElement = document.getElementById('mqttReading');
  const circumference = 2 * Math.PI * 40; // 2πr with r=40

  if (count > max) {
    circle.style.strokeDashoffset = circumference - (max / max) * circumference;
    circle.style.stroke = getColorForCount(max, max);
  } else {
    circle.style.strokeDashoffset = circumference - (count / max) * circumference;
    circle.style.stroke = getColorForCount(count, max);
  }

  // Update count text (with color transition)
  const color = getColorForCount(Math.min(count, max), max); // Added missing color variable
  countElement.textContent = count;
  countElement.style.color = color;

  // Update last updated text
  document.getElementById('lastUpdated').textContent = "LAST UPDATED: " + time;
}

// Chart configuration
const options = {
  series: [{
    name: 'People',
    data: []
  }],
  chart: {
    toolbar: { show: false },
    id: 'area-datetime',
    type: 'area',
    height: 350,
  },
  dataLabels: { enabled: false },
  stroke: {
    curve: 'stepline',
    width: 2
  },
  xaxis: {
    type: 'category',
    categories: ['08-11', '11-14', '14-17', '17-20', '20-23']
  },
  tooltip: {
    x: { format: 'HH:mm' }
  },
  yaxis: {
    tickAmount: 5,
    labels: {
      formatter: val => val.toFixed(0)
    },
    max: 6,
    min: 0,
  },
  colors: ['#012970'], // Match the starting color of our gradient
};

// Initialize chart once
const chart = new ApexCharts(document.querySelector("#chart-timeline"), options);
chart.render();

// Optimized data fetching function
function fetchData(day) {
  fetch('/' + day)
    .then(response => response.json())
    .then(data => {
      // Create block containers for the 5 time periods (8-11, 11-14, etc.)
      const blockCounts = Array(5).fill().map(() => []);

      // Process data in a single loop
      data.forEach(item => {
        const hour = new Date(item.timestamp).getHours();
        const blockIndex = Math.floor((hour - 8) / 3);

        if (blockIndex >= 0 && blockIndex < 5) {
          blockCounts[blockIndex].push(item.count);
        }
      });

      // Calculate averages and format for chart
      const seriesData = blockCounts.map((block, index) => ({
        x: options.xaxis.categories[index],
        y: block.length ? block.reduce((sum, val) => sum + val, 0) / block.length : 0
      }));

      // Update chart with new data
      chart.updateSeries([{ data: seriesData }]);
    })
    .catch(error => console.error('Error fetching data for ' + day + ':', error));
}

// Setup event listeners for day selection
const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

daysOfWeek.forEach(day => {
  const element = document.querySelector('#' + day);
  if (element) {
    element.addEventListener('click', () => {
      fetchData(day.charAt(0).toUpperCase() + day.slice(1));
    });
  }
});

// Initial UI setup with blue color
updatePeopleCount(0, '');

// Add CSS to ensure the color transitions smoothly
document.addEventListener('DOMContentLoaded', () => {
  // Add transition style for smooth color changes
  const style = document.createElement('style');
  style.textContent = `
    .circular-progress .progress {
      transition: stroke-dashoffset 0.6s ease, stroke 0.6s ease;
    }
    #mqttReading {
      transition: color 0.6s ease;
    }
  `;
  document.head.appendChild(style);

  // Initialize with default data and start polling
  fetchData('Monday');
  //updateReading();

  //updatePeopleCount(1, '');

  // Set up interval for regular updates (every second)
  setInterval(updateReading, 1000);
});