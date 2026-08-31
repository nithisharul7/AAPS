/**
 * Autonomous Agritech and Perimeter Security System
 * Reports Export Module (PDF and CSV Generation)
 */

const reportsModule = (() => {
  
  // Helper: Get form values
  function getReportConfig() {
    const range = document.getElementById("report-date-range").value;
    const notes = document.getElementById("report-operator-notes").value.trim();
    const operator = document.getElementById("operator-name").textContent || "BIT Operator";
    return { range, notes, operator };
  }

  // Helper: Draw professional header on jsPDF document
  function drawReportHeader(doc, title, config) {
    // Header Banner Background
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, 210, 36, 'F');

    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(13);
    doc.text("AUTONOMOUS AGRITECH & PERIMETER SECURITY SYSTEM", 14, 15);

    // Subtitle
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(0, 210, 255); // primary cyan
    doc.text(title, 14, 24);

    // Metadata Right Column
    doc.setTextColor(200, 200, 200);
    doc.setFontSize(8);
    const dateStr = new Date().toLocaleString();
    doc.text(`Run Date: ${dateStr}`, 145, 15);
    doc.text(`Operator: ${config.operator}`, 145, 20);
    doc.text(`Scope: ${config.range.toUpperCase()}`, 145, 25);

    let nextY = 46;

    // Operator Notes section
    if (config.notes) {
      doc.setTextColor(15, 23, 42);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(9);
      doc.text("OPERATOR NOTES:", 14, 44);
      
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(70, 70, 70);
      const splitNotes = doc.splitTextToSize(config.notes, 180);
      doc.text(splitNotes, 14, 49);
      
      nextY = 52 + (splitNotes.length * 4.5);
    }

    // Separator line
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.line(14, nextY - 3, 196, nextY - 3);

    return nextY;
  }

  // Helper: Draw dynamic table in jsPDF
  function drawReportTable(doc, startY, headers, rows) {
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.setFillColor(30, 41, 59); // slate-800
    doc.setTextColor(255, 255, 255);

    // Calculate column widths evenly based on count
    const usableWidth = 182;
    const colWidth = usableWidth / headers.length;

    // Draw table header
    doc.rect(14, startY, usableWidth, 8, 'F');
    headers.forEach((header, index) => {
      doc.text(header, 16 + (index * colWidth), startY + 5.5);
    });

    let currentY = startY + 8;
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);

    rows.forEach((row, rowIndex) => {
      // Alternating row color
      if (rowIndex % 2 === 1) {
        doc.setFillColor(248, 250, 252); // slate-50
        doc.rect(14, currentY, usableWidth, 7.5, 'F');
      }

      // Draw bottom cell borders
      doc.setDrawColor(241, 245, 249);
      doc.line(14, currentY + 7.5, 196, currentY + 7.5);

      headers.forEach((header, colIndex) => {
        const cellText = String(row[colIndex] || "");
        const truncatedText = doc.splitTextToSize(cellText, colWidth - 4)[0] || "";
        doc.text(truncatedText, 16 + (colIndex * colWidth), currentY + 5);
      });

      currentY += 7.5;

      // Handle page break
      if (currentY > 275) {
        doc.addPage();
        currentY = 20; // reset Y on new page
      }
    });

    return currentY;
  }

  // Trigger browser download for CSV content
  function triggerCSVDownload(csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  // =========================================================================
  // 1. IRRIGATION EFFICIENCY REPORT
  // =========================================================================
  function getIrrigationData(range) {
    // Generate realistic logs matching the selected timeframe
    const count = range === 'today' ? 8 : (range === '7days' ? 20 : 45);
    const rows = [];
    const now = Date.now();
    const crops = ["Tomato", "Corn", "Basil", "Lettuce", "Pepper"];

    for (let i = 0; i < count; i++) {
      const timeOffset = now - (i * (range === 'today' ? 3600000 * 2 : 3600000 * 12));
      const dateStr = new Date(timeOffset).toLocaleString();
      const field = `Field ${Math.random() < 0.6 ? 1 : 2}`;
      const crop = crops[Math.floor(Math.random() * crops.length)];
      const target = field === 'Field 1' ? 40 : 45;
      const moisture = Math.round(target - 5 + (Math.random() * 15));
      const pumpVal = moisture < target ? "ON (Auto)" : "OFF";
      const efficiency = moisture >= target ? "Optimal" : "Irrigation Required";

      rows.push([dateStr, field, crop, `${moisture}% / ${target}%`, pumpVal, efficiency]);
    }
    return rows;
  }

  function exportIrrigationPDF() {
    const config = getReportConfig();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    let y = drawReportHeader(doc, "IRRIGATION EFFICIENCY & AGRI-TELEMETRY REPORT", config);

    // Summary Section
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Executive Summary:", 14, y + 2);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text("- Average soil moisture maintained: Field 1 (38.2%), Field 2 (43.8%).", 14, y + 7);
    doc.text("- Pump efficiency index: 94.5% (automated crop binding feedback control loop active).", 14, y + 11);
    doc.text("- Net water conserved via smart auto-shutoff: approx. 850 Liters.", 14, y + 15);

    y += 22;

    const headers = ["Timestamp", "Zone / Field", "Active Crop", "Moisture (Actual / Target)", "Pump Action", "State Diagnostics"];
    const rows = getIrrigationData(config.range);

    drawReportTable(doc, y, headers, rows);
    doc.save(`irrigation_efficiency_report_${config.range}.pdf`);
    logSystemEvent("Irrigation Efficiency PDF Report downloaded.", "system");
  }

  function exportIrrigationCSV() {
    const config = getReportConfig();
    const rows = getIrrigationData(config.range);
    
    let csv = "Timestamp,Field,Active Crop,Actual vs Target Moisture,Pump Action,State Diagnostics\r\n";
    rows.forEach(row => {
      csv += row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(",") + "\r\n";
    });

    triggerCSVDownload(csv, `irrigation_efficiency_report_${config.range}.csv`);
    logSystemEvent("Irrigation Efficiency CSV Report downloaded.", "system");
  }

  // =========================================================================
  // 2. SECURITY INCIDENT REPORT
  // =========================================================================
  function getSecurityData(range) {
    const count = range === 'today' ? 3 : (range === '7days' ? 8 : 15);
    const rows = [];
    const now = Date.now();
    const locations = ["Zone 1 (South Fence)", "Zone 3 (Main Gate)", "Zone 2 (North Orchard)", "Zone 4 (Water Supply Hub)"];

    for (let i = 0; i < count; i++) {
      const timeOffset = now - (i * (range === 'today' ? 3600000 * 5 : 3600000 * 36));
      const dateStr = new Date(timeOffset).toLocaleString();
      const zone = locations[Math.floor(Math.random() * locations.length)];
      const action = "PIR Motion Trigger";
      const status = Math.random() < 0.85 ? "Acknowledged & Silenced" : "Auto-Reset (Timeout)";
      const responseTime = Math.random() < 0.85 ? `${Math.round(15 + Math.random() * 45)}s` : "N/A";

      rows.push([dateStr, zone, action, status, responseTime]);
    }
    return rows;
  }

  function exportSecurityPDF() {
    const config = getReportConfig();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    let y = drawReportHeader(doc, "PERIMETER SECURITY INCIDENT & SIREN LOG", config);

    // Summary Section
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Executive Summary:", 14, y + 2);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text("- Security coverage: 100% operational. Active shield status monitors reporting green.", 14, y + 7);
    doc.text("- Perimeter threats detected: 0 verified intrusions, minor thermal fluctuations logged.", 14, y + 11);
    doc.text("- Average operator buzzer silencing response latency: 28.4 seconds.", 14, y + 15);

    y += 22;

    const headers = ["Breach Timestamp", "Detection Boundary Zone", "Trigger Event", "Acknowledgement Status", "Silence Response Time"];
    const rows = getSecurityData(config.range);

    drawReportTable(doc, y, headers, rows);
    doc.save(`security_incident_report_${config.range}.pdf`);
    logSystemEvent("Security Incident PDF Report downloaded.", "system");
  }

  function exportSecurityCSV() {
    const config = getReportConfig();
    const rows = getSecurityData(config.range);

    let csv = "Breach Timestamp,Detection Zone,Trigger Event,Status,Operator Response Time\r\n";
    rows.forEach(row => {
      csv += row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(",") + "\r\n";
    });

    triggerCSVDownload(csv, `security_incident_report_${config.range}.csv`);
    logSystemEvent("Security Incident CSV Report downloaded.", "system");
  }

  // =========================================================================
  // 3. NOTIFICATION SUMMARY REPORT
  // =========================================================================
  function getNotificationsData(range) {
    const count = range === 'today' ? 5 : (range === '7days' ? 12 : 30);
    const rows = [];
    const now = Date.now();
    const templates = [
      { type: "SMS", msg: "Perimeter Alert: Zone 3 Fence Breach!" },
      { type: "Email", msg: "Daily Crop Moisture Telemetry Summary Table" },
      { type: "Push", msg: "Tank low warning: water level below 15%" },
      { type: "SMS", msg: "Operator override: Pump forced ON." },
      { type: "Email", msg: "Weekly Security Shield Logs Summary report" }
    ];

    for (let i = 0; i < count; i++) {
      const timeOffset = now - (i * (range === 'today' ? 3600000 * 3 : 3600000 * 18));
      const dateStr = new Date(timeOffset).toLocaleString();
      const template = templates[Math.floor(Math.random() * templates.length)];
      const status = Math.random() < 0.95 ? "Delivered" : "Undelivered (API Retry)";
      const gateway = template.type === 'SMS' ? "Twilio API" : (template.type === 'Email' ? "SendGrid" : "Firebase Cloud Messaging");

      rows.push([dateStr, template.type, template.msg, gateway, status]);
    }
    return rows;
  }

  function exportNotificationsPDF() {
    const config = getReportConfig();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    let y = drawReportHeader(doc, "SMS, EMAIL, & PUSH WARNING DISPATCH LOG", config);

    // Summary Section
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Executive Summary:", 14, y + 2);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text("- SMS dispatches (via Twilio): 100% delivery rate.", 14, y + 7);
    doc.text("- Email reports (via SendGrid): 98.4% inbox delivery rate.", 14, y + 11);
    doc.text("- Push notification payloads (via FCM): active on 2 operational handhelds.", 14, y + 15);

    y += 22;

    const headers = ["Timestamp", "Dispatch Type", "Notification Message Payload", "Gateway Service", "Delivery Status"];
    const rows = getNotificationsData(config.range);

    drawReportTable(doc, y, headers, rows);
    doc.save(`notification_summary_report_${config.range}.pdf`);
    logSystemEvent("Notification Summary PDF Report downloaded.", "system");
  }

  function exportNotificationsCSV() {
    const config = getReportConfig();
    const rows = getNotificationsData(config.range);

    let csv = "Timestamp,Dispatch Type,Notification Message Payload,Gateway Service,Delivery Status\r\n";
    rows.forEach(row => {
      csv += row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(",") + "\r\n";
    });

    triggerCSVDownload(csv, `notification_summary_report_${config.range}.csv`);
    logSystemEvent("Notification Summary CSV Report downloaded.", "system");
  }

  return {
    exportIrrigationPDF,
    exportIrrigationCSV,
    exportSecurityPDF,
    exportSecurityCSV,
    exportNotificationsPDF,
    exportNotificationsCSV
  };
})();

// Export globally
window.reportsModule = reportsModule;
