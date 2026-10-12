import { redis, hasRedis, validCode, readBody } from "./_redis.js";

const MAX_BYTES = 300_000;

// GET /api/plan?code=...        -> { data, updatedAt } or { data: null }
// PUT /api/plan { code, data }  -> { updatedAt }
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!hasRedis) return res.status(503).json({ error: "Storage is not connected" });

  try {
    if (req.method === "GET") {
      const code = req.query.code;
      if (!validCode(code)) return res.status(400).json({ error: "Invalid family code" });
      const raw = await redis("GET", `plan:${code}`);
      return res.status(200).json(raw ? JSON.parse(raw) : { data: null });
    }

    if (req.method === "PUT") {
      const { code, data } = readBody(req);
      if (!validCode(code)) return res.status(400).json({ error: "Invalid family code" });
      if (!data || typeof data !== "object" || !Array.isArray(data.week)) {
        return res.status(400).json({ error: "Invalid plan" });
      }
      const updatedAt = Date.now();
      const body = JSON.stringify({ data, updatedAt });
      if (body.length > MAX_BYTES) return res.status(413).json({ error: "Plan is too large" });
      await redis("SET", `plan:${code}`, body);
      return res.status(200).json({ updatedAt });
    }

    res.setHeader("Allow", "GET, PUT");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
