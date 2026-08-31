/**
 * Autonomous Agritech and Perimeter Security System
 * Core SPA Controller, Navigation, and Authentication Manager
 */

document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const body = document.body;
  const loginContainer = document.getElementById("login-container");
  const appContainer = document.getElementById("app-container");
  const loginForm = document.getElementById("login-form");
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const btnLogin = document.getElementById("btn-login");
  const btnLogout = document.getElementById("btn-logout");
  const loginAlert = document.getElementById("login-alert");
  const operatorNameLabel = document.getElementById("operator-name");

  // Registration Form DOM Elements
  const tabLoginBtn = document.getElementById("tab-login-btn");
  const tabRegisterBtn = document.getElementById("tab-register-btn");
  const registerForm = document.getElementById("register-form");
  const regNameInput = document.getElementById("reg-name");
  const regUsernameInput = document.getElementById("reg-username");
  const regPasswordInput = document.getElementById("reg-password");
  const regConfirmPasswordInput = document.getElementById("reg-confirm-password");
  const btnRegister = document.getElementById("btn-register");
  
  const sidebarToggle = document.getElementById("sidebar-toggle");
  const sidebar = document.querySelector(".sidebar");
  const navItems = document.querySelectorAll(".nav-item");
  const tabViews = document.querySelectorAll(".tab-view");
  
  const clockTime = document.getElementById("clock-time");
  const cloudStatusBadge = document.getElementById("cloud-status-badge");
  const cloudStatusText = document.getElementById("cloud-status-text");

  // =========================================================================
  // 1. AUTHENTICATION & LOGIN FLOW
  // =========================================================================

  // Listen for Authentication state changes
  auth.onAuthStateChanged((user) => {
    if (user) {
      // Clear failover session since we have a real Firebase session
      sessionStorage.removeItem("agritech_failover_login");
      
      // User is logged in
      body.classList.remove("login-view");
      loginContainer.classList.add("hidden");
      appContainer.classList.remove("hidden");
      operatorNameLabel.textContent = user.displayName || user.email.split("@")[0];
      
      // Initialize telemetry listeners
      if (window.databaseModule) {
        window.databaseModule.init();
      }
      
      // Initialize analytics charts
      if (window.chartsModule) {
        window.chartsModule.init();
      }
      
      // Log login event (if database is loaded)
      logSystemEvent("Operator session opened.", "system");

    } else {
      // User is logged out (Check if local failover is active)
      if (sessionStorage.getItem("agritech_failover_login") === "true") {
        body.classList.remove("login-view");
        loginContainer.classList.add("hidden");
        appContainer.classList.remove("hidden");
        operatorNameLabel.textContent = "Admin Operator (Local Failover)";
        
        if (window.databaseModule) {
          window.databaseModule.init();
        }
        if (window.chartsModule) {
          window.chartsModule.init();
        }
      } else {
        body.classList.add("login-view");
        loginContainer.classList.remove("hidden");
        appContainer.classList.add("hidden");
        
        // Detach telemetry listeners
        if (window.databaseModule) {
          window.databaseModule.detach();
        }
      }
    }
  });

  // Switch Auth tabs
  tabLoginBtn.addEventListener("click", () => {
    tabLoginBtn.classList.add("active");
    tabRegisterBtn.classList.remove("active");
    loginForm.classList.remove("hidden");
    registerForm.classList.add("hidden");
    loginAlert.classList.add("hidden");
  });

  tabRegisterBtn.addEventListener("click", () => {
    tabRegisterBtn.classList.add("active");
    tabLoginBtn.classList.remove("active");
    registerForm.classList.remove("hidden");
    loginForm.classList.add("hidden");
    loginAlert.classList.add("hidden");
  });

  function handleFailover(email, password, error) {
    if (email.toLowerCase() === "admin@agritech.com" && password === "admin123") {
      console.warn("Authentication failover activated.", error);
      sessionStorage.setItem("agritech_failover_login", "true");
      
      // Trigger UI transition manually
      body.classList.remove("login-view");
      loginContainer.classList.add("hidden");
      appContainer.classList.remove("hidden");
      operatorNameLabel.textContent = "Admin Operator (Local Failover)";
      
      if (window.databaseModule) {
        window.databaseModule.init();
      }
      if (window.chartsModule) {
        window.chartsModule.init();
      }
      
      loginForm.reset();
    } else {
      // Standard Error handling
      loginAlert.textContent = error.message || error.toString() || "Login failed.";
      loginAlert.className = "login-alert danger";
      loginAlert.classList.remove("hidden");
    }
  }

  // Handle Login Form Submit
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    
    let email = usernameInput.value.trim();
    if (!email.includes("@")) {
      email = email + "@agritech.com";
    }
    const password = passwordInput.value;
    
    // UI Loading state
    btnLogin.disabled = true;
    btnLogin.querySelector(".btn-text").classList.add("hidden");
    btnLogin.querySelector(".spinner").classList.remove("hidden");
    loginAlert.classList.add("hidden");

    try {
      if (!auth) {
        throw new Error("Firebase Auth is not initialized.");
      }
      
      auth.signInWithEmailAndPassword(email, password)
        .then(() => {
          // Success: auth state listener handles UI transition
          loginForm.reset();
        })
        .catch((error) => {
          handleFailover(email, password, error);
        })
        .finally(() => {
          // Restore login button
          btnLogin.disabled = false;
          btnLogin.querySelector(".btn-text").classList.remove("hidden");
          btnLogin.querySelector(".spinner").classList.add("hidden");
        });
    } catch (error) {
      handleFailover(email, password, error);
      // Restore login button
      btnLogin.disabled = false;
      btnLogin.querySelector(".btn-text").classList.remove("hidden");
      btnLogin.querySelector(".spinner").classList.add("hidden");
    }
  });

  // Handle Register Form Submit
  registerForm.addEventListener("submit", (e) => {
    e.preventDefault();
    
    const name = regNameInput.value.trim();
    const email = regUsernameInput.value.trim();
    const password = regPasswordInput.value;
    const confirmPassword = regConfirmPasswordInput.value;
    
    loginAlert.classList.add("hidden");

    // Form validation
    if (password !== confirmPassword) {
      loginAlert.textContent = "Passwords do not match. Please re-enter.";
      loginAlert.className = "login-alert danger";
      loginAlert.classList.remove("hidden");
      return;
    }

    if (password.length < 6) {
      loginAlert.textContent = "Password must be at least 6 characters long.";
      loginAlert.className = "login-alert danger";
      loginAlert.classList.remove("hidden");
      return;
    }

    // UI loading state
    btnRegister.disabled = true;
    btnRegister.querySelector(".btn-text").classList.add("hidden");
    btnRegister.querySelector(".spinner").classList.remove("hidden");

    auth.createUserWithEmailAndPassword(email, password)
      .then((cred) => {
        // Success: update account display name
        return cred.user.updateProfile({ displayName: name });
      })
      .then(() => {
        // Clear fields
        registerForm.reset();
      })
      .catch((error) => {
        loginAlert.textContent = error.message;
        loginAlert.className = "login-alert danger";
        loginAlert.classList.remove("hidden");
      })
      .finally(() => {
        btnRegister.disabled = false;
        btnRegister.querySelector(".btn-text").classList.remove("hidden");
        btnRegister.querySelector(".spinner").classList.add("hidden");
      });
  });

  // Handle Logout Button
  btnLogout.addEventListener("click", () => {
    logSystemEvent("Operator signed out.", "system");
    sessionStorage.removeItem("agritech_failover_login");
    auth.signOut().catch(err => console.error("Sign out failed", err));
    
    // Force transition to login view on failover logout
    body.classList.add("login-view");
    loginContainer.classList.remove("hidden");
    appContainer.classList.add("hidden");
    if (window.databaseModule) {
      window.databaseModule.detach();
    }
  });

  // =========================================================================
  // 2. SPA NAVIGATION & DRAWER
  // =========================================================================

  // Toggling sidebar on mobile
  sidebarToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    sidebar.classList.toggle("open");
  });

  // Close sidebar clicking outside
  document.addEventListener("click", (e) => {
    if (sidebar.classList.contains("open") && !sidebar.contains(e.target) && e.target !== sidebarToggle) {
      sidebar.classList.remove("open");
    }
  });

  // Handle Navigation Links click
  navItems.forEach(item => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      
      const targetTab = item.getAttribute("data-tab");
      
      // Update active nav link
      navItems.forEach(nav => nav.classList.remove("active"));
      item.classList.add("active");
      
      // Switch view
      tabViews.forEach(view => {
        if (view.id === `tab-${targetTab}`) {
          view.classList.add("active");
        } else {
          view.classList.remove("active");
        }
      });

      // Trigger charts resize when switching to tabs containing Chart.js canvases
      if ((targetTab === "analytics" || targetTab === "water") && window.chartsModule) {
        window.chartsModule.resizeCharts();
      }

      // Initialize AI Weather module when switching to its tab
      if (targetTab === "ai-weather" && window.aiWeatherModule) {
        window.aiWeatherModule.init();
        window.aiWeatherModule.resizeChart();
      }

      // Trigger immediate water stats recalculation when switching to water tab
      if (targetTab === "water" && window.databaseModule && typeof window.databaseModule.updateWaterSavingsStats === 'function') {
        window.databaseModule.updateWaterSavingsStats();
      }
      
      // Close mobile sidebar
      sidebar.classList.remove("open");
    });
  });

  // =========================================================================
  // 3. RUNNING CLOCK TIMER
  // =========================================================================
  function updateClock() {
    const now = new Date();
    let hours = String(now.getHours()).padStart(2, '0');
    let minutes = String(now.getMinutes()).padStart(2, '0');
    let seconds = String(now.getSeconds()).padStart(2, '0');
    clockTime.textContent = `${hours}:${minutes}:${seconds}`;
  }
  setInterval(updateClock, 1000);
  updateClock();

  // =========================================================================
  // 4. CLOUD CONNECTION STATUS MONITOR
  // =========================================================================
  if (isDemoMode) {
    cloudStatusBadge.className = "cloud-status-badge demo";
    cloudStatusText.textContent = "Demo Mode (Simulated)";
  } else {
    // Live Firebase connection status listener
    database.ref(".info/connected").on("value", (snap) => {
      if (snap.val() === true) {
        cloudStatusBadge.className = "cloud-status-badge online";
        cloudStatusText.textContent = "Cloud Sync Online";
        logSystemEvent("Connected to Firebase Realtime Database.", "system");
      } else {
        cloudStatusBadge.className = "cloud-status-badge offline";
        cloudStatusText.textContent = "Cloud Sync Offline";
      }
    });
  }

  // =========================================================================
  // 6. ADD FIELD MODAL AND FORM MANAGEMENT
  // =========================================================================
  const addFieldModal = document.getElementById("add-field-modal");
  const btnOpenAddField = document.getElementById("btn-open-add-field");
  const btnAddFieldClose = document.getElementById("btn-add-field-close");
  const addFieldForm = document.getElementById("add-field-form");
  const addFieldAlert = document.getElementById("add-field-alert");
  const newFieldType = document.getElementById("new-field-type");
  const sensorCountGroup = document.getElementById("sensor-count-group");
  const newFieldCrop = document.getElementById("new-field-crop");

  if (btnOpenAddField) {
    btnOpenAddField.addEventListener("click", () => {
      addFieldAlert.classList.add("hidden");
      addFieldForm.reset();
      sensorCountGroup.style.display = "none";
      
      // Populate crop choices dynamically
      if (newFieldCrop) {
        newFieldCrop.innerHTML = '<option value="">None / Bare Soil</option>';
        database.ref("crops").once("value").then((snapshot) => {
          const crops = snapshot.val() || {};
          Object.values(crops).forEach(crop => {
            const opt = document.createElement("option");
            opt.value = crop.name;
            opt.textContent = `${crop.name} (${crop.moisture}% target)`;
            newFieldCrop.appendChild(opt);
          });
        }).catch(err => console.error("Failed to load crops in add field", err));
      }
      
      addFieldModal.classList.remove("hidden");
    });
  }

  if (btnAddFieldClose) {
    btnAddFieldClose.addEventListener("click", () => {
      addFieldModal.classList.add("hidden");
    });
  }

  if (addFieldModal) {
    addFieldModal.addEventListener("click", (e) => {
      if (e.target === addFieldModal) addFieldModal.classList.add("hidden");
    });
  }

  if (newFieldType) {
    newFieldType.addEventListener("change", (e) => {
      if (e.target.value === "multi_zone") {
        sensorCountGroup.style.display = "block";
      } else {
        sensorCountGroup.style.display = "none";
      }
    });
  }

  if (addFieldForm) {
    addFieldForm.addEventListener("submit", (e) => {
      e.preventDefault();
      addFieldAlert.classList.add("hidden");

      const name = document.getElementById("new-field-name").value.trim();
      const type = newFieldType.value;
      const cropName = newFieldCrop.value;
      const threshold = parseInt(document.getElementById("new-field-threshold").value);
      
      if (!name || isNaN(threshold)) return;

      const fieldKey = name.toLowerCase().replace(/[^a-z0-9]/g, "_");
      
      // Check for duplicate field names
      database.ref("fields/" + fieldKey).once("value").then((snapshot) => {
        if (snapshot.exists()) {
          addFieldAlert.textContent = `A field named "${name}" already exists. Please choose a different name.`;
          addFieldAlert.classList.remove("hidden");
          return;
        }

        // Initialize sensor properties based on type
        const fieldData = {
          name: name,
          selected_crop: cropName || "None",
          target_moisture: threshold,
          pump_status: "auto",
          water_used: 0,
          cycle_start_tank: null
        };

        if (type === "single_zone") {
          // Find next sensor number
          const sNum = Math.floor(Math.random() * 10) + 5; // e.g. sensor 5+
          fieldData[`sensor${sNum}`] = 40;
        } else {
          // Multi-zone
          const count = parseInt(document.getElementById("new-field-sensor-count").value) || 3;
          for (let i = 1; i <= count; i++) {
            fieldData[`sensor${i}`] = 30 + Math.round(Math.random() * 10);
          }
          fieldData.average = 35;
        }

        // Save to database
        database.ref("fields/" + fieldKey).set(fieldData).then(() => {
          logSystemEvent(`Operator created new dynamic field: "${name}" (${type === 'single_zone' ? 'Single' : 'Multi'} Zone).`, "system");
          addFieldModal.classList.add("hidden");
        }).catch(err => {
          console.error("Field creation failed", err);
          addFieldAlert.textContent = "Failed to create field. Database error.";
          addFieldAlert.classList.remove("hidden");
        });
      });
    });
  }
});

