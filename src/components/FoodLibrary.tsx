import { useState, useRef } from "react";
import type { Food, DiaryEntry } from "../types";
import { meals } from "../types";
import {
  libraryFoods,
  normalize,
  searchCatalog,
  preparationLabels,
} from "../lib/catalog";
import { recipeFood, recentMeals } from "../lib/recipes";
import { aggregate } from "../lib/diary";
import { number } from "./Progress";

export default function FoodLibrary({
  foods,
  entries,
  onPick,
  onOpen,
  onFavorite,
  onSave,
  onRemove,
  onRepeat,
}: {
  foods: Food[];
  entries: DiaryEntry[];
  onPick: (f: Food) => void;
  onOpen: (f: Food) => void;
  onFavorite: (f: Food) => Promise<void>;
  onSave: (f: Food) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onRepeat: (entries: DiaryEntry[]) => void;
}) {
  const [tab, setTab] = useState("catalog"),
    [query, setQuery] = useState(""),
    [state, setState] = useState("all"),
    [editor, setEditor] = useState<Food | true | null>(null),
    [error, setError] = useState("");
  const recipes = foods.filter((f) => f.recipe);
  const matches =
    tab === "catalog"
      ? searchCatalog(query, state).map(
          (f) => foods.find((saved) => saved.id === f.id) ?? f,
        )
      : foods.filter(
          (f) =>
            (tab === "recipes" ? !!f.recipe : !!f.favorite) &&
            normalize(f.name).includes(normalize(query)),
        );
  return (
    <section
      className="card food-library"
      aria-label="Katalog, recepty a rychlý zápis"
    >
      <div className="section-heading">
        <div>
          <div className="eyebrow">BEZ OPISOVÁNÍ ETIKET</div>
          <h2>Katalog a moje jídla</h2>
        </div>
      </div>
      <div className="tabs library-tabs">
        {[
          ["catalog", "Katalog surovin"],
          ["recipes", "Moje recepty"],
          ["favorites", "Oblíbené výrobky"],
          ["repeat", "Zopakovat jídlo"],
        ].map(([key, label]) => (
          <button
            key={key}
            aria-pressed={tab === key}
            className={tab === key ? "active" : ""}
            onClick={() => {
              setTab(key);
              setQuery("");
              setEditor(null);
              setError("");
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {tab === "repeat" ? (
        <>
          <p>
            Vyber již zapsané celé jídlo. Před uložením upravíš den, typ jídla a
            velikost porce. Původní záznamy zůstanou zachované.
          </p>
          <div className="library-results">
            {recentMeals(entries).map((group) => (
              <article
                className="library-row"
                key={group[0].day + group[0].meal}
              >
                <div>
                  <strong>
                    {meals[group[0].meal]} ·{" "}
                    {new Date(group[0].day + "T12:00:00").toLocaleDateString(
                      "cs-CZ",
                    )}
                  </strong>
                  <p>
                    {group
                      .map(
                        (e) =>
                          `${e.food.name} (${number(e.amount)} ${e.food.unit})`,
                      )
                      .join(" + ")}
                  </p>
                  <small>
                    {number(aggregate(group).energy.value)} kcal{" "}
                    {aggregate(group).energy.missing ? "· neúplné údaje" : ""}
                  </small>
                </div>
                <button
                  className="button secondary"
                  onClick={() => onRepeat(group)}
                >
                  Zopakovat toto jídlo
                </button>
              </article>
            ))}
            {!entries.length && (
              <p>
                Nejdřív zapiš skutečně snědené jídlo. Potom ho zde můžeš rychle
                zopakovat.
              </p>
            )}
          </div>
        </>
      ) : (
        <>
          {tab === "catalog" && (
            <p className="fine">
              37 běžných surovin s českými názvy. Rozlišuj syrovou a vařenou
              hmotnost. Referenční data{" "}
              <a
                href="https://fdc.nal.usda.gov/download-datasets/"
                target="_blank"
                rel="noreferrer"
              >
                USDA SR Legacy 2018
              </a>
              ; konkrétní výrobek se může lišit. Údaje na 100 g jedlého podílu,
              sacharidy bez vlákniny.
            </p>
          )}
          {tab === "recipes" && (
            <>
              <p>
                {recipes.length} uložených receptů · jedna porce může obsahovat
                více surovin. Změna receptu nepřepíše dříve snědená jídla.
              </p>
              <button className="button" onClick={() => setEditor(true)}>
                Vytvořit vlastní recept
              </button>
            </>
          )}
          {editor ? (
            <RecipeEditor
              key={editor === true ? "new" : editor.id}
              original={editor === true ? undefined : editor}
              foods={libraryFoods(foods)}
              onCancel={() => setEditor(null)}
              onSave={async (f) => {
                await onSave(f);
                setEditor(null);
              }}
            />
          ) : (
            <>
              <div className="library-filter">
                <label>
                  Hledat {tab === "catalog" ? "surovinu" : "v uložených"}
                  <input
                    aria-label="Hledat v katalogu a jídlech"
                    placeholder="Např. rýže, vejce, jogurt…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
                {tab === "catalog" && (
                  <label>
                    Stav suroviny
                    <select
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                    >
                      <option value="all">Všechny stavy</option>
                      {Object.entries(preparationLabels).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
              <div className="library-results">
                {matches.map((f) => (
                  <article className="library-row" key={f.id}>
                    <div>
                      <strong>{f.name}</strong>
                      <p className="fine">
                        {f.catalog
                          ? preparationLabels[f.catalog.state]
                          : f.recipe
                            ? "Vlastní recept"
                            : "Uložený výrobek"}{" "}
                        ·{" "}
                        {f.nutrients.energy === undefined
                          ? "energie neznámá"
                          : number(f.nutrients.energy) +
                            " kcal / 100 " +
                            f.unit}{" "}
                        · porce {number(f.portion)} {f.unit}
                      </p>
                      {f.recipe && (
                        <small>
                          {f.recipe.ingredients.length} surovin ·{" "}
                          {f.recipe.servings} porcí · výsledek{" "}
                          {number(f.recipe.yield)} g
                        </small>
                      )}
                    </div>
                    <div className="library-row-actions">
                      <button
                        className="button secondary"
                        aria-label={"Zapsat " + f.name}
                        onClick={() => onPick(f)}
                      >
                        Zapsat
                      </button>
                      <button
                        className="text-button"
                        aria-label={"Podrobnosti " + f.name}
                        onClick={() => onOpen(f)}
                      >
                        Podrobnosti
                      </button>
                      <button
                        className="text-button"
                        aria-label={
                          (f.favorite
                            ? "Odebrat z oblíbených "
                            : "Uložit do oblíbených ") + f.name
                        }
                        onClick={() =>
                          onFavorite(f).catch((e) => setError(e.message))
                        }
                      >
                        {f.favorite ? "♥ Uloženo" : "♡ Uložit"}
                      </button>
                      {f.recipe && (
                        <>
                          <button
                            className="text-button"
                            aria-label={"Upravit recept " + f.name}
                            onClick={() => setEditor(f)}
                          >
                            Upravit recept
                          </button>
                          <button
                            className="text-button danger"
                            aria-label={"Smazat recept " + f.name}
                            onClick={async () => {
                              if (
                                window.confirm(
                                  "Smazat recept? Dříve zapsaná jídla zůstanou zachovaná.",
                                )
                              )
                                try {
                                  await onRemove(f.id);
                                } catch (e) {
                                  setError((e as Error).message);
                                }
                            }}
                          >
                            Smazat recept
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                ))}
                {!matches.length && (
                  <p>
                    {tab === "favorites"
                      ? "Zatím žádné oblíbené výrobky. Ulož je srdíčkem u výsledku nebo zde v katalogu."
                      : "Žádná shoda. Zkus jiné slovo nebo přidej vlastní potravinu přes Najít potravinu."}
                  </p>
                )}
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}

function RecipeEditor({
  original,
  foods,
  onSave,
  onCancel,
}: {
  original?: Food;
  foods: Food[];
  onSave: (f: Food) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(original?.name ?? ""),
    [query, setQuery] = useState(""),
    [selected, setSelected] = useState(""),
    [rows, setRows] = useState(original?.recipe?.ingredients ?? []),
    [weight, setWeight] = useState(String(original?.recipe?.yield ?? "")),
    [servings, setServings] = useState(String(original?.recipe?.servings ?? 1)),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const choices = foods.filter(
    (f) => !f.recipe && normalize(f.name).includes(normalize(query)),
  );
  let preview: Food | null = null;
  try {
    preview = recipeFood(
      name,
      rows,
      Number(weight),
      Number(servings),
      original,
    );
  } catch {}
  return (
    <form
      className="recipe-editor"
      onSubmit={async (e) => {
        e.preventDefault();
        if (locked.current) return;
        locked.current = true;
        setBusy(true);
        try {
          await onSave(
            recipeFood(name, rows, Number(weight), Number(servings), original),
          );
        } catch (err) {
          setError((err as Error).message);
          locked.current = false;
          setBusy(false);
        }
      }}
    >
      <h3>{original ? "Upravit recept" : "Nový recept / celé jídlo"}</h3>
      <label>
        Název receptu
        <input
          required
          maxLength={150}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <div className="library-filter">
        <label>
          Hledat surovinu do receptu
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected("");
            }}
          />
        </label>
        <label>
          Surovina do receptu
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="">Vyber surovinu nebo uložený výrobek</option>
            {choices.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="button secondary"
          disabled={!selected || rows.length >= 50}
          onClick={() => {
            const f = foods.find((f) => f.id === selected);
            if (f)
              setRows([
                ...rows,
                { food: structuredClone(f), amount: f.portion },
              ]);
            setSelected("");
          }}
        >
          Přidat surovinu
        </button>
      </div>
      {rows.map((r, i) => (
        <div className="recipe-ingredient" key={i}>
          <span>
            {r.food.name} ({r.food.unit})
          </span>
          <input
            type="number"
            required
            min="0.01"
            max="5000"
            step="any"
            aria-label={"Množství suroviny " + (i + 1)}
            value={r.amount || ""}
            onChange={(e) =>
              setRows(
                rows.map((row, j) =>
                  i === j ? { ...row, amount: Number(e.target.value) } : row,
                ),
              )
            }
          />
          <button
            type="button"
            className="text-button danger"
            aria-label={"Odebrat surovinu " + (i + 1)}
            onClick={() => setRows(rows.filter((_, j) => i !== j))}
          >
            Odebrat
          </button>
        </div>
      ))}
      <div className="form-grid">
        <label>
          Výsledná hmotnost hotového jídla (g)
          <input
            required
            type="number"
            min="0.01"
            max="50000"
            step="any"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
        </label>
        <label>
          Počet porcí receptu
          <input
            required
            type="number"
            min="1"
            max="100"
            step="any"
            value={servings}
            onChange={(e) => setServings(e.target.value)}
          />
        </label>
      </div>
      <p className="fine">
        Zvaž hotové jídlo bez nádoby. Voda při vaření mění hmotnost a hodnoty na
        100 g. U surovin v ml neodhadujeme automaticky hmotnost. Neznámé živiny
        zůstávají neznámé. Recept počítá snědenou část surovin, nikoliv
        například vylitý olej či vývar.
      </p>
      {preview && (
        <p role="status">
          Jedna porce: {number(preview.portion)} g ·{" "}
          {preview.nutrients.energy === undefined
            ? "energie neznámá"
            : number((preview.nutrients.energy * preview.portion) / 100) +
              " kcal"}{" "}
          ·{" "}
          {preview.nutrients.protein === undefined
            ? "bílkoviny neznámé"
            : number((preview.nutrients.protein * preview.portion) / 100) +
              " g bílkovin"}
        </p>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="action-row">
        <button className="button" disabled={busy || !preview}>
          {busy ? "Ukládám…" : "Uložit recept"}
        </button>
        <button
          type="button"
          className="button secondary"
          disabled={busy}
          onClick={onCancel}
        >
          Zrušit úpravu
        </button>
      </div>
    </form>
  );
}
