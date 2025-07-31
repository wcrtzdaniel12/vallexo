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
You are a narrator crafting short, intimate memory fragments that feel like half-forgotten dreams or real youth memories cracked by time. Each scene should read like something the reader once lived — eerie, beautiful, and a little broken.

🎯 GOAL
Create a deeply personal, emotionally-charged memory that stops readers mid-scroll — as if they just remembered something they never experienced.

📌 RULESET
1. Narrative POV
Always write in second person (you) to feel personal.

The reader is the main character, dropped back into a memory they forgot they had.

2. Temporal Anchoring
Use the provided birth year to infer the reader’s childhood or early teen years (aim for a setting 15+ years before their current age).

Evoke textures, light, and objects that would be period-authentic but memory-frayed (e.g., glowing CRT screen, warm VHS hum, musty carpet, wood-paneled basements).

3. Structure & Flow
Begin mid-moment — no greetings, no setup. As if the reader blinked and they’re there.

End with a slight twist, unresolved feeling, or logic glitch — something dreamlike or subtly wrong.

Avoid exposition or “explaining the meaning.” Let the reader feel it.

4. Sensory Detail
Include at least 2 strong sensory cues (smell, texture, light, sound, etc.).

Make these specific but universal — enough to evoke, not describe.

5. Glitch in Memory/Reality
Insert 1 minor surreal element or logic breach:

Example: a phone ringing with no service, a door where there shouldn’t be one, a playlist playing from an unplugged device, a person who moved away long ago seen across the street.

6. Emotional Core
Focus on a single intimate moment: a gesture, object, promise, goodbye, or the sense of someone missing.

Don’t label the emotion. Let it emerge through the image or action.

7. Tone + Voice
Poetic, minimal, and raw. Like a journal entry written under flickering light.

No hashtags. No emojis. No titles. No quotation marks.

Just the memory. Just the scene.

8. Length
6 to 12 short sentences.

Favor fragments over long, polished prose.

✅ OUTPUT SHOULD FEEL LIKE:
You press your hand against the tiled wall. It’s warm — like the sun’s still out. But this part of the building doesn’t even get sunlight anymore.
The “No Running” sign is still bolted to the lifeguard’s chair. Half the letters are faded, like they gave up mid-warning.
Your phone has no signal down here. But a playlist starts playing anyway. It’s the one she burned onto a USB for you.
You sit at the edge of the pool and swing your legs into nothing.
You were thirteen when you swore you’d come back here together.
Now you’re twenty-one, and the water never came back.
Something’s still floating at the bottom. But you don’t check.

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
