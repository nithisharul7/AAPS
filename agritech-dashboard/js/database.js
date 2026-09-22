/**
 * Autonomous Agritech and Perimeter Security System
 * Real-time Database Synchronizer, Telemetry UI Updater, and Web Audio Siren
 */

const cropsData = [
  { name: "Cactus", moisture: 10, icon: "fa-solid fa-sun" },
  { name: "Aloe Vera", moisture: 15, icon: "fa-solid fa-leaf" },
  { name: "Rosemary", moisture: 20, icon: "fa-solid fa-leaf" },
  { name: "Lavender", moisture: 20, icon: "fa-solid fa-clover" },
  { name: "Snake Plant", moisture: 25, icon: "fa-solid fa-tree" },
  { name: "Thyme", moisture: 30, icon: "fa-solid fa-seedling" },
  { name: "Carrots", moisture: 35, icon: "fa-solid fa-carrot" },
  { name: "Tomato", moisture: 40, icon: "fa-solid fa-apple-whole" },
  { name: "Pepper", moisture: 40, icon: "fa-solid fa-pepper-hot" },
  { name: "Corn", moisture: 45, icon: "fa-solid fa-wheat-awn" },
  { name: "Cucumber", moisture: 50, icon: "fa-solid fa-lemon" },
  { name: "Basil", moisture: 50, icon: "fa-solid fa-seedling" },
  { name: "Lettuce", moisture: 60, icon: "fa-solid fa-leaf" },
  { name: "Mint", moisture: 70, icon: "fa-solid fa-leaf" },
  { name: "Watermelon", moisture: 80, icon: "fa-solid fa-lemon" }
];

// Web Audio API Buzzer Class (Alternating Dual Frequency Siren)
class WebAudioSiren {
  constructor() {
    this.audioCtx = null;
    this.osc1 = null;
    this.osc2 = null;
    this.gainNode = null;
    this.isPlaying = false;
    this.isMuted = false;
  }

  start() {
    if (this.isPlaying || this.isMuted) return;

    try {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      
      // Setup Gain
      this.gainNode = this.audioCtx.createGain();
      this.gainNode.gain.setValueAtTime(0.08, this.audioCtx.currentTime); // keep volume comfortable
      
      // Oscillator 1 (Base Siren)
      this.osc1 = this.audioCtx.createOscillator();
      this.osc1.type = "sawtooth";
      this.osc1.frequency.setValueAtTime(800, this.audioCtx.currentTime);
      
      // Oscillator 2 (Modulator for warble)
      this.osc2 = this.audioCtx.createOscillator();
      this.osc2.type = "sine";
      this.osc2.frequency.setValueAtTime(4, this.audioCtx.currentTime); // LFO Speed
      
      // Gain node for modulating frequency
      const modulationGain = this.audioCtx.createGain();
      modulationGain.gain.setValueAtTime(150, this.audioCtx.currentTime); // Pitch swing width
      
      // Connect LFO (osc2) -> modulation gain -> osc1 frequency
      this.osc2.connect(modulationGain);
      modulationGain.connect(this.osc1.frequency);
      
      // Connect Siren (osc1) -> Master Gain -> Audio output
      this.osc1.connect(this.gainNode);
      this.gainNode.connect(this.audioCtx.destination);
      
      // Start both
      this.osc1.start();
      this.osc2.start();
      this.isPlaying = true;
      console.log("Web Audio Buzzer siren triggered.");
    } catch (e) {
      console.error("Failed to start audio synthesizer", e);
    }
  }

  stop() {
    if (!this.isPlaying) return;
    try {
      if (this.osc1) {
        this.osc1.stop();
        this.osc1.disconnect();
      }
      if (this.osc2) {
        this.osc2.stop();
        this.osc2.disconnect();
      }
      if (this.audioCtx) {
        this.audioCtx.close();
      }
      this.isPlaying = false;
      console.log("Web Audio Buzzer siren deactivated.");
    } catch (e) {
      console.error("Failed to stop audio synthesizer", e);
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted && this.isPlaying) {
      this.stop();
    }
    return this.isMuted;
  }
}

// Global Siren Instance
const alarmSiren = new WebAudioSiren();

