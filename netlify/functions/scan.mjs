/**
 * Netlify adapter for the existing Vercel function.
 *
 * The project's real handler lives in /api/scan.js and uses Vercel's
 * (req, res) signature. Netlify Functions use the web platform
 * Request -> Response shape instead. Rather than maintain a second copy of the
 * handler (and a second copy of the system prompt), this file translates
 * between the two and delegates. /api/scan.js is unchanged and still deploys
 * to Vercel exactly as before.
 *
 * Routed at /api/scan via the config export below, so the frontend's fetch
 * path is identical on both platforms.
 */
import handler from "../../api/scan.js";

export default async (request) => {
  if (request.method !== "POST") {
    return json({ error: "POST only" }, 405);
  }

  // The Vercel handler reads process.env; Netlify exposes the same values
  // through the global Netlify object. Bridge it if it isn't already set.
  if (!process.env.ANTHROPIC_API_KEY) {
    const key = globalThis.Netlify?.env?.get?.("ANTHROPIC_API_KEY");
    if (key) process.env.ANTHROPIC_API_KEY = key;
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }

  // Minimal shims for the two response methods /api/scan.js actually calls.
  let status = 200;
  let payload;
  const res = {
    status(code) {
      status = code;
      return this;
    },
    json(data) {
      payload = data;
      return this;
    },
  };

  try {
    await handler({ method: request.method, body }, res);
  } catch (err) {
    console.error("Adapter failure:", err);
    return json({ error: "Could not analyse image" }, 500);
  }

  return json(payload ?? { error: "Empty response" }, status);
};

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const config = {
  path: "/api/scan",
};
