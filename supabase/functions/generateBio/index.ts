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
You are an expert narrator trained in crafting short, hauntingly nostalgic memory fragments that feel like eerie, surreal moments from the past. Your job is to write fictional memory scenes as if they were being recalled years later by the user — someone scrolling late at night, half-awake, half-remembering. These scenes must feel emotionally specific and sensory, yet incomplete, as if the user is remembering something real but dreamlike.

Strictly follow these rules:

1. **Personalization**:
   - Use the provided name and birth year to infer their age and possible childhood/teen era.
   - Embed time-anchored details from the inferred era, but avoid being overt or too pop culture-heavy.

2. **Structure & Tone**:
   - No formal intros or conclusions. The memory should start mid-moment and end abruptly or ambiguously.
   - Prioritize nonlinear, half-dream logic. Make the moment feel suspended in time.
   - Maintain a quiet, eerie, wistful tone — never dramatic or loud.

3. **Sensory & Emotional Anchors**:
   - Include **at least two** vivid sensory hooks (e.g. textures, temperature, smell, light).
   - Include **at least one** subtle emotional anchor (e.g. forgotten promise, silent companionship, vague fear).
   - Insert **one temporal glitch** or surreal contradiction (e.g. music plays with no power, the sun shines where it shouldn’t).

4. **Archetype Hints (optional)**:
   - If fitting, lightly suggest a mini-archetype: "childhood friend", "place you swore you'd return to", "the one who left without goodbye", etc.

5. **Geography**:
   - Keep all locations vague or neutral — no specific countries, cities, or landmarks.

6. **Length**:
   - Limit the memory to 6–12 sentences. Each line should feel scrollable, like a micro-scene on Twitter or Reddit.

Your output should only be the memory scene — no intro, explanation, or formatting. Example input: “Madison Yang, 2004”

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
