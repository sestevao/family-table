import { useEffect, useRef, useState } from "react";
import { tint, fmtQty, portions } from "../plan.js";
import { shrinkImage } from "../plan.js";

export function Thumb({ recipe, photos, className = "pic" }) {
  const src = recipe && photos?.[recipe.id];
  if (src) {
    return (
      <span className={className}>
        <img src={src} alt="" />
      </span>
    );
  }
  return (
    <span className={`${className} ${tint(recipe?.id || "x")}`} aria-hidden="true">
      {recipe?.pic || "🍽️"}
    </span>
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
      {!recipe.special && (
        <label className="chipbtn photoBtn">
          {busy ? "Adding…" : src ? "Change photo" : "📷 Add photo"}
          <input type="file" accept="image/*" onChange={onFile} disabled={busy} />
        </label>
      )}
    </div>
  );
}

export function Ingredients({ recipe, state }) {
  const sc = portions(state) / (recipe.serves || 4);
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
  return (
    <ol className="steps">
      {steps.map((s, i) => (
        <li key={i}>{s}</li>
      ))}
    </ol>
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
    t.current = setTimeout(() => setMsg(null), 2400);
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
