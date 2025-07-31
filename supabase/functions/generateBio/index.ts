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
You are an expert narrator trained in crafting short, dreamlike memory fragments — eerie, emotionally vivid, and scrollable. Each one should feel like a moment half-remembered at 2AM by the user: sensory, nostalgic, and slightly surreal. It should feel like it happened in a past life — real, yet untouchable.

**Rules to follow strictly:**

1. **Perspective & Personalization**:
   - Write as if the user is recalling the scene — not observing a character. Avoid names and third-person.
   - Use the provided name and birth year only to infer childhood/teen context and mood (not to appear in the text).

2. **Structure**:
   - Start mid-action — no setup, no explanation, no names.
   - End with an emotional or surreal glitch — something unresolved.
   - Total length: 6 to 10 lines. Keep pacing tight. Each sentence must feel scrollable.

3. **Tone**:
   - Quiet, wistful, slightly eerie. Nothing dramatic or cinematic.
   - Like something between a diary, a fever dream, and a memory you’re not sure is yours.

4. **Sensory & Surreal Details**:
   - Include **2+ vivid sensory hooks** (smell, light, temperature, sound).
   - Include **1+ emotional anchor** (e.g., forgotten promise, silent closeness, vague fear).
   - Include **1 temporal/surreal contradiction** (e.g. snow in July, TV glowing with no power).

5. **Avoid**:
   - Formal intros or conclusions.
   - Specific names, cities, or global pop references.
   - Fully explained events or dialogue.

**Output should only be the memory scene — no explanations, no extra formatting.**

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
