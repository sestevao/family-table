import { useRef, useState } from "react";
import { AVOID_SUGGESTIONS, MEAL_LABEL } from "../data.js";
import { MEAL_MODES, childPortion, findRecipe, portions, startNewWeek, weekLabel } from "../plan.js";
import { local } from "../api.js";
import { isInstalled, isIos, pushSupported, remindersOn, turnOffReminders, turnOnReminders } from "../reminders.js";
import { Sheet, Stepper, copyText } from "./ui.jsx";

/* ---------- Who's eating, which meals, and food needs ---------- */

export function HouseholdSheet({ app, close }) {
  const { state, update } = app;
  const [word, setWord] = useState("");

  const addAvoid = (w) => {
    const v = w.trim().toLowerCase().slice(0, 30);
    if (!v || state.avoid.includes(v)) return;
    update((s) => { s.avoid.push(v); });
    setWord("");
  };

  return (
    <Sheet onClose={close}>
      <h3>Your family</h3>
      <p className="sub">Amounts and the shopping list are worked out from this. That's {portions(state)} adult-size portions right now.</p>

      <div className="field">
        <span className="label">Adults (13 and over)</span>
        <Stepper label="adults" value={state.adults} min={1} onChange={(v) => update((s) => { s.adults = v; })} />
      </div>

      <div className="field">
        <span className="label">Children</span>
        <div className="kids">
          {state.children.map((c, i) => (
            <div className="kid" key={c.id}>
              <span>Child {i + 1}</span>
              <Stepper
                label={`age of child ${i + 1}`}
                value={c.age}
                min={0}
                max={17}
                unit={c.age === 1 ? " yr" : " yrs"}
                onChange={(v) => update((s) => { const k = s.children.find((x) => x.id === c.id); if (k) k.age = v; })}
              />
              <span className="note">{Math.round(childPortion(c.age) * 100)}% portion</span>
              <button className="x" aria-label={`Remove child ${i + 1}`} onClick={() => update((s) => { s.children = s.children.filter((x) => x.id !== c.id); })}>×</button>
            </div>
          ))}
        </div>
        <div>
          <button
            className="chipbtn"
            onClick={() => {
              const id = "k" + Date.now().toString(36);
              update((s) => { s.children.push({ id, age: 6 }); });
            }}
          >
            + Add a child
          </button>
        </div>
        <p className="note" style={{ margin: 0 }}>Portions by age: up to 3 about a third, 4–8 half, 9–12 three quarters, 13+ a full portion.</p>
      </div>

      <h2 className="small">Meals to plan</h2>
      <div className="mealrows">
        <div className="mealrow"><span>Dinner</span><span className="note">Always</span></div>
        {Object.entries(MEAL_MODES).map(([meal, modes]) => (
          <div className="mealrow" key={meal}>
            <span>{MEAL_LABEL[meal]}</span>
            <div className="seg">
              {Object.entries(modes).map(([k, label]) => (
                <button key={k} aria-pressed={(state.mealModes[meal] || "none") === k} onClick={() => update((s) => { s.mealModes[meal] = k; })}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        ))}
        {state.mealModes.lunchbox === "weekdays" && (
          <div className="mealrow">
            <span>Lunchboxes a day</span>
            <Stepper label="lunchboxes" value={state.lunchboxes} min={1} max={8} onChange={(v) => update((s) => { s.lunchboxes = v; })} />
          </div>
        )}
      </div>

      <h2 className="small">Allergies and foods to avoid</h2>
      <p className="sub">Recipes with these get a warning and are never picked by “Surprise me”, “New week” or new ideas. Always check labels for serious allergies.</p>
      <div className="filters" style={{ marginTop: 0 }}>
        {state.avoid.map((w) => (
          <button key={w} className="chipbtn" aria-pressed="true" onClick={() => update((s) => { s.avoid = s.avoid.filter((x) => x !== w); })} aria-label={`Stop avoiding ${w}`}>
            {w} ×
          </button>
        ))}
      </div>
      <form className="addrow" onSubmit={(e) => { e.preventDefault(); addAvoid(word); }}>
        <input id="avoidWord" value={word} onChange={(e) => setWord(e.target.value)} placeholder="e.g. mushrooms, nuts, pork" />
        <button className="chipbtn" type="submit">Add</button>
      </form>
      <div className="filters">
        {AVOID_SUGGESTIONS.filter((w) => !state.avoid.includes(w)).map((w) => (
          <button key={w} className="chipbtn" onClick={() => addAvoid(w)}>+ {w}</button>
        ))}
      </div>
      <div className="row">
        <button className="chipbtn primary" onClick={close}>Done</button>
      </div>
    </Sheet>
  );
}

/* ---------- New week and past weeks ---------- */

const dinnersOf = (state, week) =>
  week.map((d) => (d.dinner?.r && findRecipe(state, d.dinner.r)?.name) || null).filter(Boolean);

export function NewWeekSheet({ app, close }) {
  const { state, update, toast } = app;
  const go = (how, past) => {
    update((s) => startNewWeek(s, how, past));
    toast(how === "fresh" ? "New week planned" : "Week updated");
    close();
  };
  return (
    <Sheet onClose={close}>
      <h3>It's a new week</h3>
      <p className="sub">
        Your plan for {weekLabel(state.weekOf)} is saved in Past weeks. How would you like to plan this week? The shopping ticks will be cleared.
      </p>
      <div className="opts">
        <button className="opt" onClick={() => go("fresh")}>
          <span className="pic t0" aria-hidden="true">✨</span>
          <b>Plan a fresh week<br /><span className="note">New meals, with favourites more often</span></b>
        </button>
        <button className="opt" onClick={() => go("keep")}>
          <span className="pic t1" aria-hidden="true">🔁</span>
          <b>Keep the same meals<br /><span className="note">Repeat last week's plan</span></b>
        </button>
      </div>
      {state.history.length > 0 && (
        <>
          <span className="label">Or reuse an older week</span>
          <div className="opts">
            {state.history.map((h) => (
              <button key={h.weekOf} className="opt" onClick={() => go("reuse", h.week)}>
                <span className="pic t3" aria-hidden="true">📅</span>
                <b>{weekLabel(h.weekOf)}<br /><span className="note">{dinnersOf(state, h.week).slice(0, 4).join(", ")}…</span></b>
              </button>
            ))}
          </div>
        </>
      )}
      <button className="chipbtn" onClick={close}>Decide later</button>
    </Sheet>
  );
}

export function PastWeeksSheet({ app, close, confirm }) {
  const { state, update, toast } = app;
  return (
    <Sheet onClose={close}>
      <h3>Past weeks</h3>
      <p className="sub">The last {state.history.length} weeks you planned. Reuse one that worked well.</p>
      <div className="opts">
        {state.history.map((h) => (
          <div key={h.weekOf} className="pastweek">
            <b>{weekLabel(h.weekOf)}</b>
            <span className="note">{dinnersOf(state, h.week).join(" · ")}</span>
            <div>
              <button
                className="chipbtn"
                onClick={() =>
                  confirm({
                    title: "Use this week again?",
                    text: "This replaces the meals planned for this week and clears the shopping ticks. The current plan is saved in Past weeks.",
                    label: "Use this week",
                    onYes: () => {
                      update((s) => startNewWeek(s, "reuse", h.week));
                      toast("Week reused");
                    },
                  })
                }
              >
                Use this week again
              </button>
            </div>
          </div>
        ))}
      </div>
    </Sheet>
  );
}

/* ---------- Family sharing, reminders, backup ---------- */

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
  return (
    <Sheet onClose={close}>
      <h3>Plan meals together</h3>
      <p className="sub">
        Start a family plan to share the week, the shopping list and your recipes with everyone at home. Each person opens your invite link once and it stays in sync.
      </p>
      <button
        className="chipbtn primary"
        onClick={() => {
          app.startFamily();
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

function Reminders({ app }) {
  const [on, setOn] = useState(remindersOn());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!app.config.reminders) return <p className="sub">Dinner reminders aren't set up on this app yet. The README explains the three keys to add in Vercel.</p>;
  if (!app.code) return <p className="sub">Start a family plan first, then you can turn on reminders.</p>;
  if (isIos() && !isInstalled()) return <p className="sub">On iPhone, add this app to your Home Screen first (Share → Add to Home Screen), then open it from there to turn on reminders.</p>;
  if (!pushSupported()) return <p className="sub">This browser can't show reminders. Try Chrome or Safari, added to your Home Screen.</p>;

  const toggle = async () => {
    setBusy(true);
    setError("");
    try {
      if (on) await turnOffReminders(app.code);
      else await turnOnReminders(app.code, app.config.vapidPublicKey);
      setOn(!on);
      app.toast(on ? "Reminders off" : "Reminders on. See you around 4pm");
    } catch (e) {
      setError(e.message || "Couldn't change reminders.");
    }
    setBusy(false);
  };
  return (
    <>
      <p className="sub">A notification each afternoon (around 4pm) with tonight's dinner, and a nudge to take tomorrow's meat or fish out of the freezer.</p>
      <button className={`chipbtn${on ? "" : " primary"}`} onClick={toggle} disabled={busy}>
        {busy ? "One moment…" : on ? "Turn off reminders on this phone" : "Turn on reminders on this phone"}
      </button>
      {error && <p className="warnbox">{error}</p>}
    </>
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
    const blob = new Blob([JSON.stringify({ app: "family-table", version: 2, state: app.state, photos: app.photos }, null, 2)], { type: "application/json" });
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
      <h3>Family & settings</h3>
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
                  onYes: async () => {
                    if (remindersOn()) await turnOffReminders(app.code);
                    app.leaveFamily();
                  },
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
          <button className="chipbtn primary" onClick={() => { app.startFamily(); app.toast("Family plan started"); }}>
            Start our family plan
          </button>
          <h2 className="small">Join with an invite link</h2>
          <JoinForm app={app} onDone={close} />
        </>
      )}

      <h2 className="small">Dinner reminder</h2>
      <Reminders app={app} />

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
