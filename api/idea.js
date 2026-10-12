import { readBody } from "./_redis.js";
import { hasGemini, askGeminiJson, AiError, RECIPE_SHAPE } from "./_gemini.js";
import { checkFamilyLimit } from "./_limits.js";

const MEAL_WORDS = {
  breakfast: "breakfast",
  lunchbox: "packed lunchbox (eaten cold, no reheating, travels well)",
  lunch: "lunch",
  dinner: "dinner",
};

const list = (x, n = 14) => (Array.isArray(x) ? x.slice(0, n).map((p) => String(p).slice(0, 60)).filter(Boolean) : []);

// POST /api/idea { code, meal, day, people, children: [ages], planned, favourites, dislikes, avoid, wish }
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!hasGemini) return res.status(503).json({ error: "New ideas are not switched on" });

  const b = readBody(req);
  const limit = await checkFamilyLimit(b.code, "idea", 20);
  if (!limit.ok) return res.status(limit.status).json({ error: limit.error });

  const meal = MEAL_WORDS[b.meal] ? b.meal : "dinner";
  const ages = list(b.children, 10).map(Number).filter((n) => n >= 0 && n < 19);
  const avoid = list(b.avoid, 20);
  const prompt = [
    `Suggest ONE easy, quick, family-friendly ${MEAL_WORDS[meal]} recipe for a UK family: ${String(b.people || "4 people").slice(0, 80)}${b.day ? `, for ${String(b.day).slice(0, 3)}` : ""}.`,
    "Use ingredients that are easy to find in UK supermarkets such as Aldi, Lidl or Tesco. Aim for 30 minutes or less.",
    ages.length ? `It must suit children aged ${ages.join(", ")}.` : "",
    avoid.length ? `It must NOT contain or be: ${avoid.join(", ")}. This is about allergies and strong dislikes, so be strict.` : "",
    list(b.favourites).length ? `The family loves: ${list(b.favourites).join(", ")}. Suggest something they'd enjoy in a similar spirit, but new.` : "",
    list(b.dislikes).length ? `They did not enjoy: ${list(b.dislikes).join(", ")}.` : "",
    list(b.planned).length ? `Make it different from these meals already planned this week: ${list(b.planned).join(", ")}.` : "",
    b.wish ? `The family asks: "${String(b.wish).slice(0, 120)}".` : "",
    meal === "lunchbox" ? "Write quantities for 4 lunchboxes." : "Write quantities for 4 servings, in metric units.",
    RECIPE_SHAPE,
    "At most 10 ingredients and 6 short steps.",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const idea = await askGeminiJson([{ text: prompt }]);
    return res.status(200).json({ idea: { ...idea, serves: 4 } });
  } catch (e) {
    return res.status(e instanceof AiError ? e.status : 502).json({ error: e.message || "Couldn't get an idea. Try again." });
  }
}
