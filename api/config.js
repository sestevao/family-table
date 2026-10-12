import { hasRedis } from "./_redis.js";
import { hasGemini } from "./_gemini.js";

// Tells the app which optional features are switched on
export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({
    sync: hasRedis,
    ai: hasGemini,
    reminders: hasRedis && Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
    vapidPublicKey: process.env.VAPID_PUBLIC_KEY || null,
  });
}