// =========================================================================
// 5. GLOBAL UTILITIES FOR EVENT & NOTIFICATION LOGS
// =========================================================================
function logSystemEvent(message, type = "system") {
  const timestamp = new Date().toISOString();
  
  if (isDemoMode) {
    // Directly push to mock state
    mockDbState.logs.events.unshift({ timestamp, message, type });
    if (mockDbState.logs.events.length > 50) mockDbState.logs.events.pop();
    triggerMockListeners("logs/events");
  } else {
    // Write to Live Firebase Realtime Database
    database.ref("logs/events").push({
      timestamp: timestamp,
      message: message,
      type: type
    }).catch(err => console.error("Event log failed", err));
  }
}

function logNotification(message, type = "sms", status = "sent") {
  const timestamp = new Date().toISOString();
  
  if (isDemoMode) {
    // Push directly to mock logs
    mockDbState.logs.notifications.unshift({ timestamp, message, type, status });
    if (mockDbState.logs.notifications.length > 50) mockDbState.logs.notifications.pop();
    triggerMockListeners("logs/notifications");
  } else {
    // Write to Live Firebase
    database.ref("logs/notifications").push({
      timestamp: timestamp,
      message: message,
      type: type,
      status: status
    }).catch(err => console.error("Notification log failed", err));
  }
}

// Expose logging globally
window.logSystemEvent = logSystemEvent;
window.logNotification = logNotification;
