import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { defaultState, normalise, setDouble } from "../src/plan.js";
import App from "../src/App.jsx";
import WeekView from "../src/components/WeekView.jsx";
import ShopView from "../src/components/ShopView.jsx";
import RecipesView from "../src/components/RecipesView.jsx";
import { SlotSheet, RecipeSheet, RecipeForm, ImportSheet } from "../src/components/sheets.jsx";
import { HouseholdSheet, NewWeekSheet, PastWeeksSheet, SettingsSheet, WelcomeSheet } from "../src/components/family.jsx";

// Renders every screen once with a busy example plan, to catch mistakes before they reach a phone
globalThis.location ??= { origin: "https://example.vercel.app", search: "", pathname: "/" };

const s = normalise(defaultState());
s.children = [{ id: "a", age: 4 }];
s.avoid = ["mushrooms"];
s.ratings = { fajita: 1, bolognese: -1 };
s.mealModes.breakfast = "all";
s.mealModes.lunchbox = "weekdays";
s.pantry = ["penne"];
s.extras = [{ id: "x1", text: "Milk", done: false }];
s.history = [{ weekOf: "2026-10-05", week: structuredClone(s.week) }];
setDouble(s, 0, "dinner", { day: 1, meal: "dinner" });

const noop = () => {};
const app = {
  state: s, update: noop, photos: {}, savePhoto: async () => {}, toast: noop, code: "fam-abcde-fghjk-mnpqr",
  config: { sync: true, ai: true, reminders: true }, joinFamily: () => true, startFamily: noop, leaveFamily: noop, replaceState: noop,
};

const screens = {
  App: <App />,
  Week: <WeekView state={s} photos={{}} openSlot={noop} openHousehold={noop} openPastWeeks={noop} askNewWeek={noop} />,
  Shopping: <ShopView state={s} update={noop} toast={noop} showText={noop} />,
  Recipes: <RecipesView state={s} photos={{}} openRecipe={noop} newRecipe={noop} openImport={noop} />,
  "Meal with cook double": <SlotSheet app={app} day={0} meal="dinner" close={noop} />,
  "Leftovers meal": <SlotSheet app={app} day={1} meal="dinner" close={noop} />,
  "Lunchbox meal": <SlotSheet app={app} day={2} meal="lunchbox" close={noop} />,
  Recipe: <RecipeSheet app={app} id="chickpasta" close={noop} edit={noop} confirm={noop} />,
  "Recipe form": <RecipeForm app={app} recipe={null} close={noop} />,
  Import: <ImportSheet app={app} close={noop} onImported={noop} />,
  Household: <HouseholdSheet app={app} close={noop} />,
  "New week": <NewWeekSheet app={app} close={noop} />,
  "Past weeks": <PastWeeksSheet app={app} close={noop} confirm={noop} />,
  Settings: <SettingsSheet app={app} close={noop} confirm={noop} />,
  Welcome: <WelcomeSheet app={app} close={noop} />,
};

describe("screens render", () => {
  for (const [name, el] of Object.entries(screens)) {
    it(name, () => {
      expect(renderToString(el).length).toBeGreaterThan(100);
    });
  }

  it("shows the important details", () => {
    const week = renderToString(screens.Week);
    expect(week).toContain("3 adults + 1 child (age 4)");
    expect(week).toContain("cook double");
    expect(week).toContain("Leftovers: Creamy chicken");
    expect(week).toContain("⚠ <!-- -->mushrooms");
    const shop = renderToString(screens.Shopping);
    expect(shop).toContain("Rough cost");
    expect(shop).toContain("Check the cupboard");
    expect(shop).toContain("Milk");
  });
});
