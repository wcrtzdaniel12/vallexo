// Video Recording Module
// Handles video recording, canvas drawing, and video processing

// Video recording variables
let recordingAudioCtx = null;
let mediaRecorder = null;
let recordingChunks = [];
let recordingStream = null;
let recordingCanvas = null;
let recordingCtx = null;
let recordingImage = null;
let recordingStartTime = 0;
let recordingDuration = 0;

// Start experience recording
function startExperienceRecording(voiceAudioEl, totalDurationSec) {
  // Show user-friendly notification about recording
  log('🎬 Starting experience recording...');
  log('💡 Note: Live audio may be muted by browser, but recording will capture everything');
  
  // Prepare canvas - OPTIMIZED FOR 9:16 MOBILE ASPECT RATIO
  const width = 720, height = 1280; // 9:16 aspect ratio (mobile-first)
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr); // Scale context to match DPR
  
  // Store canvas info for later use
  recordingCanvas = canvas;
  recordingCtx = ctx;
  recordingDuration = totalDurationSec;
  recordingStartTime = Date.now();
  
  // Load background image for recording
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = window.VallexoApp.backgroundUrl || 'img/hallway1.png';
  
  log('🎬 Recording will use background:', window.VallexoApp.backgroundUrl || 'img/hallway1.png');
  
  // Build audio mix: voice + bgm (if available) - Mobile-optimized audio routing
  let audioStream = null;
  let isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  try {
    // Create dedicated recording audio context
    recordingAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    // Resume context for mobile (non-blocking to prevent freezing)
    if (recordingAudioCtx.state === 'suspended') {
      log('🔇 Recording AudioContext suspended - attempting resume...');
      recordingAudioCtx.resume().then(() => {
        log('✅ Recording AudioContext resumed successfully');
      }).catch((resumeError) => {
        warn('⚠️ Recording AudioContext resume failed:', resumeError);
      });
    }
    
    log(`🎵 Recording audio setup: ${isMobile ? 'Mobile' : 'Desktop'} mode`);
    
    // Create audio destination for mixing
    const dest = recordingAudioCtx.createMediaStreamDestination();
    
    try {
      // Voice audio routing (primary)
      if (voiceAudioEl && voiceAudioEl.src) {
        const voiceSource = recordingAudioCtx.createMediaElementSource(voiceAudioEl);
        const voiceGain = recordingAudioCtx.createGain();
        voiceGain.gain.setValueAtTime(1.0, recordingAudioCtx.currentTime);
        
        voiceSource.connect(voiceGain);
        voiceGain.connect(recordingAudioCtx.destination);
        
        log('🎤 Voice audio routed to recording stream');
      }
      
      // Background music routing (lower volume)
      if (window.AudioManager && window.AudioManager.audioElement && window.AudioManager.audioElement.src) {
        try {
          const bgSource = recordingAudioCtx.createMediaElementSource(window.AudioManager.audioElement);
          const bgGain = recordingAudioCtx.createGain();
          bgGain.gain.setValueAtTime(0.3, recordingAudioCtx.currentTime); // Lower volume for background
          
          bgSource.connect(bgGain);
          bgGain.connect(recordingAudioCtx.destination);
          
          log('🎵 Background music routed to recording stream');
        } catch (bgError) {
          warn('⚠️ Background audio routing failed:', bgError);
        }
      }
      
      // Get the mixed audio stream
      audioStream = dest.stream;
      log(`🔊 Mixed audio stream ready: ${audioStream.getAudioTracks().length} tracks`);
      
    } catch (routingError) {
      warn('⚠️ Audio routing failed:', routingError);
      
      // Fallback: try direct audio capture if AudioContext mixing fails
      try {
        log('🔄 AudioContext mixing not available, trying direct capture...');
        const directStream = voiceAudioEl.captureStream ? voiceAudioEl.captureStream() : null;
        if (directStream && directStream.getAudioTracks().length > 0) {
          audioStream = directStream;
          log('✅ Direct audio capture working as fallback');
        } else {
          warn('⚠️ No audio capture available - recording video only');
        }
      } catch (directError) {
        warn('⚠️ Direct audio capture failed:', directError);
        log('📹 Proceeding with video-only recording');
      }
    }
    
    // Ensure recording audio context is running
    if (recordingAudioCtx.state !== 'running') {
      recordingAudioCtx.resume().then(() => {
        log('🎵 Recording AudioContext resumed and running');
      }).catch(() => {
        log('⚠️ Recording AudioContext resume failed, continuing anyway');
      });
    }
    
  } catch (error) {
    warn('⚠️ Failed to create recording AudioContext:', error);
    
    // Fallback: try direct audio capture if AudioContext mixing fails
    try {
      log('🔄 AudioContext mixing not available, trying direct capture...');
      const directStream = voiceAudioEl.captureStream ? voiceAudioEl.captureStream() : null;
      if (directStream && directStream.getAudioTracks().length > 0) {
        audioStream = directStream;
        log('✅ Direct audio capture working as fallback');
      } else {
        warn('⚠️ No audio capture available - recording video only');
      }
    } catch (directError) {
      warn('⚠️ Direct audio capture failed:', directError);
      log('📹 Proceeding with video-only recording');
    }
  }
  
  // Create video stream from canvas
  const videoStream = canvas.captureStream(30); // 30 FPS
  
  // Merge audio and video streams
  let stream = videoStream;
  if (audioStream && audioStream.getAudioTracks().length > 0) {
    try {
      // Method 1: Direct track addition (preferred)
      audioStream.getAudioTracks().forEach(track => {
        log(`🎵 Adding audio track: ${track.kind} (${track.readyState})`);
        stream.addTrack(track);
      });
      log(`✅ Audio tracks added: ${stream.getAudioTracks().length} tracks`);
    } catch (addError) {
      warn('⚠️ Direct track addition failed, trying merge method:', addError);
      
      try {
        // Method 2: Stream merging
        const merged = new MediaStream();
        videoStream.getVideoTracks().forEach(tr => merged.addTrack(tr));
        audioStream.getAudioTracks().forEach(tr => merged.addTrack(tr));
        
        // Replace original stream
        stream.getTracks().forEach(tr => stream.removeTrack(tr));
        merged.getTracks().forEach(tr => stream.addTrack(tr));
        log(`🔄 Stream merged: ${merged.getVideoTracks().length}V + ${merged.getAudioTracks().length}A`);
      } catch (mergeError) {
        warn('⚠️ Stream merging also failed:', mergeError);
        warn('⚠️ No audio stream available for recording');
      }
    }
  }
  
  // Set up MediaRecorder with mobile-optimized settings
  const isMobileDevice = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // Test different formats for compatibility
  const testFormats = isMobileDevice ? [
    { mimeType: 'video/mp4;codecs=avc1.42E01E,mp4a.40.2', name: 'MP4 H264+AAC (Mobile optimized)' },
    { mimeType: 'video/mp4', name: 'MP4 (Default)' },
    { mimeType: 'video/webm;codecs=vp8,opus', name: 'WebM VP8+Opus' },
    { mimeType: 'video/webm', name: 'WebM (Basic)' }
  ] : [
    // Desktop-first: WebM for better quality
    { mimeType: 'video/webm;codecs=vp9,opus', name: 'WebM VP9+Opus (Desktop optimized)' },
    { mimeType: 'video/webm;codecs=vp8,opus', name: 'WebM VP8+Opus' },
    { mimeType: 'video/mp4;codecs=avc1.42E01E,mp4a.40.2', name: 'MP4 H264+AAC' },
    { mimeType: 'video/mp4', name: 'MP4 (Basic)' }
  ];
  
  let options = {};
  for (const format of testFormats) {
    if (MediaRecorder.isTypeSupported(format.mimeType)) {
      options = { mimeType: format.mimeType };
      log(`📱 Using ${format.name} for ${isMobileDevice ? 'mobile' : 'desktop'} recording`);
      break;
    }
  }
  
  // Fallback to basic formats if specific codecs aren't supported
  if (!options.mimeType) {
    const basicFormats = ['video/webm', 'video/mp4'];
    for (const format of basicFormats) {
      if (MediaRecorder.isTypeSupported(format)) {
        options = { mimeType: format };
        log(`📱 Using basic ${format} as fallback`);
        break;
      }
    }
  }
  
  if (!options.mimeType) {
    options = {}; // Let browser choose default
    log('📱 Using browser default codec (no specific format supported)');
  }
  
  log(`📱 Final recording options:`, options);
  log(`📱 Stream info: ${stream.getVideoTracks().length}V + ${stream.getAudioTracks().length}A tracks`);
  log(`📱 Device type: ${isMobileDevice ? 'Mobile' : 'Desktop'}`);
  log(`📱 Format priority: ${isMobileDevice ? 'MP4 first (mobile optimized)' : 'WebM first (desktop optimized)'}`);
  
  const recorder = new MediaRecorder(stream, options);
  mediaRecorder = recorder;
  recordingStream = stream;
  
  // Set up recording event handlers
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      recordingChunks.push(event.data);
    }
  };
  
  recorder.onstop = () => {
    const finalMimeType = recorder.mimeType || 'video/webm';
    
    // Mobile optimization: convert WebM to MP4 if needed
    if (isMobileDevice && finalMimeType === 'video/webm') {
      // Try to convert WebM to MP4 for mobile compatibility
      log('📱 Mobile device detected - attempting MP4 conversion for better compatibility');
      finalMimeType = 'video/mp4';
    }
    
    log(`📱 Creating blob with MIME type: ${finalMimeType}`);
    log(`📱 Recording chunks: ${recordingChunks.length} pieces, total size: ${recordingChunks.reduce((sum, chunk) => sum + chunk.size, 0)} bytes`);
    log(`📱 Device: ${isMobileDevice ? 'Mobile' : 'Desktop'}, Format: ${finalMimeType}`);
    
    const blob = new Blob(recordingChunks, { type: finalMimeType });
    
    // Store recording data
    window.VallexoApp.experienceRecording = {
      blob: blob,
      url: URL.createObjectURL(blob),
      mimeType: finalMimeType,
      size: blob.size,
      duration: recordingDuration,
      width: width,
      height: height,
      dpr: dpr
    };
    
    // Clean up
    recordingChunks = [];
    if (recordingStream) {
      recordingStream.getTracks().forEach(track => track.stop());
    }
    try { recordingAudioCtx && recordingAudioCtx.close(); } catch (_) {}
    
    log(`✅ Recording complete: ${blob.size} bytes, type: ${finalMimeType}`);
    
    // After recording is ready, show outro and enable responsive controls
    setTimeout(() => {
      showOutroScreen();
    }, 1000);
  };
  
  // Start drawing once image is ready
  img.onload = () => {
    log(`🎬 Recording canvas setup: ${width}x${height} logical, ${canvas.width}x${canvas.height} physical (DPR: ${dpr})`);
    drawRecordingFrame();
    recorder.start(100); // collect data every 100ms
  };
  
  img.onerror = () => {
    // Fallback to default image
    img.src = 'img/hallway1.png';
  };
  
  // Store image for drawing
  recordingImage = img;
}

