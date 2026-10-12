import { readBody } from "./_redis.js";
import { hasGemini, askGeminiJson, AiError, RECIPE_SHAPE } from "./_gemini.js";
import { checkFamilyLimit } from "./_limits.js";

const MAX_IMAGE = 3_500_000;

// POST /api/import { code, url }   -> { recipe }  (reads the recipe card most recipe websites include)
// POST /api/import { code, image } -> { recipe }  (photo of a cookbook page, needs GEMINI_API_KEY)
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { code, url, image } = readBody(req);

  const limit = await checkFamilyLimit(code, "import", 30);
  if (!limit.ok) return res.status(limit.status).json({ error: limit.error });

  try {
    if (image) {
      if (!hasGemini) return res.status(503).json({ error: "Reading photos needs the AI key to be set up" });
      const m = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(String(image));
      if (!m || image.length > MAX_IMAGE) return res.status(400).json({ error: "Photo is too large or not an image" });
      const recipe = await askGeminiJson([
        { inline_data: { mime_type: m[1], data: m[2] } },
        {
          text:
            "This is a photo of a recipe: a cookbook page, a handwritten card or a screenshot. Copy the recipe exactly as written, " +
            "keeping the original quantities and the number of servings it makes.\n" +
            RECIPE_SHAPE +
            '\nIf there is no recipe in the photo, reply {"error":"no recipe"}.',
        },
      ]);
      if (recipe.error || !recipe.name) return res.status(422).json({ error: "Couldn't find a recipe in that photo" });
      return res.status(200).json({ recipe });
    }

    const target = safeUrl(url);
    if (!target) return res.status(400).json({ error: "That doesn't look like a web link" });
    const page = await fetch(target, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; FamilyTable/1.0; recipe import)", Accept: "text/html" },
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
    });
    if (!page.ok) return res.status(422).json({ error: `That website said no (error ${page.status})` });
    const html = (await page.text()).slice(0, 3_000_000);

    const fromCard = recipeFromJsonLd(html);
    if (fromCard) return res.status(200).json({ recipe: { ...fromCard, source: target.href } });

    if (!hasGemini) return res.status(422).json({ error: "Couldn't find a recipe on that page" });
    const text = html
      .replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .slice(0, 20000);
    const recipe = await askGeminiJson([
      {
        text:
          "Below is the text of a recipe web page. Extract the recipe, keeping its quantities and number of servings.\n" +
          RECIPE_SHAPE +
          '\nIf there is no recipe, reply {"error":"no recipe"}.\n\nPAGE TEXT:\n' +
          text,
      },
    ]);
    if (recipe.error || !recipe.name) return res.status(422).json({ error: "Couldn't find a recipe on that page" });
    return res.status(200).json({ recipe: { ...recipe, source: target.href } });
  } catch (e) {
    if (e instanceof AiError) return res.status(e.status).json({ error: e.message });
    if (e.name === "TimeoutError") return res.status(504).json({ error: "That website took too long to answer" });
    return res.status(502).json({ error: "Couldn't read that recipe. Try another link." });
  }
}

function safeUrl(raw) {
  try {
    const u = new URL(String(raw).trim());
    if (!["http:", "https:"].includes(u.protocol)) return null;
    const h = u.hostname.toLowerCase();
    if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal") || /^\[|^(10|127|0)\.|^192\.168\.|^169\.254\.|^172\.(1[6-9]|2\d|3[01])\./.test(h)) return null;
    return u;
  } catch {
    return null;
  }
}

const decode = (s) =>
  String(s ?? "")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();

function findRecipe(node) {
  if (!node || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const n of node) {
      const r = findRecipe(n);
      if (r) return r;
    }
    return null;
  }
  const type = [].concat(node["@type"] || []);
  if (type.includes("Recipe")) return node;
  return findRecipe(node["@graph"]) || findRecipe(node.mainEntity);
}

function steps(instr) {
  if (!instr) return [];
  if (typeof instr === "string") return decode(instr).split(/(?<=\.)\s+(?=[A-Z])/).filter(Boolean);
  return [].concat(instr).flatMap((s) => {
    if (typeof s === "string") return [decode(s)];
    if (s?.itemListElement) return steps(s.itemListElement);
    return s?.text ? [decode(s.text)] : [];
  });
}

const minutes = (iso) => {
  const m = /P(?:\d+D)?T?(?:(\d+)H)?(?:(\d+)M)?/.exec(String(iso || ""));
  return m ? Number(m[1] || 0) * 60 + Number(m[2] || 0) : 0;
};

export function recipeFromJsonLd(html) {
  const blocks = html.match(/<script[^>]*application\/ld\+json[^>]*>[\s\S]*?<\/script>/gi) || [];
  for (const block of blocks) {
    let data;
    try {
      data = JSON.parse(block.replace(/^<script[^>]*>/i, "").replace(/<\/script>$/i, "").trim());
    } catch {
      continue;
    }
    const r = findRecipe(data);
    if (!r || !r.recipeIngredient) continue;
    const yieldText = [].concat(r.recipeYield || []).join(" ");
    return {
      name: decode(r.name).slice(0, 60),
      minutes: minutes(r.totalTime) || minutes(r.prepTime) + minutes(r.cookTime) || 30,
      serves: parseInt(yieldText.match(/\d+/)?.[0], 10) || 4,
      ingredients: [].concat(r.recipeIngredient).map(decode).filter(Boolean),
      steps: steps(r.recipeInstructions).slice(0, 15),
    };
  }
  return null;
}
