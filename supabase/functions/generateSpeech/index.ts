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

    // Simple test - just return success without calling ElevenLabs
    console.log("Function called with text:", text.substring(0, 50) + "...");
    
    return new Response(JSON.stringify({ 
      success: true,
      message: "Function is working",
      textLength: text.length,
      test: true
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