// Draw each frame during recording
function drawRecordingFrame() {
  if (!recordingCtx || !recordingImage || !recordingCanvas) return;
  
  const width = recordingCanvas.width / (window.devicePixelRatio || 1);
  const height = recordingCanvas.height / (window.devicePixelRatio || 1);
  
  // Clear canvas
  recordingCtx.clearRect(0, 0, width, height);
  
  // Draw background image with Ken Burns effect
  const time = (Date.now() - recordingStartTime) / 1000;
  drawKenBurnsBackground(recordingCtx, recordingImage, width, height, time);
  
  // Draw text overlay
  drawTextOverlay(recordingCtx, width, height, time);
  
  // Continue drawing
  requestAnimationFrame(drawRecordingFrame);
}

// Draw Ken Burns background effect
function drawKenBurnsBackground(ctx, img, width, height, time) {
  const scale = 1.1 + 0.1 * Math.sin(time * 0.5);
  const x = (width - img.width * scale) / 2 + Math.sin(time * 0.3) * 20;
  const y = (height - img.height * scale) / 2 + Math.cos(time * 0.4) * 15;
  
  ctx.save();
  ctx.globalAlpha = 0.8;
  ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
  ctx.restore();
  
  // Add dark overlay for text readability
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fillRect(0, 0, width, height);
}

