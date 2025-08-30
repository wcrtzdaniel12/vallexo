// UI Management Module
// Handles UI interactions, form handling, modal management, and user interface

// UI state variables
let isModalOpen = false;
let isLoading = false;

// Initialize UI system
function initializeUI() {
  log('🎨 Initializing UI system...');
  
  // Set up form validation
  setupFormValidation();
  
  // Set up modal functionality
  setupModal();
  
  // Set up loading overlay
  setupLoadingOverlay();
  
  // Set up outro screen
  setupOutroScreen();
  
  // Set up audio toggle button
  setupAudioToggle();
  
  log('✅ UI system initialized');
}

// Form validation setup
function setupFormValidation() {
  const form = document.getElementById('memory-form');
  if (!form) return;
  
  // Clear previous error messages
  clearFormErrors();
  
  // Add form submission handler
  form.addEventListener('submit', handleFormSubmission);
  
  // Add real-time validation
  const nameInput = document.getElementById('fullname');
  const birthYearInput = document.getElementById('birthYear');
  
  if (nameInput) {
    nameInput.addEventListener('input', () => validateName(nameInput.value));
  }
  
  if (birthYearInput) {
    birthYearInput.addEventListener('input', () => validateBirthYear(birthYearInput.value));
  }
}

// Handle form submission
async function handleFormSubmission(e) {
  e.preventDefault();
  
  log('📝 Form submitted - starting validation...');
  
  // Play sound effect for engagement
  try {
    playGenerateMemorySound();
  } catch (soundError) {
    warn('🔇 Sound effect failed:', soundError);
  }
  
  // Get form data
  const fullname = document.getElementById('fullname').value.trim();
  const birthYear = parseInt(document.getElementById('birthYear').value, 10);
  
  log('📝 Form data:', { fullname, birthYear });
  
  let hasErrors = false;
  
  // Validate name
  if (!fullname || fullname.length < 2) {
    document.getElementById('name-error').classList.add('show');
    hasErrors = true;
    log('❌ Name validation failed');
  }
  if (!birthYear) {
    document.getElementById('birthYear-error').classList.add('show');
    hasErrors = true;
    log('❌ Birth year validation failed');
  } else if (birthYear < 1950 || birthYear > 2010) {
    document.getElementById('birthYear-error').textContent = 'Please enter a birth year between 1950-2010';
    document.getElementById('birthYear-error').classList.add('show');
    hasErrors = true;
    log('❌ Birth year range validation failed');
  }
  
  if (!hasErrors) {
    log('✅ Form validation passed, proceeding with memory generation...');
    
    try {
      // Close modal
      try {
        closeModal();
        log('✅ Modal closed');
      } catch (modalError) {
        warn('⚠️ Modal close failed:', modalError);
      }
      
      // Show loading overlay
      try {
        showLoadingOverlay();
        log('✅ Loading overlay shown');
      } catch (overlayError) {
        warn('⚠️ Loading overlay failed:', overlayError);
      }
      
      // Store user's name for filename generation later
      window.VallexoApp.currentUserName = fullname;
      
      log('🚀 Starting memory generation for:', fullname, birthYear);
      
      // Generate memory
      const memory = await window.MemoryManager.generateMemory(fullname, birthYear);
      
      log('✅ Memory generation completed successfully');
      
      // Start voice + UI
      log('🎬 Starting memory section display...');
      await window.MemoryManager.showMemorySection(memory);
      log('✅ Memory section displayed successfully');
      
      hideLoadingOverlay();
      
    } catch (error) {
      log('💥 Memory generation failed:', error);
      log('💥 Error stack:', error.stack);
      
      hideLoadingOverlay();
      
      // Show error message to user
      let errorMessage = 'Memory generation failed. Please try again.';
      if (error.message.includes('API key')) {
        errorMessage = 'Service temporarily unavailable. Please try again later.';
      } else if (error.message.includes('network')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      log('💥 Showing error alert:', errorMessage);
      alert(errorMessage);
    }
  } else {
    log('❌ Form validation failed, not proceeding');
  }
}

// Validate name input
function validateName(name) {
  const errorElement = document.getElementById('name-error');
  if (!errorElement) return;
  
  if (!name || name.length < 2) {
    errorElement.textContent = 'Please enter your full name (at least 2 characters)';
    errorElement.classList.add('show');
  } else {
    errorElement.classList.remove('show');
  }
}

// Validate birth year input
function validateBirthYear(year) {
  const errorElement = document.getElementById('birthYear-error');
  if (!errorElement) return;
  
  if (!year) {
    errorElement.textContent = 'Please enter your birth year';
    errorElement.classList.add('show');
  } else if (year < 1950 || year > 2010) {
    errorElement.textContent = 'Please enter a birth year between 1950-2010';
    errorElement.classList.add('show');
  } else {
    errorElement.classList.remove('show');
  }
}

// Clear all form errors
function clearFormErrors() {
  const errorElements = document.querySelectorAll('.error-message');
  errorElements.forEach(element => {
    element.classList.remove('show');
  });
}

// Modal management
function setupModal() {
  const modal = document.getElementById('memory-modal');
  const openButton = document.getElementById('open-modal');
  const closeButton = document.getElementById('close-modal');
  
  if (!modal || !openButton) return;
  
  // Open modal
  openButton.addEventListener('click', () => {
    openModal();
  });
  
  // Close modal
  if (closeButton) {
    closeButton.addEventListener('click', () => {
      closeModal();
    });
  }
  
  // Close modal on outside click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });
  
  // Close modal on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isModalOpen) {
      closeModal();
    }
  });
}

