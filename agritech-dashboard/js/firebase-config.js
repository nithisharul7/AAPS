/**
 * Autonomous Agritech and Perimeter Security System
 * Firebase SDK configuration & Mock fallback database adapter.
 * 
 * To connect to your live Firebase database, replace the config below
 * and set USE_LIVE_FIREBASE to true.
 */

const USE_LIVE_FIREBASE = true; // Set to true once you fill in your real config below

const firebaseConfig = {
  apiKey: "AIzaSyARt072_IaAMorTfeIdWY1baevbdP9yXs0",
  authDomain: "aaps-e60e6.firebaseapp.com",
  databaseURL: "https://aaps-e60e6-default-rtdb.firebaseio.com",
  projectId: "aaps-e60e6",
  storageBucket: "aaps-e60e6.firebasestorage.app",
  messagingSenderId: "669573082683",
  appId: "1:669573082683:web:37d06474aa79337239761e",
  measurementId: "G-4BFMW87DZS"
};

// Global Firebase Adapter
let dbAdapter = null;
let authAdapter = null;
let isDemoMode = false;

// Check if we should use Mock or Live
const canUseLive = USE_LIVE_FIREBASE && firebaseConfig.apiKey !== "YOUR_API_KEY_HERE";

if (canUseLive) {
  try {
    // Initialize Live Firebase
    firebase.initializeApp(firebaseConfig);
    dbAdapter = firebase.database();
    authAdapter = firebase.auth();
    isDemoMode = false;
    console.log("Firebase connection initialized successfully.");
  } catch (error) {
    console.error("Firebase initialization failed, falling back to Demo Mode.", error);
    isDemoMode = true;
  }
} else {
  isDemoMode = true;
  console.log("Running in DEMO MODE. Live Firebase configuration was not found or is disabled.");
}

// =========================================================================
// MOCK DATABASE & AUTH SIMULATOR (Unified Interface)
// =========================================================================

// Initial simulated state
const mockDbState = {
  system: {
    connection_status: "online",
    weather: "not_raining", // "raining" | "not_raining"
    temp: 26.8,
    humidity: 58.4,
    tank_level: 68,
    ldr_level: 80,
    pir_detected: false,
    water_savings: {
      cycle_count: 2,
      traditional_cycle_val: 15,
      irrigation_history: {
        evt_1: {
          timestamp: new Date(Date.now() - 1800000).toISOString(),
          field: "Field 1",
          mode: "Auto Mode",
          before: 82,
          after: 75,
          waterUsed: 7
        },
        evt_2: {
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          field: "Field 2",
          mode: "Force On",
          before: 95,
          after: 89,
          waterUsed: 6
        }
      }
    }
  },
  fields: {
    field1: {
      sensor1: 34,
      sensor2: 37,
      sensor3: 35,
      average: 35.3,
      selected_crop: "Tomato",
      target_moisture: 40,
      pump_status: "auto", // "force_on" | "force_off" | "auto"
      water_used: 12,
      cycle_start_tank: null
    },
    field2: {
      sensor4: 42,
      selected_crop: "Corn",
      target_moisture: 45,
      pump_status: "auto", // "force_on" | "force_off" | "auto"
      water_used: 9,
      cycle_start_tank: null
    }
  },
  crops: {
    cactus: { name: "Cactus", moisture: 10, icon: "fa-solid fa-sun" },
    aloe_vera: { name: "Aloe Vera", moisture: 15, icon: "fa-solid fa-leaf" },
    rosemary: { name: "Rosemary", moisture: 20, icon: "fa-solid fa-leaf" },
    lavender: { name: "Lavender", moisture: 20, icon: "fa-solid fa-clover" },
    snake_plant: { name: "Snake Plant", moisture: 25, icon: "fa-solid fa-tree" },
    thyme: { name: "Thyme", moisture: 30, icon: "fa-solid fa-seedling" },
    carrots: { name: "Carrots", moisture: 35, icon: "fa-solid fa-carrot" },
    tomato: { name: "Tomato", moisture: 40, icon: "fa-solid fa-apple-whole" },
    pepper: { name: "Pepper", moisture: 40, icon: "fa-solid fa-pepper-hot" },
    corn: { name: "Corn", moisture: 45, icon: "fa-solid fa-wheat-awn" },
    cucumber: { name: "Cucumber", moisture: 50, icon: "fa-solid fa-lemon" },
    basil: { name: "Basil", moisture: 50, icon: "fa-solid fa-seedling" },
    lettuce: { name: "Lettuce", moisture: 60, icon: "fa-solid fa-leaf" },
    mint: { name: "Mint", moisture: 70, icon: "fa-solid fa-leaf" },
    watermelon: { name: "Watermelon", moisture: 80, icon: "fa-solid fa-lemon" }
  },
  logs: {
    events: [
      { timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), message: "System initialized in Demo Mode.", type: "system" },
      { timestamp: new Date(Date.now() - 3600000).toISOString(), message: "Mock PIR sensor calibrated.", type: "security" }
    ],
    notifications: [
      { timestamp: new Date(Date.now() - 3600000 * 1.5).toISOString(), message: "Daily summary email dispatched.", type: "email", status: "delivered" }
    ]
  }
};

