/**
 * Autonomous Agritech and Perimeter Security System
 * Telemetry Charts Controller (Chart.js Integration)
 */

const chartsModule = (() => {
  let chartF1 = null;
  let chartF2 = null;
  let chartComp = null;
  let chartWaterComp = null;
  let chartTankHistory = null;
  let chartWaterDist = null;
  let sampleInterval = null;

  const MAX_DATA_POINTS = 20;

  function init() {
    console.log("Initializing Chart.js instances...");
    
    // Destroy existing instances if any
    destroyCharts();

    // Chart global defaults for dark glass theme
    Chart.defaults.color = "rgba(255, 255, 255, 0.6)";
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.font.size = 11;
    Chart.defaults.plugins.tooltip.backgroundColor = "rgba(15, 23, 42, 0.9)";
    Chart.defaults.plugins.tooltip.borderColor = "rgba(255, 255, 255, 0.1)";
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.plugins.tooltip.titleColor = "#00d2ff";

    // 1. Field 1 Chart (Blue/Cyan Tones)
    const ctxF1 = document.getElementById("chart-field1").getContext("2d");
    chartF1 = new Chart(ctxF1, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Sensor 1 (Zone 1)',
            data: [],
            borderColor: 'rgba(147, 197, 253, 0.8)', // Light Blue
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            pointRadius: 2,
            tension: 0.3
          },
          {
            label: 'Sensor 2 (Zone 2)',
            data: [],
            borderColor: 'rgba(167, 243, 208, 0.8)', // Light Emerald Green
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            pointRadius: 2,
            tension: 0.3
          },
          {
            label: 'Sensor 3 (Zone 3)',
            data: [],
            borderColor: 'rgba(253, 230, 138, 0.8)', // Light Amber/Yellow
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            pointRadius: 2,
            tension: 0.3
          },
          {
            label: 'Field 1 Average',
            data: [],
            borderColor: 'rgba(239, 68, 68, 1)', // Bold Red
            backgroundColor: 'rgba(239, 68, 68, 0.04)', // Soft Red Fill
            borderWidth: 3,
            pointRadius: 3,
            fill: true,
            tension: 0.2
          }
        ]
      },
      options: getCommonOptions("Soil Moisture %")
    });

    // 2. Field 2 Chart (Orange/Amber Tones)
    const ctxF2 = document.getElementById("chart-field2").getContext("2d");
    chartF2 = new Chart(ctxF2, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Sensor 4 (Field 2)',
            data: [],
            borderColor: 'rgba(255, 159, 0, 1)',
            backgroundColor: 'rgba(255, 159, 0, 0.08)',
            borderWidth: 3,
            pointRadius: 3,
            fill: true,
            tension: 0.2
          }
        ]
      },
      options: getCommonOptions("Soil Moisture %")
    });

    // 3. Combined Comparison Chart (Field 1 Average vs Field 2)
    const ctxComp = document.getElementById("chart-comparison").getContext("2d");
    chartComp = new Chart(ctxComp, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Field 1 Average (Multi-Zone)',
            data: [],
            borderColor: 'rgba(0, 210, 255, 1)',
            backgroundColor: 'transparent',
            borderWidth: 2.5,
            pointRadius: 2.5,
            tension: 0.3
          },
          {
            label: 'Field 2 (Single Sensor)',
            data: [],
            borderColor: 'rgba(255, 159, 0, 1)',
            backgroundColor: 'transparent',
            borderWidth: 2.5,
            pointRadius: 2.5,
            tension: 0.3
          }
        ]
      },
      options: getCommonOptions("Comparison %")
    });

    // 4. Smart vs Traditional Comparison Bar Chart
    const ctxWaterComp = document.getElementById("chart-water-comparison").getContext("2d");
    chartWaterComp = new Chart(ctxWaterComp, {
      type: 'bar',
      data: {
        labels: ['Traditional Usage (%)', 'Smart Usage (%)'],
        datasets: [{
          label: 'Water Volume (%)',
          data: [0, 0],
          backgroundColor: [
            'rgba(148, 163, 184, 0.4)', // slate/traditional
            'rgba(34, 197, 94, 0.6)'    // green/smart
          ],
          borderColor: [
            'rgba(148, 163, 184, 0.8)',
            'rgba(34, 197, 94, 0.9)'
          ],
          borderWidth: 1.5,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            min: 0,
            grid: { color: "rgba(255, 255, 255, 0.05)" }
          },
          x: {
            grid: { display: false }
          }
        }
      }
    });

    // 5. Water Tank Level History Line Chart
    const ctxTankHist = document.getElementById("chart-water-tank-history").getContext("2d");
    chartTankHistory = new Chart(ctxTankHist, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Tank Level (%)',
          data: [],
          borderColor: 'rgba(56, 189, 248, 0.85)', // Sky Blue
          backgroundColor: 'rgba(56, 189, 248, 0.05)',
          borderWidth: 2,
          pointRadius: 2,
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            min: 0,
            max: 100,
            grid: { color: "rgba(255, 255, 255, 0.05)" }
          },
          x: {
            grid: { display: false }
          }
        }
      }
    });

    // 6. Water Distribution Donut Chart
    const ctxWaterDist = document.getElementById("chart-water-distribution").getContext("2d");
    chartWaterDist = new Chart(ctxWaterDist, {
      type: 'doughnut',
      data: {
        labels: ['Field 1 Share (%)', 'Field 2 Share (%)'],
        datasets: [{
          data: [50, 50],
          backgroundColor: ['#60a5fa', '#34d399'],
          borderColor: 'rgba(15, 23, 42, 0.6)',
          borderWidth: 1.5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        cutout: '70%'
      }
    });

    // Pre-populate with baseline points to look populated
    generateBaselineTelemetry();

    // Start Telemetry Sampling Interval (Sample sensor readouts every 4 seconds)
    startTelemetrySampling();
  }

  function getCommonOptions(yLabel) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: {
            color: 'rgba(255, 255, 255, 0.04)',
            drawBorder: false
          },
          ticks: {
            color: 'rgba(255, 255, 255, 0.4)'
          }
        },
        y: {
          min: 0,
          max: 100,
          grid: {
            color: 'rgba(255, 255, 255, 0.04)',
            drawBorder: false
          },
          ticks: {
            color: 'rgba(255, 255, 255, 0.4)'
          },
          title: {
            display: true,
            text: yLabel,
            color: 'rgba(255, 255, 255, 0.5)'
          }
        }
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            boxWidth: 12,
            padding: 10
          }
        }
      }
    };
  }

  function startTelemetrySampling() {
    if (sampleInterval) clearInterval(sampleInterval);

    sampleInterval = setInterval(() => {
      // 1. Read values from the UI Elements safely
      const elS1 = document.getElementById("field1-card") ? document.querySelector("#field1-card strong") : null;
      const elS2 = document.getElementById("field1-card") ? document.querySelectorAll("#field1-card strong")[1] : null;
      const elS3 = document.getElementById("field1-card") ? document.querySelectorAll("#field1-card strong")[2] : null;
      const elF1Avg = document.getElementById("field1-card") ? document.querySelector("#field1-card .dial-val") : null;
      
      const elS4 = document.getElementById("field2-card") ? document.querySelector("#field2-card strong") : null;
      
      const s1 = elS1 ? parseFloat(elS1.textContent) : 0;
      const s2 = elS2 ? parseFloat(elS2.textContent) : 0;
      const s3 = elS3 ? parseFloat(elS3.textContent) : 0;
      const f1Avg = elF1Avg ? parseFloat(elF1Avg.textContent) : 0;
      
      const s4 = elS4 ? parseFloat(elS4.textContent) : 0;

      // Validate readings
      if (isNaN(f1Avg) || isNaN(s4)) return;

      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      // 2. Append points to charts
      appendChartPoint(chartF1, timestamp, [s1, s2, s3, f1Avg]);
      appendChartPoint(chartF2, timestamp, [s4]);
      appendChartPoint(chartComp, timestamp, [f1Avg, s4]);

    }, 4000); // 4-second sampling rate
  }

  function appendChartPoint(chartInstance, label, dataArray) {
    if (!chartInstance) return;

    // Add labels
    chartInstance.data.labels.push(label);
    
    // Add datasets data
    chartInstance.data.datasets.forEach((dataset, index) => {
      dataset.data.push(dataArray[index]);
    });

    // Check sliding window limit
    if (chartInstance.data.labels.length > MAX_DATA_POINTS) {
      chartInstance.data.labels.shift();
      chartInstance.data.datasets.forEach(dataset => {
        dataset.data.shift();
      });
    }

    // Refresh chart UI
    chartInstance.update('none'); // silent update
  }

  // Generates 10 baseline data points so charts don't look completely blank on startup
  function generateBaselineTelemetry() {
    const now = Date.now();
    for (let i = 9; i >= 0; i--) {
      const timeOffset = now - (i * 15000);
      const label = new Date(timeOffset).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      
      // Field 1 base readings
      const baseS1 = 30 + Math.round(Math.random() * 8);
      const baseS2 = 33 + Math.round(Math.random() * 8);
      const baseS3 = 32 + Math.round(Math.random() * 8);
      const baseAvg = parseFloat(((baseS1 + baseS2 + baseS3) / 3).toFixed(1));

      // Field 2 base readings
      const baseS4 = 40 + Math.round(Math.random() * 6);

      appendChartPoint(chartF1, label, [baseS1, baseS2, baseS3, baseAvg]);
      appendChartPoint(chartF2, label, [baseS4]);
      appendChartPoint(chartComp, label, [baseAvg, baseS4]);
    }
  }

  function resizeCharts() {
    // Redraw and scale charts cleanly inside their viewports
    setTimeout(() => {
      if (chartF1) { chartF1.resize(); chartF1.update(); }
      if (chartF2) { chartF2.resize(); chartF2.update(); }
      if (chartComp) { chartComp.resize(); chartComp.update(); }
      if (chartWaterComp) { chartWaterComp.resize(); chartWaterComp.update(); }
      if (chartTankHistory) { chartTankHistory.resize(); chartTankHistory.update(); }
      if (chartWaterDist) { chartWaterDist.resize(); chartWaterDist.update(); }
    }, 50);
  }

  function updateWaterCharts(traditionalUsed, smartUsed, tankLevel, f1Used, f2Used) {
    if (chartWaterComp) {
      chartWaterComp.data.datasets[0].data = [traditionalUsed, smartUsed];
      chartWaterComp.update();
    }

    if (chartWaterDist) {
      const total = (f1Used || 0) + (f2Used || 0);
      if (total > 0) {
        const f1Pct = Math.round((f1Used / total) * 100);
        const f2Pct = Math.round((f2Used / total) * 100);
        chartWaterDist.data.datasets[0].data = [f1Pct, f2Pct];
      } else {
        chartWaterDist.data.datasets[0].data = [50, 50];
      }
      chartWaterDist.update();
    }

    if (chartTankHistory) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      
      // Seed initial points if empty to make it look active
      if (chartTankHistory.data.labels.length === 0) {
        for (let i = 5; i >= 1; i--) {
          const offsetTime = new Date(Date.now() - i * 15000);
          chartTankHistory.data.labels.push(offsetTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
          chartTankHistory.data.datasets[0].data.push(Math.min(100, Math.max(5, tankLevel + Math.round((Math.random() - 0.5) * 6))));
        }
      }
      
      chartTankHistory.data.labels.push(timeStr);
      chartTankHistory.data.datasets[0].data.push(tankLevel);

      if (chartTankHistory.data.labels.length > MAX_DATA_POINTS) {
        chartTankHistory.data.labels.shift();
        chartTankHistory.data.datasets[0].data.shift();
      }
      chartTankHistory.update('none'); // silent update
    }
  }

  function destroyCharts() {
    if (sampleInterval) {
      clearInterval(sampleInterval);
      sampleInterval = null;
    }
    if (chartF1) { chartF1.destroy(); chartF1 = null; }
    if (chartF2) { chartF2.destroy(); chartF2 = null; }
    if (chartComp) { chartComp.destroy(); chartComp = null; }
    if (chartWaterComp) { chartWaterComp.destroy(); chartWaterComp = null; }
    if (chartTankHistory) { chartTankHistory.destroy(); chartTankHistory = null; }
    if (chartWaterDist) { chartWaterDist.destroy(); chartWaterDist = null; }
  }

  return {
    init,
    resizeCharts,
    destroyCharts,
    updateWaterCharts
  };
})();

// Export globally
window.chartsModule = chartsModule;
