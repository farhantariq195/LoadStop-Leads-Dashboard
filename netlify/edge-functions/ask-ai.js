export default async (request, context) => {
  // Re-check the same site password here, independent of basic-auth.js — Edge Function
  // execution order across files isn't guaranteed, so this endpoint must gate itself too.
  const user = Deno.env.get("DASH_USER");
  const pass = Deno.env.get("DASH_PASS");
  if (user && pass) {
    const expected = "Basic " + btoa(`${user}:${pass}`);
    const auth = request.headers.get("authorization");
    if (auth !== expected) {
      return new Response("Authentication required.", {
        status: 401,
        headers: { "WWW-Authenticate": 'Basic realm="LoadStop Dashboard", charset="UTF-8"' },
      });
    }
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed." }), {
      status: 405,
      headers: { "content-type": "application/json" },
    });
  }

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "AI isn't configured yet — set GEMINI_API_KEY in Netlify environment variables." }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body." }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const question = typeof body.question === "string" ? body.question.trim() : "";
  const dataContext = typeof body.context === "string" ? body.context : "";
  if (!question) {
    return new Response(JSON.stringify({ error: "Missing question." }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  if (question.length > 2000) {
    return new Response(JSON.stringify({ error: "Question is too long." }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const prompt = `You are a data analyst assistant embedded in the LoadStop Lead Intelligence Dashboard. Answer the user's question using ONLY the dashboard data provided below — don't invent numbers that aren't there. Be concise and specific, and cite real figures from the data. If the data doesn't contain what's needed to answer, say so plainly instead of guessing.

DASHBOARD DATA:
${dataContext}

QUESTION: ${question}`;

  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 1024 },
        }),
      }
    );
    const data = await resp.json();
    if (!resp.ok) {
      return new Response(JSON.stringify({ error: data.error?.message || "AI request failed." }), {
        status: 502,
        headers: { "content-type": "application/json" },
      });
    }
    const answer = data.candidates?.[0]?.content?.parts?.map(p => p.text).join("") || "No answer returned.";
    return new Response(JSON.stringify({ answer }), { headers: { "content-type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: "AI request failed: " + e.message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
};

export const config = { path: "/api/ask-ai" };