// Draw text overlay
function drawTextOverlay(ctx, width, height, time) {
  const text = "Your nostalgic memory is being created...";
  const fontSize = Math.min(width * 0.04, 48);
  
  ctx.font = `bold ${fontSize}px 'Playfair Display', serif`;
  ctx.fillStyle = 'white';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Add text shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;
  
  // Center text
  ctx.fillText(text, width / 2, height / 2);
  
  // Reset shadow
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

// Stop recording
function stopRecording() {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
    window.VallexoApp.isRecording = false;
  }
}

// Save recorded video
function saveRecordedVideo() {
  if (!window.VallexoApp.experienceRecording) {
    warn('⚠️ No recording available to save');
    return;
  }
  
  const { blob, mimeType } = window.VallexoApp.experienceRecording;
  const fileExt = mimeType.includes('mp4') ? 'mp4' : 'webm';
  
  log(`💾 Saving video: ${mimeType} -> .${fileExt}`);
  
  // Create nostalgic filename format: MEMORY_LOG_XXX_NAME
  const nostalgicFilename = generateNostalgicFilename(fileExt);
  
  // Create download link
  const a = document.createElement('a');
  a.href = window.VallexoApp.experienceRecording.url;
  a.download = nostalgicFilename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  
  log(`✅ Download initiated: ${nostalgicFilename}`);
}

