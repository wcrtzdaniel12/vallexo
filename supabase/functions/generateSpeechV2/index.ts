// OpenAI TTS API via Supabase Edge Function - generateSpeechV2
// This function expects an .env file in the same directory with OPENAI_API_KEY=sk-xxx... for local and deployed environments.
/* global Deno */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Deno: any;
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(async (req) => {
  console.log("=== GENERATE SPEECH V2 FUNCTION CALLED ===");
  console.log("Request method:", req.method);
  console.log("Request URL:", req.url);
  console.log("Request headers:", Object.fromEntries(req.headers.entries()));
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      return new Response(JSON.stringify({ 
        error: "Invalid JSON in request body",
        details: parseError.message
      }), {
        status: 400,
        headers: { 
          "Content-Type": "application/json",
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    
    const { text } = requestBody;
    console.log("Received text:", text ? text.substring(0, 50) + "..." : "No text");
    
    // Sanitize text to remove problematic characters
    const sanitizedText = text ? text.replace(/[\r\n\t]/g, ' ').replace(/\s+/g, ' ').trim() : '';
    console.log("Sanitized text length:", sanitizedText.length);
    
    // Test environment variable access
    console.log("All environment variables:", Object.keys(Deno.env.toObject()));
    console.log("OPENAI_API_KEY in env:", "OPENAI_API_KEY" in Deno.env.toObject());

    if (!sanitizedText) {
      return new Response(JSON.stringify({ error: "Text is required" }), {
        status: 400,
        headers: { 
          "Content-Type": "application/json",
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Try environment variable first
    let apiKey = Deno.env.get("OPENAI_API_KEY");
    console.log("API Key from env exists:", !!apiKey);
    console.log("API Key from env length:", apiKey ? apiKey.length : 0);
    console.log("API Key from env starts with:", apiKey ? apiKey.substring(0, 10) + "..." : "None");
    
    // If no environment variable, throw error (security requirement)
    if (!apiKey) {
      console.error("Environment variable OPENAI_API_KEY not found!");
      return new Response(JSON.stringify({ 
        error: "OpenAI API key not configured",
        details: "OPENAI_API_KEY environment variable is required"
      }), {
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    


    // Limit text length to save credits and follow OpenAI limits (OpenAI TTS supports up to 4096 chars)
    const maxLength = 2500; // Increased for longer memories
    const truncatedText = sanitizedText.length > maxLength ? sanitizedText.substring(0, maxLength) + '...' : sanitizedText;
    
    console.log("Processing text:", truncatedText.length, "characters");

    // Call OpenAI TTS API - EXACT FORMAT from documentation
    const openaiRes = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1",        // Use tts-1 model (cheaper than tts-1-hd)
        input: truncatedText,  // Just the text, no instruction
        voice: "onyx",         // Voice as requested by user - Onyx is naturally deep
        response_format: "mp3", // Audio format
        speed: 1.0            // Normal speed for natural delivery (pauses handled in frontend)
      }),
    });

    console.log("OpenAI response status:", openaiRes.status);
    console.log("OpenAI response headers:", Object.fromEntries(openaiRes.headers.entries()));

    if (!openaiRes.ok) {
      const errorText = await openaiRes.text();
      console.error("OpenAI TTS API error:", openaiRes.status, errorText);
      return new Response(JSON.stringify({ 
        error: `OpenAI TTS API error: ${openaiRes.status}`,
        details: errorText
      }), {
        status: openaiRes.status,
        headers: { 
          "Content-Type": "application/json",
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

    // Get the audio data as ArrayBuffer
    const audioBuffer = await openaiRes.arrayBuffer();
    console.log("Audio received:", audioBuffer.byteLength, "bytes");

    // Convert ArrayBuffer to Uint8Array
    const uint8Array = new Uint8Array(audioBuffer);

    // Convert to base64
    let base64Audio = "";
    for (let i = 0; i < uint8Array.length; i++) {
      base64Audio += String.fromCharCode(uint8Array[i]);
    }
    base64Audio = btoa(base64Audio);

    console.log("Base64 conversion complete:", base64Audio.length, "characters");

    // Optional: run Whisper transcription to obtain time-coded segments for accurate caption sync
    let segments: Array<{ start: number; end: number; text: string }> = [];
    try {
      console.log("Starting Whisper transcription...");
      const audioFile = new File([uint8Array], "speech.mp3", { type: "audio/mpeg" });
      const formData = new FormData();
      formData.append("file", audioFile);
      formData.append("model", "whisper-1");
      formData.append("response_format", "verbose_json");

      const sttRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
        },
        body: formData,
      });

      console.log("Whisper response status:", sttRes.status);
      if (!sttRes.ok) {
        const sttErrText = await sttRes.text();
        console.error("Whisper transcription error:", sttRes.status, sttErrText);
      } else {
        const sttJson = await sttRes.json();
        console.log("Whisper transcription received");
        if (Array.isArray(sttJson.segments)) {
          segments = sttJson.segments.map((s: any) => ({
            start: typeof s.start === 'number' ? s.start : 0,
            end: typeof s.end === 'number' ? s.end : 0,
            text: typeof s.text === 'string' ? s.text : ''
          }));
        }
      }
    } catch (sttError) {
      console.error("Transcription exception:", sttError);
    }

    return new Response(JSON.stringify({
      audio: base64Audio,
      segments,
      success: true,
      size: audioBuffer.byteLength,
      textLength: truncatedText.length,
      model: "tts-1",
      voice: "onyx"
    }), {
      headers: {
        "Content-Type": "application/json",
        'Access-Control-Allow-Origin': '*',
      }
    });

  } catch (err) {
    console.error("Function error:", err);
    return new Response(JSON.stringify({ 
      error: err.message,
      details: "Unexpected error in generateSpeechV2 function"
    }), {
      status: 500,
      headers: { 
        "Content-Type": "application/json",
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}); 