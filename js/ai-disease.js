/**
 * Autonomous Agritech - Crop Disease AI Module
 * Handles image upload (camera/file), mock AI analysis, and Voice synthesis.
 */

document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const uploadArea = document.getElementById("disease-upload-area");
  const imageInput = document.getElementById("disease-image-input");
  const uploadPlaceholder = document.getElementById("disease-upload-placeholder");
  const imagePreview = document.getElementById("disease-image-preview");
  const btnReselect = document.getElementById("btn-reselect-image");
  const btnAnalyze = document.getElementById("btn-analyze-disease");
  
  // State Views
  const stateInitial = document.getElementById("disease-initial-state");
  const stateLoading = document.getElementById("disease-loading-state");
  const stateResult = document.getElementById("disease-result-state");
  
  // Result Elements
  const diagnosisName = document.getElementById("diagnosis-name");
  const confidenceBar = document.getElementById("diagnosis-confidence-bar");
  const confidenceText = document.getElementById("diagnosis-confidence-text");
  const instructionsContainer = document.getElementById("diagnosis-instructions");
  const btnListen = document.getElementById("btn-listen-instructions");
  
  // Supported Crops Grid
  const supportedCropsGrid = document.getElementById("disease-supported-crops");

  let currentImageFile = null;
  let analysisResultText = ""; // Plain text for TTS

  // --- Render Supported Crops ---
  function renderSupportedCrops() {
    if (!supportedCropsGrid) return;
    
    const crops = [
      { name: "Tomato", icon: "fa-solid fa-apple-whole", desc: "Mosaic Virus & Healthy" },
      { name: "Strawberry", icon: "fa-solid fa-seedling", desc: "Leaf Scorch & Healthy" },
      { name: "Squash", icon: "fa-solid fa-leaf", desc: "Powdery Mildew & Healthy" },
      { name: "Soybean", icon: "fa-solid fa-seedling", desc: "Healthy Status" }
    ];

    crops.forEach(crop => {
      const card = document.createElement("div");
      card.className = "crop-card";
      card.style.cursor = "default"; // Override pointer since it's just for display
      card.innerHTML = `
        <div class="crop-visual-box"><i class="${crop.icon}"></i></div>
        <h3>${crop.name}</h3>
        <div class="crop-moisture-val" style="font-size: 0.85rem; margin-top: 5px; color: var(--text-main);">${crop.desc}</div>
        <div class="crop-moisture-label" style="margin-top: 5px;">Supported States</div>
      `;
      supportedCropsGrid.appendChild(card);
    });
  }

  renderSupportedCrops();

  // --- Teachable Machine Initialization ---
  const URL = "assets/tm-my-image-model/";
  let model, maxPredictions;

  async function initModel() {
      const modelURL = URL + "model.json";
      const metadataURL = URL + "metadata.json";
      try {
          model = await tmImage.load(modelURL, metadataURL);
          maxPredictions = model.getTotalClasses();
          console.log("Teachable Machine Model loaded successfully");
      } catch (e) {
          console.error("Error loading TM model:", e);
      }
  }

  initModel();

  // --- 1. Image Upload & Preview ---
  
  // Trigger file input when clicking the upload area
  if(uploadArea) {
    uploadArea.addEventListener("click", () => {
      if (!currentImageFile) {
        imageInput.click();
      }
    });

    // Drag and Drop support
    uploadArea.addEventListener("dragover", (e) => {
      e.preventDefault();
      uploadArea.style.borderColor = "var(--primary)";
      uploadArea.style.background = "rgba(0, 210, 255, 0.05)";
    });

    uploadArea.addEventListener("dragleave", (e) => {
      e.preventDefault();
      uploadArea.style.borderColor = "var(--glass-border)";
      uploadArea.style.background = "rgba(0, 0, 0, 0.2)";
    });

    uploadArea.addEventListener("drop", (e) => {
      e.preventDefault();
      uploadArea.style.borderColor = "var(--glass-border)";
      uploadArea.style.background = "rgba(0, 0, 0, 0.2)";
      
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        if (file.type.startsWith("image/")) {
          imageInput.files = e.dataTransfer.files; // Sync with input
          handleImageFile(file);
        }
      }
    });
  }

  // Handle Reselect
  if(btnReselect) {
    btnReselect.addEventListener("click", () => {
      imageInput.click();
    });
  }

  // Handle file selection
  if(imageInput) {
    imageInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file && file.type.startsWith("image/")) {
        handleImageFile(file);
      }
    });
  }

  function handleImageFile(file) {
    currentImageFile = file;
    const reader = new FileReader();
    
    reader.onload = (e) => {
      imagePreview.src = e.target.result;
      imagePreview.classList.remove("hidden");
      uploadPlaceholder.classList.add("hidden");
      
      // Update UI state
      btnReselect.classList.remove("hidden");
      btnAnalyze.disabled = false;
      
      // Reset result views if we were showing one
      resetResultView();
    };
    
    reader.readAsDataURL(file);
  }

  function resetResultView() {
    stateInitial.classList.remove("hidden");
    stateLoading.classList.add("hidden");
    stateResult.classList.add("hidden");
    btnListen.classList.add("hidden");
    
    // Stop any ongoing speech
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  // --- 2. AI Analysis (Mock) ---
  
  if(btnAnalyze) {
    btnAnalyze.addEventListener("click", () => {
      if (!currentImageFile) return;
      
      // Update button UI
      btnAnalyze.disabled = true;
      btnAnalyze.querySelector(".btn-text").classList.add("hidden");
      btnAnalyze.querySelector(".spinner").classList.remove("hidden");
      btnReselect.disabled = true;
      
      // Update State Views
      stateInitial.classList.add("hidden");
      stateResult.classList.add("hidden");
      stateLoading.classList.remove("hidden");
      btnListen.classList.add("hidden");
      
      // Stop speech if playing
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }

      // Call the real diagnosis function
      setTimeout(() => {
        processRealDiagnosis();
      }, 500); // small delay for UI to show loading
    });
  }

  async function processRealDiagnosis() {
    if (!model) {
      alert("Model not loaded yet or missing weights.bin. Please wait or check the model files.");
      resetResultView();
      // Restore button UI
      btnAnalyze.disabled = false;
      btnAnalyze.querySelector(".btn-text").classList.remove("hidden");
      btnAnalyze.querySelector(".spinner").classList.add("hidden");
      btnReselect.disabled = false;
      return;
    }

    try {
      const prediction = await model.predict(imagePreview);
      
      let highestProb = 0;
      let bestClass = "";
      
      for (let i = 0; i < maxPredictions; i++) {
          if (prediction[i].probability > highestProb) {
              highestProb = prediction[i].probability;
              bestClass = prediction[i].className;
          }
      }

      let resultName, score, instructions;
      
      if (highestProb < 0.60) {
          resultName = "Invalid Photo / Unknown";
          score = Math.round(highestProb * 100);
          instructions = "The uploaded photo does not appear to match any known crop or leaf patterns. Please ensure you upload a clear photo of the affected plant leaf.";
      } else {
          resultName = bestClass.replace(/___/g, " - ").replace(/_/g, " ");
          score = Math.round(highestProb * 100);
          
          if (bestClass.includes("healthy")) {
              instructions = "1. No disease detected.<br>2. Maintain current irrigation and fertilization schedules.<br>3. Continue routine monitoring.";
          } else if (bestClass.includes("Tomato_mosaic_virus")) {
              instructions = "1. Isolate the affected crop area if possible.<br>2. Remove and destroy infected plants immediately.<br>3. Disinfect tools and wash hands after handling infected plants to prevent spread.";
          } else if (bestClass.includes("Leaf_scorch")) {
              instructions = "1. Ensure adequate watering but avoid waterlogging.<br>2. Check for salt buildup in the soil.<br>3. Apply mulch to retain soil moisture and regulate temperature.";
          } else if (bestClass.includes("Powdery_mildew")) {
              instructions = "1. Prune heavily affected leaves to improve air circulation.<br>2. Apply a sulfur or potassium bicarbonate fungicide.<br>3. Avoid overhead watering to keep foliage dry.";
          } else {
              instructions = "1. Monitor the plant closely.<br>2. Consult a local agricultural extension if symptoms worsen.";
          }
      }

      // Construct TTS string (remove HTML tags)
      analysisResultText = `Diagnosis complete. Detected: ${resultName}. Confidence score is ${score} percent. Treatment Plan: ` + 
                           instructions.replace(/<br>/g, " ").replace(/\d\./g, "");

      // Update DOM
      stateLoading.classList.add("hidden");
      stateResult.classList.remove("hidden");
      
      diagnosisName.textContent = resultName;
      
      // Color coding based on result
      const badge = document.getElementById("diagnosis-name-badge");
      if (resultName.toLowerCase().includes("healthy")) {
        badge.style.background = "rgba(34, 197, 94, 0.15)";
        badge.style.borderColor = "var(--green-accent)";
      } else if (resultName === "Invalid Photo / Unknown") {
        badge.style.background = "rgba(255, 152, 0, 0.15)";
        badge.style.borderColor = "#ff9800"; // Orange
      } else {
        badge.style.background = "rgba(239, 68, 68, 0.15)";
        badge.style.borderColor = "var(--red-accent)";
      }
      
      // Animate bar
      confidenceBar.style.width = "0%";
      setTimeout(() => {
        confidenceBar.style.width = `${score}%`;
        confidenceText.textContent = `${score}%`;
      }, 100);
      
      instructionsContainer.innerHTML = instructions;
      
      // Show Listen Button
      btnListen.classList.remove("hidden");
      
      // Optional: Log it
      if (window.logSystemEvent) {
        window.logSystemEvent(`AI Disease Analysis run: Detected ${resultName} (${score}%)`, "system");
      }

    } catch (e) {
      console.error("Prediction error", e);
      alert("Error analyzing image.");
      resetResultView();
    }

    // Restore button UI
    btnAnalyze.disabled = false;
    btnAnalyze.querySelector(".btn-text").classList.remove("hidden");
    btnAnalyze.querySelector(".spinner").classList.add("hidden");
    btnReselect.disabled = false;
  }

  // --- 3. Text-to-Speech Voice Instructions ---
  
  if(btnListen) {
    btnListen.addEventListener("click", () => {
      if (!('speechSynthesis' in window)) {
        alert("Text-to-Speech is not supported in this browser.");
        return;
      }
      
      const synth = window.speechSynthesis;
      
      if (synth.speaking) {
        // Toggle off if already speaking
        synth.cancel();
        btnListen.innerHTML = '<i class="fa-solid fa-volume-high"></i> Listen';
        return;
      }
      
      if (analysisResultText !== "") {
        const utterance = new SpeechSynthesisUtterance(analysisResultText);
        utterance.rate = 0.95; // Slightly slower for clarity
        utterance.pitch = 1.0;
        
        // Attempt to find a good English voice
        const voices = synth.getVoices();
        const preferredVoice = voices.find(v => v.lang.startsWith("en") && (v.name.includes("Female") || v.name.includes("Google")));
        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }
        
        // Update UI while playing
        btnListen.innerHTML = '<i class="fa-solid fa-stop"></i> Stop Audio';
        btnListen.style.color = "var(--primary)";
        btnListen.style.borderColor = "var(--primary)";
        
        utterance.onend = () => {
          btnListen.innerHTML = '<i class="fa-solid fa-volume-high"></i> Listen';
          btnListen.style.color = "var(--text-main)";
          btnListen.style.borderColor = "var(--glass-border)";
        };
        
        utterance.onerror = () => {
          btnListen.innerHTML = '<i class="fa-solid fa-volume-high"></i> Listen';
          btnListen.style.color = "var(--text-main)";
          btnListen.style.borderColor = "var(--glass-border)";
        };
        
        synth.speak(utterance);
      }
    });
  }
  
  // Handle voice loading for some browsers
  if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = () => {
       // Forces voices to load
       window.speechSynthesis.getVoices();
    };
  }

});
