import { DAYS, MEALS, MEAL_LABEL, SPECIAL } from "../data.js";
import { findRecipe, mealOn, portions, peopleLabel, dateFromKey } from "../plan.js";
import { Thumb, Marks } from "./ui.jsx";

export function slotInfo(state, slot) {
  if (!slot) return null;
  if (slot.r) {
    const r = findRecipe(state, slot.r);
    return r && { name: r.name, mins: r.mins, double: slot.double, recipe: r };
  }
  if (slot.s === "left" && slot.of) {
    const of = findRecipe(state, slot.of);
    return { name: of ? `Leftovers: ${of.name}` : "Leftovers", sub: "From the double batch", recipe: { id: "left", pic: "🥡" } };
  }
  if (slot.s && SPECIAL[slot.s]) {
    return { name: SPECIAL[slot.s].name, sub: SPECIAL[slot.s].sub, recipe: { id: slot.s, pic: SPECIAL[slot.s].pic } };
  }
  if (slot.t) return { name: slot.t, sub: "Your note", recipe: { id: "note", pic: "📝" } };
  return null;
}

export default function WeekView({ state, photos, openSlot, openHousehold, openPastWeeks, askNewWeek }) {
  const monday = dateFromKey(state.weekOf);
  const todayIdx = Math.floor((new Date().setHours(0, 0, 0, 0) - monday.getTime()) / 86400000);
  const planned = ["breakfast", "lunchbox", "lunch"].filter((m) => (state.mealModes?.[m] || "none") !== "none").map((m) => MEAL_LABEL[m].toLowerCase());

  return (
    <>
      <button className="household" onClick={openHousehold}>
        <span className="pic t0" aria-hidden="true">👪</span>
        <span className="what">
          <b>{peopleLabel(state)}</b>
          <i>
            {portions(state)} portions · dinner{planned.length ? `, ${planned.join(", ")}` : ""}
            {state.avoid.length ? ` · avoiding ${state.avoid.join(", ")}` : ""}
          </i>
        </span>
        <span className="go" aria-hidden="true">Edit</span>
      </button>

      <div className="toolbar">
        <button className="chipbtn primary" onClick={askNewWeek}>↻ New week of ideas</button>
        {state.history.length > 0 && <button className="chipbtn" onClick={openPastWeeks}>Past weeks</button>}
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
              <div className="slots">
                {MEALS.map((meal) => {
                  if (!mealOn(state, meal, i)) return null;
                  const info = slotInfo(state, day[meal]);
                  return (
                    <button key={meal} className="slot" onClick={() => openSlot(i, meal)}>
                      <span className="meal">{meal === "lunchbox" ? "Box" : meal === "breakfast" ? "Bkfst" : meal}</span>
                      <Thumb recipe={info ? info.recipe : { id: "empty", pic: "＋" }} photos={photos} />
                      <span className="what">
                        {info ? (
                          <>
                            <b>{info.name}</b>
                            <i>
                              {info.mins ? <span className="mins">{info.mins} min</span> : info.sub}
                              {info.double && <span className="mark dbl">×2 cook double</span>}
                              <Marks state={state} recipe={info.recipe} />
                            </i>
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
            </div>
          );
        })}
      </div>
      <p className="note" style={{ marginTop: 14 }}>
        Tap any meal to swap it, see the recipe, cook double, get a new idea or write your own. The shopping list updates by itself.
      </p>
    </>
  );
}
