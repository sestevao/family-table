import { useEffect, useRef, useState } from "react";
import { tint, fmtQty, mealScale, shrinkImage, avoidHits, rating } from "../plan.js";

export function Thumb({ recipe, photos, className = "pic" }) {
  const src = recipe && photos?.[recipe.id];
  if (src) {
    return (
      <span className={className}>
        <img src={src} alt="" loading="lazy" />
      </span>
    );
  }
  return (
    <span className={`${className} ${tint(recipe?.id || "x")}`} aria-hidden="true">
      {recipe?.pic || "🍽️"}
    </span>
  );
}

// Small markers after a recipe name: favourite, not again, allergy warning
export function Marks({ state, recipe }) {
  if (!recipe?.ing) return null;
  const r = rating(state, recipe.id);
  const hits = avoidHits(state, recipe);
  return (
    <>
      {r > 0 && <span className="mark fav" title="Family favourite">♥</span>}
      {r < 0 && <span className="mark nope" title="Not again">✕</span>}
      {hits.length > 0 && <span className="mark warn">⚠ {hits.join(", ")}</span>}
    </>
  );
}

export function Rating({ state, update, recipe }) {
  const r = rating(state, recipe.id);
  const set = (v) =>
    update((s) => {
      if (v) s.ratings[recipe.id] = v;
      else delete s.ratings[recipe.id];
    });
  return (
    <div className="row" style={{ marginTop: 0, marginBottom: 12 }}>
      <button className="chipbtn" aria-pressed={r > 0} onClick={() => set(r > 0 ? 0 : 1)}>♥ Family favourite</button>
      <button className="chipbtn" aria-pressed={r < 0} onClick={() => set(r < 0 ? 0 : -1)}>✕ Not again</button>
    </div>
  );
}

export function Hero({ recipe, photos, onPhoto, toast }) {
  const src = photos?.[recipe.id];
  const [busy, setBusy] = useState(false);
  const onFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    toast("Adding photo…");
    try {
      await onPhoto(recipe.id, await shrinkImage(f));
      toast("Photo added");
    } catch {
      toast("That photo couldn't be added. Try a different one.");
    }
    setBusy(false);
  };
  return (
    <div className={`hero ${tint(recipe.id)}`}>
      {src ? <img src={src} alt={`Photo of ${recipe.name}`} /> : <span aria-hidden="true">{recipe.pic || "🍽️"}</span>}
      <label className="chipbtn photoBtn">
        {busy ? "Adding…" : src ? "Change photo" : "📷 Add photo"}
        <input type="file" accept="image/*" onChange={onFile} disabled={busy} />
      </label>
    </div>
  );
}

export function Ingredients({ recipe, state, meal }) {
  const sc = mealScale(state, meal || recipe.meal?.[0] || "dinner", recipe);
  return (
    <ul className="ings">
      {recipe.ing.map(([q, u, n, a], i) => (
        <li key={i}>
          <span className="q">{a === "s" || !q ? "—" : fmtQty(q * sc, u)}</span>
          <span>{n}</span>
        </li>
      ))}
    </ul>
  );
}

export function Method({ steps }) {
  if (!steps?.length) return <p className="note">No method written yet.</p>;
  return (
    <ol className="steps">
      {steps.map((s, i) => (
        <li key={i}>{s}</li>
      ))}
    </ol>
  );
}

export function Stepper({ label, value, onChange, min = 0, max = 10, unit = "" }) {
  return (
    <div className="stepper" aria-label={label}>
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} aria-label={`Less ${label}`}>−</button>
      <span>{value}{unit}</span>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} aria-label={`More ${label}`}>+</button>
    </div>
  );
}

export function Sheet({ onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);
  return (
    <div className="scrim" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true">
        <div className="grab" />
        {children}
      </div>
    </div>
  );
}

export function useToast() {
  const [msg, setMsg] = useState(null);
  const t = useRef();
  const show = (m) => {
    setMsg(m);
    clearTimeout(t.current);
    t.current = setTimeout(() => setMsg(null), 2600);
  };
  const node = msg ? (
    <div className="toast" role="status">
      {msg}
    </div>
  ) : null;
  return [show, node];
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
