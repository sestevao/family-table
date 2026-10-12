import { useState } from "react";
import { AISLES, AISLE_ORDER } from "../data.js";
import { buildList, fmtQty, peopleLabel } from "../plan.js";
import { copyText } from "./ui.jsx";

function listAsText(state, list) {
  let out = `Shopping list (${peopleLabel(state)})\n`;
  AISLE_ORDER.forEach((a) => {
    if (a === "s") return;
    const items = list.filter((it) => it.aisle === a && !state.ticks[it.key]);
    const extras = a === "o" ? state.extras.filter((x) => !x.done) : [];
    if (!items.length && !extras.length) return;
    out += `\n${AISLES[a].name.toUpperCase()}\n`;
    items.forEach((it) => (out += `• ${it.qty ? fmtQty(it.qty, it.unit) + " " : ""}${it.name}\n`));
    extras.forEach((x) => (out += `• ${x.text}\n`));
  });
  const staples = list.filter((it) => it.aisle === "s").map((it) => it.name);
  if (staples.length) out += `\nCHECK THE CUPBOARD\n${staples.join(", ")}\n`;
  return out;
}

export default function ShopView({ state, update, toast, showText }) {
  const [extra, setExtra] = useState("");
  const list = buildList(state);
  const buyable = list.filter((it) => it.aisle !== "s");
  const total = buyable.length + state.extras.length;
  const done = buyable.filter((it) => state.ticks[it.key]).length + state.extras.filter((x) => x.done).length;

  const copy = async () => {
    const text = listAsText(state, list);
    if (await copyText(text)) toast("List copied. Paste it into WhatsApp or Notes");
    else showText(text);
  };

  const addExtra = (e) => {
    e.preventDefault();
    const v = extra.trim();
    if (!v) return;
    update((s) => s.extras.push({ id: Date.now().toString(36), text: v.slice(0, 80), done: false }));
    setExtra("");
  };

  return (
    <>
      <div className="toolbar">
        <button className="chipbtn primary" onClick={copy}>Copy list</button>
        <button className="chipbtn" onClick={() => update((s) => { s.ticks = {}; s.extras.forEach((x) => (x.done = false)); })}>
          Untick all
        </button>
      </div>
      <div className="progress" aria-hidden="true">
        <i style={{ width: `${total ? Math.round((done / total) * 100) : 0}%` }} />
      </div>
      <p className="note" style={{ margin: "6px 0 0" }}>
        {done} of {total} in the basket · for {peopleLabel(state)}
      </p>

      {AISLE_ORDER.map((a) => {
        const items = list.filter((it) => it.aisle === a).sort((x, y) => x.name.localeCompare(y.name));
        const extras = a === "o" ? state.extras : [];
        if (!items.length && !extras.length) return null;
        return (
          <section className="shopsec" key={a}>
            <h3>{AISLES[a].name}</h3>
            {AISLES[a].where && <p className="where">{AISLES[a].where}</p>}
            <div className="list">
              {items.map((it) => {
                const on = Boolean(state.ticks[it.key]);
                const id = "t_" + it.key.replace(/[^a-z0-9]/gi, "_");
                return (
                  <div key={it.key} className={`item${on ? " done" : ""}`}>
                    <input
                      type="checkbox"
                      id={id}
                      checked={on}
                      onChange={(e) => update((s) => { if (e.target.checked) s.ticks[it.key] = 1; else delete s.ticks[it.key]; })}
                    />
                    <label htmlFor={id}>
                      {it.qty ? <span className="q">{fmtQty(it.qty, it.unit)} </span> : null}
                      {it.name}
                      <span className="used">{it.used.join(", ")}</span>
                    </label>
                  </div>
                );
              })}
              {extras.map((x) => (
                <div key={x.id} className={`item${x.done ? " done" : ""}`}>
                  <input
                    type="checkbox"
                    id={`x_${x.id}`}
                    checked={x.done}
                    onChange={(e) => update((s) => { const it = s.extras.find((y) => y.id === x.id); if (it) it.done = e.target.checked; })}
                  />
                  <label htmlFor={`x_${x.id}`}>
                    {x.text}
                    <span className="used">Added by you</span>
                  </label>
                  <button className="x" aria-label={`Remove ${x.text}`} onClick={() => update((s) => { s.extras = s.extras.filter((y) => y.id !== x.id); })}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          </section>
        );
      })}

      <form className="addrow" onSubmit={addExtra}>
        <input id="addExtra" value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="Add something else (milk, nappies…)" autoComplete="off" />
        <button className="chipbtn primary" type="submit">Add</button>
      </form>

      <h2>Where to shop in Southampton</h2>
      <div className="guide">
        <div><b>Cheapest big shop</b><p>Aldi and Lidl have several stores around the city. Good for tins, pasta, dairy and frozen.</p></div>
        <div><b>Fresh fruit, veg and meat</b><p>Kingsland Market in St Mary's, plus the greengrocers and butchers on Shirley and Portswood high streets. Often cheaper for loose veg.</p></div>
        <div><b>Spices, rice and world foods</b><p>The international grocers around St Mary's and Bevois Valley sell big bags of rice and spices for much less.</p></div>
        <div><b>One stop or home delivery</b><p>Tesco, Sainsbury's, Asda and Morrisons all deliver in Southampton. Copy this list into their app to fill your basket quickly.</p></div>
      </div>
      <p className="note" style={{ marginTop: 10 }}>
        Quantities are worked out for your family. Shops sell in packs, so round up where you need to.
      </p>
    </>
  );
}