// Share recorded video
function shareRecordedVideo() {
  if (!window.VallexoApp.experienceRecording) {
    warn('⚠️ No recording available to share');
    return;
  }
  
  const { blob, mimeType } = window.VallexoApp.experienceRecording;
  const fileExt = mimeType.includes('mp4') ? 'mp4' : 'webm';
  
  log(`📤 Sharing video: ${mimeType} -> .${fileExt}`);
  
  // Create nostalgic filename
  const nostalgicFilename = generateNostalgicFilename(fileExt);
  
  // Create File object for sharing
  const file = new File([blob], nostalgicFilename, { type: mimeType });
  
  // Use Web Share API if available
  if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
    navigator.share({
      files: [file],
      title: 'My Nostalgic Memory',
      text: 'Check out this nostalgic childhood memory I generated!'
    }).then(() => {
      log('✅ Video shared successfully via system share sheet');
    }).catch((error) => {
      warn('⚠️ System share failed, falling back to download:', error);
      saveRecordedVideo();
    });
  } else {
    // Fallback to download
    saveRecordedVideo();
  }
}

// Generate nostalgic filename
function generateNostalgicFilename(fileExt) {
  let userName = window.VallexoApp.currentUserName || 'USER';
  if (userName === 'USER') { // Fallback if not set globally
    const nameInput = document.getElementById('fullname');
    if (nameInput && nameInput.value && nameInput.value.trim()) {
      const fullName = nameInput.value.trim();
      const firstName = fullName.split(' ')[0];
      userName = firstName.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (!userName) userName = 'USER';
    }
  }
  const randomLogNumber = Math.floor(Math.random() * 999) + 1;
  const logNumber = String(randomLogNumber).padStart(3, '0');
  return `MEMORY_LOG_${logNumber}_${userName}.${fileExt}`;
}

// Export functions for other modules
window.VideoManager = {
  startExperienceRecording,
  stopRecording,
  saveRecordedVideo,
  shareRecordedVideo,
  generateNostalgicFilename,
  isRecording: () => window.VallexoApp.isRecording
};
