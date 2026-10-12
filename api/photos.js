import { redis, hasRedis, validCode, readBody } from "./_redis.js";

const MAX_PHOTO = 250_000;

// GET    /api/photos?code=...          -> { photos: { recipeId: dataUrl } }
// PUT    /api/photos { code, id, src } -> { ok: true }
// DELETE /api/photos { code, id }      -> { ok: true }
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!hasRedis) return res.status(503).json({ error: "Storage is not connected" });

  try {
    if (req.method === "GET") {
      const code = req.query.code;
      if (!validCode(code)) return res.status(400).json({ error: "Invalid family code" });
      const flat = (await redis("HGETALL", `photos:${code}`)) || [];
      const photos = {};
      for (let i = 0; i < flat.length; i += 2) photos[flat[i]] = flat[i + 1];
      return res.status(200).json({ photos });
    }

    const { code, id, src } = readBody(req);
    if (!validCode(code)) return res.status(400).json({ error: "Invalid family code" });
    if (typeof id !== "string" || !/^[A-Za-z0-9_-]{1,40}$/.test(id)) {
      return res.status(400).json({ error: "Invalid recipe" });
    }

    if (req.method === "PUT") {
      if (typeof src !== "string" || !src.startsWith("data:image/") || src.length > MAX_PHOTO) {
        return res.status(400).json({ error: "Photo is too large or not an image" });
      }
      await redis("HSET", `photos:${code}`, id, src);
      return res.status(200).json({ ok: true });
    }

    if (req.method === "DELETE") {
      await redis("HDEL", `photos:${code}`, id);
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", "GET, PUT, DELETE");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
