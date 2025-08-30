// Memory Generation Module
// Handles memory generation, API calls, and background image matching

// Memory generation with retry logic
async function generateMemory(name, birthYear) {
  const maxRetries = 2;
  const urls = [
    'https://yhnsuovqpewwyqofrtaz.supabase.co/functions/v1/generateBio',
    'https://yhnsuovqpewwyqofrtaz.supabase.co/functions/v1/generateBio'
  ];
  
  for (let retry = 0; retry <= maxRetries; retry++) {
    for (let urlIndex = 0; urlIndex < urls.length; urlIndex++) {
      const url = urls[urlIndex];
      
      try {
        const requestBody = { name, birthYear };
        log(`🔄 Attempt ${retry + 1}/${maxRetries + 1} to generate memory via:`, url);
        log('📝 Request payload:', requestBody);
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlobnN1b3ZxcGV3d3lxb2ZydGF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NzI5NzQsImV4cCI6MjA1MDU0ODk3NH0.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8'
          },
          body: JSON.stringify(requestBody)
        });
          
        log('📡 Response status:', response.status, response.statusText);
          
        if (!response.ok) {
          const errorText = await response.text();
          warn(`❌ HTTP error with ${url}: ${response.status} - ${errorText}`);
          continue; // Try next URL
        }
          
        const data = await response.json();
        log('✅ Response from Supabase function:', data);
          
        if (data && data.memory) {
          log('🎉 Memory generated successfully:', data.memory.substring(0, 100) + '...');
          return data.memory;
        } else {
          warn('⚠️ No memory in response data:', data);
          continue; // Try next URL
        }
      } catch (error) {
        warn(`❌ Network/parsing error with ${url}:`, error);
        continue; // Try next URL
      }
    }
    
    // If we get here, all URLs failed for this retry
    if (retry < maxRetries) {
      log(`⏳ Retry ${retry + 1} failed, waiting before next attempt...`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (retry + 1))); // Exponential backoff
    }
  }
  
  // If we get here, all retries failed
  const lastError = new Error('All memory generation attempts failed');
  error('💥 All memory generation attempts failed after retries. Last error:', lastError);
  throw lastError;
}

// Background image matching for memory content
async function getBackgroundImageForMemory(memoryText) {
  try {
    log('🖼️ Matching background image to memory content (99 scene settings)...');
    log('📝 Memory text to match:', memoryText.substring(0, 100) + '...');
    
    const requestPayload = { memoryText };
    log('📤 Request payload:', requestPayload);
    
    const response = await fetch('https://yhnsuovqpewwyqofrtaz.supabase.co/functions/v1/getBackgroundImageV2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlobnN1b3ZxcGV3d3lxb2ZydGF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NzI5NzQsImV4cCI6MjA1MDU0ODk3NH0.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8'
      },
      body: JSON.stringify(requestPayload)
    });
    
    log('📡 Response status:', response.status, response.statusText);
    log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const data = await response.json();
      log('🎯 Background image matched (from 99 possibilities):', {
        setting: data.matchedSetting,
        confidence: data.confidence,
        imageUrl: data.backgroundUrl,
        debugInfo: data.debugInfo
      });
      
      // Update global background URL
      window.VallexoApp.backgroundUrl = data.backgroundUrl;
      
      return {
        success: true,
        backgroundUrl: data.backgroundUrl,
        matchedSetting: data.matchedSetting,
        confidence: data.confidence
      };
    } else {
      const errorText = await response.text();
      warn('⚠️ Background matching failed, using fallback');
      return {
        success: false,
        backgroundUrl: 'img/hallway1.png', // Fallback image
        error: errorText
      };
    }
  } catch (error) {
    warn('⚠️ Background matching error, using fallback');
    return {
      success: false,
      backgroundUrl: 'img/hallway1.png', // Fallback image
      error: error.message
    };
  }
}

