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
    updateConnectionStatus('Connected');
  });

  // Listen for messages
  socket.addEventListener('message', (event) => {
    const data = event.data;
    processWebSocketData(data);
  });

  // Connection closed
  socket.addEventListener('close', (event) => {
    isConnected = false;
    updateConnectionStatus('Disconnected');

    // Attempt to reconnect if not max attempts reached
    if (reconnectAttempts < maxReconnectAttempts) {
      reconnectAttempts++;
      updateConnectionStatus(`Reconnecting (${reconnectAttempts}/${maxReconnectAttempts})...`);
      setTimeout(connectWebSocket, reconnectDelay);
    } else {
      updateConnectionStatus('Connection failed. Falling back to HTTP.');
      // Fall back to HTTP polling
      setInterval(updateReadingViaHttp, 5000);
    }
  });

  // Connection error
  socket.addEventListener('error', (event) => {
    console.error('WebSocket error:', event);
    updateConnectionStatus('Error connecting');
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

  // Update UI elements and progress circle with the time from data
  updatePeopleCount(count, time);
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
    })
    .catch(error => console.error('Error fetching latest data:', error));
}

// Update connection status indicator
function updateConnectionStatus(status) {
  const connectionStatus = document.getElementById('connection-status');
  if (connectionStatus) {
    connectionStatus.textContent = `Connection: ${status}`;

    // Update color based on status
    if (status.includes('Connected')) {
      connectionStatus.className = 'status-connected';
    } else if (status.includes('Reconnecting')) {
      connectionStatus.className = 'status-reconnecting';
    } else {
      connectionStatus.className = 'status-disconnected';
    }
  }
}

function updatePeopleCount(count, time) {
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

  // Update last updated text if time is provided
  if (time) {
    document.getElementById('lastUpdated').textContent = "LAST UPDATED: " + time;
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

// Initialize the application
function initializeApp() {
  // Add CSS for connection status
  const style = document.createElement('style');
  style.textContent = `
    .circular-progress .progress {
      transition: stroke-dashoffset 0.6s ease, stroke 0.6s ease;
    }
    #mqttReading {
      transition: color 0.6s ease;
    }
    #connection-status {
      padding: 5px 10px;
      border-radius: 4px;
      font-size: 0.85rem;
      margin: 10px 0;
    }
    .status-connected {
      background-color: #d4edda;
      color: #155724;
    }
    .status-reconnecting {
      background-color: #fff3cd;
      color: #856404;
    }
    .status-disconnected {
      background-color: #f8d7da;
      color: #721c24;
    }
  `;
  document.head.appendChild(style);

  // Add connection status element if it doesn't exist
  if (!document.getElementById('connection-status')) {
    const statusElement = document.createElement('div');
    statusElement.id = 'connection-status';
    statusElement.textContent = 'Connection: Initializing...';
    statusElement.className = 'status-reconnecting';

    // Insert after lastUpdated element
    const lastUpdated = document.getElementById('lastUpdated');
    if (lastUpdated && lastUpdated.parentElement) {
      lastUpdated.parentElement.insertBefore(statusElement, lastUpdated.nextSibling);
    } else {
      // Or insert at top of body if lastUpdated not found
      document.body.insertBefore(statusElement, document.body.firstChild);
    }
  }

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

  // Initial UI setup
  updatePeopleCount(0, '');

  // Initialize WebSocket connection
  connectWebSocket();
}

// Start the application when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);