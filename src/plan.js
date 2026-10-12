import { AISLES, AVOID_ALIASES, DAYS, LIBRARY, MEALS, PACKS, STARTER_WEEK } from "./data.js";

/* ---------- Recipes ---------- */

export const allRecipes = (state) => LIBRARY.concat(state?.custom || []);
export const findRecipe = (state, id) => allRecipes(state).find((r) => r.id === id);
export const rating = (state, id) => state?.ratings?.[id] || 0; // 1 = favourite, -1 = not again

/* ---------- Dates ---------- */

export function mondayOf(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}
export function weekKey(date = new Date()) {
  const d = mondayOf(date);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function dateFromKey(key) {
  const [y, m, d] = String(key).split("-").map(Number);
  return y ? new Date(y, m - 1, d) : mondayOf();
}
export const fmtDay = (d) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
export function weekLabel(key) {
  const mon = dateFromKey(key);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return `${fmtDay(mon)} – ${fmtDay(sun)}`;
}

/* ---------- People ---------- */

// Rough share of an adult portion by age
export function childPortion(age) {
  if (age <= 3) return 0.35;
  if (age <= 8) return 0.5;
  if (age <= 12) return 0.75;
  return 1;
}
export const portions = (state) =>
  Math.max(1, Math.round(((state.adults || 0) + (state.children || []).reduce((t, c) => t + childPortion(c.age), 0)) * 100) / 100);

export function peopleLabel(state) {
  const a = state.adults || 0;
  const kids = state.children || [];
  let out = `${a} adult${a === 1 ? "" : "s"}`;
  if (kids.length) out += ` + ${kids.length} child${kids.length === 1 ? "" : "ren"} (age${kids.length === 1 ? "" : "s"} ${kids.map((c) => c.age).join(", ")})`;
  return out;
}

/* ---------- Which meals are planned ---------- */

export const MEAL_MODES = {
  breakfast: { none: "Off", weekend: "Weekends", all: "Every day" },
  lunchbox: { none: "Off", weekdays: "School days" },
  lunch: { none: "Off", weekend: "Weekends", all: "Every day" },
};

export function mealOn(state, meal, i) {
  if (meal === "dinner") return true;
  const mode = state.mealModes?.[meal] || "none";
  if (mode === "all") return true;
  if (mode === "weekend") return i >= 5;
  if (mode === "weekdays") return i < 5;
  return false;
}

// Lunchbox recipes make boxes, everything else is scaled to the family
export function mealScale(state, meal, recipe) {
  const serves = recipe.serves || 4;
  return meal === "lunchbox" ? (state.lunchboxes || 1) / serves : portions(state) / serves;
}

/* ---------- Allergies and dislikes ---------- */

export function avoidHits(state, recipe) {
  const words = state?.avoid || [];
  if (!words.length || !recipe?.ing) return [];
  const text = [recipe.name, ...recipe.ing.map((i) => i[2])].join(" | ").toLowerCase();
  return words.filter((w) => {
    const key = w.toLowerCase().trim();
    const terms = AVOID_ALIASES[key] || [key.replace(/(es|s)$/, "")];
    return terms.some((t) => t && text.includes(t));
  });
}

/* ---------- Picking meals ---------- */

// Favourites come up about three times as often; "not again" and allergy matches never do
function weightedOrder(state, pool) {
  return pool
    .filter((r) => rating(state, r.id) >= 0 && !avoidHits(state, r).length)
    .map((r) => ({ r, k: Math.random() ** (1 / (rating(state, r.id) > 0 ? 3 : 1)) }))
    .sort((a, b) => b.k - a.k)
    .map((x) => x.r);
}

export function pickRecipe(state, meal, notId) {
  const pool = weightedOrder(state, allRecipes(state).filter((r) => r.meal.includes(meal) && r.id !== notId));
  return pool[0] || null;
}

export function pickWeek(state) {
  const recipes = allRecipes(state);
  const order = {};
  for (const meal of MEALS) {
    order[meal] = weightedOrder(state, recipes.filter((r) => r.meal.includes(meal) && !(meal === "dinner" && r.id === "roast")));
  }
  const roastOk = order.dinner && weightedOrder(state, recipes.filter((r) => r.id === "roast")).length > 0;
  return DAYS.map((_, i) => {
    const day = {};
    for (const meal of MEALS) {
      const list = order[meal];
      day[meal] = list.length ? { r: list[i % list.length].id } : null;
    }
    if (i === 6 && roastOk) day.dinner = { r: "roast" };
    return day;
  });
}

/* ---------- State ---------- */

export function defaultState() {
  return {
    adults: 3,
    children: [],
    lunchboxes: 1,
    mealModes: { breakfast: "none", lunchbox: "none", lunch: "weekend" },
    weekOf: weekKey(),
    week: structuredClone(STARTER_WEEK),
    history: [],
    ticks: {},
    extras: [],
    custom: [],
    ratings: {},
    avoid: [],
    pantry: [],
  };
}

// Fills in anything missing and upgrades plans saved by older versions
export function normalise(s) {
  const d = defaultState();
  if (!s || !Array.isArray(s.week) || s.week.length !== 7) return d;
  const out = { ...d, ...s };
  for (const k of ["ticks", "ratings"]) out[k] = s[k] && typeof s[k] === "object" ? s[k] : {};
  for (const k of ["extras", "custom", "avoid", "pantry", "history", "children"]) out[k] = Array.isArray(s[k]) ? s[k] : [];
  if (s.adults == null) out.adults = s.servings || 2;
  if (!s.children && s.kids) out.children = Array.from({ length: s.kids }, (_, i) => ({ id: `c${i}`, age: 7 }));
  if (!s.mealModes) out.mealModes = { ...d.mealModes, lunch: s.lunchMode || "weekend" };
  if (!s.weekOf) out.weekOf = weekKey();
  if (s.lunchboxes == null) out.lunchboxes = Math.max(1, out.children.length);
  delete out.servings;
  delete out.kids;
  delete out.lunchMode;
  return out;
}

// Keep the last 8 weeks so a good week can be reused
export function archiveWeek(s) {
  const entry = { weekOf: s.weekOf, week: structuredClone(s.week) };
  s.history = [entry, ...(s.history || []).filter((h) => h.weekOf !== s.weekOf)].slice(0, 8);
}

export function startNewWeek(s, how, pastWeek) {
  archiveWeek(s);
  if (how === "fresh") s.week = pickWeek(s);
  if (how === "reuse" && pastWeek) s.week = structuredClone(pastWeek);
  s.week.forEach((day) => MEALS.forEach((m) => { if (day[m]?.double) delete day[m].double; }));
  s.weekOf = weekKey();
  s.ticks = {};
  s.extras = s.extras.filter((x) => !x.done);
}

/* ---------- Cook once, eat twice ---------- */

export function setDouble(s, day, meal, target) {
  const slot = s.week[day][meal];
  if (!slot?.r) return;
  // Clear any leftovers this meal created before
  s.week.forEach((d) => MEALS.forEach((m) => { if (d[m]?.s === "left" && d[m].of === slot.r && d[m].from === `${day}-${meal}`) d[m] = null; }));
  if (!target) {
    delete slot.double;
    return;
  }
  slot.double = true;
  s.week[target.day][target.meal] = { s: "left", of: slot.r, from: `${day}-${meal}` };
}

/* ---------- Quantities, packs and cost ---------- */

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

export const baseName = (name) => String(name).replace(/\s*\(.*?\)/g, "").toLowerCase().trim();

function toBase(q, unit) {
  if (unit === "kg") return [q * 1000, "g"];
  if (unit === "l") return [q * 1000, "ml"];
  return [q, unit || ""];
}

function packOptions(name) {
  const b = baseName(name);
  if (PACKS[b]) return PACKS[b];
  const key = Object.keys(PACKS)
    .filter((k) => b.includes(k))
    .sort((x, y) => y.length - x.length)[0];
  return key ? PACKS[key] : null;
}

// The pack choice that wastes least, e.g. 1.3 kg chicken -> 2 x 650 g
export function packFor(name, qty, unit) {
  const opts = packOptions(name);
  if (!opts || !qty) return null;
  const [q, u] = toBase(qty, unit);
  let best = null;
  for (const [size, pu, price] of opts) {
    if (pu !== u) continue;
    const n = Math.max(1, Math.ceil(q / size - 0.02));
    const waste = n * size - q;
    if (!best || waste < best.waste - 1e-9 || (Math.abs(waste - best.waste) < 1e-9 && n < best.n)) best = { n, size, unit: pu, waste, cost: n * price };
  }
  if (!best) return null;
  let label = "";
  if (best.unit === "g" || best.unit === "ml") label = `${best.n} × ${fmtQty(best.size, best.unit)} pack${best.n === 1 ? "" : "s"}`;
  else if (!best.unit && best.size > 1) label = `${best.n} pack${best.n === 1 ? "" : "s"} of ${best.size}`;
  else if (best.unit === "clove") label = `${best.n} pack${best.n === 1 ? "" : "s"} of 4 bulbs`;
  else if (best.unit === "slice") label = `${best.n} pack${best.n === 1 ? "" : "s"} of ${best.size}`;
  return { ...best, label };
}

export function buildList(state) {
  const items = {};
  const pantry = new Set(state.pantry || []);
  state.week.forEach((day, i) => {
    MEALS.forEach((meal) => {
      if (!mealOn(state, meal, i)) return;
      const slot = day[meal];
      const r = slot?.r && findRecipe(state, slot.r);
      if (!r) return;
      const scale = mealScale(state, meal, r) * (slot.double ? 2 : 1);
      r.ing.forEach(([q, unit, name, aisle]) => {
        const a = AISLES[aisle] ? aisle : "o";
        const [bq, bu] = toBase(q || 0, unit);
        const key = `${a}|${baseName(name)}|${a === "s" ? "" : bu}`;
        items[key] ||= { key, name, base: baseName(name), unit: bu, aisle: a, qty: 0, used: [] };
        if (a !== "s") items[key].qty += bq * scale;
        const label = `${DAYS[i]} ${meal}${slot.double ? " ×2" : ""}`;
        if (!items[key].used.includes(label)) items[key].used.push(label);
      });
    });
  });
  return Object.values(items).map((it) => ({
    ...it,
    pack: it.aisle === "s" ? null : packFor(it.name, it.qty, it.unit),
    atHome: it.aisle !== "s" && pantry.has(it.base),
  }));
}

// Rough cost of what is still to buy
export function listCost(list) {
  const buy = list.filter((it) => it.aisle !== "s" && !it.atHome);
  const priced = buy.filter((it) => it.pack);
  return { total: priced.reduce((t, it) => t + it.pack.cost, 0), priced: priced.length, count: buy.length };
}

/* ---------- Reading ingredients people type or import ---------- */

const FRACTIONS = { "½": ".5", "¼": ".25", "¾": ".75", "⅓": ".33", "⅔": ".67" };

const AISLE_GUESS = [
  [/frozen/, "f"],
  [/chicken|beef|pork|lamb|mince|sausage|bacon|ham\b|salmon|fish|prawn|cod|turkey|chorizo/, "m"],
  [/milk|cheese|cheddar|egg|yog|cream|butter|mozzarella|parmesan|feta|halloumi/, "d"],
  [/bread|bun|wrap|tortilla|pitta|naan|bagel|roll|loaf/, "b"],
  [/salt|pepper$|black pepper|oil|spice|paprika|cumin|oregano|vinegar|stock cube|sugar|honey|cinnamon|turmeric|chilli flakes|soy sauce/, "s"],
  [/tin|pasta|rice|noodle|spaghetti|penne|fusilli|beans|sauce|jar|stock|flour|lentil|oats|chickpea|passata|tomato puree|chopped tomatoes|coconut milk/, "c"],
];

export function parseIng(line) {
  let text = String(line).trim();
  for (const [f, v] of Object.entries(FRACTIONS)) text = text.replace(new RegExp(`(\\d)?${f}`, "g"), (_, d) => (d || "0") + v);
  text = text.replace(/(\d+)\s+(\d+)\/(\d+)/, (_, a, b, c) => String(Number(a) + Number(b) / Number(c)));
  text = text.replace(/(\d+)\/(\d+)/, (_, b, c) => String(Number(b) / Number(c)));
  const m = text.match(/^(\d+(?:[.,]\d+)?)\s*(g|kg|ml|l|tins?|cans?|packs?|jars?|cloves?|bunch(?:es)?|sachets?|tbsp|tsp)?\.?\s+(?:of\s+)?(.+)$/i);
  let q = 0, u = "", n = text;
  if (m) {
    q = parseFloat(m[1].replace(",", "."));
    u = (m[2] || "").toLowerCase().replace(/(es|s)$/, "").replace("can", "tin");
    if (u === "bunche") u = "bunch";
    n = m[3];
    if (u === "l") { u = "ml"; q *= 1000; }
    if (u === "kg") { u = "g"; q *= 1000; }
    if (u === "tbsp" || u === "tsp") { n = `${m[1]} ${m[2]} ${m[3]}`; u = ""; q = 0; }
  }
  n = n.replace(/,.*$/, "").trim() || text;
  const low = n.toLowerCase();
  const a = (AISLE_GUESS.find(([re]) => re.test(low)) || [0, "v"])[1];
  // Staples like oil and spices are "check the cupboard" items, so they carry no amount
  return [a === "s" ? 0 : Math.round(q * 100) / 100, a === "s" ? "" : u, n.slice(0, 60), a];
}

export const ingToLine = ([q, u, n]) => (q ? `${q}${u ? " " + u : ""} ` : "") + n;

const UNITS = ["g", "ml", "kg", "tin", "pack", "jar", "clove", "bunch", "sachet", "pouch", "slice", "bottle"];

// AI and imports send either "400 g chicken" strings or {qty, unit, name, aisle} objects
export function ingFromAny(x) {
  if (typeof x === "string") return parseIng(x);
  if (!x || typeof x !== "object" || !x.name) return null;
  const guess = parseIng(String(x.name));
  return [
    Math.max(0, Number(x.qty) || 0),
    UNITS.includes(x.unit) ? x.unit : "",
    String(x.name).slice(0, 60),
    AISLES[x.aisle] ? x.aisle : guess[3],
  ];
}

// Turn an AI reply or an imported recipe into a safe recipe object
export function cleanIdea(x, meal) {
  if (!x || typeof x !== "object" || !x.name) throw new Error("bad recipe");
  const meals = Array.isArray(meal) ? meal : [meal || "dinner"];
  return {
    id: "ai" + Date.now().toString(36),
    custom: true,
    ai: true,
    name: String(x.name).slice(0, 60),
    pic: String(x.emoji || "🍽️").slice(0, 4),
    mins: Math.min(240, Math.max(5, parseInt(x.minutes, 10) || 30)),
    serves: Math.min(12, Math.max(1, parseInt(x.serves, 10) || 4)),
    meal: meals,
    tags: [],
    ing: (Array.isArray(x.ingredients) ? x.ingredients : []).slice(0, 30).map(ingFromAny).filter((g) => g && g[2]),
    steps: (Array.isArray(x.steps) ? x.steps : []).slice(0, 15).map((s) => String(s).slice(0, 400)),
  };
}

/* ---------- Pictures ---------- */

export function tint(id) {
  let h = 0;
  for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return "t" + (h % 4);
}

// Shrink a phone photo to a small JPEG
export function shrinkImage(file, max = 640, limit = 180000) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const sc = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * sc);
      c.height = Math.round(img.height * sc);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      let q = 0.8;
      let out = c.toDataURL("image/jpeg", q);
      while (out.length > limit && q > 0.3) {
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