// Show memory section with voiceover
async function showMemorySection(memoryText) {
  log('🎬 Preparing memory section and voiceover...');
  
  try {
    // Get background image for this memory
    const bgResult = await getBackgroundImageForMemory(memoryText);
    if (bgResult.success) {
      // Update background in reveal section if it exists
      const revealBg = document.querySelector('.reveal-bg');
      if (revealBg && bgResult.backgroundUrl) {
        revealBg.style.backgroundImage = `url(${bgResult.backgroundUrl})`;
        log('🖼️ Background image updated for memory setting');
      }
    }
    
    // Start voiceover preparation (this is the main functionality now)
    try {
      log('🎵 Starting voiceover narration...');
      await narrateMemory(memoryText); // Wait for voiceover to be ready
      log('✅ Voiceover ready, narration flow complete');
    } catch (error) {
      log('⚠️ Voiceover failed:', error);
      log('⚠️ Voiceover error stack:', error.stack);
      // Continue anyway - the user can still download the recording
    }
    
    // Note: The memory-section UI was removed when we cleaned up replay functionality
    // The narration now handles the entire experience flow
    log('✅ Memory section flow completed (UI removed, narration handles display)');
  } catch (error) {
    error('❌ Error in showMemorySection:', error);
    throw error;
  }
}

