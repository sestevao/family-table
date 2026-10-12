import { useRef, useState } from "react";
import { DAYS } from "../data.js";
import { allRecipes, findRecipe, lunchOn, peopleLabel, cleanIdea, parseIng, ingToLine } from "../plan.js";
import { askIdea, local } from "../api.js";
import { Sheet, Thumb, Hero, Ingredients, Method, copyText } from "./ui.jsx";

function RecipeDetails({ recipe, app }) {
  return (
    <>
      <Hero recipe={recipe} photos={app.photos} onPhoto={app.savePhoto} toast={app.toast} />
      <p className="sub">
        <span className="mins">{recipe.mins} min</span> · {recipe.meal.join(" or ")} · amounts for {peopleLabel(app.state)}
      </p>
      <Ingredients recipe={recipe} state={app.state} />
      <h2 className="small">Method</h2>
      <Method steps={recipe.steps} />
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
    const planned = state.week
      .flatMap((d) => ["lunch", "dinner"].map((m) => d[m]?.r && findRecipe(state, d[m].r)))
      .filter(Boolean)
      .map((r) => r.name);
    try {
      const res = await askIdea({ code: app.code, meal, day: DAYS[day], people: peopleLabel(state), kids: state.kids > 0, planned, wish });
      setIdea(cleanIdea(res.idea, meal));
    } catch (err) {
      setError(err.status === 429 ? "Too many ideas for now. Try again in a little while." : "That didn't work. Tap New idea to try again.");
    }
    setBusy(false);
  };

  return (
    <div className="ai">
      <b className="h">✨ Need a new idea?</b>
      <span className="note">Get a fresh, quick {meal} made with ingredients from UK supermarkets.</span>
      <form className="addrow" onSubmit={ask}>
        <input id="aiWish" value={wish} onChange={(e) => setWish(e.target.value)} placeholder="Any wishes? e.g. no fish, use up chicken" maxLength={120} />
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
            <Ingredients recipe={idea} state={app.state} />
            <div style={{ marginTop: 10 }}><Method steps={idea.steps} /></div>
            <div className="row">
              <button className="chipbtn primary" onClick={() => onUse(idea)}>Use for {DAYS[day]} {meal}</button>
              <button className="chipbtn" onClick={ask}>Try another</button>
            </div>
          </div>
        )}
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

  const set = (v) => {
    update((s) => { s.week[day][meal] = v; });
    close();
  };
  const surprise = () => {
    const pool = suits.filter((x) => x.id !== cur.r);
    const p = pool[Math.floor(Math.random() * pool.length)];
    if (p) {
      set({ r: p.id });
      toast(`${DAYS[day]}: ${p.name}`);
    }
  };
  const option = (x) => (
    <button key={x.id} className={`opt${cur.r === x.id ? " cur" : ""}`} onClick={() => set({ r: x.id })}>
      <Thumb recipe={x} photos={app.photos} />
      <b>{x.name}</b>
      <span className="mins">{x.mins} min</span>
    </button>
  );

  return (
    <Sheet onClose={close}>
      <span className="label">{DAYS[day]} {meal}</span>
      {recipe ? (
        <>
          <h3>{recipe.name}</h3>
          <RecipeDetails recipe={recipe} app={app} />
          <h2 className="small">Swap for something else</h2>
        </>
      ) : (
        <>
          <h3>What's for {meal}?</h3>
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
              s.week[day][meal] = { r: idea.id };
            });
            toast("Saved to your recipes");
            close();
          }}
        />
      )}

      <div className="row" style={{ marginTop: 0, marginBottom: 12 }}>
        <button className="chipbtn" onClick={surprise}>↻ Surprise me</button>
        <button className="chipbtn" onClick={() => set({ s: "left" })}>Leftovers</button>
        <button className="chipbtn" onClick={() => set({ s: "out" })}>Eating out</button>
        {(cur.r || cur.s || cur.t) && <button className="chipbtn danger" onClick={() => set(null)}>Clear</button>}
      </div>
      <form className="addrow" style={{ margin: "0 0 14px" }} onSubmit={(e) => { e.preventDefault(); if (note.trim()) set({ t: note.trim().slice(0, 80) }); }}>
        <input id="slotNote" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Or type your own (e.g. Grandma's lasagne)" />
        <button className="chipbtn" type="submit">Save</button>
      </form>

      <span className="label">Suits {meal}</span>
      <div className="opts">{suits.map(option)}</div>
      {others.length > 0 && (
        <>
          <span className="label">Other ideas</span>
          <div className="opts">{others.map(option)}</div>
        </>
      )}
    </Sheet>
  );
}

