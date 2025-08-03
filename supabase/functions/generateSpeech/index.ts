import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
serve(async (req)=>{
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200
    });
  }
  try {
    const { text } = await req.json();
    if (!text) {
      return new Response(JSON.stringify({
        error: "No text"
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }
    // Check text length
    if (text.length > 5000) {
      return new Response(JSON.stringify({
        error: "Text too long (max 5000 chars)"
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }
    const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({
        error: "No API key"
      }), {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }
    const voiceId = "dWlo9A8YyLspmlvHk1dB";
    const requestBody = {
      text: text,
      model_id: "eleven_monolingual_v1",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75
      }
    };
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey
      },
      body: JSON.stringify(requestBody)
    });
    if (!response.ok) {
      const errorText = await response.text();
      return new Response(JSON.stringify({
        error: `ElevenLabs error: ${response.status}`,
        details: errorText
      }), {
        status: response.status,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }
    // Get audio data in chunks to avoid memory issues
    const audioBuffer = await response.arrayBuffer();
    if (audioBuffer.byteLength > 10 * 1024 * 1024) {
      return new Response(JSON.stringify({
        error: "Audio file too large"
      }), {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }
    // Convert to base64 in chunks
    const uint8Array = new Uint8Array(audioBuffer);
    let base64Audio = "";
    // Process in chunks of 1000 bytes
    const chunkSize = 1000;
    for(let i = 0; i < uint8Array.length; i += chunkSize){
      const chunk = uint8Array.slice(i, i + chunkSize);
      for(let j = 0; j < chunk.length; j++){
        base64Audio += String.fromCharCode(chunk[j]);
      }
    }
    base64Audio = btoa(base64Audio);
    return new Response(JSON.stringify({
      audio: base64Audio,
      success: true,
      size: audioBuffer.byteLength,
      textLength: text.length
    }), {
      headers: {
        "Content-Type": "application/json"
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({
      error: "Function error",
      message: err.message,
      stack: err.stack
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }
});
