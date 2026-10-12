import { redis, hasRedis, validCode, readBody } from "./_redis.js";

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const IDEAS_PER_HOUR = 20;

// POST /api/idea { code, meal, day, people, kids, planned: [names], wish }
// -> { idea: { name, emoji, minutes, ingredients: [...], steps: [...] } }
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(503).json({ error: "New ideas are not switched on" });

  const { code, meal, day, people, kids, planned, wish } = readBody(req);

  // Only families with a saved plan can ask, with a simple hourly limit to protect the free quota
  if (hasRedis) {
    if (!validCode(code) || !(await redis("EXISTS", `plan:${code}`))) {
      return res.status(403).json({ error: "Unknown family" });
    }
    const bucket = `idea:${code}:${Math.floor(Date.now() / 3_600_000)}`;
    const used = await redis("INCR", bucket);
    if (used === 1) await redis("EXPIRE", bucket, 3600);
    if (used > IDEAS_PER_HOUR) return res.status(429).json({ error: "Too many ideas this hour" });
  }

  const mealName = meal === "lunch" ? "lunch" : "dinner";
  const prompt = [
    `Suggest ONE easy, quick, family-friendly ${mealName} recipe for a UK family of ${String(people || "4").slice(0, 40)}${day ? ` (${String(day).slice(0, 3)})` : ""}.`,
    "Use ingredients that are easy to find in UK supermarkets such as Aldi, Lidl or Tesco. Aim for 30 minutes or less.",
    kids ? "It must suit children." : "",
    Array.isArray(planned) && planned.length
      ? `Make it different from these meals already planned this week: ${planned.slice(0, 14).map((p) => String(p).slice(0, 60)).join(", ")}.`
      : "",
    wish ? `The family asks: "${String(wish).slice(0, 120)}".` : "",
    "Write quantities for 4 servings, in metric units.",
    'Reply with only a JSON object in this shape: {"name":"...","emoji":"one food emoji","minutes":25,"ingredients":[{"qty":400,"unit":"g","name":"chicken thighs","aisle":"m"}],"steps":["short step"]}',
    'unit is one of: g, ml, kg, tin, pack, jar, clove, bunch, sachet, pouch, bottle, or "" for a count.',
    "aisle is one of: v (fruit and veg), m (meat and fish), d (dairy and eggs), b (bread), c (tins, pasta, rice, jars), f (frozen), s (cupboard staples like oil, salt and spices; use qty 0).",
    "At most 10 ingredients and 6 short steps.",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 1 },
      }),
    });
    const json = await r.json();
    if (r.status === 429) return res.status(429).json({ error: "The free AI limit was reached. Try again later." });
    if (!r.ok) return res.status(502).json({ error: json.error?.message || "AI request failed" });
    const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    const idea = JSON.parse(text.slice(start, end + 1));
    return res.status(200).json({ idea });
  } catch (e) {
    return res.status(502).json({ error: "Couldn't get an idea. Try again." });
  }
}