// Listeners Registry for Mock Database
const mockListeners = {};

// Trigger a mock listener callback
function triggerMockListeners(path) {
  Object.keys(mockListeners).forEach(key => {
    if (key === path || path.startsWith(key + "/") || key.startsWith(path + "/")) {
      const callback = mockListeners[key];
      const data = getMockVal(key);
      callback({
        val: () => data,
        exists: () => data !== undefined
      });
    }
  });
}

// Get value from nested object by path (e.g. "system/pump_status")
function getMockVal(path) {
  const parts = path.split('/').filter(p => p !== '');
  let current = mockDbState;
  for (let part of parts) {
    if (current && current[part] !== undefined) {
      current = current[part];
    } else {
      return undefined;
    }
  }
  // Return deep clone to prevent direct manipulation
  return JSON.parse(JSON.stringify(current));
}

// Set value in nested object by path
function setMockVal(path, val) {
  const parts = path.split('/').filter(p => p !== '');
  let current = mockDbState;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!current[part]) current[part] = {};
    current = current[part];
  }
  const lastPart = parts[parts.length - 1];
  if (val === null || val === undefined) {
    delete current[lastPart];
  } else {
    current[lastPart] = val;
  }
  triggerMockListeners(path);
}

// Simulate physical system changes in background
let lastPumpsState = {};
if (isDemoMode) {
  setInterval(() => {
    // 1. Simulate minor temperature and humidity fluctuations
    let tempDelta = (Math.random() - 0.5) * 0.4;
    let humDelta = (Math.random() - 0.5) * 0.8;
    mockDbState.system.temp = Math.max(15, Math.min(45, parseFloat((mockDbState.system.temp + tempDelta).toFixed(1))));
    mockDbState.system.humidity = Math.max(20, Math.min(95, parseFloat((mockDbState.system.humidity + humDelta).toFixed(1))));

    // LDR Sensor (Day/Night cycle simulation)
    const oldLdr = mockDbState.system.ldr_level || 80;
    const oldIsNight = oldLdr < 30;

    const ldrCycle = Math.sin(Date.now() / 25000); // oscillates day/night every 50 seconds
    const targetLdr = ldrCycle > -0.25 ? 82 : 12; // Day is 62.5% of cycle, Night is 37.5%
    const newLdr = Math.max(0, Math.min(100, Math.round(targetLdr + (Math.random() - 0.5) * 6)));
    const newIsNight = newLdr < 30;

    mockDbState.system.ldr_level = newLdr;

    if (oldIsNight !== newIsNight) {
      const modeName = newIsNight ? "NIGHT" : "DAY";
      mockDbState.logs.events.unshift({
        timestamp: new Date().toISOString(),
        message: `LDR Sensor: Ambient light level transitioned to ${modeName} mode.`,
        type: "system"
      });
      triggerMockListeners("logs/events");
    }

    // 2. Simulate Water Tank fluctuations and Field moisture dynamics
    let anyPumpActive = false;
    const activePumps = {}; // key: activeState
    
    // Determine active status for each field pump
    Object.keys(mockDbState.fields).forEach(key => {
      const field = mockDbState.fields[key];
      
      // Determine if pump is running
      let isPumpRunning = false;
      if (field.pump_status === 'force_on') {
        isPumpRunning = true;
      } else if (field.pump_status === 'auto') {
        const currentMoisture = field.average !== undefined ? field.average : (field.sensor1 !== undefined ? field.sensor1 : (field.sensor4 !== undefined ? field.sensor4 : 0));
        isPumpRunning = currentMoisture < (field.target_moisture || 40);
      }
      
      activePumps[key] = isPumpRunning;
      if (isPumpRunning) {
        anyPumpActive = true;
      }
    });

    if (anyPumpActive) {
      mockDbState.system.tank_level = Math.max(5, mockDbState.system.tank_level - 1);
      
      // Accumulate water_used for active pumps
      Object.keys(mockDbState.fields).forEach(key => {
        if (activePumps[key]) {
          mockDbState.fields[key].water_used = (mockDbState.fields[key].water_used || 0) + 1;
          triggerMockListeners(`fields/${key}`);
        }
      });
      triggerMockListeners("system");
    } else {
      // Tank refills slowly (e.g. well replenishment)
      mockDbState.system.tank_level = Math.min(100, mockDbState.system.tank_level + (mockDbState.system.weather === 'raining' ? 2 : 0.2));
    }
    mockDbState.system.tank_level = Math.round(mockDbState.system.tank_level);

    // Track transitions per field
    Object.keys(mockDbState.fields).forEach(key => {
      const field = mockDbState.fields[key];
      const pumpActive = activePumps[key];
      const lastPumpActive = lastPumpsState[key] || false;
      
      // On start transition (inactive -> active)
      if (!lastPumpActive && pumpActive) {
        field.cycle_start_tank = mockDbState.system.tank_level;
        triggerMockListeners(`fields/${key}`);
      }
      
      // On stop transition (active -> inactive)
      if (lastPumpActive && !pumpActive) {
        const startTank = field.cycle_start_tank || Math.min(100, mockDbState.system.tank_level + 7);
        const endTank = mockDbState.system.tank_level;
        const modeName = field.pump_status === 'force_on' ? 'Force On' : 'Auto Mode';
        const eventKey = "evt_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
        
        if (!mockDbState.system.water_savings.irrigation_history) {
          mockDbState.system.water_savings.irrigation_history = {};
        }
        mockDbState.system.water_savings.irrigation_history[eventKey] = {
          timestamp: new Date().toISOString(),
          field: field.name || (key.charAt(0).toUpperCase() + key.slice(1)),
          mode: modeName,
          before: startTank,
          after: endTank,
          waterUsed: Math.max(0, startTank - endTank)
        };
        
        field.cycle_start_tank = null;
        mockDbState.system.water_savings.cycle_count = (mockDbState.system.water_savings.cycle_count || 0) + 1;
        
        mockDbState.logs.events.unshift({
          timestamp: new Date().toISOString(),
          message: `Water Management: ${field.name || key} complete irrigation cycle logged (Before: ${startTank}%, After: ${endTank}%).`,
          type: "system"
        });
        triggerMockListeners("logs/events");
        triggerMockListeners(`fields/${key}`);
        triggerMockListeners("system");
      }
      
      lastPumpsState[key] = pumpActive;
    });

    // 3. Weather simulation (10% chance to toggle raining state if dry, or not raining)
    if (Math.random() < 0.02) {
      const isRainingNow = mockDbState.system.weather === 'raining';
      mockDbState.system.weather = isRainingNow ? 'not_raining' : 'raining';
      
      const rainMsg = isRainingNow ? "Rainfall stopped." : "Rainfall detected by sensor!";
      mockDbState.logs.events.unshift({
        timestamp: new Date().toISOString(),
        message: rainMsg,
        type: "weather"
      });
      // Cap logs at 50 entries
      if (mockDbState.logs.events.length > 50) mockDbState.logs.events.pop();
      triggerMockListeners("logs/events");
    }

    // 4. Soil moisture dynamics per field
    Object.keys(mockDbState.fields).forEach(key => {
      const field = mockDbState.fields[key];
      const pumpActive = activePumps[key];
      
      // Base drying rate
      let drySpeed = mockDbState.system.weather === 'raining' ? -0.4 : 0.1;
      if (pumpActive) {
        drySpeed -= 1.6;
      }
      
      // Find all keys in field starting with "sensor"
      let sensorKeys = Object.keys(field).filter(k => k.startsWith("sensor"));
      if (sensorKeys.length === 0) {
        sensorKeys = ["sensor1"];
        field.sensor1 = 40;
      }
      
      sensorKeys.forEach(sKey => {
        const val = field[sKey] || 40;
        field[sKey] = Math.max(5, Math.min(99, Math.round(val - drySpeed + (Math.random() - 0.5))));
      });
      
      // Compute average
      if (field.average !== undefined || sensorKeys.length > 1) {
        const sum = sensorKeys.reduce((acc, sk) => acc + field[sk], 0);
        field.average = parseFloat((sum / sensorKeys.length).toFixed(1));
      }
      
      triggerMockListeners(`fields/${key}`);
    });

    // 5. PIR Security Alert Simulation
    // 5% chance of intrusion trigger in demo mode, if not already active
    if (!mockDbState.system.pir_detected && Math.random() < 0.03) {
      mockDbState.system.pir_detected = true;
      mockDbState.logs.events.unshift({
        timestamp: new Date().toISOString(),
        message: "ALERT: Intrusion detected in Zone 3 (Perimeter Shield Triggered!)",
        type: "security"
      });
      mockDbState.logs.notifications.unshift({
        timestamp: new Date().toISOString(),
        message: "SMS and Email dispatched: Perimeter Intrusion Warning!",
        type: "all",
        status: "sent"
      });
      if (mockDbState.logs.events.length > 50) mockDbState.logs.events.pop();
      if (mockDbState.logs.notifications.length > 50) mockDbState.logs.notifications.pop();
      
      triggerMockListeners("logs/events");
      triggerMockListeners("logs/notifications");
    }

    // Trigger listeners for all system metrics
    triggerMockListeners("system");
    triggerMockListeners("fields/field1");
    triggerMockListeners("fields/field2");
  }, 3000);
}

