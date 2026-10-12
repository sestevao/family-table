import { useEffect, useRef, useState } from "react";
import { useFamilyPlan } from "./useFamilyPlan.js";
import { buildList, pickWeek, weekKey, weekLabel, archiveWeek } from "./plan.js";
import { local } from "./api.js";
import { useToast } from "./components/ui.jsx";
import WeekView from "./components/WeekView.jsx";
import ShopView from "./components/ShopView.jsx";
import RecipesView from "./components/RecipesView.jsx";
import { SlotSheet, RecipeSheet, RecipeForm, ConfirmSheet, TextSheet, ImportSheet } from "./components/sheets.jsx";
import { WelcomeSheet, SettingsSheet, HouseholdSheet, NewWeekSheet, PastWeeksSheet } from "./components/family.jsx";

const TABS = [
  { id: "week", label: "Week", icon: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></> },
  { id: "shop", label: "Shopping", icon: <><path d="M4 6h2l2 11h10l2-8H7" /><circle cx="10" cy="20" r="1.3" /><circle cx="17" cy="20" r="1.3" /></> },
  { id: "recipes", label: "Recipes", icon: <><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z" /><path d="M5 17a3 3 0 0 1 3-3h11" /></> },
];

export default function App() {
  const plan = useFamilyPlan();
  const { state, update, config, code, ready } = plan;
  const [tab, setTab] = useState("week");
  const [sheet, setSheet] = useState(null);
  const [toast, toastNode] = useToast();
  const app = { ...plan, toast };
  const close = () => setSheet(null);
  const confirm = (opts) => setSheet({ type: "confirm", ...opts });

  // First visit with sync available: offer to start or join a family plan
  useEffect(() => {
    if (config.loaded && config.sync && !code && !local.get("ft-solo")) setSheet({ type: "welcome" });
  }, [config.loaded, config.sync, code]);

  // On a new week (once the family's latest plan has loaded), ask how to plan it, once per visit
  const askedNewWeek = useRef(false);
  useEffect(() => {
    const check = () => {
      if (askedNewWeek.current || !ready || state.weekOf >= weekKey() || document.visibilityState !== "visible") return;
      askedNewWeek.current = true;
      setSheet((s) => s || { type: "newweek" });
    };
    check();
    document.addEventListener("visibilitychange", check);
    return () => document.removeEventListener("visibilitychange", check);
  }, [ready, state.weekOf]);

  const list = buildList(state);
  const toBuy = list.filter((it) => it.aisle !== "s" && !it.atHome && !state.ticks[it.key]).length + state.extras.filter((x) => !x.done).length;

  return (
    <>
      <div className="app">
        <header className="top">
          <div className="brand">
            Family Table
            <small>Week of {weekLabel(state.weekOf)}</small>
          </div>
          <span className="sync">{plan.status}</span>
          <button className="iconbtn" aria-label="Family and settings" onClick={() => setSheet({ type: "settings" })}>
            <svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><circle cx="17" cy="9" r="2.5" /><path d="M16 14.2c2.8.3 5 2.6 5 5.8" /></svg>
          </button>
        </header>
        <main>
          {tab === "week" && (
            <WeekView
              state={state}
              photos={plan.photos}
              openSlot={(day, meal) => setSheet({ type: "slot", day, meal })}
              openHousehold={() => setSheet({ type: "household" })}
              openPastWeeks={() => setSheet({ type: "past" })}
              askNewWeek={() =>
                confirm({
                  title: "Plan a fresh week?",
                  text: "This picks new meals for every day (favourites come up more often) and clears the shopping ticks. The current plan is saved in Past weeks.",
                  label: "Plan fresh week",
                  onYes: () => {
                    update((s) => {
                      archiveWeek(s);
                      s.week = pickWeek(s);
                      s.ticks = {};
                      s.extras = s.extras.filter((x) => !x.done);
                    });
                    toast("New week planned");
                  },
                })
              }
            />
          )}
          {tab === "shop" && <ShopView state={state} update={update} toast={toast} showText={(text) => setSheet({ type: "text", text })} />}
          {tab === "recipes" && (
            <RecipesView
              state={state}
              photos={plan.photos}
              openRecipe={(id) => setSheet({ type: "recipe", id })}
              newRecipe={() => setSheet({ type: "form", recipe: null })}
              openImport={() => setSheet({ type: "import" })}
            />
          )}
        </main>
      </div>

      <nav className="tabs" role="tablist">
        <div className="in">
          {TABS.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => { setTab(t.id); window.scrollTo(0, 0); }}>
              <svg viewBox="0 0 24 24">{t.icon}</svg>
              {t.label}
              {t.id === "shop" && toBuy > 0 && <span className="badge">{toBuy}</span>}
            </button>
          ))}
        </div>
      </nav>

      {sheet?.type === "slot" && <SlotSheet app={app} day={sheet.day} meal={sheet.meal} close={close} />}
      {sheet?.type === "recipe" && (
        <RecipeSheet app={app} id={sheet.id} close={close} confirm={confirm} edit={(recipe) => setSheet({ type: "form", recipe })} />
      )}
      {sheet?.type === "form" && <RecipeForm app={app} recipe={sheet.recipe} isNew={sheet.isNew} close={close} />}
      {sheet?.type === "import" && <ImportSheet app={app} close={close} onImported={(recipe) => setSheet({ type: "form", recipe, isNew: true })} />}
      {sheet?.type === "confirm" && <ConfirmSheet {...sheet} close={close} />}
      {sheet?.type === "text" && <TextSheet text={sheet.text} close={close} />}
      {sheet?.type === "welcome" && <WelcomeSheet app={app} close={close} />}
      {sheet?.type === "settings" && <SettingsSheet app={app} close={close} confirm={confirm} />}
      {sheet?.type === "household" && <HouseholdSheet app={app} close={close} />}
      {sheet?.type === "newweek" && <NewWeekSheet app={app} close={close} />}
      {sheet?.type === "past" && <PastWeeksSheet app={app} close={close} confirm={confirm} />}
      {toastNode}
    </>
  );
}
