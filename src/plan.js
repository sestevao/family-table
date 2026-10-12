import { AISLES, DAYS, LIBRARY, STARTER_WEEK } from "./data.js";

export const allRecipes = (state) => LIBRARY.concat(state?.custom || []);
export const findRecipe = (state, id) => allRecipes(state).find((r) => r.id === id);

function shuffle(a) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pickWeek(state) {
  const recipes = allRecipes(state);
  const dinners = shuffle(recipes.filter((r) => r.meal.includes("dinner") && r.id !== "roast"));
  const lunches = shuffle(recipes.filter((r) => r.meal.includes("lunch")));
  return DAYS.map((_, i) => ({
    dinner: { r: i === 6 ? "roast" : dinners[i % dinners.length].id },
    lunch: { r: lunches[i % lunches.length].id },
  }));
}

export function defaultState() {
  return { adults: 3, kids: 0, lunchMode: "weekend", week: structuredClone(STARTER_WEEK), ticks: {}, extras: [], custom: [] };
}

export function normalise(s) {
  const d = defaultState();
  if (!s || !Array.isArray(s.week) || s.week.length !== 7) return d;
  const out = { ...d, ...s, ticks: s.ticks || {}, extras: s.extras || [], custom: s.custom || [] };
  if (s.adults == null) {
    out.adults = s.servings || 2;
    out.kids = 0;
  }
  delete out.servings;
  return out;
}

export const lunchOn = (state, i) => state.lunchMode === "all" || (state.lunchMode === "weekend" && i >= 5);

// Children eat roughly half an adult portion
export const portions = (state) => Math.max(1, (state.adults || 0) + (state.kids || 0) * 0.5);

export function peopleLabel(state) {
  const a = state.adults || 0;
  const k = state.kids || 0;
  return `${a} adult${a === 1 ? "" : "s"}${k ? ` + ${k} child${k === 1 ? "" : "ren"}` : ""}`;
}

export function fmtQty(q, unit) {
  if (!q) return "";
  if (unit === "g") return q >= 1000 ? `${Math.round(q / 100) / 10} kg` : `${Math.round(q / 10) * 10} g`;
  if (unit === "kg") return `${Math.round(q * 10) / 10} kg`;
  if (unit === "ml") return q >= 1000 ? `${Math.round(q / 100) / 10} l` : `${Math.round(q / 10) * 10} ml`;
  const n = Math.ceil(q - 0.01);
  if (!unit) return String(n);
  if (n === 1) return `1 ${unit}`;
  return `${n} ${unit === "bunch" ? "bunches" : unit.endsWith("s") ? unit : unit + "s"}`;
}

export function buildList(state) {
  const items = {};
  const total = portions(state);
  state.week.forEach((day, i) => {
    ["lunch", "dinner"].forEach((meal) => {
      if (meal === "lunch" && !lunchOn(state, i)) return;
      const slot = day[meal];
      const r = slot?.r && findRecipe(state, slot.r);
      if (!r) return;
      const scale = total / (r.serves || 4);
      r.ing.forEach(([q, unit, name, aisle]) => {
        const a = AISLES[aisle] ? aisle : "o";
        const key = `${a}|${name.toLowerCase()}|${a === "s" ? "" : unit}`;
        items[key] ||= { key, name, unit, aisle: a, qty: 0, used: [] };
        if (a !== "s") items[key].qty += (q || 0) * scale;
        const label = `${DAYS[i]} ${meal}`;
        if (!items[key].used.includes(label)) items[key].used.push(label);
      });
    });
  });
  return Object.values(items);
}

const AISLE_GUESS = [
  [/chicken|beef|pork|lamb|mince|sausage|bacon|ham|salmon|fish|prawn|cod|turkey/, "m"],
  [/milk|cheese|cheddar|egg|yog|cream|butter|mozzarella|parmesan/, "d"],
  [/bread|bun|wrap|tortilla|pitta|naan|bagel|roll/, "b"],
  [/frozen|peas/, "f"],
  [/tin|pasta|rice|noodle|spaghetti|penne|beans|sauce|jar|stock|flour|lentil/, "c"],
  [/salt|pepper|oil|spice|paprika|cumin|oregano|vinegar/, "s"],
];

export function parseIng(line) {
  const m = line.trim().match(/^(\d+(?:[.,]\d+)?)\s*(g|kg|ml|l|tins?|packs?|jars?|cloves?|tbsp|tsp)?\s+(.+)$/i);
  let q = 0, u = "", n = line.trim();
  if (m) {
    q = parseFloat(m[1].replace(",", "."));
    u = (m[2] || "").toLowerCase().replace(/s$/, "");
    n = m[3];
    if (u === "l") { u = "ml"; q *= 1000; }
    if (u === "tbsp" || u === "tsp") { n = `${m[1]} ${m[2]} ${m[3]}`; u = ""; q = 0; }
  }
  const low = n.toLowerCase();
  const a = (AISLE_GUESS.find(([re]) => re.test(low)) || [0, "v"])[1];
  return [q, u, n, a];
}

export const ingToLine = ([q, u, n]) => (q ? `${q}${u ? " " + u : ""} ` : "") + n;

const UNITS = ["g", "ml", "kg", "tin", "pack", "jar", "clove", "bunch", "sachet", "pouch", "slice", "bottle"];

// Turn an AI reply into a safe recipe object
export function cleanIdea(x, meal) {
  if (!x || typeof x !== "object" || !x.name) throw new Error("bad idea");
  return {
    id: "ai" + Date.now().toString(36),
    custom: true,
    ai: true,
    name: String(x.name).slice(0, 60),
    pic: String(x.emoji || "🍽️").slice(0, 4),
    mins: Math.min(120, Math.max(5, parseInt(x.minutes, 10) || 30)),
    meal: [meal],
    tags: [],
    ing: (Array.isArray(x.ingredients) ? x.ingredients : [])
      .slice(0, 20)
      .map((g) => [
        Math.max(0, Number(g.qty) || 0),
        UNITS.includes(g.unit) ? g.unit : "",
        String(g.name || "").slice(0, 50),
        AISLES[g.aisle] ? g.aisle : "o",
      ])
      .filter((g) => g[2]),
    steps: (Array.isArray(x.steps) ? x.steps : []).slice(0, 8).map((s) => String(s).slice(0, 240)),
  };
}

export function tint(id) {
  let h = 0;
  for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return "t" + (h % 4);
}

export function mondayOfThisWeek() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

// Shrink a phone photo to a small JPEG so it syncs quickly
export function shrinkImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const sc = Math.min(1, 640 / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * sc);
      c.height = Math.round(img.height * sc);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      let q = 0.75;
      let out = c.toDataURL("image/jpeg", q);
      while (out.length > 180000 && q > 0.3) {
        q -= 0.15;
        out = c.toDataURL("image/jpeg", q);
      }
      resolve(out);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("bad image"));
    };
    img.src = url;
  });
}
