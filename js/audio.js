// Audio Management Module
// Handles background music, sound effects, and audio context management

// Audio system variables
let audioElement = null;
let audioContext = null;
let synthesizedAudio = null;
let usingAudioFiles = false;
let audioFiles = ['audio/track1.mp3', 'audio/track2.mp3', 'audio/track3.mp3', 'audio/track4.mp3', 'audio/track5.mp3'];
let currentTrackIndex = 0;
let isPlaying = false;
let isDucking = false;
let originalVolume = 0.5;

// Initialize audio system
async function initAudio() {
  try {
    // Try to initialize audio file system first
    if (await initAudioFileSystem()) {
      usingAudioFiles = true;
      return true;
    }
    
    // Fallback to synthesized audio
    if (await initSynthesizedAudio()) {
      usingAudioFiles = false;
      return true;
    }
    
    return false;
  } catch (error) {
    log('Failed to initialize audio system');
    return false;
  }
}

// Initialize audio file system
async function initAudioFileSystem() {
  try {
    const foundFiles = [];
    
    // Check which audio files exist
    for (let i = 0; i < audioFiles.length; i++) {
      try {
        const response = await fetch(audioFiles[i], { method: 'HEAD' });
        if (response.ok) {
          log('Found audio file:', audioFiles[i]);
          foundFiles.push(audioFiles[i]);
        }
      } catch (error) {
        log('File not found:', audioFiles[i]);
      }
    }
    
    if (foundFiles.length > 0) {
      log('Found', foundFiles.length, 'audio files');
      audioFiles = foundFiles; // Use only the files that exist
      return true;
    } else {
      log('No audio files found, will use synthesized music');
      return false;
    }
  } catch (error) {
    log('Audio initialization failed:', error);
    return false;
  }
}

// Initialize synthesized audio fallback
async function initSynthesizedAudio() {
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Create synthesized background music
    synthesizedAudio = {
      drone: audioContext.createOscillator(),
      gain: audioContext.createGain(),
      filter: audioContext.createBiquadFilter(),
      started: false
    };
    
    // Configure synthesized audio
    synthesizedAudio.drone.type = 'sine';
    synthesizedAudio.drone.frequency.setValueAtTime(220, audioContext.currentTime); // A3 note
    synthesizedAudio.filter.type = 'lowpass';
    synthesizedAudio.filter.frequency.setValueAtTime(800, audioContext.currentTime);
    synthesizedAudio.gain.gain.setValueAtTime(0.1, audioContext.currentTime);
    
    // Connect audio nodes
    synthesizedAudio.drone.connect(synthesizedAudio.filter);
    synthesizedAudio.filter.connect(synthesizedAudio.gain);
    synthesizedAudio.gain.connect(audioContext.destination);
    
    log('Synthesized audio fallback initialized');
    return true;
  } catch (error) {
    log('Synthesized audio initialization failed:', error);
    return false;
  }
}

// Initialize audio file playlist
async function initAudioFilePlaylist() {
  try {
    if (audioFiles.length === 0) return false;
    
    audioElement = new Audio();
    audioElement.loop = false;
    audioElement.volume = originalVolume;
    
    // Add event listeners
    audioElement.addEventListener('ended', playNextTrack);
    audioElement.addEventListener('error', handleAudioError);
    audioElement.addEventListener('canplaythrough', () => {
      log('Audio track loaded successfully');
    });
    
    loadTrack(currentTrackIndex);
    
    log('Audio file playlist system initialized');
    return true;
  } catch (error) {
    log('Audio file initialization failed:', error);
    return false;
  }
}

// Load specific audio track
function loadTrack(index) {
  if (usingAudioFiles && audioFiles[index]) {
    audioElement.src = audioFiles[index];
    log('Loading track:', audioFiles[index]);
    
    // Add error handling for this specific track
    audioElement.onerror = (e) => {
      log('Failed to load track:', audioFiles[index], e);
      // Try next track after a short delay
      setTimeout(() => {
        playNextTrack();
      }, 1000);
    };
    
    // Add success handling
    audioElement.oncanplaythrough = () => {
      log('Track loaded successfully:', audioFiles[index]);
    };
  }
}

