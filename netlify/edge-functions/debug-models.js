export default async (request, context) => {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) return new Response(JSON.stringify({ error: "no key" }), { headers: { "content-type": "application/json" } });
  const url = new URL(request.url);
  const model = url.searchParams.get("model");
  if (!model) {
    const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await resp.json();
    return new Response(JSON.stringify(data), { headers: { "content-type": "application/json" } });
  }
  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: "say hi in 3 words" }] }] }),
    }
  );
  const data = await resp.json();
  return new Response(JSON.stringify({ status: resp.status, model, data }), { headers: { "content-type": "application/json" } });
};

export const config = { path: "/api/debug-models" };
