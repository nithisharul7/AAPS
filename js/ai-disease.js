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

  let currentImageFile = null;
  let analysisResultText = ""; // Plain text for TTS

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

      // Simulate Network/AI processing delay (2.5 seconds)
      setTimeout(() => {
        processMockDiagnosis();
      }, 2500);
    });
  }

  function processMockDiagnosis() {
    // Restore button UI
    btnAnalyze.disabled = false;
    btnAnalyze.querySelector(".btn-text").classList.remove("hidden");
    btnAnalyze.querySelector(".spinner").classList.add("hidden");
    btnReselect.disabled = false;
    
    // Generate mock results (randomize for demo purposes)
    const diseases = [
      {
        name: "Leaf Blight (Early Stage)",
        score: Math.floor(Math.random() * 15) + 80, // 80-95%
        instructions: "1. Isolate the affected crop area if possible.<br>2. Apply a copper-based fungicide spray to prevent further spread.<br>3. Temporarily reduce irrigation to lower ambient soil moisture in the zone."
      },
      {
        name: "Powdery Mildew",
        score: Math.floor(Math.random() * 10) + 85, // 85-95%
        instructions: "1. Prune heavily affected leaves to improve air circulation.<br>2. Apply a sulfur or potassium bicarbonate fungicide.<br>3. Avoid overhead watering to keep foliage dry."
      },
      {
        name: "Healthy Plant",
        score: Math.floor(Math.random() * 5) + 94, // 94-99%
        instructions: "1. No disease detected.<br>2. Maintain current irrigation and fertilization schedules.<br>3. Continue routine monitoring."
      }
    ];
    
    const result = diseases[Math.floor(Math.random() * diseases.length)];
    
    // Construct TTS string (remove HTML tags)
    analysisResultText = `Diagnosis complete. Detected: ${result.name}. Confidence score is ${result.score} percent. Treatment Plan: ` + 
                         result.instructions.replace(/<br>/g, " ").replace(/\d\./g, "");

    // Update DOM
    stateLoading.classList.add("hidden");
    stateResult.classList.remove("hidden");
    
    diagnosisName.textContent = result.name;
    
    // Color coding based on result
    const badge = document.getElementById("diagnosis-name-badge");
    if (result.name === "Healthy Plant") {
      badge.style.background = "rgba(34, 197, 94, 0.15)";
      badge.style.borderColor = "var(--green-accent)";
    } else {
      badge.style.background = "rgba(239, 68, 68, 0.15)";
      badge.style.borderColor = "var(--red-accent)";
    }
    
    // Animate bar
    confidenceBar.style.width = "0%";
    setTimeout(() => {
      confidenceBar.style.width = `${result.score}%`;
      confidenceText.textContent = `${result.score}%`;
    }, 100);
    
    instructionsContainer.innerHTML = result.instructions;
    
    // Show Listen Button
    btnListen.classList.remove("hidden");
    
    // Optional: Log it
    if (window.logSystemEvent) {
      window.logSystemEvent(`AI Disease Analysis run: Detected ${result.name} (${result.score}%)`, "system");
    }
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
