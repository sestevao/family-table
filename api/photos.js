import { redis, hasRedis, validCode, readBody } from "./_redis.js";

const MAX_PHOTO = 600_000;
const useBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
const isBlobUrl = (s) => typeof s === "string" && /^https:\/\/[a-z0-9.-]+\.public\.blob\.vercel-storage\.com\//i.test(s);

// GET    /api/photos?code=...          -> { photos: { recipeId: url or data URL } }
// PUT    /api/photos { code, id, src } -> { ok: true, src }
// DELETE /api/photos { code, id }      -> { ok: true }
// With Vercel Blob connected, photos are stored as files and the database keeps only their links.
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
    const previous = await redis("HGET", `photos:${code}`, id);

    if (req.method === "PUT") {
      let stored = src;
      if (isBlobUrl(src)) {
        stored = src; // restoring a backup that already points at a stored file
      } else if (typeof src !== "string" || !/^data:image\/(jpeg|png|webp);base64,/.test(src) || src.length > MAX_PHOTO) {
        return res.status(400).json({ error: "Photo is too large or not an image" });
      } else if (useBlob) {
        const { put } = await import("@vercel/blob");
        const [meta, b64] = src.split(",");
        const type = meta.slice(5, meta.indexOf(";"));
        const blob = await put(`photos/${code}/${id}.${type.split("/")[1]}`, Buffer.from(b64, "base64"), {
          access: "public",
          contentType: type,
          addRandomSuffix: true,
        });
        stored = blob.url;
      }
      await redis("HSET", `photos:${code}`, id, stored);
      if (previous && previous !== stored) await removeBlob(previous);
      return res.status(200).json({ ok: true, src: stored });
    }

    if (req.method === "DELETE") {
      await redis("HDEL", `photos:${code}`, id);
      if (previous) await removeBlob(previous);
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", "GET, PUT, DELETE");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

async function removeBlob(url) {
  if (!useBlob || !isBlobUrl(url)) return;
  try {
    const { del } = await import("@vercel/blob");
    await del(url);
  } catch {}
}
