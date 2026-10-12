import { useState } from "react";
import { DAYS, MEALS, MEAL_LABEL } from "../data.js";
import { allRecipes, findRecipe, mealOn, peopleLabel, cleanIdea, parseIng, ingToLine, pickRecipe, rating, setDouble, avoidHits, shrinkImage } from "../plan.js";
import { askIdea, importRecipe } from "../api.js";
import { Sheet, Thumb, Hero, Ingredients, Method, Rating, Stepper } from "./ui.jsx";
import { RecipeTile } from "./RecipesView.jsx";

function RecipeDetails({ recipe, app, meal }) {
  const hits = avoidHits(app.state, recipe);
  return (
    <>
      <Hero recipe={recipe} photos={app.photos} onPhoto={app.savePhoto} toast={app.toast} />
      {hits.length > 0 && <p className="warnbox">⚠ Contains {hits.join(", ")}, which your family avoids.</p>}
      <Rating state={app.state} update={app.update} recipe={recipe} />
      <p className="sub">
        <span className="mins">{recipe.mins} min</span> · {recipe.meal.map((m) => MEAL_LABEL[m]).join(" or ")} · amounts for{" "}
        {meal === "lunchbox" ? `${app.state.lunchboxes} lunchbox${app.state.lunchboxes === 1 ? "" : "es"}` : peopleLabel(app.state)}
      </p>
      <Ingredients recipe={recipe} state={app.state} meal={meal} />
      <h2 className="small">Method</h2>
      <Method steps={recipe.steps} />
      {recipe.source && (
        <p className="note">
          From <a href={recipe.source} target="_blank" rel="noreferrer">{new URL(recipe.source).hostname.replace(/^www\./, "")}</a>
        </p>
      )}
    </>
  );
}