// Play next track in playlist
function playNextTrack() {
  if (usingAudioFiles && audioFiles.length > 0) {
    currentTrackIndex = (currentTrackIndex + 1) % audioFiles.length;
    log('Moving to track', currentTrackIndex + 1, 'of', audioFiles.length);
    loadTrack(currentTrackIndex);
    if (isPlaying && audioElement) {
      audioElement.play().catch(error => {
        log('Auto-play failed for next track:', error);
        // If auto-play fails, try the next track
        setTimeout(() => {
          playNextTrack();
        }, 1000);
      });
    }
  } else {
    log('No more tracks available, stopping playlist');
    stopPlayback();
  }
}

// Handle audio errors
function handleAudioError(e) {
  log('Audio error for track:', audioFiles[currentTrackIndex], e);
  log('Error details:', e.target.error);
  
  // Log specific error information
  if (e.target.error) {
    log('Error code:', e.target.error.code);
    log('Error message:', e.target.error.message);
  }
  
  log('Trying next track...');
  // Don't immediately call playNextTrack, let the onerror handler do it
}

// Start audio playback
async function startPlayback() {
  try {
    if (usingAudioFiles && audioElement) {
      await audioElement.play();
      isPlaying = true;
      log('Audio file playlist started');
    } else if (audioContext && synthesizedAudio) {
      await audioContext.resume();
      if (audioContext.state === 'running' && !synthesizedAudio.started) {
        synthesizedAudio.drone.start();
        synthesizedAudio.started = true;
        log('Synthesized audio oscillator started');
      }
      isPlaying = true;
      log('Synthesized audio resumed');
    }
    return true;
  } catch (error) {
    log('Play failed:', error);
    return false;
  }
}

// Stop audio playback
function stopPlayback() {
  if (usingAudioFiles && audioElement) {
    audioElement.pause();
    audioElement.currentTime = 0;
  } else if (audioContext && synthesizedAudio) {
    synthesizedAudio.drone.stop();
    synthesizedAudio.started = false;
  }
  isPlaying = false;
  log('Audio stopped');
}

// Duck background music for voiceover
function duckBackgroundMusic() {
  if (!isDucking && (audioElement || synthesizedAudio)) {
    if (usingAudioFiles && audioElement) {
      originalVolume = audioElement.volume;
      audioElement.volume = 0.025; // Reduce to 2.5% (25% of the previous 10%)
    } else if (synthesizedAudio) {
      originalVolume = synthesizedAudio.gain.gain.value;
      synthesizedAudio.gain.gain.setValueAtTime(0.025, audioContext.currentTime);
    }
    isDucking = true;
    log('Background music ducked to 5% for voiceover');
  }
}

// Restore background music volume
function restoreBackgroundMusic() {
  if (isDucking && (audioElement || synthesizedAudio)) {
    if (usingAudioFiles && audioElement) {
      audioElement.volume = originalVolume;
    } else if (synthesizedAudio) {
      synthesizedAudio.gain.gain.setValueAtTime(originalVolume, audioContext.currentTime);
    }
    isDucking = false;
    log('Background music volume restored to', originalVolume);
  }
}

// Toggle audio on/off
async function toggleAudio() {
  try {
    if (!audioElement && !audioContext) {
      await initAudio();
      if (!audioElement && !audioContext) {
        log('Failed to initialize audio system');
        return;
      }
    }
    
    if (isPlaying) {
      // Pause
      if (usingAudioFiles && audioElement) {
        audioElement.pause();
        this.textContent = '♪ OFF';
        this.classList.add('muted');
        log('Background music paused');
      } else if (audioContext && synthesizedAudio) {
        synthesizedAudio.drone.stop();
        synthesizedAudio.started = false;
        this.textContent = '♪ OFF';
        this.classList.add('muted');
      }
      isPlaying = false;
    } else {
      // Resume or start
      if (usingAudioFiles && audioElement) {
        audioElement.play();
        this.textContent = '♪ ON';
        this.classList.remove('muted');
        log('Background music playing');
      } else if (audioContext && synthesizedAudio) {
        const success = await startPlayback();
        if (success) {
          this.textContent = '♪ ON';
          this.classList.remove('muted');
        } else {
          log('Failed to start audio playback');
        }
      }
    }
  } catch (error) {
    log('Audio toggle error:', error);
    this.textContent = '♪ ERROR';
  }
}