// Open modal
function openModal() {
  const modal = document.getElementById('memory-modal');
  if (!modal) return;
  
  modal.classList.add('show');
  isModalOpen = true;
  
  // Focus on first input
  const firstInput = modal.querySelector('input');
  if (firstInput) {
    firstInput.focus();
  }
  
  // Clear form
  clearForm();
}

// Close modal
function closeModal() {
  const modal = document.getElementById('memory-modal');
  if (!modal) return;
  
  modal.classList.remove('show');
  isModalOpen = false;
  
  // Clear form
  clearForm();
}

// Clear form
function clearForm() {
  const form = document.getElementById('memory-form');
  if (!form) return;
  
  form.reset();
  clearFormErrors();
}

// Loading overlay management
function setupLoadingOverlay() {
  const overlay = document.getElementById('loading-overlay');
  if (!overlay) return;
  
  // Initially hidden
  overlay.style.display = 'none';
}

// Show loading overlay
function showLoadingOverlay() {
  const overlay = document.getElementById('loading-overlay');
  if (!overlay) return;
  
  overlay.style.display = 'flex';
  isLoading = true;
}

// Hide loading overlay
function hideLoadingOverlay() {
  const overlay = document.getElementById('loading-overlay');
  if (!overlay) return;
  
  overlay.style.display = 'none';
  isLoading = false;
}

// Outro screen management
function setupOutroScreen() {
  const overlay = document.getElementById('outro-overlay');
  if (!overlay) return;
  
  // Initially hidden
  overlay.style.display = 'none';
  
  // Set up button handlers
  setupOutroButtons();
}

// Set up outro screen buttons
function setupOutroButtons() {
  // Save button
  const saveBtn = document.getElementById('save-btn');
  if (saveBtn) {
    saveBtn.onclick = () => {
      log('💾 Save button clicked');
      // Download recorded video
      if (window.VideoManager) {
        window.VideoManager.saveRecordedVideo();
      }
    };
  }
  
  // Share button
  const shareBtn = document.getElementById('share-btn');
  if (shareBtn) {
    shareBtn.onclick = () => {
      log('🔗 Share button clicked');
      // Use system share sheet for recorded video
      if (window.VideoManager) {
        window.VideoManager.shareRecordedVideo();
      }
    };
  }
  
  // Recall More button
  const recallMoreBtn = document.getElementById('recall-more-btn');
  if (recallMoreBtn) {
    recallMoreBtn.onclick = () => {
      log('🔄 Recall More button clicked');
      // Hide outro screen and return to hero page
      hideOutroScreen();
      if (window.VallexoApp.experienceRecording && window.VallexoApp.experienceRecording.url) {
        URL.revokeObjectURL(window.VallexoApp.experienceRecording.url);
      }
      // Reset any UI state
      if (window.stopKenBurnsReveal) {
        window.stopKenBurnsReveal();
      }
      log('✅ Ready for new memory generation');
    };
  }
}

