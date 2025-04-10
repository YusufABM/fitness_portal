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
  // Handle both #RRGGBB and RRGGBB formats
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

// Initialize WebSocket connection
let socket;
let isConnected = false;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
const reconnectDelay = 3000; // 3 seconds
let lastUpdateTime = Date.now();
let lastCountChangeTime = ""; // Track when count last changed
let lastCount = null; // Track the last count value

function connectWebSocket() {
  // Close existing socket if any
  if (socket) {
    socket.close();
  }

  // Create new WebSocket connection
  socket = new WebSocket(`wss://vkmotion.site`);

  // Connection opened
  socket.addEventListener('open', (event) => {
    console.log('WebSocket connection established');
    isConnected = true;
    reconnectAttempts = 0;
    updateStatusDot('connected');
  });

  // Listen for messages
  socket.addEventListener('message', (event) => {
    const data = event.data;
    processWebSocketData(data);
    lastUpdateTime = Date.now();
    pulseStatusDot();
  });

  // Connection closed
  socket.addEventListener('close', (event) => {
    isConnected = false;
    updateStatusDot('disconnected');

    // Attempt to reconnect if not max attempts reached
    if (reconnectAttempts < maxReconnectAttempts) {
      reconnectAttempts++;
      setTimeout(connectWebSocket, reconnectDelay);
    } else {
      // Fall back to HTTP polling
      setInterval(updateReadingViaHttp, 5000);
    }
  });

  // Connection error
  socket.addEventListener('error', (event) => {
    console.error('WebSocket error:', event);
    updateStatusDot('disconnected');
  });
}

// Process data from WebSocket
function processWebSocketData(data) {


  // Parse the message
  const countRegex = /Count: (\d+)/;
  const timeRegex = /Time: (.+)/;
  const countMatch = data.match(countRegex);
  const timeMatch = data.match(timeRegex);

  const count = countMatch ? parseInt(countMatch[1]) : 0;
  const time = timeMatch ? timeMatch[1] : '';

  // Check if count has changed
  if (lastCount !== null && count !== lastCount) {
    lastCountChangeTime = time;
  }

  // Update last count
  lastCount = count;

  // Update UI elements and progress circle
  // Use lastCountChangeTime if available, otherwise use current time
  updatePeopleCount(count, time, lastCountChangeTime);
}

// Fallback function to fetch data via HTTP
function updateReadingViaHttp() {
  fetch('/latest')
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.text();
    })
    .then(data => {
      processWebSocketData(data); // Reuse the same processing function
      lastUpdateTime = Date.now();
      pulseStatusDot();
    })
    .catch(error => console.error('Error fetching latest data:', error));
}

// Fetch the last count change information from the server
function fetchLastCountChange() {
  fetch('/lastCountChange')
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => {
      // Update our local variables with the server data
      lastCount = data.count;
      lastCountChangeTime = data.time;

      // Update the UI with this information
      if (data.time) {
        document.getElementById('lastUpdated').textContent = "LAST CHANGE: " + data.time;
      }

      // Update the count display with the latest value from server
      updatePeopleCount(data.count, data.time, data.time);
    })
    .catch(error => console.error('Error fetching last count change:', error));
}

// Create status dot
function createStatusDot() {
  const statusDot = document.createElement('div');
  statusDot.id = 'status-dot';

  // Add the dot to the DOM - find a good location in the card
  const cardElement = document.querySelector('.card');
  if (cardElement) {
    // Position the dot in the top-right corner of the card
    cardElement.style.position = 'relative';
    statusDot.style.position = 'absolute';
    statusDot.style.top = '10px';
    statusDot.style.right = '10px';
    statusDot.style.width = '8px';
    statusDot.style.height = '8px';
    statusDot.style.borderRadius = '50%';
    statusDot.style.backgroundColor = '#888';
    statusDot.style.transition = 'transform 0.5s ease, background-color 0.3s ease';

    cardElement.appendChild(statusDot);
  } else {
    // If no card found, add it near the top of the body
    statusDot.style.position = 'fixed';
    statusDot.style.top = '10px';
    statusDot.style.right = '10px';
    statusDot.style.width = '8px';
    statusDot.style.height = '8px';
    statusDot.style.borderRadius = '50%';
    statusDot.style.backgroundColor = '#888';
    statusDot.style.transition = 'transform 0.5s ease, background-color 0.3s ease';

    document.body.appendChild(statusDot);
  }

  return statusDot;
}

// Update status dot based on connection status
function updateStatusDot(status) {
  const statusDot = document.getElementById('status-dot') || createStatusDot();

  if (status === 'connected') {
    statusDot.style.backgroundColor = '#28a745'; // Green
    statusDot.title = 'Connected';
  } else if (status === 'disconnected') {
    statusDot.style.backgroundColor = '#dc3545'; // Red
    statusDot.title = 'Disconnected';
  } else if (status === 'connecting') {
    statusDot.style.backgroundColor = '#ffc107'; // Yellow
    statusDot.title = 'Connecting...';
  }
}

// Create a pulse effect for the status dot
function pulseStatusDot() {
  const statusDot = document.getElementById('status-dot');
  if (!statusDot) return;

  // Apply pulse animation
  statusDot.style.transform = 'scale(1.5)';

  // Reset after animation completes
  setTimeout(() => {
    statusDot.style.transform = 'scale(1)';
  }, 500);
}

