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

2. Temporal Anchoring — Aim for emotionally distant but personally formative years.
When selecting a time period, use the user’s birth year to calculate their current age. If the user is between 14 and 37 years old, the setting should focus on their early to late childhood years, roughly between ages 6 to 12. These are the hazy, foundational years where memories are sensory-driven and emotionally raw — think faded cartoons playing in the background, the static of an old TV, schoolyard games, the smell of sun-warmed plastic lunchboxes, toys, early digital media, elementary school, bedtime routines, or ambient memories of home or the quiet mystery of car rides at night — simple, sensory-rich fragments of childhood.

If the user is 38 to 80 years old, anchor the setting in their teenage years, a period often filled with formative experiences, personal awakenings, and emotional imprints — such as high school cultural trends, early romances, group of friends, hometown memories, pre-internet or early internet culture, distinct fashion/music phases, or formative personal experiences.

🟡 Important: Always ensure the scene takes place in the correct calendar year based on the user’s age (e.g., a user born in 2001 should experience a memory from around 2007–2013, not a general “childhood” setting that drifts into the present or teenage years).

Avoid anchoring the scene in the recent past (e.g., 5–10 years ago), as that period is too fresh to trigger deep nostalgia. The chosen moment should feel like it belongs to a world that no longer exists, evoking a kind of beautiful emotional dissonance — vivid yet unreachable.

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
You wake up while the only DVD you had in the car was playing for the 14th time and have now made you a wretched attempt at falling asleep in the car while your parents drive you home from a long trip. 
You hear them turn on their turn signal and open your eyes briefly to notice from the car window that you’ve turn onto a familiar street, you’re just slightly too hot - 
You’re foot is falling asleep and you haven’t eaten anything with protein for hours not to mention you’re dying of thirst. The colors outside all look washed out. There isn’t a cloud discemable in the entire sky. 
Do you merely feel disgusted? or does this reality demand that you be?

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