function AiPanel({ app, day, meal, onUse }) {
  const [wish, setWish] = useState("");
  const [busy, setBusy] = useState(false);
  const [idea, setIdea] = useState(null);
  const [error, setError] = useState("");

  const ask = async (e) => {
    e?.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setIdea(null);
    const { state } = app;
    const names = (fn) => allRecipes(state).filter(fn).map((r) => r.name);
    const planned = state.week.flatMap((d) => MEALS.map((m) => d[m]?.r && findRecipe(state, d[m].r))).filter(Boolean).map((r) => r.name);
    try {
      const res = await askIdea({
        code: app.code,
        meal,
        day: DAYS[day],
        people: peopleLabel(state),
        children: state.children.map((c) => c.age),
        planned: [...new Set(planned)],
        favourites: names((r) => rating(state, r.id) > 0),
        dislikes: names((r) => rating(state, r.id) < 0),
        avoid: state.avoid,
        wish,
      });
      setIdea(cleanIdea(res.idea, [meal]));
    } catch (err) {
      setError(err.status === 429 ? "Too many ideas for now. Try again in a little while." : "That didn't work. Tap New idea to try again.");
    }
    setBusy(false);
  };

  return (
    <div className="ai">
      <b className="h">✨ Need a new idea?</b>
      <span className="note">A fresh, quick {MEAL_LABEL[meal].toLowerCase()} with ingredients from UK supermarkets, avoiding anything your family can't eat.</span>
      <form className="addrow" onSubmit={ask}>
        <input id="aiWish" value={wish} onChange={(e) => setWish(e.target.value)} placeholder="Any wishes? e.g. use up chicken" maxLength={120} />
        <button className="chipbtn primary" type="submit" disabled={busy}>{busy ? "Thinking…" : "New idea"}</button>
      </form>
      <div className="aiout">
        {busy && <p className="note">Thinking of something tasty…</p>}
        {error && <p className="note">{error}</p>}
        {idea && (
          <div className="card">
            <div className="top">
              <Thumb recipe={idea} />
              <b>{idea.name}</b>
              <span className="mins">{idea.mins} min</span>
            </div>
            <Ingredients recipe={idea} state={app.state} meal={meal} />
            <div style={{ marginTop: 10 }}><Method steps={idea.steps} /></div>
            <div className="row">
              <button className="chipbtn primary" onClick={() => onUse(idea)}>Use for {DAYS[day]} {MEAL_LABEL[meal].toLowerCase()}</button>
              <button className="chipbtn" onClick={ask}>Try another</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CookDouble({ app, day, meal, slot }) {
  if (day >= 6 || !["lunch", "dinner"].includes(meal)) return null;
  const targets = [
    meal === "dinner" && { day: day + 1, meal: "lunch", label: `${DAYS[day + 1]} lunch` },
    { day: day + 1, meal: "dinner", label: `${DAYS[day + 1]} dinner` },
  ].filter(Boolean);
  const current = slot.double
    ? targets.find((t) => app.state.week[t.day][t.meal]?.s === "left" && app.state.week[t.day][t.meal]?.from === `${day}-${meal}`)
    : null;
  const choose = (t) => {
    app.update((s) => setDouble(s, day, meal, t));
    if (t && !mealOn(app.state, t.meal, t.day)) app.toast("Turn on lunches in Family settings to see the leftovers");
    else app.toast(t ? `Leftovers added to ${t.label}` : "Back to a single batch");
  };
  return (
    <div className="double">
      <b>Cook once, eat twice</b>
      <span className="note">Make a double batch: the shopping list doubles and the leftovers fill another meal.</span>
      <div className="row" style={{ marginTop: 8 }}>
        {targets.map((t) => (
          <button key={t.label} className="chipbtn" aria-pressed={current?.label === t.label} onClick={() => choose(current?.label === t.label ? null : t)}>
            Leftovers for {t.label}
          </button>
        ))}
        {slot.double && <button className="chipbtn" onClick={() => choose(null)}>Single batch</button>}
      </div>
    </div>
  );
}

export function SlotSheet({ app, day, meal, close }) {
  const { state, update, toast } = app;
  const cur = state.week[day][meal] || {};
  const recipe = cur.r && findRecipe(state, cur.r);
  const recipes = allRecipes(state);
  const suits = recipes.filter((x) => x.meal.includes(meal));
  const others = recipes.filter((x) => !x.meal.includes(meal));
  const [note, setNote] = useState(cur.t || "");
  const [showAll, setShowAll] = useState(false);

  const set = (v) => {
    update((s) => {
      setDouble(s, day, meal, null); // clear leftovers made by the meal being replaced
      s.week[day][meal] = v;
    });
    close();
  };
  const surprise = () => {
    const p = pickRecipe(state, meal, cur.r);
    if (p) {
      set({ r: p.id });
      toast(`${DAYS[day]}: ${p.name}`);
    } else toast("No other recipes fit. Try a new idea or add your own.");
  };
  const option = (x) => (
    <RecipeTile key={x.id} recipe={x} state={state} photos={app.photos} current={cur.r === x.id} onClick={() => set({ r: x.id })} />
  );
  // Favourites first, then the rest; "not again" and allergy matches last
  const score = (x) => rating(state, x.id) * 2 - (avoidHits(state, x).length ? 3 : 0);
  const sorted = [...suits].sort((a, b) => score(b) - score(a));

  return (
    <Sheet onClose={close}>
      <span className="label">{DAYS[day]} {MEAL_LABEL[meal].toLowerCase()}</span>
      {recipe ? (
        <>
          <h3>{recipe.name}</h3>
          <RecipeDetails recipe={recipe} app={app} meal={meal} />
          <CookDouble app={app} day={day} meal={meal} slot={cur} />
          <h2 className="small">Swap for something else</h2>
        </>
      ) : (
        <>
          <h3>What's for {MEAL_LABEL[meal].toLowerCase()}?</h3>
          <p className="sub">Pick a recipe, get a new idea, or write your own plan.</p>
        </>
      )}

      {app.config.ai && app.code && (
        <AiPanel
          app={app}
          day={day}
          meal={meal}
          onUse={(idea) => {
            update((s) => {
              s.custom.push(idea);
              setDouble(s, day, meal, null);
              s.week[day][meal] = { r: idea.id };
            });
            toast("Saved to your recipes");
            close();
          }}
        />
      )}

      <div className="row" style={{ marginTop: 0, marginBottom: 12 }}>
        <button className="chipbtn" onClick={surprise}>↻ Surprise me</button>
        {meal !== "lunchbox" && <button className="chipbtn" onClick={() => set({ s: "left" })}>Leftovers</button>}
        {meal !== "lunchbox" && <button className="chipbtn" onClick={() => set({ s: "out" })}>Eating out</button>}
        {(cur.r || cur.s || cur.t) && <button className="chipbtn danger" onClick={() => set(null)}>Clear</button>}
      </div>
      <form className="addrow" style={{ margin: "0 0 14px" }} onSubmit={(e) => { e.preventDefault(); if (note.trim()) set({ t: note.trim().slice(0, 80) }); }}>
        <input id="slotNote" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Or type your own (e.g. Grandma's lasagne)" />
        <button className="chipbtn" type="submit">Save</button>
      </form>

      <span className="label">Suits {MEAL_LABEL[meal].toLowerCase()}</span>
      <div className="pickgrid">{sorted.map(option)}</div>
      {others.length > 0 &&
        (showAll ? (
          <>
            <span className="label">Other recipes</span>
            <div className="pickgrid">{others.map(option)}</div>
          </>
        ) : (
          <button className="chipbtn" onClick={() => setShowAll(true)}>Show {others.length} other recipes</button>
        ))}
    </Sheet>
  );
}

export function RecipeSheet({ app, id, close, edit, confirm }) {
  const { state, update, toast } = app;
  const recipe = findRecipe(state, id);
  if (!recipe) return null;

  const addTo = (i) => {
    const meal = recipe.meal.includes("dinner") ? "dinner" : recipe.meal.find((m) => mealOn(state, m, i)) || recipe.meal[0];
    update((s) => {
      setDouble(s, i, meal, null);
      s.week[i][meal] = { r: recipe.id };
    });
    close();
    toast(mealOn(state, meal, i) ? `Added to ${DAYS[i]} ${MEAL_LABEL[meal].toLowerCase()}` : `Added. Turn on ${MEAL_LABEL[meal].toLowerCase()} in Family settings to see it`);
  };
  const remove = () =>
    confirm({
      title: `Delete ${recipe.name}?`,
      text: "It will also be removed from any day it's planned on.",
      label: "Delete",
      onYes: () => {
        update((s) => {
          s.custom = s.custom.filter((x) => x.id !== recipe.id);
          s.week.forEach((d) => MEALS.forEach((m) => { if (d[m]?.r === recipe.id || d[m]?.of === recipe.id) d[m] = null; }));
          delete s.ratings[recipe.id];
        });
        toast("Recipe deleted");
      },
    });

  return (
    <Sheet onClose={close}>
      <h3>{recipe.name}</h3>
      <RecipeDetails recipe={recipe} app={app} meal={recipe.meal[0]} />
      <h2 className="small">Add to a day</h2>
      <div className="row" style={{ marginTop: 0 }}>
        {DAYS.map((d, i) => (
          <button key={d} className="chipbtn" onClick={() => addTo(i)}>{d}</button>
        ))}
      </div>
      {recipe.custom && (
        <div className="row">
          <button className="chipbtn" onClick={() => edit(recipe)}>Edit recipe</button>
          <button className="chipbtn danger" onClick={remove}>Delete</button>
        </div>
      )}
    </Sheet>
  );
}

export function RecipeForm({ app, recipe, isNew, close }) {
  const [name, setName] = useState(recipe?.name || "");
  const [mins, setMins] = useState(recipe?.mins || 30);
  const [serves, setServes] = useState(recipe?.serves || 4);
  const [meals, setMeals] = useState(recipe?.meal || ["dinner"]);
  const [ing, setIng] = useState(recipe ? recipe.ing.map(ingToLine).join("\n") : "");
  const [steps, setSteps] = useState(recipe ? recipe.steps.join("\n") : "");

  const toggleMeal = (m) => setMeals((cur) => (cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m]));

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    // Keep the aisle for lines that haven't changed
    const before = new Map((recipe?.ing || []).map((g) => [ingToLine(g), g]));
    const rec = {
      id: recipe?.id && !isNew ? recipe.id : "c" + Date.now().toString(36),
      custom: true,
      name: name.trim().slice(0, 60),
      pic: recipe?.pic || "🍽️",
      mins: Math.max(5, parseInt(mins, 10) || 30),
      serves,
      meal: meals.length ? MEALS.filter((m) => meals.includes(m)) : ["dinner"],
      tags: recipe?.tags || [],
      ing: ing.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 40).map((l) => before.get(l) || parseIng(l)),
      steps: steps.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 30),
      ...(recipe?.source ? { source: recipe.source } : {}),
    };
    app.update((s) => {
      if (s.custom.some((x) => x.id === rec.id)) s.custom = s.custom.map((x) => (x.id === rec.id ? rec : x));
      else s.custom.push(rec);
    });
    app.toast(isNew || !recipe ? "Recipe saved" : "Recipe updated");
    close();
  };

  return (
    <Sheet onClose={close}>
      <h3>{isNew && recipe ? "Check the imported recipe" : recipe ? "Edit recipe" : "Add your own recipe"}</h3>
      <p className="sub">One ingredient per line, like “500 g chicken breast” or “2 peppers”. The app scales amounts to your family.</p>
      <form onSubmit={submit}>
        <div className="field">
          <label className="label" htmlFor="rfName">Name</label>
          <input id="rfName" required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="row" style={{ marginTop: 0, alignItems: "end" }}>
          <div className="field" style={{ flex: 1, minWidth: 120 }}>
            <label className="label" htmlFor="rfMins">Minutes</label>
            <input id="rfMins" type="number" min="5" max="240" value={mins} onChange={(e) => setMins(e.target.value)} />
          </div>
          <div className="field">
            <span className="label">Serves</span>
            <Stepper label="servings" value={serves} onChange={setServes} min={1} max={12} />
          </div>
        </div>
        <div className="field">
          <span className="label">Good for</span>
          <div className="filters" style={{ marginTop: 0 }}>
            {MEALS.map((m) => (
              <button type="button" key={m} className="chipbtn" aria-pressed={meals.includes(m)} onClick={() => toggleMeal(m)}>
                {MEAL_LABEL[m]}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <label className="label" htmlFor="rfIng">Ingredients</label>
          <textarea id="rfIng" value={ing} onChange={(e) => setIng(e.target.value)} placeholder={"500 g beef mince\n1 onion\n2 tins chopped tomatoes"} />
        </div>
        <div className="field">
          <label className="label" htmlFor="rfSteps">Method (one step per line)</label>
          <textarea id="rfSteps" value={steps} onChange={(e) => setSteps(e.target.value)} />
        </div>
        <div className="row">
          <button className="chipbtn primary" type="submit">Save recipe</button>
          <button className="chipbtn" type="button" onClick={close}>Cancel</button>
        </div>
      </form>
    </Sheet>
  );
}

export function ImportSheet({ app, close, onImported }) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const canSync = app.config.sync && app.code;

  const run = async (body, label) => {
    setBusy(label);
    setError("");
    try {
      const { recipe } = await importRecipe({ code: app.code, ...body });
      const clean = cleanIdea(recipe, ["dinner"]);
      onImported({ ...clean, ai: false, ...(recipe.source ? { source: recipe.source } : {}) });
    } catch (e) {
      setError(e.message || "Couldn't import that recipe.");
    }
    setBusy("");
  };

  const onPhoto = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      await run({ image: await shrinkImage(f, 1600, 2_400_000) }, "photo");
    } catch {
      setError("That photo couldn't be read. Try a clearer one.");
    }
  };

  return (
    <Sheet onClose={close}>
      <h3>Import a recipe</h3>
      {!canSync ? (
        <p className="sub">Importing works once family sync is switched on. Start a family plan in Family settings first.</p>
      ) : (
        <>
          <p className="sub">Paste a link from a recipe website such as BBC Good Food, or take a photo of a cookbook page. You can check everything before it's saved.</p>
          <form className="addrow" onSubmit={(e) => { e.preventDefault(); if (url.trim()) run({ url: url.trim() }, "link"); }}>
            <input id="importUrl" type="url" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.bbcgoodfood.com/recipes/…" />
            <button className="chipbtn primary" type="submit" disabled={Boolean(busy)}>{busy === "link" ? "Reading…" : "Import"}</button>
          </form>
          {app.config.ai && (
            <div className="row">
              <label className="chipbtn">
                {busy === "photo" ? "Reading photo…" : "📷 Photo of a recipe"}
                <input type="file" accept="image/*" hidden onChange={onPhoto} disabled={Boolean(busy)} />
              </label>
            </div>
          )}
          {error && <p className="warnbox">{error}</p>}
        </>
      )}
    </Sheet>
  );
}

export function ConfirmSheet({ title, text, label, onYes, close }) {
  return (
    <Sheet onClose={close}>
      <h3>{title}</h3>
      <p className="sub">{text}</p>
      <div className="row">
        <button className="chipbtn primary" onClick={() => { close(); onYes(); }}>{label}</button>
        <button className="chipbtn" onClick={close}>Cancel</button>
      </div>
    </Sheet>
  );
}

export function TextSheet({ text, close }) {
  return (
    <Sheet onClose={close}>
      <h3>Your list</h3>
      <p className="sub">Select all and copy.</p>
      <div className="field">
        <textarea id="copyArea" readOnly value={text} style={{ minHeight: 300 }} onFocus={(e) => e.target.select()} autoFocus />
      </div>
    </Sheet>
  );
}
