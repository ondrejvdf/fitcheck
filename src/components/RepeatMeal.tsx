import { useState, useRef } from "react";
import type { DiaryEntry, Meal } from "../types";
import { meals } from "../types";
import { dayKey, aggregate } from "../lib/diary";
import { repeatEntries } from "../lib/recipes";
import { number } from "./Progress";
export default function RepeatMeal({
  entries,
  day,
  onSave,
  onClose,
}: {
  entries: DiaryEntry[];
  day: string;
  onSave: (entries: DiaryEntry[]) => Promise<void>;
  onClose: () => void;
}) {
  const [date, setDate] = useState(day),
    [meal, setMeal] = useState<Meal>(entries[0].meal),
    [factor, setFactor] = useState("1"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const ids = useRef(entries.map(() => crypto.randomUUID())),
    locked = useRef(false);
  let result: DiaryEntry[] = [];
  try {
    result = repeatEntries(entries, date, meal, Number(factor), ids.current);
  } catch {}
  const total = aggregate(result);
  return (
    <div className="modal-backdrop">
      <section
        className="modal"
        role="dialog"
        aria-label="Zopakovat celé jídlo"
      >
        <button
          className="close text-button"
          aria-label="Zavřít opakování jídla"
          disabled={busy}
          onClick={onClose}
        >
          Zavřít
        </button>
        <h2>Zopakovat celé jídlo</h2>
        <p>Přidá se nový záznam. Původní jídlo se nepřesune ani nezmění.</p>
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
              if (confirmedDay > dayKey())
                throw Error("Jídlo lze zapsat nejpozději do dneška.");
              await onSave(
                repeatEntries(
                  entries,
                  confirmedDay,
                  meal,
                  Number(factor),
                  ids.current,
                ),
              );
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
              Den opakovaného jídla
              <input
                required
                type="date"
                name="day"
                max={dayKey()}
                value={date}
                onInput={(e) => setDate(e.currentTarget.value)}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            <label>
              Zařadit jako
              <select
                value={meal}
                onChange={(e) => setMeal(e.target.value as Meal)}
              >
                {Object.entries(meals).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Násobek původního množství
              <input
                required
                type="number"
                min="0.01"
                max="10"
                step="any"
                value={factor}
                onChange={(e) => setFactor(e.target.value)}
              />
            </label>
          </div>
          <ul>
            {result.map((e) => (
              <li key={e.id}>
                {e.food.name} · {number(e.amount)} {e.food.unit}
              </li>
            ))}
          </ul>
          <p>
            Celkem {number(total.energy.value)} kcal ·{" "}
            {number(total.protein.value)} g bílkovin
            {total.energy.missing || total.protein.missing
              ? " · neúplné údaje"
              : ""}
          </p>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <button className="button full" disabled={busy || !result.length}>
            {busy ? "Ukládám…" : "Potvrdit zopakování jídla"}
          </button>
        </form>
      </section>
    </div>
  );
}