export function RecipeSheet({ app, id, close, edit, confirm }) {
  const { state, update, toast } = app;
  const recipe = findRecipe(state, id);
  if (!recipe) return null;

  const addTo = (i) => {
    const meal = recipe.meal.includes("dinner") ? "dinner" : lunchOn(state, i) ? "lunch" : "dinner";
    update((s) => { s.week[i][meal] = { r: recipe.id }; });
    close();
    toast(`Added to ${DAYS[i]} ${meal}`);
  };
  const remove = () =>
    confirm({
      title: `Delete ${recipe.name}?`,
      text: "It will also be removed from any day it's planned on.",
      label: "Delete",
      onYes: () => {
        update((s) => {
          s.custom = s.custom.filter((x) => x.id !== recipe.id);
          s.week.forEach((d) => ["lunch", "dinner"].forEach((m) => { if (d[m]?.r === recipe.id) d[m] = null; }));
        });
        toast("Recipe deleted");
      },
    });

  return (
    <Sheet onClose={close}>
      <h3>{recipe.name}</h3>
      <RecipeDetails recipe={recipe} app={app} />
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

export function RecipeForm({ app, recipe, close }) {
  const [name, setName] = useState(recipe?.name || "");
  const [mins, setMins] = useState(recipe?.mins || 30);
  const [meal, setMeal] = useState(recipe ? (recipe.meal.length > 1 ? "both" : recipe.meal[0]) : "dinner");
  const [ing, setIng] = useState(recipe ? recipe.ing.map(ingToLine).join("\n") : "");
  const [steps, setSteps] = useState(recipe ? recipe.steps.join("\n") : "");

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    const rec = {
      id: recipe ? recipe.id : "c" + Date.now().toString(36),
      custom: true,
      name: name.trim().slice(0, 60),
      pic: recipe?.pic || "🍽️",
      mins: Math.max(5, parseInt(mins, 10) || 30),
      meal: meal === "both" ? ["dinner", "lunch"] : [meal],
      tags: [],
      ing: ing.split("\n").filter((l) => l.trim()).slice(0, 40).map(parseIng),
      steps: steps.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 30),
    };
    app.update((s) => {
      if (recipe) s.custom = s.custom.map((x) => (x.id === recipe.id ? rec : x));
      else s.custom.push(rec);
    });
    app.toast(recipe ? "Recipe updated" : "Recipe saved");
    close();
  };

  return (
    <Sheet onClose={close}>
      <h3>{recipe ? "Edit recipe" : "Add your own recipe"}</h3>
      <p className="sub">Write one ingredient per line, for 4 people, like “500 g chicken breast” or “2 peppers”.</p>
      <form onSubmit={submit}>
        <div className="field">
          <label className="label" htmlFor="rfName">Name</label>
          <input id="rfName" required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="row" style={{ marginTop: 0 }}>
          <div className="field" style={{ flex: 1 }}>
            <label className="label" htmlFor="rfMins">Minutes</label>
            <input id="rfMins" type="number" min="5" max="240" value={mins} onChange={(e) => setMins(e.target.value)} />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label className="label" htmlFor="rfMeal">Good for</label>
            <select id="rfMeal" value={meal} onChange={(e) => setMeal(e.target.value)}>
              <option value="dinner">Dinner</option>
              <option value="lunch">Lunch</option>
              <option value="both">Both</option>
            </select>
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

function JoinForm({ app, onDone }) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  return (
    <form
      className="addrow"
      onSubmit={(e) => {
        e.preventDefault();
        if (app.joinFamily(text)) {
          app.toast("Joined the family plan");
          onDone();
        } else setError("That doesn't look like an invite link. Paste the whole link someone sent you.");
      }}
      style={{ flexWrap: "wrap" }}
    >
      <input id="joinCode" value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste an invite link" />
      <button className="chipbtn" type="submit">Join</button>
      {error && <p className="note" style={{ width: "100%", margin: 0 }}>{error}</p>}
    </form>
  );
}

export function WelcomeSheet({ app, close }) {
  const [busy, setBusy] = useState(false);
  return (
    <Sheet onClose={close}>
      <h3>Plan meals together</h3>
      <p className="sub">
        Start a family plan to share the week, the shopping list and your recipes with everyone at home. Each person opens your invite link once and it stays in sync.
      </p>
      <button
        className="chipbtn primary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await app.startFamily();
          app.toast("Family plan started");
          close();
        }}
      >
        Start our family plan
      </button>
      <h2 className="small">Someone already started one?</h2>
      <JoinForm app={app} onDone={close} />
      <div className="row">
        <button className="chipbtn" onClick={() => { local.set("ft-solo", true); close(); }}>Just use it on this phone</button>
      </div>
    </Sheet>
  );
}

