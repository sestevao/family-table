import { describe, expect, it } from "vitest";
import {
  avoidHits, buildList, childPortion, cleanIdea, defaultState, findRecipe, listCost, mealOn, normalise,
  packFor, parseIng, pickWeek, portions, setDouble, startNewWeek, weekKey,
} from "../src/plan.js";
import { recipeFromJsonLd } from "../api/import.js";

const fresh = () => normalise(defaultState());
const item = (list, name) => list.find((i) => i.base === name);

describe("portions", () => {
  it("counts children by age", () => {
    expect(childPortion(2)).toBe(0.35);
    expect(childPortion(6)).toBe(0.5);
    expect(childPortion(10)).toBe(0.75);
    expect(childPortion(15)).toBe(1);
    const s = { ...fresh(), adults: 2, children: [{ id: "a", age: 4 }, { id: "b", age: 11 }] };
    expect(portions(s)).toBe(3.25);
  });
});

describe("shopping list", () => {
  it("adds up the same ingredient across the week", () => {
    const s = { ...fresh(), adults: 4, children: [] };
    // Starter week dinners: chicken pasta 400 g + fajitas 500 g + stir-fry 400 g
    expect(item(buildList(s), "chicken breast").qty).toBe(1300);
  });

  it("scales to the family", () => {
    const s = { ...fresh(), adults: 2, children: [] };
    expect(item(buildList(s), "chicken breast").qty).toBe(650);
  });

  it("doubles a cook-twice meal and fills the leftovers slot", () => {
    const s = { ...fresh(), adults: 4 };
    setDouble(s, 0, "dinner", { day: 1, meal: "lunch" });
    expect(s.week[1].lunch).toMatchObject({ s: "left", of: "chickpasta" });
    expect(item(buildList(s), "penne").qty).toBe(800);
    setDouble(s, 0, "dinner", null);
    expect(s.week[1].lunch).toBeNull();
    expect(item(buildList(s), "penne").qty).toBe(400);
  });

  it("only counts meals that are switched on", () => {
    const s = fresh();
    expect(mealOn(s, "lunch", 0)).toBe(false);
    expect(mealOn(s, "lunch", 5)).toBe(true);
    expect(item(buildList(s), "porridge oats")).toBeUndefined();
    s.mealModes.breakfast = "all";
    expect(item(buildList(s), "porridge oats")).toBeDefined();
  });

  it("makes lunchboxes per box, not per person", () => {
    const s = { ...fresh(), adults: 2, lunchboxes: 2 };
    s.mealModes.lunchbox = "weekdays";
    s.week.forEach((d) => (d.lunchbox = null));
    s.week[0].lunchbox = { r: "hamwraps" };
    expect(item(buildList(s), "apples").qty).toBe(2);
  });

  it("moves cupboard items out of the buy list and the cost", () => {
    const s = fresh();
    const before = listCost(buildList(s)).total;
    s.pantry = ["spaghetti", "penne"];
    const list = buildList(s);
    expect(item(list, "penne").atHome).toBe(true);
    expect(listCost(list).total).toBeLessThan(before);
  });
});

describe("pack sizes", () => {
  it("picks the pack that wastes least", () => {
    expect(packFor("chicken breast", 1300, "g")).toMatchObject({ n: 2, size: 650 });
    expect(packFor("peppers", 4, "")).toMatchObject({ n: 2, size: 3, label: "2 packs of 3" });
    expect(packFor("chopped tomatoes (400 g)", 3, "tin")).toMatchObject({ n: 3 });
    expect(packFor("gnocchi", 1, "kg")).toMatchObject({ n: 2, size: 500 });
    expect(packFor("unicorn steaks", 2, "")).toBeNull();
  });
});

describe("allergies, favourites and picking", () => {
  it("flags recipes with avoided foods, including hidden ones", () => {
    const s = { ...fresh(), avoid: ["mushrooms", "nuts"] };
    expect(avoidHits(s, findRecipe(s, "chickpasta"))).toEqual(["mushrooms"]);
    expect(avoidHits(s, findRecipe(s, "gnocchi"))).toEqual(["nuts"]); // pesto has pine nuts
    expect(avoidHits(s, findRecipe(s, "bolognese"))).toEqual([]);
  });

  it("never picks avoided or 'not again' recipes for a new week", () => {
    const s = { ...fresh(), avoid: ["fish"], ratings: { bolognese: -1 } };
    for (let n = 0; n < 20; n++) {
      const ids = pickWeek(s).map((d) => d.dinner?.r);
      expect(ids).not.toContain("salmon");
      expect(ids).not.toContain("fishwraps");
      expect(ids).not.toContain("bolognese");
    }
  });
});

describe("weeks", () => {
  it("archives the old week when starting a new one", () => {
    const s = { ...fresh(), weekOf: "2026-10-05", ticks: { x: 1 } };
    startNewWeek(s, "keep");
    expect(s.weekOf).toBe(weekKey());
    expect(s.history[0].weekOf).toBe("2026-10-05");
    expect(s.ticks).toEqual({});
  });

  it("upgrades plans saved by the first version", () => {
    const old = { servings: 3, lunchMode: "all", week: fresh().week, ticks: {}, extras: [], custom: [] };
    const s = normalise(old);
    expect(s.adults).toBe(3);
    expect(s.children).toEqual([]);
    expect(s.mealModes.lunch).toBe("all");
    expect(s.weekOf).toBe(weekKey());
    expect(s).not.toHaveProperty("servings");
  });
});

describe("reading ingredients", () => {
  it("understands common recipe lines", () => {
    expect(parseIng("400g chopped tomatoes")).toEqual([400, "g", "chopped tomatoes", "c"]);
    expect(parseIng("2 tins chickpeas")).toEqual([2, "tin", "chickpeas", "c"]);
    expect(parseIng("½ cucumber")).toEqual([0.5, "", "cucumber", "v"]);
    expect(parseIng("1.5kg potatoes")).toEqual([1500, "g", "potatoes", "v"]);
    expect(parseIng("2 tbsp olive oil")).toEqual([0, "", "2 tbsp olive oil", "s"]);
    expect(parseIng("500 g chicken thighs, diced")).toEqual([500, "g", "chicken thighs", "m"]);
  });

  it("cleans AI and imported recipes", () => {
    const r = cleanIdea({ name: "Test", minutes: "20", serves: "6", ingredients: ["300g penne", { qty: 1, unit: "bogus", name: "lemon", aisle: "zz" }], steps: ["Cook"] }, ["dinner"]);
    expect(r.serves).toBe(6);
    expect(r.ing).toEqual([[300, "g", "penne", "c"], [1, "", "lemon", "v"]]);
  });

  it("reads the recipe card from a web page", () => {
    const html = `<html><script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"WebPage"},{"@type":"Recipe","name":"Easy chilli &amp; rice","recipeYield":"Serves 6","totalTime":"PT45M","recipeIngredient":["500g beef mince","1 onion"],"recipeInstructions":[{"@type":"HowToStep","text":"Fry the mince."},{"@type":"HowToStep","text":"Add the onion."}]}]}</script></html>`;
    expect(recipeFromJsonLd(html)).toEqual({
      name: "Easy chilli & rice",
      minutes: 45,
      serves: 6,
      ingredients: ["500g beef mince", "1 onion"],
      steps: ["Fry the mince.", "Add the onion."],
    });
  });
});