// Show outro screen
function showOutroScreen() {
  log('🎭 Showing emotional outro screen');
  const overlay = document.getElementById('outro-overlay');
  if (overlay) {
    overlay.style.display = 'flex';
    
    // Add fade-in animation
    overlay.style.opacity = '0';
    setTimeout(() => {
      overlay.style.opacity = '1';
    }, 100);
  }
}

// Hide outro screen
function hideOutroScreen() {
  const overlay = document.getElementById('outro-overlay');
  if (overlay) {
    overlay.style.opacity = '0';
    setTimeout(() => {
      overlay.style.display = 'none';
    }, 300);
  }
}

// Audio toggle button setup
function setupAudioToggle() {
  const audioToggle = document.getElementById('audio-toggle');
  if (!audioToggle) return;
  
  // Set initial state
  audioToggle.textContent = '♪ OFF';
  audioToggle.classList.add('muted');
  
  // Add click handler
  audioToggle.addEventListener('click', async function() {
    if (window.AudioManager) {
      await window.AudioManager.toggleAudio.call(this);
    }
  });
}

// Performance detection
function detectPerformanceMode() {
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const hasLimitedMemory = navigator.deviceMemory && navigator.deviceMemory < 4;
  const hasSlowConnection = navigator.connection && 
    (navigator.connection.effectiveType === 'slow-2g' || 
     navigator.connection.effectiveType === '2g' || 
     navigator.connection.effectiveType === '3g');
  
  window.VallexoApp.isLowPerformance = isMobile || hasLimitedMemory || hasSlowConnection;
  log('📱 Performance mode:', window.VallexoApp.isLowPerformance ? 'Low (mobile/limited)' : 'High (desktop)');
  return window.VallexoApp.isLowPerformance;
}

// Mobile optimization for live experience
function optimizeForMobile() {
  if (!window.VallexoApp.isLowPerformance) return;
  
  const revealBg = document.querySelector('.reveal-bg');
  if (revealBg) {
    // Disable live parallax for mobile performance
    revealBg.style.transform = 'scale(1.05)'; // Slight zoom for visual interest
    
    log('📱 Static background set for live experience (parallax saved for video)');
  }
  
  // DISABLED: Keep background completely static for smooth performance
  // Only the downloadable video will have parallax effects
  log('📱 Live parallax disabled for performance - effects only in downloadable video');
  return;
}

// Event handlers initialization
function initializeEventHandlers() {
  log('🔧 Setting up event handlers...');
  
  // Global error handler
  window.addEventListener('error', (event) => {
    error('🚨 Global error caught:', event.error);
    error('🚨 Error message:', event.message);
    error('🚨 Error stack:', event.error?.stack);
    error('🚨 Error source:', event.filename, 'line:', event.lineno);
  });
  
  // Unhandled promise rejection handler
  window.addEventListener('unhandledrejection', (event) => {
    error('🚨 Unhandled promise rejection:', event.reason);
    error('🚨 Promise rejection stack:', event.reason?.stack);
  });
  
  // User interaction handlers for audio
  const userInteractionEvents = ['click', 'touchstart', 'keydown', 'scroll'];
  userInteractionEvents.forEach(eventType => {
    document.addEventListener(eventType, window.AudioManager.resumeAudioContexts, { once: true });
  });
  
  // Performance optimization
  detectPerformanceMode();
  optimizeForMobile();
  
  log('✅ Event handlers initialized');
}

// Export functions for other modules
window.UIManager = {
  initializeUI,
  openModal,
  closeModal,
  showLoadingOverlay,
  hideLoadingOverlay,
  showOutroScreen,
  hideOutroScreen,
  setupFormValidation,
  handleFormSubmission,
  detectPerformanceMode,
  optimizeForMobile
};
