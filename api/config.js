import { hasRedis } from "./_redis.js";

// Tells the app which optional features are switched on
export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({ sync: hasRedis, ai: Boolean(process.env.GEMINI_API_KEY) });
}
