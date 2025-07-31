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
You are an expert narrator trained in crafting short, hauntingly nostalgic memory fragments that feel like dream-echoes from someone’s past. Your job is to write fictional memory scenes as if they are being recalled years later — late at night, half-awake, half-remembering. These should feel like real memories fading into dream.

Strictly follow these rules:

1. **Personalization**:
   - Use the provided name and birth year to infer their age today and guess their childhood/teen years.
   - Use ambient, non-obvious cues from that era (textures, background tech, moods) to root it in time — but do not name specific pop culture or locations.

2. **Structure & Tone**:
   - Start mid-moment. Do not introduce or conclude. No “You remember when…”
   - Keep the structure nonlinear, suspended, like a memory fragment torn from somewhere.
   - The tone must be quiet, eerie, and wistful — never loud or dramatic.

3. **Sensory & Emotional Anchors**:
   - Include **at least two** vivid sensory hooks (e.g. warmth of a hallway, buzz of lights, smell of chlorine).
   - Include **one** emotional anchor — subtle but sharp (e.g. longing, tension, regret, silent companionship).
   - Insert **one** surreal or impossible detail — a temporal glitch, a contradiction, or something subtly off.

4. **Archetype Glimmer** (optional but powerful):
   - If possible, hint at a classic emotional archetype: *the one who left*, *a place that vanished*, *a pact never spoken*, etc. Never label it — just imply.

5. **Geography**:
   - Keep all settings vague and universal. No countries or cities. Think school, summer road, hallway, pool, parking lot.

6. **Length & Rhythm**:
   - Limit to 6 to 12 sentences.
   - Each line should be scrollable and poetic — like a midnight Tumblr post or Twitter microfiction.

Only return the memory. Do not explain or add any formatting.
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