export function SettingsSheet({ app, close, confirm }) {
  const fileRef = useRef();
  const link = app.code ? `${location.origin}/?family=${app.code}` : "";

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Family Table", text: "Join our family meal plan", url: link });
        return;
      } catch {}
    }
    app.toast((await copyText(link)) ? "Invite link copied" : "Copy the link above");
  };

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify({ app: "family-table", version: 1, state: app.state, photos: app.photos }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `family-table-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const importBackup = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (!data?.state?.week) throw new Error("bad");
      app.replaceState(data.state);
      for (const [id, src] of Object.entries(data.photos || {})) await app.savePhoto(id, src).catch(() => {});
      app.toast("Backup restored");
      close();
    } catch {
      app.toast("That file isn't a Family Table backup");
    }
  };

  return (
    <Sheet onClose={close}>
      <h3>Family & backup</h3>
      {!app.config.sync ? (
        <p className="sub">
          Family sync isn't switched on for this app yet, so your plan is saved on this phone only. Connect Upstash Redis in Vercel to share it with the family.
        </p>
      ) : app.code ? (
        <>
          <p className="sub">Everyone who opens this invite link shares the same plan. Only send it to family.</p>
          <div className="code">{link}</div>
          <div className="row">
            <button className="chipbtn primary" onClick={share}>Share invite link</button>
            <button
              className="chipbtn danger"
              onClick={() =>
                confirm({
                  title: "Leave the family plan?",
                  text: "This phone keeps a copy of the plan but stops syncing. You can rejoin with the invite link.",
                  label: "Leave",
                  onYes: app.leaveFamily,
                })
              }
            >
              Leave
            </button>
          </div>
          <h2 className="small">Join a different family plan</h2>
          <JoinForm app={app} onDone={close} />
        </>
      ) : (
        <>
          <p className="sub">This phone isn't sharing a plan yet.</p>
          <button className="chipbtn primary" onClick={async () => { await app.startFamily(); app.toast("Family plan started"); }}>
            Start our family plan
          </button>
          <h2 className="small">Join with an invite link</h2>
          <JoinForm app={app} onDone={close} />
        </>
      )}

      <h2 className="small">Backup</h2>
      <p className="sub">Save a copy of your plan, recipes and photos as a file, or restore one.</p>
      <div className="row" style={{ marginTop: 0 }}>
        <button className="chipbtn" onClick={exportBackup}>Download backup</button>
        <button className="chipbtn" onClick={() => fileRef.current?.click()}>Restore backup</button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={importBackup} />
      </div>
    </Sheet>
  );
}
