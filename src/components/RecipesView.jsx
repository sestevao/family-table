import { useState } from "react";
import { MEAL_LABEL } from "../data.js";
import { allRecipes, rating, avoidHits } from "../plan.js";
import { Photo } from "./ui.jsx";

const FILTERS = [
  ["all", "All"], ["fav", "♥ Favourites"], ["quick", "Under 20 min"], ["kids", "Kid friendly"], ["veggie", "Veggie"],
  ["healthy", "Healthy"], ["breakfast", "Breakfast"], ["lunchbox", "Lunchbox"], ["mine", "Mine"],
];

// A photo card for one recipe, used in the recipe grid and the meal picker
export function RecipeTile({ recipe, state, photos, onClick, current }) {
  const hits = avoidHits(state, recipe);
  return (
    <button className={`rtile${current ? " cur" : ""}`} onClick={onClick}>
      <Photo recipe={recipe} photos={photos}>
        <span className="badge-top mins">{recipe.mins} min</span>
        {rating(state, recipe.id) > 0 && <span className="fav" aria-label="Family favourite">♥</span>}
      </Photo>
      <span className="t">
        <b>{recipe.name}</b>
        <i>
          {recipe.meal.map((m) => MEAL_LABEL[m]).join(" · ")}
          {rating(state, recipe.id) < 0 && " · not again"}
        </i>
        {hits.length > 0 && <span className="mark warn">⚠ {hits.join(", ")}</span>}
      </span>
    </button>
  );
}

export default function RecipesView({ state, photos, openRecipe, newRecipe, openImport }) {
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const q = query.toLowerCase();
  const recipes = allRecipes(state).filter((r) => {
    if (filter === "mine" && !r.custom) return false;
    if (filter === "fav" && rating(state, r.id) <= 0) return false;
    if (filter === "quick" && r.mins > 20) return false;
    if (["breakfast", "lunchbox"].includes(filter) && !r.meal.includes(filter)) return false;
    if (["kids", "veggie", "healthy"].includes(filter) && !(r.tags || []).includes(filter)) return false;
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
        <button className="chipbtn primary" onClick={newRecipe}>+ Add your own</button>
        <button className="chipbtn" onClick={openImport}>Import from a link or photo</button>
      </div>
      {recipes.length ? (
        <div className="rgrid">
          {recipes.map((r) => (
            <RecipeTile key={r.id} recipe={r} state={state} photos={photos} onClick={() => openRecipe(r.id)} />
          ))}
        </div>
      ) : (
        <p className="note" style={{ marginTop: 16 }}>
          {filter === "mine"
            ? "You haven't added any recipes yet. Add a family favourite or import one from a website."
            : filter === "fav"
              ? "No favourites yet. Open a recipe and tap “Family favourite”."
              : "No recipes match that search."}
        </p>
      )}
    </>
  );
}
