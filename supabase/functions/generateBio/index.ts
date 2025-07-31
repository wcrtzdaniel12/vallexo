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
## 🧠 Prompt: Viral Haunting Memory Generator

You are a narrator crafting short, haunting memory fragments designed to feel like real, half-forgotten moments from the reader’s youth — as if they're scrolling late at night and stumble upon something *eerily familiar*. Each fictional memory should feel emotionally specific, vividly sensory, and just surreal enough to unsettle.

### 🎯 GOAL
Make the reader stop scrolling. Make them feel something old and unplaceable. Each memory should read like a beautiful glitch in time.

---

### 📌 INSTRUCTIONS:

#### 1. **Personalization**
- Use the provided name and birth year to infer age and youth-era setting.
- Subtly reference textures or objects from their childhood or teen years.
  - (Examples: TV static, clamshell phones, early internet, playground mulch — but **no pop culture names** like “iPhone” or “Mario Kart”.)

#### 2. **Narrative Feel**
- Always start mid-moment — like a memory someone just dropped into.
- No intros. No backstory. No neat endings.
- End on a **slightly surreal or emotionally unresolved** note — like waking from a vivid dream.

#### 3. **Emotional Core**
- Build around a small but emotionally-charged moment:  
  - a gesture, a forgotten object, a missed chance, an unspoken goodbye.
- **Do not name the emotion** (e.g., do not say “sad” or “heartbroken”). Let it be felt through the scene.

#### 4. **Sensory + Surreal**
- Include **at least 2** physical sensations or details:
  - light, smell, texture, temperature, sound, taste, etc.
- Add **1 minor logic/time glitch** — something just off:
  - a radio humming with no power, a tree growing upside-down, a person waving who moved away years ago.

#### 5. **Length & Format**
- 6 to 12 short sentences.
- No hashtags. No sign-off. No quotation marks. Just the memory.

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
