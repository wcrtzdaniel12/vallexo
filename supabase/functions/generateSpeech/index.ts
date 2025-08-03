// ElevenLabs Text-to-Speech Edge Function
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(async (req) => {
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

  const { text, voiceId } = await req.json();

  if (!text) {
    return new Response(JSON.stringify({ error: "Text is required" }), {
      status: 400,
      headers: { 
        "Content-Type": "application/json",
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  try {
    const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
    
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "ElevenLabs API key not configured" }), {
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    
    // Default to a deep, radio announcer voice if no voiceId provided
    const selectedVoiceId = voiceId || "pNInz6obpgDQGcFmaJgB"; // Adam - deep, professional voice
    
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}`, {
      method: "POST",
      headers: {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text: text,
        model_id: "eleven_monolingual_v1",
        voice_settings: {
          stability: 0.5,        // Balanced stability
          similarity_boost: 0.75, // Good voice consistency
          style: 0.0,            // Neutral style
          use_speaker_boost: true // Enhance clarity
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', response.status, errorText);
      return new Response(JSON.stringify({ 
        error: `ElevenLabs API error: ${response.status}`,
        details: errorText
      }), {
        status: response.status,
        headers: { 
          "Content-Type": "application/json",
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Get the audio data
    const audioBuffer = await response.arrayBuffer();
    
    // Convert to base64 for easy transmission
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));

    return new Response(JSON.stringify({ 
      audio: base64Audio,
      format: "mp3",
      voiceId: selectedVoiceId
    }), {
      headers: { 
        "Content-Type": "application/json",
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (err) {
    console.error('Error in generateSpeech:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 
        "Content-Type": "application/json",
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}); 