// OpenAI TTS narration
async function narrateMemory(memoryText) {
  // Update status display
  const speechStatus = document.getElementById('speech-status');
  const voiceCount = document.getElementById('voice-count');
  
  if (speechStatus) speechStatus.textContent = 'OpenAI TTS: Active';
  if (voiceCount) voiceCount.textContent = 'Voice: Onyx (1950s Radio)';
  
  log('Using OpenAI TTS with Onyx voice for 1950s radio host narration');
  
  // Get current background for context
  let bgUrl = 'img/hallway1.png'; // Default fallback
  try {
    const revealBg = document.querySelector('.reveal-bg');
    if (revealBg) {
      const bgStyle = window.getComputedStyle(revealBg).backgroundImage;
      bgUrl = bgStyle.match(/url\("?(.*?)"?\)/)?.[1];
      if (bgUrl) {
        log('🖼️ Current background:', bgUrl);
      }
    }
  } catch (bgError) {
    warn('⚠️ Background detection failed:', bgError);
  }
  
  // Truncate text to save API credits (OpenAI TTS has limits)
  const maxLength = 500; // Conservative limit
  let text = memoryText;
  if (text.length > maxLength) {
    text = text.substring(0, maxLength) + '...';
    log('Text truncated to save credits:', text.length, 'characters');
  }
  
  try {
    // Sanitize text for API call
    const sanitizedText = text
      .replace(/[^\w\s.,!?-]/g, '') // Remove special characters
      .replace(/\s+/g, ' ')         // Normalize whitespace
      .trim();                       // Remove leading/trailing spaces
    
    log('Sanitized text length:', sanitizedText.length);
    
    // Call OpenAI TTS API via Supabase Edge Function
    log('🎙️ CALLING GENERATE SPEECH V2 WITH NEW API KEY');
    log('📞 Endpoint: generateSpeechV2 (NOT generateSpeech)');
    log('🔑 Expected: New API key should work');
    log('Request URL:', 'https://yhnsuovqpewwyqofrtaz.supabase.co/functions/v1/generateSpeechV2?v=4&t=' + Date.now());
    log('Request body:', JSON.stringify({ text: sanitizedText }));
    
    const response = await fetch('https://yhnsuovqpewwyqofrtaz.supabase.co/functions/v1/generateSpeechV2?v=4&t=' + Date.now(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlobnN1b3ZxcGV3d3lxb2ZydGF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NzI5NzQsImV4cCI6MjA1MDU0ODk3NH0.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8'
      },
      body: JSON.stringify({ text: sanitizedText })
    });
    
    log('OpenAI TTS response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json();
      error('OpenAI TTS error:', errorData);
      throw new Error(`OpenAI TTS failed: ${response.status} - ${errorData.error || 'Unknown error'}`);
    }
    
    const data = await response.json();
    log('OpenAI TTS success:', data);
    
    if (data.audio) {
      // Create audio element for playback
      const audioBlob = new Blob([Uint8Array.from(atob(data.audio), c => c.charCodeAt(0))], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      // Set up audio event handlers
      audio.onloadedmetadata = () => {
        // Determine timing strategy based on available data
        let boundaryPromise = null;
        
        if (data.segments && data.segments.length > 0) {
          const sentenceCount = splitMemoryIntoLines(memoryText).length;
          log('Using Whisper segments for caption timing (text-aligned)');
          boundaryPromise = Promise.resolve(boundariesFromSegmentsAndText(data.segments, memoryText, audio.duration))
            .then(bt => (Array.isArray(bt) && bt.length ? bt : boundariesFromWhisperSegments(data.segments, sentenceCount, audio.duration)));
        } else {
          log('No Whisper segments; using offline silence analysis with calibrated reading-time snapping');
          boundaryPromise = extractSilenceBoundariesFromBlob(audioBlob)
            .then(rawSilences => {
              return boundariesFromSilences(rawSilences, memoryText, audio.duration);
            });
        }
        
        // Start synchronized reveal
        try {
          const btResolved = await (boundaryPromise || Promise.resolve(boundaryTimes));
          const bt = Array.isArray(btResolved) && btResolved.length ? btResolved : computeBoundaryTimesForLines(memoryText, Math.max(6, audio.duration || 20));
          // Only use fixed timing as fallback if no Whisper segments
          if (data.segments && data.segments.length > 0) {
            log('🎯 WHISPER SEGMENTS DETECTED:', {
              segmentCount: data.segments.length,
              segments: data.segments.map((seg, i) => `${i}: "${seg.text}" (${seg.start?.toFixed(2)}s-${seg.end?.toFixed(2)}s)`),
              totalDuration: audio.duration?.toFixed(2) + 's'
            });
            log('✅ Using Whisper segments for timing and text division');
            startKenBurnsRevealWithSegments(memoryText, audio, data.segments);
          } else {
            log('⚠️ NO WHISPER SEGMENTS AVAILABLE:', {
              hasSegments: !!data.segments,
              segmentLength: data.segments?.length || 0,
              dataKeys: Object.keys(data || {})
            });
            log('🔄 Falling back to fixed 2.5s timing');
            revealSync.fixedSecondsPerLine = 2.5;
            startKenBurnsReveal(memoryText, audio, null, bt);
          }
        } catch (error) {
          log('❌ ERROR in caption timing logic:', error);
          log('🔄 Emergency fallback to fixed 2.5s timing');
          revealSync.fixedSecondsPerLine = 2.5;
          const bt = computeBoundaryTimesForLines(memoryText, Math.max(6, audio.duration || 20));
          startKenBurnsReveal(memoryText, audio, null, bt);
        }
      };
      
      audio.onended = () => {
        log('OpenAI TTS narration ended');
        removeRadioStaticEffect();
        restoreBackgroundMusic(); // Restore background music volume
        URL.revokeObjectURL(audioUrl); // Clean up
        stopKenBurnsReveal();
        // Recording is complete, user can download via outro screen
        setTimeout(() => {
          showOutroScreen();
        }, 1000); // Small delay for smooth transition
      };
      
      audio.onerror = (error) => {
        error('OpenAI TTS audio error:', error);
        removeRadioStaticEffect();
        restoreBackgroundMusic(); // Restore background music volume
        URL.revokeObjectURL(audioUrl);
        alert('Audio playback failed. Please try clicking the "Replay Narration" button.');
        stopKenBurnsReveal();
      };
      
      // Start playing with proper error handling
      try {
        await audio.play();
      } catch (playError) {
        if (playError.name === 'NotAllowedError') {
          log('🔇 Audio autoplay blocked - requesting user interaction');
          // Show user-friendly message and request interaction
          const interactionMsg = document.createElement('div');
          interactionMsg.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            border: 2px solid cyan;
            color: cyan;
            padding: 20px;
            border-radius: 10px;
            font-family: monospace;
            text-align: center;
            z-index: 10000;
            max-width: 400px;
          `;
          interactionMsg.innerHTML = `
            <div style="margin-bottom: 15px;">🔇 Browser requires interaction</div>
            <div style="font-size: 14px; margin-bottom: 20px;">Click anywhere to start narration</div>
            <div style="font-size: 12px; color: #888;">Recording will capture everything</div>
          `;
          document.body.appendChild(interactionMsg);
          
          // Wait for user interaction then retry
          const startNarration = async () => {
            try {
              await audio.play();
              interactionMsg.remove();
              document.removeEventListener('click', startNarration);
            } catch (retryError) {
              error('Retry failed:', retryError);
              interactionMsg.remove();
              document.removeEventListener('click', startNarration);
            }
          };
          
          document.addEventListener('click', startNarration, { once: true });
          
          // Also add a timeout fallback - if user doesn't interact in 10 seconds, 
          // we'll try to start the narration flow anyway
          setTimeout(() => {
            if (interactionMsg.parentNode) {
              interactionMsg.remove();
              document.removeEventListener('click', startNarration);
              log('⏰ Timeout reached - attempting to continue narration flow');
              // The narration flow should continue even without audio playing
            }
          }, 10000);
          
          return; // Don't proceed with fallback yet
        } else {
          throw playError; // Re-throw other errors
        }
      }
      
      // If we get here, audio started successfully
      log('🎵 Live audio playback started successfully');
      log('OpenAI TTS narration started');
      updateDebugInfo();
      
      // Start synchronized reveal
      try {
        const btResolved = await (boundaryPromise || Promise.resolve(boundaryTimes));
        const bt = Array.isArray(btResolved) && btResolved.length ? btResolved : computeBoundaryTimesForLines(memoryText, Math.max(6, audio.duration || 20));
        // Only use fixed timing as fallback if no Whisper segments
        if (data.segments && data.segments.length > 0) {
          log('🎯 WHISPER SEGMENTS DETECTED:', {
            segmentCount: data.segments.length,
            segments: data.segments.map((seg, i) => `${i}: "${seg.text}" (${seg.start?.toFixed(2)}s-${seg.end?.toFixed(2)}s)`),
            totalDuration: audio.duration?.toFixed(2) + 's'
          });
          log('✅ Using Whisper segments for timing and text division');
          startKenBurnsRevealWithSegments(memoryText, audio, data.segments);
        } else {
          log('⚠️ NO WHISPER SEGMENTS AVAILABLE:', {
            hasSegments: !!data.segments,
            segmentLength: data.segments?.length || 0,
            dataKeys: Object.keys(data || {})
          });
          log('🔄 Falling back to fixed 2.5s timing');
          revealSync.fixedSecondsPerLine = 2.5;
          startKenBurnsReveal(memoryText, audio, null, bt);
        }
      } catch (error) {
        log('❌ ERROR in caption timing logic:', error);
        log('🔄 Emergency fallback to fixed 2.5s timing');
        revealSync.fixedSecondsPerLine = 2.5;
        const bt = computeBoundaryTimesForLines(memoryText, Math.max(6, audio.duration || 20));
        startKenBurnsReveal(memoryText, audio, null, bt);
      }
      
      // Fallback to Web Speech API if OpenAI TTS fails
      log('🔄 Falling back to Web Speech API...');
      try {
        fallbackToWebSpeech(memoryText);
      } catch (fallbackError) {
        error('❌ Fallback to Web Speech API also failed:', fallbackError);
        // At this point, we've exhausted all options
        // The user can still download the recording, but no narration
      }
    } else {
      throw new Error('No audio data in response');
    }
  } catch (error) {
    error('❌ Error in OpenAI TTS narration:', error);
    error('❌ Error stack:', error.stack);
    
    // Fallback to Web Speech API
    try {
      fallbackToWebSpeech(memoryText);
    } catch (fallbackError) {
      error('❌ Fallback to Web Speech API also failed:', fallbackError);
      // At this point, we've exhausted all options
      // The user can still download the recording, but no narration
    }
  }
}

// Export functions for other modules
window.MemoryManager = {
  generateMemory,
  getBackgroundImageForMemory,
  showMemorySection,
  narrateMemory
};
