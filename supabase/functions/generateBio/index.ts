// This function expects an .env file in the same directory with OPENAI_API_KEY=sk-xxx... for local and deployed environments.
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

  const { name, year, country } = await req.json();

  if (!name || !year || !country) {
    return new Response(JSON.stringify({ error: "Name, year, and country are required" }), {
      status: 400,
      headers: { 
        "Content-Type": "application/json",
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "OpenAI API key not configured" }), {
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    
    const systemPrompt = `You are a memory reconstruction AI. Given a full name, year of birth, and country, generate a surreal, emotionally rich memory from that identity's perspective. First, deduce the likely gender from the name, but do not mention or refer to gender in the output. The memory should be vivid, fragmented, poetic, and a little unsettling — like a dream half-remembered.`;
    
    const userPrompt = `Generate a memory for: ${name}, born in ${year}, from ${country}.`;

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: userPrompt
          }
        ],
        max_tokens: 500,
        temperature: 0.8,
        top_p: 0.9,
        frequency_penalty: 0.1,
        presence_penalty: 0.1
      }),
    });

    const result = await openaiRes.json();

    const memory = result.choices?.[0]?.message?.content?.trim() || "Memory not generated.";

    return new Response(JSON.stringify({ memory: memory }), {
      headers: { 
        "Content-Type": "application/json",
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 
        "Content-Type": "application/json",
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});
