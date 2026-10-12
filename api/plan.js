import { redis, hasRedis, validCode, readBody } from "./_redis.js";

const MAX_BYTES = 400_000;

// Saves only if nobody else saved since this phone last loaded (compare-and-set), so changes are never silently lost
const SAVE_IF_UNCHANGED = `
local current = redis.call('GET', KEYS[2])
if current and current ~= ARGV[2] then
  return {0, current, redis.call('GET', KEYS[1])}
end
redis.call('SET', KEYS[1], ARGV[1])
redis.call('SET', KEYS[2], ARGV[3])
return {1, ARGV[3]}
`;

// GET /api/plan?code=...               -> { data, version } or { data: null }
// PUT /api/plan { code, data, base }   -> { version } or 409 { conflict: true, data, version }
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!hasRedis) return res.status(503).json({ error: "Storage is not connected" });

  try {
    if (req.method === "GET") {
      const code = req.query.code;
      if (!validCode(code)) return res.status(400).json({ error: "Invalid family code" });
      const [raw, version] = await Promise.all([redis("GET", `plan:${code}`), redis("GET", `planv:${code}`)]);
      if (!raw) return res.status(200).json({ data: null, version: null });
      const parsed = JSON.parse(raw);
      // Plans saved by the first version were wrapped as { data, updatedAt }
      const data = parsed && parsed.data && parsed.updatedAt ? parsed.data : parsed;
      return res.status(200).json({ data, version: version || "legacy" });
    }

    if (req.method === "PUT") {
      const { code, data, base } = readBody(req);
      if (!validCode(code)) return res.status(400).json({ error: "Invalid family code" });
      if (!data || typeof data !== "object" || !Array.isArray(data.week)) {
        return res.status(400).json({ error: "Invalid plan" });
      }
      const body = JSON.stringify(data);
      if (body.length > MAX_BYTES) return res.status(413).json({ error: "Plan is too large" });
      const version = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const result = await redis("EVAL", SAVE_IF_UNCHANGED, "2", `plan:${code}`, `planv:${code}`, body, String(base || ""), version);
      if (Number(result[0]) === 1) return res.status(200).json({ version });
      return res.status(409).json({ conflict: true, version: result[1], data: result[2] ? JSON.parse(result[2]) : null });
    }

    res.setHeader("Allow", "GET, PUT");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
