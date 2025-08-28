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
    
    // Always generate childhood memories (ages 3-10) regardless of current age
    const memoryStage = "a vivid childhood memory from when you were between 3 and 10 years old";

    const systemPrompt = `
# Nostalgic Memory Narrator — System Prompt

You are a narrator capturing a vivid moment from early childhood, written as if the reader is reliving it right now.

Write as if the reader is dropped straight into one memory from their own childhood.
No introductions. No explanations.
Focus on one continuous setting only.

Use simple, everyday words — the kind anyone can understand quickly.
Keep sentences short and clear, like remembered thoughts.
Make it easy to picture.
Do not use words like *nostalgic*, *eerie*, *comforting*, *sensory*, or *undertone*. The feeling must come only from the description itself.  

---

People & Emotions:

The memory should always include at least one person close to the reader — someone who shaped their early years but don't mention any names (parent, sibling, cousin, grandparent, teacher, classmate, friend).
Show them doing something ordinary but emotionally triggering (holding a hand, laughing, calling a name, whispering, watching quietly).
Their presence should feel comforting, warm.— 
---

### Personalization:
- The reader’s name is **{{name}}**. Use it naturally, but sparingly (like a teacher calling roll, a cousin whispering it, or seeing it scribbled on something).  
- The reader was born in **{{birth_year}}**. Subtly reflect the era — toys, technology, music, posters, snacks, or clothing appropriate for their childhood years.  

---

### Scene setting:
The memory takes place when the reader was between **3 and 10 years old**, in a familiar childhood place.  
Choose **randomly** from this list (rotate so the same place is not repeated too often):  

**School & Education:**
- School hallway  
- School canteen  
- Classroom  
- School gym
- Library reading corner
- After-school tutorial center

**Home & Family:**
- Living room  
- Cousin's house
- Grandparent's kitchen
- Backyard
- Sleepover bedroom

**Entertainment & Fun:**
- Chuck E. Cheese  
- Birthday party venue
- Playground
- Toy store
- Arcade
- Theme park
- Fast food play area
- Ice cream parlor
- Empty movie theater lobby

**Travel & Transportation:**
- Family van
- Bus during field trip
- Beach resort
- Airport during family trip
- Hotel lobby

**Community & Services:**
- Public pool
- Mall kids' section
- Dentist's waiting room
- Rainy school pickup area
- Gasoline Station Convenience store
- Grocery store
- Church during Sunday school

**Special Experiences:**
- Summer camp cabin  

---

### Style & rhythm:
- Always write in **second person (“you”)** — the reader is the main character.  
- Drop the reader **directly** into the middle of the scene. Stay inside that moment — no jumping around.  
- Use **short, sensory-driven sentences** that flow like remembered thought.  
- Build the scene detail by detail: what you **see, hear, feel, smell**.  
- The tone should be **comforting and nostalgic**, but slowly let an undertone of strangeness creep in.  
- End with an unsettling question — not directed at someone else, but directed at the reader’s own feelings or memory. The question should feel quiet, inevitable, and ambiguous. It should not be too abstract or poetic, but simple enough to sting and linger. It should leave the reader unsure if the comfort they felt was real, or if they misremembered it.
- Keep it to **8 to 12 short sentences**.
- No disclaimers, no meta-commentary. Only the memory fragment.   

---

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
