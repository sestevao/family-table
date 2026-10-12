import { useEffect, useRef } from "react";
import { DAYS, MEAL_LABEL, SPECIAL } from "../data.js";
import { findRecipe, mealOn, portions, peopleLabel, dateFromKey } from "../plan.js";
import { Photo, Thumb, Marks } from "./ui.jsx";

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const SIDE_MEALS = ["breakfast", "lunchbox", "lunch"];

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

const EMPTY = { id: "empty", pic: "🍽️" };

function Meta({ state, info }) {
  if (!info) return <span className="meta">Tap to choose</span>;
  return (
    <span className="meta">
      {info.mins ? <span className="mins">{info.mins} min</span> : <span>{info.sub}</span>}
      {info.double && <span className="mark dbl">×2 cook double</span>}
      <Marks state={state} recipe={info.recipe} />
    </span>
  );
}

export default function WeekView({ state, photos, openSlot, openHousehold, openPastWeeks, askNewWeek }) {
  const monday = dateFromKey(state.weekOf);
  const todayIdx = Math.floor((new Date().setHours(0, 0, 0, 0) - monday.getTime()) / 86400000);
  const isThisWeek = todayIdx >= 0 && todayIdx <= 6;
  const focus = isThisWeek ? todayIdx : 0;
  const tonight = slotInfo(state, state.week[focus].dinner);
  const cards = useRef([]);
  const planned = SIDE_MEALS.filter((m) => (state.mealModes?.[m] || "none") !== "none").map((m) => MEAL_LABEL[m].toLowerCase());
  const dateOf = (i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  };

  // Start the day cards at today
  useEffect(() => {
    const el = cards.current[focus];
    if (el && focus > 0) el.parentElement.scrollLeft = el.offsetLeft - 16;
  }, [focus]);

  const jumpTo = (i) => cards.current[i]?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });

  return (
    <>
      <button className={`tonight${tonight ? "" : " empty"}`} onClick={() => openSlot(focus, "dinner")}>
        <Photo recipe={tonight ? tonight.recipe : EMPTY} photos={photos}>
          <span className="overlay">
            <span className="eyebrow">{isThisWeek ? "Tonight" : `${DAY_NAMES[focus]} dinner`}</span>
            <b>{tonight ? tonight.name : "Nothing planned yet"}</b>
            <Meta state={state} info={tonight} />
          </span>
        </Photo>
      </button>

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

      <div className="sectionhead">
        <h2>This week</h2>
        <span className="note swipehint">Swipe the days</span>
      </div>
      <div className="daychips" role="tablist" aria-label="Days">
        {DAYS.map((d, i) => (
          <button key={d} className={`daychip${isThisWeek && i === todayIdx ? " today" : ""}`} onClick={() => jumpTo(i)} aria-label={DAY_NAMES[i]}>
            {d}
            <b>{dateOf(i).getDate()}</b>
          </button>
        ))}
      </div>

      <div className="carousel">
        {state.week.map((day, i) => {
          const dinner = slotInfo(state, day.dinner);
          const isToday = isThisWeek && i === todayIdx;
          return (
            <article key={i} className={`daycard${isToday ? " today" : ""}`} ref={(el) => (cards.current[i] = el)} aria-label={DAY_NAMES[i]}>
              <button className="dinner" onClick={() => openSlot(i, "dinner")}>
                <Photo recipe={dinner ? dinner.recipe : EMPTY} photos={photos}>
                  <span className="overlay">
                    <span className="dayname">
                      {DAYS[i]} {dateOf(i).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      {isToday && <em>Today</em>}
                    </span>
                    <span>
                      <b>{dinner ? dinner.name : "Choose dinner"}</b>
                      <Meta state={state} info={dinner} />
                    </span>
                  </span>
                </Photo>
              </button>
              {SIDE_MEALS.some((meal) => mealOn(state, meal, i)) && <div className="others">
                {SIDE_MEALS.map((meal) => {
                  if (!mealOn(state, meal, i)) return null;
                  const info = slotInfo(state, day[meal]);
                  return (
                    <button key={meal} className="mealline" onClick={() => openSlot(i, meal)}>
                      <Thumb recipe={info ? info.recipe : { id: "empty", pic: "＋" }} photos={photos} />
                      <span className="what">
                        <span className="label">{MEAL_LABEL[meal]}</span>
                        {info ? <b>{info.name}</b> : <b className="empty">Tap to choose</b>}
                      </span>
                      <span className="go" aria-hidden="true">›</span>
                    </button>
                  );
                })}
              </div>}
            </article>
          );
        })}
      </div>

      <div className="toolbar">
        <button className="chipbtn primary" onClick={askNewWeek}>↻ New week of ideas</button>
        {state.history.length > 0 && <button className="chipbtn" onClick={openPastWeeks}>Past weeks</button>}
      </div>
      <p className="note" style={{ marginTop: 12 }}>
        Tap any meal to swap it, see the recipe, cook double, get a new idea or write your own. The shopping list updates by itself.
      </p>
    </>
  );
}
