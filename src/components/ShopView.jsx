import { useState } from "react";
import { AISLES, AISLE_ORDER } from "../data.js";
import { buildList, fmtQty, listCost, peopleLabel } from "../plan.js";
import { copyText } from "./ui.jsx";

const money = (n) => `£${n.toFixed(2)}`;

function listAsText(state, list) {
  let out = `Shopping list (${peopleLabel(state)})\n`;
  AISLE_ORDER.forEach((a) => {
    if (a === "s") return;
    const items = list.filter((it) => it.aisle === a && !it.atHome && !state.ticks[it.key]);
    const extras = a === "o" ? state.extras.filter((x) => !x.done) : [];
    if (!items.length && !extras.length) return;
    out += `\n${AISLES[a].name.toUpperCase()}\n`;
    items.forEach((it) => (out += `• ${it.qty ? fmtQty(it.qty, it.unit) + " " : ""}${it.name}${it.pack?.label ? ` (${it.pack.label})` : ""}\n`));
    extras.forEach((x) => (out += `• ${x.text}\n`));
  });
  const check = list.filter((it) => it.aisle === "s" || it.atHome).map((it) => it.name);
  if (check.length) out += `\nCHECK THE CUPBOARD\n${check.join(", ")}\n`;
  return out;
}

function Item({ it, state, update }) {
  const on = Boolean(state.ticks[it.key]);
  const id = "t_" + it.key.replace(/[^a-z0-9]/gi, "_");
  const tick = (e) => {
    const checked = e.target.checked;
    update((s) => {
      if (checked) s.ticks[it.key] = 1;
      else delete s.ticks[it.key];
    });
  };
  const setHome = (home) =>
    update((s) => {
      s.pantry = s.pantry.filter((p) => p !== it.base);
      if (home) s.pantry.push(it.base);
    });
  return (
    <div className={`item${on ? " done" : ""}`}>
      <input type="checkbox" id={id} checked={on} onChange={tick} />
      <label htmlFor={id}>
        {it.qty ? <span className="q">{fmtQty(it.qty, it.unit)} </span> : null}
        {it.name}
        <span className="used">
          {it.pack?.label && <>{it.pack.label} · ~{money(it.pack.cost)} · </>}
          {it.used.join(", ")}
        </span>
      </label>
      {it.aisle !== "s" && (
        <button className="homebtn" onClick={() => setHome(!it.atHome)} aria-label={it.atHome ? `Need to buy ${it.name}` : `${it.name} is always in the cupboard`}>
          {it.atHome ? "Buy" : "Have it"}
        </button>
      )}
    </div>
  );
}

export default function ShopView({ state, update, toast, showText }) {
  const [extra, setExtra] = useState("");
  const list = buildList(state);
  const buyable = list.filter((it) => it.aisle !== "s" && !it.atHome);
  const total = buyable.length + state.extras.length;
  const done = buyable.filter((it) => state.ticks[it.key]).length + state.extras.filter((x) => x.done).length;
  const cost = listCost(list);
  const atHome = list.filter((it) => it.atHome);
  const staples = list.filter((it) => it.aisle === "s");

  const copy = async () => {
    const text = listAsText(state, list);
    if (await copyText(text)) toast("List copied. Paste it into WhatsApp or Notes");
    else showText(text);
  };

  const addExtra = (e) => {
    e.preventDefault();
    const v = extra.trim().slice(0, 80);
    if (!v) return;
    const id = Date.now().toString(36);
    update((s) => s.extras.push({ id, text: v, done: false }));
    setExtra("");
  };

  return (
    <>
      <div className="summary">
        <div>
          <span className="label">Rough cost</span>
          <b>{money(cost.total)}</b>
          <i>Aldi/Lidl-style prices for {cost.priced} of {cost.count} items</i>
        </div>
        <div>
          <span className="label">In the basket</span>
          <b>{done} / {total}</b>
          <i>for {peopleLabel(state)}</i>
        </div>
      </div>
      <div className="progress" aria-hidden="true">
        <i style={{ width: `${total ? Math.round((done / total) * 100) : 0}%` }} />
      </div>
      <div className="toolbar">
        <button className="chipbtn primary" onClick={copy}>Copy list</button>
        <button className="chipbtn" onClick={() => update((s) => { s.ticks = {}; s.extras.forEach((x) => (x.done = false)); })}>
          Untick all
        </button>
      </div>

      <div className="aisles">
      {AISLE_ORDER.filter((a) => a !== "s").map((a) => {
        const items = list.filter((it) => it.aisle === a && !it.atHome).sort((x, y) => x.name.localeCompare(y.name));
        const extras = a === "o" ? state.extras : [];
        if (!items.length && !extras.length) return null;
        return (
          <section className="shopsec" key={a}>
            <h3>{AISLES[a].name}</h3>
            {AISLES[a].where && <p className="where">{AISLES[a].where}</p>}
            <div className="list">
              {items.map((it) => <Item key={it.key} it={it} state={state} update={update} />)}
              {extras.map((x) => {
                const toggle = (e) => {
                  const checked = e.target.checked;
                  update((s) => { const y = s.extras.find((z) => z.id === x.id); if (y) y.done = checked; });
                };
                return (
                  <div key={x.id} className={`item${x.done ? " done" : ""}`}>
                    <input type="checkbox" id={`x_${x.id}`} checked={x.done} onChange={toggle} />
                    <label htmlFor={`x_${x.id}`}>
                      {x.text}
                      <span className="used">Added by you</span>
                    </label>
                    <button className="x" aria-label={`Remove ${x.text}`} onClick={() => update((s) => { s.extras = s.extras.filter((y) => y.id !== x.id); })}>
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
      </div>

      <form className="addrow" onSubmit={addExtra}>
        <input id="addExtra" value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="Add something else (milk, nappies…)" autoComplete="off" />
        <button className="chipbtn primary" type="submit">Add</button>
      </form>

      {(atHome.length > 0 || staples.length > 0) && (
        <section className="shopsec">
          <h3>Check the cupboard</h3>
          <p className="where">Things you said you always have, and staples like oil and spices. Tap “Buy” to move one back to the list.</p>
          <div className="list">
            {atHome.map((it) => <Item key={it.key} it={it} state={state} update={update} />)}
            {staples.length > 0 && (
              <div className="item">
                <label>
                  {staples.map((it) => it.name).join(", ")}
                  <span className="used">Staples used this week</span>
                </label>
              </div>
            )}
          </div>
        </section>
      )}

      <h2>Where to shop in Southampton</h2>
      <div className="guide">
        <div><b>Cheapest big shop</b><p>Aldi and Lidl have several stores around the city. Good for tins, pasta, dairy and frozen.</p></div>
        <div><b>Fresh fruit, veg and meat</b><p>Kingsland Market in St Mary's, plus the greengrocers and butchers on Shirley and Portswood high streets. Often cheaper for loose veg.</p></div>
        <div><b>Spices, rice and world foods</b><p>The international grocers around St Mary's and Bevois Valley sell big bags of rice and spices for much less.</p></div>
        <div><b>One stop or home delivery</b><p>Tesco, Sainsbury's, Asda and Morrisons all deliver in Southampton. Copy this list into their app to fill your basket quickly.</p></div>
      </div>
      <p className="note" style={{ marginTop: 10 }}>
        Pack sizes and prices are a rough guide based on typical UK budget supermarkets. Real prices change and vary by shop.
      </p>
    </>
  );
}
