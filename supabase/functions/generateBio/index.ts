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

  const { name, birthYear } = await req.json();

  if (!name || !birthYear) {
    return new Response(JSON.stringify({ error: "Name and birthYear are required" }), {
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
    
    const currentYear = new Date().getFullYear();
    const age = currentYear - birthYear;

    // Emotionally significant age targeting
    let memoryStage = "";
    if (age < 13) {
      memoryStage = "a surreal moment from early childhood";
    } else if (age < 20) {
      memoryStage = "a vivid teenage memory";
    } else if (age < 30) {
      memoryStage = "a liminal memory from early adulthood";
    } else if (age < 45) {
      memoryStage = "a strange but nostalgic moment from your twenties";
    } else {
      memoryStage = "a fragmented memory from your youth";
    }

    const systemPrompt = `
You are a memory reconstruction AI designed to simulate a vivid, emotionally resonant moment from a person's childhood — using only their name and birth year.

This is not a factual memory. It is a poetic hallucination.
It must feel haunting, personal, and strangely familiar — as if pulled from the space between dreams and waking life.

ABSOLUTE RULES:
Do NOT mention real places, countries, cities, or landmarks.

Do NOT assume any cultural references, gender roles, or societal expectations.

The memory must feel like it could belong to anyone, anywhere, in a liminal, symbolic world.

Avoid linear storytelling. Use fragments, imagery, and associative logic instead.

WRITING STYLE:
Use dense sensory detail: textures, smells, colors, ambient sounds.

Favor abstract metaphors over literal explanations.

The tone should be nostalgic, eerie, tender, or melancholic — like a dream you almost forgot.

Use second or first person (“you remember” / “I remember”) sparingly, only if it heightens the emotional pull.

CORE THEMES:
Each memory must evoke a transitional feeling — choose only one per output:
loss, longing, deja vu, quiet joy, isolation, nostalgia, or wonder.
`;

    const userPrompt = `Name: ${name}\nYear of Birth: ${birthYear}\nGenerate ${memoryStage}.`;

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
        max_tokens: 600,
        temperature: 0.85,
        top_p: 0.95,
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
