import { useRef, useState } from "react";
import type { Food, Meal, DiaryEntry } from "../types";
import { meals } from "../types";
import { dayKey, makeEntry, entryNutrients } from "../lib/diary";
import { number } from "./Progress";
import Icon from "./Icon";
export default function AddToDay({
  food,
  day,
  initialMeal = "snack",
  entry,
  onClose,
  onSave,
  onComplete,
}: {
  food: Food;
  day: string;
  initialMeal?: Meal;
  entry?: DiaryEntry;
  onClose: () => void;
  onSave: (e: DiaryEntry) => Promise<void>;
  onComplete: () => void;
}) {
  const [quantity, setQuantity] = useState(
    String(entry?.amount ?? food.portion),
  );
  const [mode, setMode] = useState<"amount" | "servings">("amount");
  const [meal, setMeal] = useState<Meal>(entry?.meal ?? initialMeal);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const id = useRef(entry?.id ?? crypto.randomUUID());
  const amount = Number(quantity) * (mode === "servings" ? food.portion : 1);
  const nutrients =
    Number.isFinite(amount) && amount > 0
      ? entryNutrients({ ...entry, food, amount } as DiaryEntry)
      : {};
  const missing = ["energy", "protein", "carbs", "fat"].filter(
    (k) => food.nutrients[k as keyof Food["nutrients"]] === undefined,
  );
  return (
    <div className="modal-backdrop">
      <section className="modal">
        <button
          className="icon-button close"
          aria-label="Zavřít přidání jídla"
          onClick={onClose}
          disabled={busy}
        >
          <Icon name="X" />
        </button>
        <h2>{entry ? "Upravit snědenou porci" : "Přidat do mého dne"}</h2>
        <p>{food.name}</p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (locked.current) return;
            locked.current = true;
            setBusy(true);
            try {
              const confirmedDay = String(
                new FormData(e.currentTarget).get("day"),
              );
              const value = makeEntry(
                food,
                confirmedDay,
                meal,
                amount,
                id.current,
              );
              if (entry) value.createdAt = entry.createdAt;
              await onSave(value);
              onClose();
            } catch (err) {
              setError((err as Error).message);
              locked.current = false;
              setBusy(false);
            }
          }}
        >
          <div className="form-grid">
            <label>
              Datum
              <input
                type="date"
                name="day"
                required
                defaultValue={entry?.day ?? day}
                max={dayKey()}
              />
            </label>
            <label>
              Jídlo
              <select
                value={meal}
                onChange={(e) => setMeal(e.target.value as Meal)}
              >
                {Object.entries(meals).map(([k, v]) => (
                  <option value={k} key={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Způsob zadání
              <select
                value={mode}
                onChange={(e) => {
                  const next = e.target.value as typeof mode;
                  setQuantity(
                    String(
                      next === "servings"
                        ? Number(quantity) / food.portion
                        : Number(quantity) * food.portion,
                    ),
                  );
                  setMode(next);
                }}
              >
                <option value="amount">Množství v {food.unit}</option>
                <option value="servings">
                  Počet porcí (1 = {food.portion} {food.unit})
                </option>
              </select>
            </label>
            <label>
              {mode === "servings"
                ? "Počet porcí"
                : "Skutečně snědeno (" + food.unit + ")"}
              <input
                aria-label="Snědené množství"
                required
                type="number"
                min="0.01"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </label>
          </div>
          <p>
            Celkem {number(Number.isFinite(amount) ? amount : 0)} {food.unit} ·{" "}
            {nutrients.energy === undefined
              ? "energie neznámá"
              : number(nutrients.energy) + " kcal"}{" "}
            ·{" "}
            {nutrients.protein === undefined
              ? "bílkoviny neznámé"
              : number(nutrients.protein) + " g bílkovin"}
          </p>
          {missing.length > 0 && (
            <div className="notice">
              Etiketa má chybějící hlavní údaje. Položku lze zapsat, ale denní
              součty budou neúplné.
              <button
                type="button"
                className="text-button"
                onClick={onComplete}
              >
                Doplnit etiketu před přidáním
              </button>
            </div>
          )}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <button type="submit" className="button full" disabled={busy}>
            {busy
              ? "Ukládám…"
              : entry
                ? "Uložit změnu"
                : "Potvrdit přidání jídla"}
          </button>
          <p className="fine">
            Zapisuj skutečně snědené množství. Samotné hodnocení výrobku se do
            dne nezapočítává.
          </p>
        </form>
      </section>
    </div>
  );
}