// Create Mock Reference Adapter
class MockRef {
  constructor(path) {
    this.path = path || "";
  }
  child(childPath) {
    return new MockRef(this.path ? `${this.path}/${childPath}` : childPath);
  }
  on(eventType, callback) {
    if (eventType === 'value') {
      mockListeners[this.path] = callback;
      // Immediately invoke with current value
      const val = getMockVal(this.path);
      callback({
        val: () => val,
        exists: () => val !== undefined
      });
    }
  }
  once(eventType, callback) {
    if (eventType === 'value') {
      const val = getMockVal(this.path);
      const snap = {
        val: () => val,
        exists: () => val !== undefined
      };
      if (callback) callback(snap);
      return Promise.resolve(snap);
    }
    return Promise.resolve();
  }
  off(eventType) {
    if (eventType === 'value') {
      delete mockListeners[this.path];
    }
  }
  set(val, callback) {
    setMockVal(this.path, val);
    if (callback) callback(null);
    return Promise.resolve();
  }
  update(values, callback) {
    Object.keys(values).forEach(key => {
      setMockVal(this.path ? `${this.path}/${key}` : key, values[key]);
    });
    if (callback) callback(null);
    return Promise.resolve();
  }
  push(val, callback) {
    const parentVal = getMockVal(this.path) || [];
    const newId = "id_" + Math.random().toString(36).substr(2, 9);
    if (Array.isArray(parentVal)) {
      parentVal.push(val);
      setMockVal(this.path, parentVal);
    } else {
      setMockVal(`${this.path}/${newId}`, val);
    }
    if (callback) callback(null);
    return Promise.resolve({ key: newId });
  }
}

