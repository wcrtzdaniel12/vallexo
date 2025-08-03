import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
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
    const { text } = await req.json();
    
    if (!text) {
      return new Response(JSON.stringify({ error: "No text" }), {
        status: 400,
        headers: { 
          "Content-Type": "application/json",
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

    // Check text length
    if (text.length > 5000) {
      return new Response(JSON.stringify({ error: "Text too long (max 5000 chars)" }), {
        status: 400,
        headers: { 
          "Content-Type": "application/json",
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

    const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
    
    console.log('API Key found:', apiKey ? 'Yes' : 'No');
    console.log('API Key length:', apiKey ? apiKey.length : 0);
    console.log('API Key preview:', apiKey ? apiKey.substring(0, 10) + '...' : 'None');
    
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "No API key" }), {
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          'Access-Control-Allow-Origin': '*',
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

    console.log('Making request to ElevenLabs with voice ID:', voiceId);
    console.log('Text length:', text.length);
    console.log('Request body:', JSON.stringify(requestBody, null, 2));

    // Try both authorization header formats
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
        "Authorization": `Bearer ${apiKey}`, // Try both formats
      },
      body: JSON.stringify(requestBody),
    });

    console.log('ElevenLabs response status:', response.status);
    console.log('ElevenLabs response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', response.status, errorText);
      return new Response(JSON.stringify({ 
        error: `ElevenLabs error: ${response.status}`,
        details: errorText,
        apiKeyLength: apiKey.length,
        apiKeyPreview: apiKey.substring(0, 10) + '...'
      }), {
        status: response.status,
        headers: { 
          "Content-Type": "application/json",
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

    // Get audio data in chunks to avoid memory issues
    const audioBuffer = await response.arrayBuffer();
    
    console.log('Audio buffer size:', audioBuffer.byteLength, 'bytes');
    
    if (audioBuffer.byteLength > 10 * 1024 * 1024) { // 10MB limit
      return new Response(JSON.stringify({ error: "Audio file too large" }), {
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

    // Convert to base64 in chunks
    const uint8Array = new Uint8Array(audioBuffer);
    let base64Audio = "";
    
    // Process in chunks of 1000 bytes
    const chunkSize = 1000;
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.slice(i, i + chunkSize);
      for (let j = 0; j < chunk.length; j++) {
        base64Audio += String.fromCharCode(chunk[j]);
      }
    }
    
    base64Audio = btoa(base64Audio);
    
    console.log('Base64 audio length:', base64Audio.length);

    return new Response(JSON.stringify({ 
      audio: base64Audio,
      success: true,
      size: audioBuffer.byteLength,
      textLength: text.length
    }), {
      headers: { 
        "Content-Type": "application/json",
        'Access-Control-Allow-Origin': '*',
      }
    });

  } catch (err) {
    console.error('Error in generateSpeech:', err);
    return new Response(JSON.stringify({ 
      error: "Function error",
      message: err.message,
      stack: err.stack
    }), {
      status: 500,
      headers: { 
        "Content-Type": "application/json",
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
});
