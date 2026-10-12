import { createHash } from "node:crypto";
import { redis, hasRedis, validCode, readBody } from "./_redis.js";

// POST   /api/push { code, subscription } -> turn on the dinner reminder for this phone
// DELETE /api/push { code, endpoint }     -> turn it off
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!hasRedis) return res.status(503).json({ error: "Storage is not connected" });
  const { code, subscription, endpoint } = readBody(req);
  if (!validCode(code)) return res.status(400).json({ error: "Invalid family code" });

  try {
    if (req.method === "POST") {
      if (!subscription?.endpoint?.startsWith("https://") || !subscription.keys?.p256dh || !subscription.keys?.auth) {
        return res.status(400).json({ error: "Invalid subscription" });
      }
      await redis("HSET", `push:${code}`, hash(subscription.endpoint), JSON.stringify(subscription));
      await redis("SADD", "pushfamilies", code);
      return res.status(200).json({ ok: true });
    }
    if (req.method === "DELETE") {
      if (typeof endpoint === "string") await redis("HDEL", `push:${code}`, hash(endpoint));
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

export const hash = (s) => createHash("sha256").update(s).digest("hex").slice(0, 32);