function updatePeopleCount(count, time, countChangeTime) {
  const max = 6;
  const circle = document.querySelector('.circular-progress .progress');
  const countElement = document.getElementById('mqttReading');
  const circumference = 2 * Math.PI * 75; // 2πr with r=75

  // Ensure count is a number
  count = typeof count === 'number' ? count : 0;

  // Calculate progress and color
  const normalizedCount = Math.min(Math.max(count, 0), max);
  const progress = normalizedCount / max;
  const color = getColorForCount(normalizedCount, max);

  // Update circle progress
  if (normalizedCount === 0) {
    circle.style.strokeDashoffset = `${circumference}`; // Full circumference for no progress
  } else {
    circle.style.strokeDashoffset = `${circumference - (progress * circumference)}`;
  }
  circle.style.stroke = color;

  // Update count text
  countElement.textContent = count;
  countElement.style.color = color;

  // Update last updated text with either the count change time or current time
  // Use count change time if available, or current time as fallback
  const displayTime = countChangeTime || time;
  if (displayTime) {
    document.getElementById('lastUpdated').textContent = "LAST COUNT : " + displayTime;
  }
}

// Chart configuration
const chartOptions = {
  series: [{
    name: 'People',
    data: []
  }],
  chart: {
    toolbar: { show: false },
    id: 'area-datetime',
    type: 'area',
    height: 350,
    zoom: { enabled: false }
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
      formatter: val => Math.round(val)
    },
    max: 6,
    min: 0,
  },
  colors: ['#012970'], // Match the starting color of our gradient
};

// Initialize chart once
let chart;
function initializeChart() {
  chart = new ApexCharts(document.querySelector("#chart-timeline"), chartOptions);
  chart.render();
}

// Fetch and process data for a specific day
function fetchData(day) {
  fetch('/' + day.toLowerCase())
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      // Create block containers for the 5 time periods (8-11, 11-14, etc.)
      const blockCounts = Array(5).fill().map(() => []);

      // Process data in a single loop
      data.forEach(item => {
        const timestamp = new Date(item.timestamp);
        if (isNaN(timestamp.getTime())) {
          console.error('Invalid timestamp:', item.timestamp);
          return;
        }

        const hour = timestamp.getHours();
        const blockIndex = Math.floor((hour - 8) / 3);

        if (blockIndex >= 0 && blockIndex < 5) {
          blockCounts[blockIndex].push(item.count);
        }
      });

      // Calculate averages and format for chart
      const seriesData = blockCounts.map((block, index) => ({
        x: chartOptions.xaxis.categories[index],
        y: block.length ? Math.round(block.reduce((sum, val) => sum + val, 0) / block.length) : 0
      }));

      // Update chart with new data
      chart.updateSeries([{ data: seriesData }]);
    })
    .catch(error => console.error(`Error fetching data for ${day}:`, error));
}

// Handle day selection
function selectDay(day) {
  // Remove active class from all buttons
  document.querySelectorAll('.day-tabs .nav-link').forEach(btn => {
    btn.classList.remove('active');
  });

  // Add active class to selected button
  const tabButton = document.querySelector(`[data-day="${day.toLowerCase()}"]`);
  if (tabButton) {
    tabButton.classList.add('active');
  }

  // Update dropdown value
  document.getElementById('daySelect').value = day.toLowerCase();

  // Fetch data for selected day
  fetchData(day);
}

// Check connection every 10 seconds
function checkConnection() {
  if (isConnected) {
    const now = Date.now();
    // If no update for more than 30 seconds, consider connection stale
    if (now - lastUpdateTime > 30000) {
      updateStatusDot('disconnected');
    }
  }
}

// Initialize the application
function initializeApp() {
  // Add transition styles for smooth color changes
  const style = document.createElement('style');
  style.textContent = `
    .circular-progress .progress {
      transition: stroke-dashoffset 0.6s ease, stroke 0.6s ease;
    }
    #mqttReading {
      transition: color 0.6s ease;
    }
    @keyframes pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.5); }
      100% { transform: scale(1); }
    }
  `;
  document.head.appendChild(style);

  // Remove any existing connection status element (from previous version)
  const oldConnectionStatus = document.getElementById('connection-status');
  if (oldConnectionStatus) {
    oldConnectionStatus.remove();
  }

  // Create the status dot
  createStatusDot();
  updateStatusDot('connecting');

  // Initialize chart
  initializeChart();

  // Set up day selection event listeners
  document.querySelectorAll('.day-tabs .nav-link').forEach(button => {
    button.addEventListener('click', function() {
      const day = this.getAttribute('data-day');
      selectDay(day.charAt(0).toUpperCase() + day.slice(1));
    });
  });

  // Add event listener to dropdown
  document.getElementById('daySelect').addEventListener('change', function() {
    selectDay(this.value.charAt(0).toUpperCase() + this.value.slice(1));
  });

  // Initialize with default data
  selectDay('Monday');

  // Fetch the last count change from the server immediately
  fetchLastCountChange();

  // Initialize WebSocket connection
  connectWebSocket();


  // Add debug logging to help troubleshoot WebSocket issues
  console.log("Application initialized, WebSocket connecting to wss://vkmotion.site");
}

// Start the application when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);