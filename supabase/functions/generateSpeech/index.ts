import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  try {
    const { text } = await req.json();
    
    if (!text) {
      return new Response(JSON.stringify({ error: "No text provided" }), {
        status: 400,
        headers: { 
          "Content-Type": "application/json",
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

    // Limit text length to save credits
    const maxLength = 500;
    const truncatedText = text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    
    console.log("Processing text:", truncatedText.length, "characters");

    const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
    
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API key not found" }), {
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

    const voiceId = "dWlo9A8YyLspmlvHk1dB"; // Matthew voice
    
    console.log("Calling ElevenLabs with optimized settings...");
    
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text: truncatedText,
        model_id: "eleven_monolingual_v1", // Cheaper model
        voice_settings: {
          stability: 0.3,        // Lower = fewer credits
          similarity_boost: 0.6,  // Lower = fewer credits
          style: 0.1,            // Lower = fewer credits
          use_speaker_boost: false // Turn off to save credits
        }
      }),
    });

    console.log("ElevenLabs response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs API error:", response.status, errorText);
      return new Response(JSON.stringify({ 
        error: `ElevenLabs API error: ${response.status}`,
        details: errorText
      }), {
        status: response.status,
        headers: { 
          "Content-Type": "application/json",
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

    const audioBuffer = await response.arrayBuffer();
    console.log("Audio received:", audioBuffer.byteLength, "bytes");
    
    const uint8Array = new Uint8Array(audioBuffer);
    
    // Convert to base64
    let base64Audio = "";
    for (let i = 0; i < uint8Array.length; i++) {
      base64Audio += String.fromCharCode(uint8Array[i]);
    }
    base64Audio = btoa(base64Audio);
    
    console.log("Base64 conversion complete:", base64Audio.length, "characters");

    return new Response(JSON.stringify({ 
      audio: base64Audio,
      success: true,
      size: audioBuffer.byteLength,
      textLength: truncatedText.length,
      creditsUsed: Math.ceil(truncatedText.length / 100) // Rough estimate
    }), {
      headers: { 
        "Content-Type": "application/json",
        'Access-Control-Allow-Origin': '*',
      }
    });

  } catch (err) {
    console.error("Function error:", err);
    return new Response(JSON.stringify({ 
      error: "Function error",
      message: err.message
    }), {
      status: 500,
      headers: { 
        "Content-Type": "application/json",
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
});
