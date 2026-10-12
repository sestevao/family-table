// Tiny Upstash Redis REST client. Files starting with "_" are not exposed as API routes on Vercel.
// Vercel's Upstash integration sets either the KV_* or the UPSTASH_* variables.
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

export const hasRedis = Boolean(URL_ && TOKEN);

export async function redis(...command) {
  if (!hasRedis) throw new Error("Storage is not connected");
  const res = await fetch(URL_, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
  });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error || `Redis error ${res.status}`);
  return json.result;
}

// Family codes look like "fam-k3x9q-7mbt2-pw4ze": hard to guess, safe in a URL
export function validCode(code) {
  return typeof code === "string" && /^fam-[a-z0-9-]{12,40}$/.test(code);
}

export function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  try {
    return JSON.parse(req.body || "{}");
  } catch {
    return {};
  }
}
