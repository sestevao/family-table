import webpush from "web-push";
import { redis, hasRedis } from "./_redis.js";
import { LIBRARY, DAYS, SPECIAL } from "../src/data.js";

// Runs once a day from Vercel Cron (see vercel.json) and sends each family "what's for dinner" to their phones
export default async function handler(req, res) {
  if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Not allowed" });
  }
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = process.env;
  if (!hasRedis || !VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return res.status(200).json({ skipped: "Reminders are not set up" });
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:family-table@example.com", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

  const today = DAYS.indexOf(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", weekday: "short" }).format(new Date()));
  const families = (await redis("SMEMBERS", "pushfamilies")) || [];
  let sent = 0;

  for (const code of families) {
    const subs = (await redis("HGETALL", `push:${code}`)) || [];
    if (!subs.length) {
      await redis("SREM", "pushfamilies", code);
      continue;
    }
    const raw = await redis("GET", `plan:${code}`);
    if (!raw) continue;
    let plan = JSON.parse(raw);
    if (plan.data && plan.updatedAt) plan = plan.data;
    const payload = JSON.stringify(message(plan, today));

    for (let i = 0; i < subs.length; i += 2) {
      try {
        await webpush.sendNotification(JSON.parse(subs[i + 1]), payload, { TTL: 6 * 3600 });
        sent++;
      } catch (e) {
        if (e.statusCode === 404 || e.statusCode === 410) await redis("HDEL", `push:${code}`, subs[i]); // phone unsubscribed
      }
    }
  }
  return res.status(200).json({ families: families.length, sent });
}

function describe(plan, slot) {
  if (!slot) return null;
  const recipes = LIBRARY.concat(plan.custom || []);
  if (slot.r) return recipes.find((r) => r.id === slot.r) || null;
  if (slot.s === "left") {
    const of = recipes.find((r) => r.id === slot.of);
    return { name: of ? `Leftovers: ${of.name}` : "Leftovers", ing: [] };
  }
  if (slot.s) return { name: SPECIAL[slot.s]?.name || "No cooking", ing: [] };
  if (slot.t) return { name: slot.t, ing: [] };
  return null;
}

function message(plan, today) {
  const tonight = describe(plan, plan.week?.[today]?.dinner);
  const tomorrow = today < 6 ? describe(plan, plan.week?.[today + 1]?.dinner) : null;
  const title = tonight ? `Tonight: ${tonight.name}` : "Nothing planned for dinner tonight";
  const parts = [];
  if (tonight?.mins) parts.push(`Ready in about ${tonight.mins} min.`);
  if (!tonight) parts.push("Tap to pick something quick.");
  if (tomorrow) {
    const meat = (tomorrow.ing || []).filter((i) => i[3] === "m" || i[3] === "f").map((i) => i[2].replace(/\s*\(.*?\)/g, ""));
    parts.push(`Tomorrow: ${tomorrow.name}.`);
    if (meat.length) parts.push(`If your ${meat.slice(0, 2).join(" or ")} is frozen, take it out tonight.`);
  }
  return { title, body: parts.join(" "), url: "/" };
}
