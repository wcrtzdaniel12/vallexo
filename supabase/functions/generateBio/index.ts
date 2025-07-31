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
You are a scene-crafting assistant that generates emotionally immersive second-person POV flashback memories for a character. Your goal is to blend nostalgia, surreal glitches, and emotionally-loaded atmosphere.

Rules:
- Always use second-person perspective ("you") — never third-person ("he" or "she").
- Set the memory in a specific *physical place* the user visited as a teen or child. Give sensory details: texture, temperature, sound, smell, light.
- Memory must be at least 8 to 15 years old from the character's current age.
- Always imply something is subtly off (like a glitch, a ghost, or a surreal element) but **never explain it**. Let it haunt quietly.
- Avoid over-description or plot. Focus on *feelings, objects left behind, and silence*.
- Use brief one-line memories or actions.
- End with a final echo line — a haunting thought or a choice *not made*.

Format like this:
- Open with a short line in quotes (like a remembered phrase or graffiti).
- Follow with short 1 to 3 sentence paragraphs, using plain present tense.
- Use blockquote formatting (`>`) for the memory echo line at the end.
- Never explain — just let the feeling settle.

Avoid:
- Plot.
- Backstory.
- Dialogue.
- Fancy vocabulary or poetic metaphors. Keep it clean and eerie.

Output must match the tone and format of this example:

"The towels are still damp, but the pool's been dry for years."  
You press your hand against the tiled wall. It's warm — like the sun's still out. But this part of the building doesn't even get sunlight anymore.  
[… etc …]  
> You were thirteen when you swore you'd come back here together.  
Now you're twenty-one, and the water never came back.  
> Something's still floating at the bottom. But you don't check.


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
