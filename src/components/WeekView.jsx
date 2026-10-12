import { DAYS, SPECIAL } from "../data.js";
import { findRecipe, lunchOn, portions, mondayOfThisWeek } from "../plan.js";
import { Thumb } from "./ui.jsx";

const LUNCH_MODES = { all: "Every day", weekend: "Weekends", none: "Off" };

function slotInfo(state, slot) {
  if (!slot) return null;
  if (slot.r) {
    const r = findRecipe(state, slot.r);
    return r && { name: r.name, sub: <span className="mins">{r.mins} min</span>, recipe: r };
  }
  if (slot.s && SPECIAL[slot.s]) {
    return { name: SPECIAL[slot.s].name, sub: SPECIAL[slot.s].sub, recipe: { id: slot.s, pic: SPECIAL[slot.s].pic } };
  }
  if (slot.t) return { name: slot.t, sub: "Your note", recipe: { id: "note", pic: "📝" } };
  return null;
}

export default function WeekView({ state, update, photos, openSlot, askNewWeek }) {
  const monday = mondayOfThisWeek();
  const todayIdx = (new Date().getDay() + 6) % 7;
  const step = (key, d) =>
    update((s) => {
      s[key] = Math.min(10, Math.max(key === "adults" ? 1 : 0, (s[key] || 0) + d));
    });

  return (
    <>
      <div className="toolbar">
        <div className="stepper" aria-label="Adults">
          <button onClick={() => step("adults", -1)} aria-label="Fewer adults">−</button>
          <span>{state.adults} adult{state.adults === 1 ? "" : "s"}</span>
          <button onClick={() => step("adults", 1)} aria-label="More adults">+</button>
        </div>
        <div className="stepper" aria-label="Children">
          <button onClick={() => step("kids", -1)} aria-label="Fewer children">−</button>
          <span>{state.kids} child{state.kids === 1 ? "" : "ren"}</span>
          <button onClick={() => step("kids", 1)} aria-label="More children">+</button>
        </div>
      </div>
      <p className="note" style={{ margin: "6px 0 0" }}>
        Children count as half a portion, so the shopping list is for {portions(state)} portions.
      </p>
      <div className="toolbar">
        <button className="chipbtn primary" onClick={askNewWeek}>↻ New week of ideas</button>
      </div>
      <div className="toolbar">
        <span className="label">Plan lunches</span>
        <div className="seg">
          {Object.entries(LUNCH_MODES).map(([k, label]) => (
            <button key={k} aria-pressed={state.lunchMode === k} onClick={() => update((s) => { s.lunchMode = k; })}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="days">
        {state.week.map((day, i) => {
          const d = new Date(monday);
          d.setDate(monday.getDate() + i);
          return (
            <div key={i} className={`day${i === todayIdx ? " today" : ""}`}>
              <div className="dname">
                {DAYS[i]}
                <small>{d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</small>
                {i === todayIdx && <span className="tag">Today</span>}
              </div>
              {["lunch", "dinner"].map((meal) => {
                if (meal === "lunch" && !lunchOn(state, i)) return null;
                const info = slotInfo(state, day[meal]);
                return (
                  <button key={meal} className="slot" onClick={() => openSlot(i, meal)}>
                    <span className="meal">{meal}</span>
                    <Thumb recipe={info ? info.recipe : { id: "empty", pic: "＋" }} photos={photos} />
                    <span className="what">
                      {info ? (
                        <>
                          <b>{info.name}</b>
                          <i>{info.sub}</i>
                        </>
                      ) : (
                        <b className="empty">Tap to choose</b>
                      )}
                    </span>
                    <span className="go" aria-hidden="true">›</span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
      <p className="note" style={{ marginTop: 14 }}>
        Tap any meal to swap it, see the recipe, get a new idea or write your own. The shopping list updates by itself.
      </p>
    </>
  );
}
