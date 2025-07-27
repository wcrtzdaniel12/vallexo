// This function expects an .env file in the same directory with OPENAI_API_KEY=sk-xxx... for local and deployed environments.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(async (req) => {
  const { name } = await req.json();

  if (!name) {
    return new Response(JSON.stringify({ error: "Name is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    const prompt = `Write a short, humble but professional-sounding one-line bio for someone named "${name}". Accurately guess their gender based on the name if possible, but **do not mention gender in the result**.`;

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [{ role: "system", content: prompt }],
        max_tokens: 60,
        temperature: 0.8,
      }),
    });

    const result = await openaiRes.json();

    const message = result.choices?.[0]?.message?.content?.trim() || "Bio not generated.";

    return new Response(JSON.stringify({ bio: message }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