// Mock Database wrapper
const mockDatabase = {
  ref: (path) => new MockRef(path)
};

// Mock Auth wrapper
const mockAuth = {
  currentUser: null,
  authStateListener: null,
  onAuthStateChanged: function(callback) {
    this.authStateListener = callback;
    callback(this.currentUser);
  },
  signInWithEmailAndPassword: function(email, password) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const emailLower = email.toLowerCase();
        
        // 1. Check default admin credentials
        if (emailLower === "admin@agritech.com" && password === "admin123") {
          const user = { email: email, uid: "admin_uid_100", displayName: "BIT Operator" };
          this.currentUser = user;
          if (this.authStateListener) this.authStateListener(user);
          
          mockDbState.logs.events.unshift({
            timestamp: new Date().toISOString(),
            message: `Operator admin@agritech.com logged in.`,
            type: "system"
          });
          triggerMockListeners("logs/events");
          
          resolve({ user });
          return;
        }

        // 2. Check localStorage users
        let users = JSON.parse(localStorage.getItem("agritech_mock_users") || "[]");
        const matched = users.find(u => u.email.toLowerCase() === emailLower && u.password === password);

        if (matched) {
          const userInstance = {
            email: matched.email,
            uid: matched.uid,
            displayName: matched.displayName || matched.email.split('@')[0],
            updateProfile: function(profile) {
              if (profile.displayName) {
                this.displayName = profile.displayName;
                let currentUsers = JSON.parse(localStorage.getItem("agritech_mock_users") || "[]");
                const idx = currentUsers.findIndex(u => u.uid === this.uid);
                if (idx !== -1) {
                  currentUsers[idx].displayName = profile.displayName;
                  localStorage.setItem("agritech_mock_users", JSON.stringify(currentUsers));
                }
                if (mockAuth.authStateListener) mockAuth.authStateListener(this);
              }
              return Promise.resolve();
            }
          };

          this.currentUser = userInstance;
          if (this.authStateListener) this.authStateListener(userInstance);

          mockDbState.logs.events.unshift({
            timestamp: new Date().toISOString(),
            message: `Operator ${matched.email} logged in.`,
            type: "system"
          });
          triggerMockListeners("logs/events");

          resolve({ user: userInstance });
        } else {
          reject(new Error("Incorrect username (email) or password. Please try again."));
        }
      }, 800);
    });
  },
  createUserWithEmailAndPassword: function(email, password) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        let users = JSON.parse(localStorage.getItem("agritech_mock_users") || "[]");
        const emailLower = email.toLowerCase();
        const exists = emailLower === "admin@agritech.com" || users.some(u => u.email.toLowerCase() === emailLower);

        if (exists) {
          reject(new Error("The email address is already in use by another account."));
          return;
        }

        const newUser = {
          email: email,
          displayName: email.split('@')[0], // default
          uid: "uid_" + Math.random().toString(36).substr(2, 9),
          password: password
        };

        users.push(newUser);
        localStorage.setItem("agritech_mock_users", JSON.stringify(users));

        const userInstance = {
          email: newUser.email,
          uid: newUser.uid,
          displayName: newUser.displayName,
          updateProfile: function(profile) {
            if (profile.displayName) {
              this.displayName = profile.displayName;
              let currentUsers = JSON.parse(localStorage.getItem("agritech_mock_users") || "[]");
              const idx = currentUsers.findIndex(u => u.uid === this.uid);
              if (idx !== -1) {
                currentUsers[idx].displayName = profile.displayName;
                localStorage.setItem("agritech_mock_users", JSON.stringify(currentUsers));
              }
              if (mockAuth.authStateListener) mockAuth.authStateListener(this);
            }
            return Promise.resolve();
          }
        };

        mockAuth.currentUser = userInstance;
        if (mockAuth.authStateListener) mockAuth.authStateListener(userInstance);

        mockDbState.logs.events.unshift({
          timestamp: new Date().toISOString(),
          message: `New Operator registered account: ${email}`,
          type: "system"
        });
        triggerMockListeners("logs/events");

        resolve({ user: userInstance });
      }, 800);
    });
  },
  signOut: function() {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.currentUser = null;
        if (this.authStateListener) this.authStateListener(null);
        resolve();
      }, 500);
    });
  }
};

// Assign final database & auth adapters
const database = isDemoMode ? mockDatabase : dbAdapter;
const auth = isDemoMode ? mockAuth : authAdapter;

// Utility to switch PIR motion state manually in Mock mode
function simulatePIRTrigger() {
  if (isDemoMode) {
    mockDbState.system.pir_detected = true;
    mockDbState.logs.events.unshift({
      timestamp: new Date().toISOString(),
      message: "MANUAL SIMULATION: Perimeter Security breach!",
      type: "security"
    });
    mockDbState.logs.notifications.unshift({
      timestamp: new Date().toISOString(),
      message: "SMS and Email warning pushed.",
      type: "all",
      status: "sent"
    });
    triggerMockListeners("system");
    triggerMockListeners("logs/events");
    triggerMockListeners("logs/notifications");
  }
}

function clearPIRAlert() {
  setMockVal("system/pir_detected", false);
  mockDbState.logs.events.unshift({
    timestamp: new Date().toISOString(),
    message: "Security status cleared/alarm acknowledged by Operator.",
    type: "security"
  });
  triggerMockListeners("logs/events");
}
