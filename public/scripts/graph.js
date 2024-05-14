

function getDataFromDatabase() {
  // This is a placeholder function that should be replaced with your actual code to fetch data from the database
  fetch('/database')
    .then(response => response.json())
    .then(data => {
      const hourlyData = data.filter((item, index) => index % 60 === 0); // Filter data to show one data point per hour

      const chartData = hourlyData.map(item => ({
        x: new Date(item.timestamp), // Replace 'time' with the appropriate property name from your data
        y: item.count, // Replace 'count' with the appropriate property name from your data
      }));

      const options = {
        chart: {
          height: 350,
          type: 'area',
          toolbar: {
            show: false
          },
        },
        series: [
          {
            name: 'People',
            data: chartData,
          },
        ],
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
          categories: chartData.map(item => item.x.toISOString()), // Replace 'categories' with the appropriate property name from your data
        },
        yaxis: {
          tickAmount: 5,
          labels: {
            formatter: function (val) {
              return val.toFixed(0)
            }
          },
          opposite: true,
        },
        tooltip: {
          x: {
            format: 'dd/MM/yy HH:mm'
          },
        }
      };

      const chart = new ApexCharts(document.getElementById('reportsChart'), options);
      chart.render();
    });
}

getDataFromDatabase();
