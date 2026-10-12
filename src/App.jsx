import { useEffect, useState } from "react";
import { useFamilyPlan } from "./useFamilyPlan.js";
import { buildList, mondayOfThisWeek, pickWeek } from "./plan.js";
import { local } from "./api.js";
import { useToast } from "./components/ui.jsx";
import WeekView from "./components/WeekView.jsx";
import ShopView from "./components/ShopView.jsx";
import RecipesView from "./components/RecipesView.jsx";
import { SlotSheet, RecipeSheet, RecipeForm, ConfirmSheet, TextSheet, WelcomeSheet, SettingsSheet } from "./components/sheets.jsx";

const TABS = [
  { id: "week", label: "Week", icon: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></> },
  { id: "shop", label: "Shopping", icon: <><path d="M4 6h2l2 11h10l2-8H7" /><circle cx="10" cy="20" r="1.3" /><circle cx="17" cy="20" r="1.3" /></> },
  { id: "recipes", label: "Recipes", icon: <><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z" /><path d="M5 17a3 3 0 0 1 3-3h11" /></> },
];

export default function App() {
  const plan = useFamilyPlan();
  const { state, update, config, code } = plan;
  const [tab, setTab] = useState("week");
  const [sheet, setSheet] = useState(null);
  const [toast, toastNode] = useToast();
  const app = { ...plan, toast };
  const close = () => setSheet(null);

  // First visit with sync available: offer to start or join a family plan
  useEffect(() => {
    if (config.loaded && config.sync && !code && !local.get("ft-solo")) setSheet({ type: "welcome" });
  }, [config.loaded, config.sync, code]);

  const confirm = (opts) => setSheet({ type: "confirm", ...opts });

  const list = buildList(state);
  const toBuy = list.filter((it) => it.aisle !== "s" && !state.ticks[it.key]).length + state.extras.filter((x) => !x.done).length;

  const monday = mondayOfThisWeek();
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });

  return (
    <>
      <div className="app">
        <header className="top">
          <div className="brand">
            Family Table
            <small>Week of {fmt(monday)} – {fmt(sunday)}</small>
          </div>
          <span className="sync">{plan.status}</span>
          <button className="iconbtn" aria-label="Family and backup" onClick={() => setSheet({ type: "settings" })}>
            <svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><circle cx="17" cy="9" r="2.5" /><path d="M16 14.2c2.8.3 5 2.6 5 5.8" /></svg>
          </button>
        </header>
        <main>
          {tab === "week" && (
            <WeekView
              state={state}
              update={update}
              photos={plan.photos}
              openSlot={(day, meal) => setSheet({ type: "slot", day, meal })}
              askNewWeek={() =>
                confirm({
                  title: "Start a new week?",
                  text: "This picks fresh meals for every day and clears the ticks on your shopping list.",
                  label: "New week",
                  onYes: () => {
                    update((s) => {
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
      {sheet?.type === "form" && <RecipeForm app={app} recipe={sheet.recipe} close={close} />}
      {sheet?.type === "confirm" && <ConfirmSheet {...sheet} close={close} />}
      {sheet?.type === "text" && <TextSheet text={sheet.text} close={close} />}
      {sheet?.type === "welcome" && <WelcomeSheet app={app} close={close} />}
      {sheet?.type === "settings" && <SettingsSheet app={app} close={close} confirm={confirm} />}
      {toastNode}
    </>
  );
}
