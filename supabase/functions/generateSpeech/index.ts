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

    // Check for API key in different possible environment variable names
    const possibleKeys = [
      "ELEVENLABS_API_KEY",
      "ELEVENLABS_APIKEY", 
      "ELEVENLABS_KEY",
      "ELEVENLABS_API",
      "ELEVEN_API_KEY",
      "ELEVEN_APIKEY",
      "ELEVEN_KEY"
    ];
    
    let apiKey: string | null = null;
    let foundKeyName: string | null = null;
    
    for (const keyName of possibleKeys) {
      const value = Deno.env.get(keyName);
      if (value) {
        apiKey = value;
        foundKeyName = keyName;
        break;
      }
    }
    
    console.log("API Key search:");
    console.log("- Found key:", foundKeyName);
    console.log("- Key length:", apiKey ? apiKey.length : 0);
    console.log("- All env vars:", Object.keys(Deno.env.toObject()));
    
    if (!apiKey) {
      return new Response(JSON.stringify({ 
        error: "API key not found in environment",
        debug: {
          searchedKeys: possibleKeys,
          allEnvVars: Object.keys(Deno.env.toObject()),
          envVarsWithEleven: Object.keys(Deno.env.toObject()).filter(key => 
            key.toLowerCase().includes('eleven') || key.toLowerCase().includes('api')
          )
        }
      }), {
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

    console.log("Using API key from:", foundKeyName);
    console.log("API key length:", apiKey.length);
    console.log("API key ends with:", apiKey.substring(apiKey.length - 4));

    const voiceId = "dWlo9A8YyLspmlvHk1dB"; // Matthew voice
    
    // Prepare request exactly as per ElevenLabs documentation
    const requestBody = {
      text: text,
      model_id: "eleven_monolingual_v1",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75
      }
    };
    
    console.log("Making request to ElevenLabs:");
    console.log("- URL:", `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`);
    console.log("- Method: POST");
    console.log("- Headers:", {
      "Content-Type": "application/json",
      "xi-api-key": "***" + apiKey.substring(apiKey.length - 4)
    });
    
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey, // Exactly as per ElevenLabs docs
      },
      body: JSON.stringify(requestBody),
    });

    console.log("ElevenLabs response:");
    console.log("- Status:", response.status);
    console.log("- OK:", response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs API error:", response.status, errorText);
      
      return new Response(JSON.stringify({ 
        error: `ElevenLabs API error: ${response.status}`,
        details: errorText,
        debug: {
          apiKeyFound: !!apiKey,
          apiKeySource: foundKeyName,
          apiKeyLength: apiKey.length,
          apiKeyEnd: apiKey.substring(apiKey.length - 4),
          requestUrl: `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
          responseStatus: response.status
        }
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
      size: audioBuffer.byteLength
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
