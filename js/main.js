// Main Application Entry Point
// Core app logic, global variables, and initialization

// Production Logging Utility - Only logs in development
window.Logger = {
  isDev: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.includes('localhost'),
  
  log: function(message, ...args) {
    if (this.isDev) {
      console.log(message, ...args);
    }
  },
  
  warn: function(message, ...args) {
    if (this.isDev) {
      console.warn(message, ...args);
    }
  },
  
  error: function(message, ...args) {
    // Always log errors in production for debugging
    console.error(message, ...args);
  },
  
  info: function(message, ...args) {
    if (this.isDev) {
      console.info(message, ...args);
    }
  }
};

// Global logger instance
const log = window.Logger.log;
const warn = window.Logger.warn;
const error = window.Logger.error;
const info = window.Logger.info;

// Global variables and state
let currentUserName = 'USER';
let experienceRecording = null;
let backgroundUrl = null;
let isRecording = false;
let isLowPerformance = false;

// Lazy load Tone.js to prevent AudioContext warnings
window.loadToneJS = function() {
  if (window.Tone) return Promise.resolve(window.Tone);

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/tone/14.8.49/Tone.min.js';
    script.onload = () => {
      log('🎵 Tone.js loaded on demand');
      resolve(window.Tone);
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

// Prevent any Tone.js usage until explicitly loaded
window.Tone = {
  start: () => Promise.resolve(),
  context: null,
  loaded: false
};

log('🔧 Tone.js loading deferred - will load on user interaction');

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  log('🚀 Vallexo app initializing...');
  
  // Initialize all modules
  initializeAudioSystem();
  initializeUI();
  initializeEventHandlers();
  
  log('✅ App initialization complete');
});

// Export for other modules
window.VallexoApp = {
  currentUserName,
  experienceRecording,
  backgroundUrl,
  isRecording,
  isLowPerformance,
  log,
  warn,
  error,
  info
};