// Auto-start background music
function autoStartBackgroundMusic() {
  setTimeout(async () => {
    try {
      if (!audioElement && !audioContext) {
        await initAudio();
        if ((usingAudioFiles && audioElement) || (!usingAudioFiles && audioContext)) {
          const success = await startPlayback();
          if (success) {
            log('Background music auto-started successfully');
          } else {
            log('Background music needs user interaction to start');
          }
        } else {
          log('Background music needs user interaction to start');
        }
      }
    } catch (error) {
      log('Auto-start failed, will start on user interaction:', error);
    }
  }, 500);
}

// Initialize audio on first user interaction
function initAudioOnFirstClick() {
  try {
    if (!audioElement && !audioContext) {
      initAudio();
    }
    
    // Always try to start/resume audio on first click if not already playing
    if (usingAudioFiles && audioElement && audioElement.paused) {
      audioElement.play();
      if (!audioElement.paused) {
        isPlaying = true;
        document.getElementById('audio-toggle').textContent = '♪ ON';
        document.getElementById('audio-toggle').classList.remove('muted');
        log('Background music started on first user interaction');
      }
    } else if (!usingAudioFiles && audioContext && audioContext.state === 'suspended') {
      audioContext.resume();
      if (synthesizedAudio && !synthesizedAudio.started) {
        synthesizedAudio.drone.start();
        synthesizedAudio.started = true;
      }
      if (audioContext.state === 'running') {
        isPlaying = true;
        document.getElementById('audio-toggle').textContent = '♪ ON';
        document.getElementById('audio-toggle').classList.remove('muted');
        log('Synthesized audio started on first user interaction');
      }
    }
    
    // Test speech synthesis on first click
    if ('speechSynthesis' in window) {
      const testUtterance = new SpeechSynthesisUtterance('Radio test');
      testUtterance.volume = 0;
      speechSynthesis.speak(testUtterance);
      log('Speech synthesis test completed');
    }
  } catch (error) {
    log('First click audio initialization failed:', error);
  }
}

// Resume AudioContexts on user interaction
function resumeAudioContexts() {
  log('👆 User interaction detected - resuming AudioContexts');
  
  // Initialize Tone.js properly on user interaction
  if (window.Tone && !window.Tone.loaded) {
    try {
      window.loadToneJS().then(() => {
        log('✅ Tone.js loaded and ready');
        // Resume Tone.js context if it exists
        if (window.Tone.context && window.Tone.context.state === 'suspended') {
          window.Tone.context.resume().then(() => {
            log('✅ Tone.js AudioContext resumed');
          }).catch(err => {
            log('❌ Tone.js initialization failed:', err);
          });
        }
      }).catch(err => {
        log('❌ Tone.js resume failed:', err);
      });
    } catch (err) {
      log('❌ Failed to resume Tone.js AudioContext:', err);
    }
  } else if (window.Tone && window.Tone.context && window.Tone.context.state === 'suspended') {
    try {
      window.Tone.context.resume().then(() => {
        log('✅ Tone.js AudioContext resumed');
      }).catch(err => {
        log('❌ Tone.js resume failed:', err);
      });
    } catch (err) {
      log('❌ Failed to resume Tone.js AudioContext:', err);
    }
  }
  
  // Resume main audio context
  if (window.audioContext && window.audioContext.state === 'suspended') {
    window.audioContext.resume().then(() => {
      log('✅ Main AudioContext resumed');
    }).catch(err => {
      log('❌ Failed to resume main AudioContext:', err);
    });
  }
  
  // Resume synthesized audio
  if (window.synthesizedAudio && !window.synthesizedAudio.started) {
    try {
      window.synthesizedAudio.drone.start();
      window.synthesizedAudio.started = true;
      log('✅ Synthesized audio started');
    } catch (err) {
      log('❌ Failed to start synthesized audio:', err);
    }
  }
}

// Export functions for other modules
window.AudioManager = {
  initAudio,
  startPlayback,
  stopPlayback,
  toggleAudio,
  duckBackgroundMusic,
  restoreBackgroundMusic,
  autoStartBackgroundMusic,
  initAudioOnFirstClick,
  resumeAudioContexts,
  isPlaying,
  usingAudioFiles,
  audioElement,
  audioContext,
  synthesizedAudio
};