const databaseModule = (() => {
  // References for unbinding listeners later
  let systemRef = null;
  let fieldsRef = null;
  let eventsLogRef = null;
  let notificationsLogRef = null;
  let cropsRef = null;
  
  // Water Management Caches
  let cachedSystem = null;
  let cachedFields = null;
  let cachedField1 = null;
  let cachedField2 = null;
  
  let currentSelectedCrop = null;

  function init() {
    console.log("Initializing Real-Time Data Sync Listeners...");

    // Bind DOM Listeners
    setupSecurityControlListeners();
    setupModalListeners();
    setupLogsControlListeners();

    // Water management traditional base cycle input listener
    const tradInput = document.getElementById("traditional-base-input");
    if (tradInput) {
      tradInput.addEventListener("input", (e) => {
        const val = parseFloat(e.target.value) || 15;
        database.ref("system/water_savings/traditional_cycle_val").set(val)
          .then(() => {
            updateWaterSavingsStats();
          });
      });
    }

    // 1. Listen to System Metrics
    systemRef = database.ref("system");
    systemRef.on("value", (snapshot) => {
      const data = snapshot.val();
      if (!data) return;
      
      cachedSystem = data;
      updateSystemUI(data);
      if (cachedFields) {
        evaluateAllPumpsGlowState(cachedFields);
      }
      updateWaterSavingsStats();
    });

    // 2. Listen to dynamic Fields
    fieldsRef = database.ref("fields");
    fieldsRef.on("value", (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        const fieldsCont = document.getElementById("dashboard-fields-container");
        const pumpsCont = document.getElementById("dashboard-pumps-container");
        if (fieldsCont) fieldsCont.innerHTML = `<p style="grid-column: span 12; text-align: center; color: var(--text-muted); padding: 40px;">No fields configured. Click "Add Field" to create one.</p>`;
        if (pumpsCont) pumpsCont.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding: 20px; width: 100%;">No pump controllers active.</p>`;
        return;
      }
      
      cachedFields = data;
      cachedField1 = data.field1 || null;
      cachedField2 = data.field2 || null;

      renderDashboardFields(data);
      updateWaterSavingsStats();
    });

    // 4. Listen to Event Logs
    eventsLogRef = database.ref("logs/events");
    eventsLogRef.on("value", (snapshot) => {
      const data = snapshot.val();
      renderEventsList(data);
    });

    // 5. Listen to Notification Logs
    notificationsLogRef = database.ref("logs/notifications");
    notificationsLogRef.on("value", (snapshot) => {
      const data = snapshot.val();
      renderNotificationsList(data);
    });

    // 6. Listen to Crops Database
    cropsRef = database.ref("crops");
    cropsRef.on("value", (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        // Seed database
        const seedData = {};
        cropsData.forEach(crop => {
          const key = crop.name.toLowerCase().replace(/[^a-z0-9]/g, "_");
          seedData[key] = crop;
        });
        database.ref("crops").set(seedData);
      } else {
        renderCropsGrid(data);
      }
    });
  }

  function detach() {
    console.log("Detaching Database Listeners...");
    if (systemRef) systemRef.off("value");
    if (fieldsRef) fieldsRef.off("value");
    if (eventsLogRef) eventsLogRef.off("value");
    if (notificationsLogRef) notificationsLogRef.off("value");
    if (cropsRef) cropsRef.off("value");
    alarmSiren.stop();
  }

  // =========================================================================
  // UI UPDATERS
  // =========================================================================

  function updateSystemUI(data) {
    // Water Tank
    const level = data.tank_level || 0;
    document.getElementById("tank-level-txt").textContent = `${level}%`;
    document.getElementById("tank-volume-desc").textContent = `Level: ${level}% (approx. ${level * 30}L)`;
    
    // Wave animation path Y calculation
    const yVal = 108 - (level * 0.98); // base Y=108, top Y=10
    const waterPath = document.getElementById("tank-water");
    waterPath.setAttribute("d", `M 12 108 L 88 108 L 88 ${yVal} Q 50 ${yVal - 5} 12 ${yVal} Z`);

    // Environment weather Status
    const weather = data.weather || "not_raining";
    const weatherCard = document.getElementById("weather-card");
    const weatherTxt = document.getElementById("weather-status-txt");
    const weatherIcon = document.getElementById("weather-icon");

    if (weather === "raining") {
      weatherCard.className = "metric-item weather-item raining";
      weatherTxt.textContent = "Raining";
      weatherIcon.innerHTML = `<i class="fa-solid fa-cloud-showers-heavy"></i>`;
    } else {
      weatherCard.className = "metric-item weather-item";
      weatherTxt.textContent = "Not Raining";
      weatherIcon.innerHTML = `<i class="fa-solid fa-cloud-sun"></i>`;
    }

    // Temperature & Humidity
    document.getElementById("temp-val").textContent = `${data.temp || 0.0}°C`;
    document.getElementById("humidity-val").textContent = `${data.humidity || 0}%`;

    // LDR Sensor (Day/Night Indicator)
    const ldrLevel = data.ldr_level !== undefined ? data.ldr_level : 80;
    const ldrValText = document.getElementById("ldr-val");
    const ldrIconEl = document.getElementById("ldr-icon");

    if (ldrLevel < 30) {
      if (ldrValText) ldrValText.textContent = `Night (${ldrLevel}%)`;
      if (ldrIconEl) {
        ldrIconEl.className = "fa-solid fa-moon ldr-icon night-mode";
      }
    } else {
      if (ldrValText) ldrValText.textContent = `Day (${ldrLevel}%)`;
      if (ldrIconEl) {
        ldrIconEl.className = "fa-solid fa-sun ldr-icon";
      }
    }

    // PIR Alarm Security
    const pir = !!data.pir_detected;
    const secCard = document.getElementById("card-security-display");
    const secDot = document.getElementById("security-dot-status");
    const secHeader = document.getElementById("security-state-header");
    const secDesc = document.getElementById("security-state-desc");
    const alarmBanner = document.getElementById("security-alarm-banner");
    const radarDanger = document.getElementById("radar-danger-icon");

    if (pir) {
      secCard.classList.add("breached");
      secDot.className = "security-status-indicator alarm";
      secDot.textContent = "Breach!";
      secHeader.textContent = "PERIMETER BREACHED!";
      secDesc.textContent = "Motion alert triggered in perimeter zone. Alarm sounding.";
      alarmBanner.classList.remove("hidden");
      radarDanger.classList.remove("hidden");
      
      // Sound Web Audio Siren!
      alarmSiren.start();
    } else {
      secCard.classList.remove("breached");
      secDot.className = "security-status-indicator safe";
      secDot.textContent = "Secure";
      secHeader.textContent = "Intrusion Shield Active";
      secDesc.textContent = "PIR sensors monitoring perimeter fencing. Live alarm feed active.";
      alarmBanner.classList.add("hidden");
      radarDanger.classList.add("hidden");
      
      // Stop Siren
      alarmSiren.stop();
    }

    // Update Radio Selector visual (matching DB state)
    // Removed system-wide pump status in favor of per-field updates
  }

  function renderDashboardFields(fields) {
    const fieldsContainer = document.getElementById("dashboard-fields-container");
    if (!fieldsContainer) return;
    fieldsContainer.innerHTML = "";

    Object.keys(fields).forEach((fieldKey) => {
      const field = fields[fieldKey];
      
      const sensorKeys = Object.keys(field).filter(k => k.startsWith("sensor"));
      const isMultiZone = field.average !== undefined || sensorKeys.length > 1;
      
      const currentMoisture = field.average !== undefined ? field.average : (field.sensor1 !== undefined ? field.sensor1 : (field[sensorKeys[0]] || 0));
      const target = field.target_moisture || 40;
      const crop = field.selected_crop || "None";
      const name = field.name || (fieldKey.charAt(0).toUpperCase() + fieldKey.slice(1));
      
      const dialColor = fieldKey === "field1" ? "#00d2ff" : (fieldKey === "field2" ? "#ff9f00" : "#a78bfa");
      const fillOffset = 264 - (currentMoisture / 100 * 264);

      const card = document.createElement("div");
      card.className = "card card-field";
      card.id = `${fieldKey}-card`;
      
      let sensorReadoutsHtml = "";
      if (isMultiZone) {
        sensorKeys.forEach((sKey, index) => {
          sensorReadoutsHtml += `
            <div class="sensor-readout">
              <span>Zone ${index + 1} Sensor</span>
              <strong>${field[sKey]}%</strong>
            </div>
          `;
        });
      } else {
        sensorReadoutsHtml += `
          <div class="sensor-readout">
            <span>Sensor Moisture</span>
            <strong>${field[sensorKeys[0] || 'sensor1']}%</strong>
          </div>
        `;
      }

      let statusBoxHtml = "";
      if (!isMultiZone) {
        if (currentMoisture < target) {
          statusBoxHtml = `
            <div class="field-status-box irrigation-needed">
              <i class="fa-solid fa-triangle-exclamation"></i> Irrigation Recommended
            </div>
          `;
        } else {
          statusBoxHtml = `
            <div class="field-status-box">
              <i class="fa-solid fa-circle-check"></i> Satisfactory Moisture
            </div>
          `;
        }
      }

      card.innerHTML = `
        <button class="field-delete-btn" data-field="${fieldKey}" title="Delete Field">
          <i class="fa-solid fa-trash-can"></i>
        </button>
        <div class="card-header">
          <h3><i class="fa-solid ${isMultiZone ? 'fa-circle-nodes' : 'fa-location-crosshairs'}" style="color: ${dialColor}"></i> ${name}</h3>
          <span class="crop-badge">Crop: ${crop} (${target}% Target)</span>
        </div>
        <div class="card-body field-dashboard">
          <div class="dial-container">
            <div class="moisture-dial">
              <svg viewBox="0 0 100 100" class="dial-svg">
                <circle cx="50" cy="50" r="42" stroke="var(--glass-border)" stroke-width="8" fill="transparent" class="dial-bg"/>
                <circle cx="50" cy="50" r="42" stroke="${dialColor}" stroke-width="8" fill="transparent" stroke-dasharray="264" stroke-dashoffset="${fillOffset}" class="dial-fill"/>
              </svg>
              <div class="dial-center">
                <span class="dial-val">${currentMoisture}%</span>
                <span class="dial-lbl">${isMultiZone ? 'Average' : 'Moisture'}</span>
              </div>
            </div>
          </div>
          <div class="sensor-readout-rows ${!isMultiZone ? 'single-sensor-rows' : ''}">
            ${sensorReadoutsHtml}
            <div class="sensor-target">
              <span>Target Moisture</span>
              <span class="target-val">${target}%</span>
            </div>
            ${statusBoxHtml}
          </div>
        </div>
      `;

      fieldsContainer.appendChild(card);

      // Bind delete button listener
      card.querySelector(".field-delete-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        if (confirm(`Are you sure you want to delete "${name}"? This cannot be undone.`)) {
          database.ref("fields/" + fieldKey).set(null).then(() => {
            logSystemEvent(`Operator deleted field: "${name}".`, "system");
          }).catch(err => console.error("Field deletion failed", err));
        }
      });
    });
    
    renderDashboardPumps(fields);
  }

  function renderDashboardPumps(fields) {
    const pumpsContainer = document.getElementById("dashboard-pumps-container");
    if (!pumpsContainer) return;
    pumpsContainer.innerHTML = "";

    const fieldKeys = Object.keys(fields);
    fieldKeys.forEach((fieldKey, idx) => {
      const field = fields[fieldKey];
      const name = field.name || (fieldKey.charAt(0).toUpperCase() + fieldKey.slice(1));
      const pumpStatus = field.pump_status || "auto";

      if (idx > 0) {
        const divider = document.createElement("div");
        divider.className = "pump-divider";
        pumpsContainer.appendChild(divider);
      }

      const pumpCol = document.createElement("div");
      pumpCol.className = "pump-sub-section";
      pumpCol.id = `pump-${fieldKey}-section`;

      pumpCol.innerHTML = `
        <div class="pump-section-header">
          <h4>${name} Pump</h4>
          <span class="badge" id="pump-${fieldKey}-indicator">Offline</span>
        </div>
        <div class="pump-section-body">
          <div class="pump-visual-glow" id="pump-${fieldKey}-visual-glow">
            <div class="water-droplets" id="droplets-${fieldKey}-animation">
              <span></span><span></span><span></span>
            </div>
            <i class="fa-solid fa-water pump-icon" id="pump-${fieldKey}-glow-icon"></i>
          </div>
          <div class="pump-control">
            <label class="control-label">Command (${name})</label>
            <div class="segmented-control">
              <input type="radio" name="pump_command_${fieldKey}" id="pump-${fieldKey}-force-on" value="force_on" ${pumpStatus === 'force_on' ? 'checked' : ''}>
              <label for="pump-${fieldKey}-force-on" class="seg-item">Force On</label>

              <input type="radio" name="pump_command_${fieldKey}" id="pump-${fieldKey}-force-off" value="force_off" ${pumpStatus === 'force_off' ? 'checked' : ''}>
              <label for="pump-${fieldKey}-force-off" class="seg-item">Force Off</label>

              <input type="radio" name="pump_command_${fieldKey}" id="pump-${fieldKey}-auto" value="auto" ${pumpStatus === 'auto' ? 'checked' : ''}>
              <label for="pump-${fieldKey}-auto" class="seg-item">Auto Mode</label>
            </div>
            <p class="pump-instruction" id="pump-${fieldKey}-status-info">Auto: Runs when moisture &lt; target.</p>
          </div>
        </div>
      `;

      pumpsContainer.appendChild(pumpCol);

      const radios = pumpCol.querySelectorAll(`input[name="pump_command_${fieldKey}"]`);
      radios.forEach(radio => {
        radio.addEventListener("change", (e) => {
          const val = e.target.value;
          database.ref(`fields/${fieldKey}/pump_status`).set(val)
            .then(() => {
              logSystemEvent(`Operator set ${name} pump configuration to: ${val.toUpperCase()}`, "irrigation");
            });
        });
      });
    });

    evaluateAllPumpsGlowState(fields);
  }

  function evaluateAllPumpsGlowState(fields) {
    Object.keys(fields).forEach(fieldKey => {
      const field = fields[fieldKey];
      const pumpStatus = field.pump_status || "auto";
      
      const sensorKeys = Object.keys(field).filter(k => k.startsWith("sensor"));
      const currentMoisture = field.average !== undefined ? field.average : (field.sensor1 !== undefined ? field.sensor1 : (field[sensorKeys[0]] || 0));
      const target = field.target_moisture || 40;

      let isRunning = false;
      let desc = "";

      if (pumpStatus === "force_on") {
        isRunning = true;
        desc = "Override: Pump Forced ON.";
      } else if (pumpStatus === "force_off") {
        isRunning = false;
        desc = "Override: Pump Forced OFF.";
      } else {
        if (currentMoisture < target) {
          isRunning = true;
          desc = "Auto: Active (Moisture below target).";
        } else {
          isRunning = false;
          desc = "Auto: Idle (Moisture satisfied).";
        }
      }

      const pSection = document.getElementById(`pump-${fieldKey}-section`);
      const pIndicator = document.getElementById(`pump-${fieldKey}-indicator`);
      const pInfo = document.getElementById(`pump-${fieldKey}-status-info`);

      if (pInfo) pInfo.textContent = desc;

      if (isRunning) {
        if (pSection) pSection.className = "pump-sub-section running";
        if (pIndicator) {
          pIndicator.style.backgroundColor = "var(--green-accent)";
          pIndicator.style.color = "white";
          pIndicator.textContent = "Running";
        }
      } else {
        if (pumpStatus === "force_off") {
          if (pSection) pSection.className = "pump-sub-section forced-off";
          if (pIndicator) {
            pIndicator.style.backgroundColor = "var(--red-accent)";
            pIndicator.style.color = "white";
            pIndicator.textContent = "Inhibited";
          }
        } else {
          if (pSection) pSection.className = "pump-sub-section";
          if (pIndicator) {
            pIndicator.style.backgroundColor = "var(--text-muted)";
            pIndicator.style.color = "white";
            pIndicator.textContent = "Idle";
          }
        }
      }
    });
  }

  // =========================================================================
  // TELEMETRY SETTERS / ACTIONS
  // =========================================================================

  function setupSecurityControlListeners() {
    // Alarm Acknowledge
    document.getElementById("btn-ack-alarm").addEventListener("click", () => {
      if (isDemoMode) {
        clearPIRAlert();
      } else {
        database.ref("system/pir_detected").set(false)
          .then(() => {
            logSystemEvent("Alarm siren manually acknowledged and silenced by operator.", "security");
          });
      }
    });

    // Test Breach Simulation
    document.getElementById("btn-test-pir").addEventListener("click", () => {
      if (isDemoMode) {
        simulatePIRTrigger();
      } else {
        database.ref("system/pir_detected").set(true)
          .then(() => {
            logSystemEvent("Test simulation warning triggered by operator console.", "security");
          });
      }
    });

    // Mute Siren
    const muteBtn = document.getElementById("btn-buzzer-toggle");
    muteBtn.addEventListener("click", () => {
      const isMuted = alarmSiren.toggleMute();
      if (isMuted) {
        muteBtn.className = "btn-outline muted";
        muteBtn.innerHTML = `<i class="fa-solid fa-volume-xmark"></i> Siren Muted`;
        logSystemEvent("Local browser buzzer silenced.", "system");
      } else {
        muteBtn.className = "btn-outline";
        muteBtn.innerHTML = `<i class="fa-solid fa-volume-high"></i> Mute Buzzer`;
        logSystemEvent("Local browser buzzer audible enabled.", "system");
        
        // If threat is currently active, sound immediately
        const secCard = document.getElementById("card-security-display");
        if (secCard.classList.contains("breached")) {
          alarmSiren.start();
        }
      }
    });
  }

  // =========================================================================
  // CROP GRID AND MODAL DIALOGS
  // =========================================================================

  function renderCropsGrid(cropsObj) {
    const grid = document.getElementById("crop-cards-container");
    grid.innerHTML = "";

    if (!cropsObj) return;

    Object.keys(cropsObj).forEach(key => {
      const crop = cropsObj[key];
      if (!crop) return; // Safety guard: skip empty/null entries
      
      const card = document.createElement("div");
      card.className = "crop-card";
      card.innerHTML = `
        <div class="crop-visual-box"><i class="${crop.icon}"></i></div>
        <h3>${crop.name}</h3>
        <div class="crop-moisture-val">${crop.moisture}%</div>
        <div class="crop-moisture-label">Moisture Req.</div>
      `;

      // Crop delete overlay button
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "crop-delete-btn";
      deleteBtn.innerHTML = `<i class="fa-solid fa-trash-can"></i>`;
      deleteBtn.title = "Delete Crop";
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation(); // prevent modal opening
        if (confirm(`Are you sure you want to delete crop "${crop.name}" from the database?`)) {
          deleteCrop(key);
        }
      });
      card.appendChild(deleteBtn);

      card.addEventListener("click", () => {
        openCropModal(crop);
      });
      grid.appendChild(card);
    });
  }

  function deleteCrop(cropKey) {
    database.ref("crops/" + cropKey).set(null)
      .then(() => {
        logSystemEvent(`Crop deleted from database: ${cropKey.replace('_', ' ').toUpperCase()}`, "system");
      })
      .catch(err => console.error("Crop deletion failed", err));
  }

  const cropModal = document.getElementById("crop-modal");
  const modalClose = document.getElementById("btn-modal-close");
  const modalCropName = document.getElementById("modal-crop-name");
  const modalCropMoisture = document.getElementById("modal-crop-moisture");
  const modalCropMoistureVal = document.getElementById("modal-crop-moisture-val");

  function openCropModal(crop) {
    currentSelectedCrop = crop;
    modalCropName.textContent = crop.name;
    modalCropMoisture.textContent = `${crop.moisture}%`;
    modalCropMoistureVal.textContent = `${crop.moisture}%`;
    cropModal.classList.remove("hidden");
  }

  function setupModalListeners() {
    // Assignment modal close
    modalClose.addEventListener("click", () => cropModal.classList.add("hidden"));
    cropModal.addEventListener("click", (e) => {
      if (e.target === cropModal) cropModal.classList.add("hidden");
    });

    // Assign Field 1
    document.getElementById("btn-assign-f1").addEventListener("click", () => {
      if (!currentSelectedCrop) return;
      
      database.ref("fields/field1").update({
        selected_crop: currentSelectedCrop.name,
        target_moisture: currentSelectedCrop.moisture
      }).then(() => {
        logSystemEvent(`Field 1 irrigation target set to ${currentSelectedCrop.name} (${currentSelectedCrop.moisture}% moisture).`, "irrigation");
        cropModal.classList.add("hidden");
      }).catch(err => console.error("Field 1 update failed", err));
    });

    // Assign Field 2
    document.getElementById("btn-assign-f2").addEventListener("click", () => {
      if (!currentSelectedCrop) return;

      database.ref("fields/field2").update({
        selected_crop: currentSelectedCrop.name,
        target_moisture: currentSelectedCrop.moisture
      }).then(() => {
        logSystemEvent(`Field 2 irrigation target set to ${currentSelectedCrop.name} (${currentSelectedCrop.moisture}% moisture).`, "irrigation");
        cropModal.classList.add("hidden");
      }).catch(err => console.error("Field 2 update failed", err));
    });

    // --- ADD CROP FORM MODAL HANDLERS ---
    const addCropModal = document.getElementById("add-crop-modal");
    const btnOpenAddCrop = document.getElementById("btn-open-add-crop");
    const btnAddCropClose = document.getElementById("btn-add-crop-close");
    const addCropForm = document.getElementById("add-crop-form");
    const addCropAlert = document.getElementById("add-crop-alert");

    btnOpenAddCrop.addEventListener("click", () => {
      addCropAlert.classList.add("hidden");
      addCropForm.reset();
      addCropModal.classList.remove("hidden");
    });

    btnAddCropClose.addEventListener("click", () => {
      addCropModal.classList.add("hidden");
    });

    addCropModal.addEventListener("click", (e) => {
      if (e.target === addCropModal) addCropModal.classList.add("hidden");
    });

    addCropForm.addEventListener("submit", (e) => {
      e.preventDefault();
      addCropAlert.classList.add("hidden");

      const name = document.getElementById("new-crop-name").value.trim();
      const moisture = parseInt(document.getElementById("new-crop-moisture").value);
      const icon = document.getElementById("new-crop-icon").value;

      if (!name || isNaN(moisture)) return;

      // 1. Fetch current crops to check for duplicate crop names
      database.ref("crops").once("value").then((snapshot) => {
        const crops = snapshot.val() || {};
        
        // Case-insensitive duplicate name search
        const nameLower = name.toLowerCase();
        const isDuplicate = Object.values(crops).some(c => c.name.toLowerCase() === nameLower);

        if (isDuplicate) {
          addCropAlert.textContent = `Crop "${name}" already exists. Duplicate entries are not allowed.`;
          addCropAlert.classList.remove("hidden");
          return;
        }

        // 2. Generate key and push
        const key = nameLower.replace(/[^a-z0-9]/g, "_");
        database.ref("crops/" + key).set({
          name: name,
          moisture: moisture,
          icon: icon
        }).then(() => {
          logSystemEvent(`New crop added to system database: ${name} (${moisture}%).`, "system");
          addCropModal.classList.add("hidden");
        }).catch(err => {
          console.error("Failed to add crop", err);
          addCropAlert.textContent = "Database write error. Please try again.";
          addCropAlert.classList.remove("hidden");
        });
      });
    });
  }

  // =========================================================================
  // LOGS LIST RENDERING
  // =========================================================================

  function renderEventsList(logsObj) {
    const listBody = document.getElementById("event-logs-body");
    listBody.innerHTML = "";
    
    if (!logsObj) {
      listBody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:var(--text-muted);">No records found</td></tr>`;
      return;
    }

    // Convert object or array to sorted array of log items
    let logsArray = [];
    if (Array.isArray(logsObj)) {
      logsArray = logsObj;
    } else {
      logsArray = Object.keys(logsObj).map(key => logsObj[key]);
    }

    // Sort by timestamp descending
    logsArray.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    logsArray.slice(0, 50).forEach(log => {
      const timeStr = new Date(log.timestamp).toLocaleTimeString();
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="log-time">${timeStr}</td>
        <td><span class="log-cat ${log.type || 'system'}">${log.type || 'system'}</span></td>
        <td>${log.message}</td>
      `;
      listBody.appendChild(tr);
    });
  }

  function renderNotificationsList(logsObj) {
    const listBody = document.getElementById("notification-logs-body");
    listBody.innerHTML = "";

    if (!logsObj) {
      listBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted);">No notifications dispatched</td></tr>`;
      return;
    }

    let logsArray = [];
    if (Array.isArray(logsObj)) {
      logsArray = logsObj;
    } else {
      logsArray = Object.keys(logsObj).map(key => logsObj[key]);
    }

    logsArray.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    logsArray.slice(0, 50).forEach(log => {
      const timeStr = new Date(log.timestamp).toLocaleTimeString();
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="log-time">${timeStr}</td>
        <td><span class="log-cat ${log.type || 'all'}">${log.type || 'all'}</span></td>
        <td>${log.message}</td>
        <td><span class="status-indicator ${log.status || 'sent'}">${log.status || 'sent'}</span></td>
      `;
      listBody.appendChild(tr);
    });
  }

  function setupLogsControlListeners() {
    document.getElementById("btn-clear-events").addEventListener("click", () => {
      if (confirm("Are you sure you want to clear system event history?")) {
        if (isDemoMode) {
          mockDbState.logs.events = [];
          triggerMockListeners("logs/events");
        } else {
          database.ref("logs/events").set(null);
        }
        logSystemEvent("Operator cleared system event log.", "system");
      }
    });

    document.getElementById("btn-clear-notifications").addEventListener("click", () => {
      if (confirm("Are you sure you want to clear push notification dispatch history?")) {
        if (isDemoMode) {
          mockDbState.logs.notifications = [];
          triggerMockListeners("logs/notifications");
        } else {
          database.ref("logs/notifications").set(null);
        }
        logSystemEvent("Operator cleared notification log.", "system");
      }
    });
  }

  function updateWaterSavingsStats() {
    if (!cachedSystem || !cachedField1 || !cachedField2) return;
    
    const tankLevel = cachedSystem.tank_level || 0;
    const f1Used = cachedField1.water_used || 0;
    const f2Used = cachedField2.water_used || 0;
    const smartUsed = f1Used + f2Used;
    
    const cycleCount = (cachedSystem.water_savings && cachedSystem.water_savings.cycle_count) || 0;
    const traditionalCycleVal = parseFloat(document.getElementById("traditional-base-input").value) || 15;
    
    const traditionalUsed = cycleCount * traditionalCycleVal;
    const waterSaved = Math.max(0, traditionalUsed - smartUsed);
    
    const efficiency = traditionalUsed > 0 
      ? ((waterSaved / traditionalUsed) * 100).toFixed(1) 
      : "0.0";
    
    // --- UPDATE GENERAL CARDS ---
    const tankCircleVal = document.getElementById("water-tank-circle-val");
    const tankSvgCircle = document.getElementById("water-tank-svg-circle");
    if (tankCircleVal) tankCircleVal.textContent = `${tankLevel}%`;
    if (tankSvgCircle) {
      tankSvgCircle.setAttribute("stroke-dasharray", `${tankLevel}, 100`);
    }
    
    const f1UsedText = document.getElementById("water-f1-used-val");
    const f2UsedText = document.getElementById("water-f2-used-val");
    const smartUsedText = document.getElementById("water-smart-used-val");
    const traditionalUsedText = document.getElementById("water-traditional-used-val");
    const savedPctText = document.getElementById("water-saved-pct-val");
    const efficiencyText = document.getElementById("water-efficiency-val");
    const savedProgressBar = document.getElementById("water-saved-progress-bar");

    if (f1UsedText) f1UsedText.textContent = `${f1Used}%`;
    if (f2UsedText) f2UsedText.textContent = `${f2Used}%`;
    if (smartUsedText) smartUsedText.textContent = `${smartUsed}%`;
    if (traditionalUsedText) traditionalUsedText.textContent = `${traditionalUsed}%`;
    if (savedPctText) savedPctText.textContent = `${waterSaved}% Saved`;
    if (efficiencyText) efficiencyText.textContent = `${efficiency}%`;

    if (savedProgressBar) {
      const savedPct = traditionalUsed > 0 
        ? Math.min(100, Math.max(0, (waterSaved / traditionalUsed) * 100)) 
        : 0;
      savedProgressBar.style.width = `${savedPct}%`;
    }

    // --- WATER DISTRIBUTION SECTION ---
    const distTotal = f1Used + f2Used;
    let f1DistPct = 50;
    let f2DistPct = 50;
    if (distTotal > 0) {
      f1DistPct = Math.round((f1Used / distTotal) * 100);
      f2DistPct = 100 - f1DistPct;
    }
    const distF1PctText = document.getElementById("water-dist-f1-pct");
    const distF1Bar = document.getElementById("water-dist-f1-bar");
    const distF2PctText = document.getElementById("water-dist-f2-pct");
    const distF2Bar = document.getElementById("water-dist-f2-bar");

    if (distF1PctText) distF1PctText.textContent = `${f1DistPct}%`;
    if (distF1Bar) distF1Bar.style.width = `${f1DistPct}%`;
    if (distF2PctText) distF2PctText.textContent = `${f2DistPct}%`;
    if (distF2Bar) distF2Bar.style.width = `${f2DistPct}%`;

    // --- TIMELINE IRRIGATION HISTORY ---
    const timelineContainer = document.getElementById("irrigation-timeline");
    if (timelineContainer) {
      timelineContainer.innerHTML = "";
      const historyObj = (cachedSystem.water_savings && cachedSystem.water_savings.irrigation_history) || {};
      const historyList = Object.keys(historyObj).map(key => historyObj[key]);
      
      // Sort descending (latest first)
      historyList.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      if (historyList.length === 0) {
        timelineContainer.innerHTML = `<p style="font-size: 0.8rem; color: var(--text-muted); text-align: center; padding: 20px;">No complete irrigation events logged today.</p>`;
      } else {
        historyList.forEach((evt, idx) => {
          const dt = new Date(evt.timestamp);
          const timeStr = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const dateStr = dt.toLocaleDateString([], { month: 'short', day: 'numeric' });
          
          const timelineItem = document.createElement("div");
          timelineItem.className = idx === 0 ? "timeline-item latest" : "timeline-item";
          
          timelineItem.innerHTML = `
            <span class="timeline-time">${dateStr} • ${timeStr}</span>
            <div class="timeline-content">
              <h4>
                <i class="fa-solid ${evt.field === 'Field 1' ? 'fa-circle-nodes' : 'fa-location-crosshairs'}" style="color: ${evt.field === 'Field 1' ? '#60a5fa' : '#34d399'};"></i>
                <span>${evt.field}</span>
                <span class="badge" style="background: rgba(255,255,255,0.05); color: var(--text-muted); font-size: 0.65rem;">${evt.mode}</span>
              </h4>
              <p>Tank Level change: <strong>${evt.before}%</strong> to <strong>${evt.after}%</strong></p>
              <span class="timeline-metric-change">💧 Consumed: ${evt.waterUsed}% Tank Vol</span>
            </div>
          `;
          timelineContainer.appendChild(timelineItem);
        });
      }
    }

    // --- WATER MANAGEMENT SUMMARY ---
    // Average Tank Usage (%)
    const avgUsageVal = cycleCount > 0 ? (smartUsed / cycleCount).toFixed(1) : "0.0";
    
    // Tank Flow Status
    const pump1Active = cachedField1.pump_status === 'force_on' || 
                        (cachedField1.pump_status === 'auto' && cachedField1.average < cachedField1.target_moisture);
    const pump2Active = cachedField2.pump_status === 'force_on' || 
                        (cachedField2.pump_status === 'auto' && cachedField2.sensor4 < cachedField2.target_moisture);
    const isRaining = cachedSystem.weather === 'raining';

    let tankStatus = "Stable";
    let tankStatusIcon = "fa-gauge";
    let tankStatusColor = "#34d399"; // green

    if (pump1Active || pump2Active) {
      tankStatus = "Draining";
      tankStatusIcon = "fa-arrow-down-long";
      tankStatusColor = "#fb923c"; // orange/amber
    } else if (isRaining) {
      tankStatus = "Replenishing";
      tankStatusIcon = "fa-cloud-showers-water";
      tankStatusColor = "#60a5fa"; // blue
    }

    // Update DOM nodes
    const summaryTank = document.getElementById("summary-tank-val");
    const summaryCycles = document.getElementById("summary-cycles-val");
    const summaryAvgUsage = document.getElementById("summary-avg-usage-val");
    const summaryStatus = document.getElementById("summary-status-val");
    const summaryStatusIcon = document.getElementById("summary-status-icon");
    const summaryStatusCard = document.getElementById("summary-status-card");
    const summaryEfficiency = document.getElementById("summary-efficiency-val");

    if (summaryTank) summaryTank.textContent = `${tankLevel}%`;
    if (summaryCycles) summaryCycles.textContent = cycleCount;
    if (summaryAvgUsage) summaryAvgUsage.textContent = `${avgUsageVal}%`;
    if (summaryStatus) summaryStatus.textContent = tankStatus;
    if (summaryStatusIcon) {
      summaryStatusIcon.className = `fa-solid ${tankStatusIcon}`;
      summaryStatusIcon.style.color = tankStatusColor;
    }
    if (summaryStatusCard) {
      summaryStatusCard.className = "metric-box";
      summaryStatusCard.style.borderColor = tankStatusColor + "33"; // add alpha border tint
    }
    if (summaryEfficiency) summaryEfficiency.textContent = `${efficiency}%`;

    // Sync traditional base input if database value changed from elsewhere
    if (cachedSystem.water_savings && cachedSystem.water_savings.traditional_cycle_val !== undefined) {
      const tradInput = document.getElementById("traditional-base-input");
      if (tradInput && parseFloat(tradInput.value) !== cachedSystem.water_savings.traditional_cycle_val) {
        tradInput.value = cachedSystem.water_savings.traditional_cycle_val;
      }
    }

    // Update comparison charts
    if (window.chartsModule && typeof window.chartsModule.updateWaterCharts === 'function') {
      window.chartsModule.updateWaterCharts(traditionalUsed, smartUsed, tankLevel, f1Used, f2Used);
    }
  }

  return {
    init,
    detach,
    updateWaterSavingsStats
  };
})();

// Export globally
window.databaseModule = databaseModule;
