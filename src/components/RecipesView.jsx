import { useState } from "react";
import { allRecipes } from "../plan.js";
import { Thumb } from "./ui.jsx";

const FILTERS = [["all", "All"], ["quick", "Under 20 min"], ["kids", "Kid friendly"], ["veggie", "Veggie"], ["healthy", "Healthy"], ["mine", "Mine"]];

export default function RecipesView({ state, photos, openRecipe, newRecipe }) {
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const q = query.toLowerCase();
  const recipes = allRecipes(state).filter((r) => {
    if (filter === "mine" && !r.custom) return false;
    if (filter === "quick" && r.mins > 20) return false;
    if (!["all", "mine", "quick"].includes(filter) && !(r.tags || []).includes(filter)) return false;
    return !q || r.name.toLowerCase().includes(q) || r.ing.some((i) => i[2].toLowerCase().includes(q));
  });

  return (
    <>
      <input className="search" id="recipeSearch" type="search" placeholder="Search recipes or ingredients" value={query} onChange={(e) => setQuery(e.target.value)} />
      <div className="filters">
        {FILTERS.map(([k, label]) => (
          <button key={k} className="chipbtn" aria-pressed={filter === k} onClick={() => setFilter(k)}>
            {label}
          </button>
        ))}
      </div>
      <div className="toolbar">
        <button className="chipbtn primary" onClick={newRecipe}>+ Add your own recipe</button>
      </div>
      <div className="rcards">
        {recipes.length ? (
          recipes.map((r) => (
            <button key={r.id} className="rcard" onClick={() => openRecipe(r.id)}>
              <Thumb recipe={r} photos={photos} />
              <span className="t">
                <b>{r.name}</b>
                <i>{r.meal.join(" · ")} · {r.ing.length} ingredients</i>
              </span>
              <span className="mins">{r.mins} min</span>
            </button>
          ))
        ) : (
          <p className="note">
            {filter === "mine" ? "You haven't added any recipes yet. Tap “Add your own recipe” to save a family favourite." : "No recipes match that search."}
          </p>
        )}
      </div>
    </>
  );
}
