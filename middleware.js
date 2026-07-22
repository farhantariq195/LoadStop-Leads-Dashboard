export default function middleware(request) {
  const user = process.env.DASH_USER;
  const pass = process.env.DASH_PASS;

  // If the env vars aren't set yet, don't accidentally lock everyone out.
  if (!user || !pass) return;

  const expected = "Basic " + btoa(`${user}:${pass}`);
  const auth = request.headers.get("authorization");

  if (auth !== expected) {
    return new Response("Authentication required.", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="LoadStop Dashboard", charset="UTF-8"',
        "x-debug-user-len": String(user.length),
        "x-debug-pass-len": String(pass.length),
        "x-debug-expected-len": String(expected.length),
        "x-debug-auth-received": auth ? "yes" : "no",
        "x-debug-auth-received-len": auth ? String(auth.length) : "0",
      },
    });
  }
  // No return needed here — Vercel treats a middleware that returns nothing
  // as "continue to the actual page", same as calling next().
}
