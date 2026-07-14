export default async (request, context) => {
  const user = Deno.env.get("DASH_USER");
  const pass = Deno.env.get("DASH_PASS");

  // If the env vars aren't set yet, don't accidentally lock everyone out.
  if (!user || !pass) return context.next();

  const expected = "Basic " + btoa(`${user}:${pass}`);
  const auth = request.headers.get("authorization");

  if (auth !== expected) {
    return new Response("Authentication required.", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="LoadStop Dashboard", charset="UTF-8"',
      },
    });
  }

  return context.next();
};

export const config = { path: "/*" };
