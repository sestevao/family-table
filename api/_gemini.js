// Small Google Gemini client shared by the "new idea" and "import a recipe" functions
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

export const hasGemini = Boolean(process.env.GEMINI_API_KEY);

export class AiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

// parts: [{ text }] or [{ inline_data: { mime_type, data } }, { text }]
export async function askGeminiJson(parts) {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.9 },
    }),
  });
  const json = await r.json().catch(() => ({}));
  if (r.status === 429) throw new AiError("The free AI limit was reached. Try again later.", 429);
  if (!r.ok) throw new AiError(json.error?.message || "AI request failed", 502);
  const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < start) throw new AiError("The AI reply wasn't a recipe", 502);
  return JSON.parse(text.slice(start, end + 1));
}

export const RECIPE_SHAPE =
  'Reply with only a JSON object in this shape: {"name":"...","emoji":"one food emoji","minutes":25,"serves":4,"ingredients":[{"qty":400,"unit":"g","name":"chicken thighs","aisle":"m"}],"steps":["short step"]}\n' +
  'unit is one of: g, ml, tin, pack, jar, clove, bunch, sachet, pouch, bottle, or "" for a count. Convert kg to g and litres to ml.\n' +
  "aisle is one of: v (fruit and veg), m (meat and fish), d (dairy and eggs), b (bread), c (tins, pasta, rice, jars), f (frozen), s (cupboard staples like oil, salt and spices; use qty 0).";
