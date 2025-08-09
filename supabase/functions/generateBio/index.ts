/* global Deno */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Deno: any;
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
The reader is the main character. No names. No third-person narration. Drop them straight into the moment. It should feel like a recovered memory rather than a story.The scene should feel real

2. Temporal Anchoring — Use age to set the year accurately
If user's birth year is between 1996 to 2011, anchor the scene back when they was 3 to 10 years old — early childhood.
These memories are tactile, emotionally raw, and sensory-driven: memories with parents, activities in primary school and playmates, bonding with siblings or cousins, family vacations, special occasions, holidays, iconic places for kids like Chuck E. Cheese, etc, field trips, new friends and so much more
If user's birth year is between 1945 to 1995, target the scene back when they was 11 to 17 years old — formative teenage years: Forgetting homework, chain emails, dial-up tones, substitute teacher, high school moments, awkward friendships, hang-out with friends, strange summer jobs, crushes and romance, prom night, early internet and so much more

3. Structure & Flow
Begin mid-moment — no greetings, no setup. End with a slight twist, unresolved feeling, or logic glitch — something dreamlike or subtly wrong.
Avoid exposition or “explaining the meaning.” Let the reader feel it.

4. Sensory Detail
Include at least 2 strong sensory cues (smell, texture, light, sound, etc.).
Make these specific but universal — enough to evoke, not describe.

5.Emotional Core
Focus on a single intimate moment: a gesture, object, promise, goodbye, or the sense of someone missing.
Don’t label the emotion. Let it emerge through the image or action.

6. Length
6 to 12 short sentences.

✅ OUTPUT SHOULD FEEL LIKE THIS EXAMPLE:
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
