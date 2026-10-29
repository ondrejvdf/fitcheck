import { useState } from "react";
import type { Food, Nutrients, Category } from "../types";
import { categories, labels } from "../types";
import { validate } from "../lib/nutrition";
import { applyCorrections } from "../lib/corrections";
export default function Manual({
  onSave,
  initial,
  onCancel,
}: {
  onSave: (f: Food) => void;
  initial?: Food;
  onCancel?: () => void;
}) {
  const [error, setError] = useState("");
  const [basis, setBasis] = useState("100");
  return (
    <section className="card form-card">
      <div className="eyebrow">Z ETIKETY ROVNOU K VÝSLEDKU</div>
      <h2>{initial ? "Doplnit údaje z etikety" : "Přidat potravinu ručně"}</h2>
      <p>Opiš údaje z obalu. Neuvedené hodnoty nech prázdné.</p>
      {initial && (
        <p className="fine">
          Fotografie, čárový kód a původní zdroj zůstanou zachovány. Změněné
          údaje uložíme jen do tohoto zařízení jako tvoje úpravy. Pokud měníš
          již uvedenou hodnotu, nahradíš ji vlastní hodnotou; původní podklad
          zůstane dohledatelný u zdrojů výsledku.
        </p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const d = new FormData(e.currentTarget);
          const size = Number(d.get("portion"));
          const nutrients: Nutrients = {};
          for (const k of Object.keys(labels) as (keyof Nutrients)[]) {
            const raw = d.get(k);
            if (raw !== "" && raw !== null)
              nutrients[k] =
                Number(raw) * (basis === "portion" ? 100 / size : 1);
          }
          const errors = validate(nutrients);
          if (!String(d.get("name")).trim())
            errors.push("Vyplň název potraviny.");
          if (
            !initial &&
            !Object.values(nutrients).some((v) => v !== undefined)
          )
            errors.push("Vyplň alespoň jednu nutriční hodnotu.");
          if (errors.length) {
            setError(errors.join(" "));
            return;
          }
          const fields = {
            name: String(d.get("name")).trim(),
            category: d.get("category") as Category,
            unit: d.get("unit") as "g" | "ml",
            portion: size,
            nutrients,
          };
          if (initial) {
            onSave(applyCorrections(initial, fields));
            return;
          }
          onSave({
            id: crypto.randomUUID(),
            name: String(d.get("name")).trim(),
            category: d.get("category") as Category,
            unit: d.get("unit") as "g" | "ml",
            portion: size,
            nutrients,
            source: "manual",
            categoryCertain: fields.category !== "general",
            date: new Date().toISOString(),
          });
        }}
      >
        <div className="form-grid">
          <label className="wide">
            Název potraviny
            <input
              name="name"
              required
              maxLength={150}
              placeholder="Např. Bílý řecký jogurt"
              defaultValue={initial?.name}
            />
          </label>
          <label>
            Kategorie
            <select name="category" defaultValue={initial?.category}>
              {Object.entries(categories).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label>
            Jednotka
            <select name="unit" defaultValue={initial?.unit}>
              <option value="g">Gramy (g)</option>
              <option value="ml">Mililitry (ml)</option>
            </select>
          </label>
          <label>
            Velikost porce (g/ml)
            <input
              name="portion"
              type="number"
              required
              min="1"
              max="5000"
              step="any"
              defaultValue={initial?.portion ?? 150}
            />
          </label>
          <label>
            Údaje na etiketě
            <select
              value={basis}
              disabled={!!initial}
              onChange={(e) => setBasis(e.target.value)}
            >
              <option value="100">Na 100 g / 100 ml</option>
              <option value="portion">Na jednu porci</option>
            </select>
          </label>
          {Object.entries(labels).map(([k, v]) => (
            <label key={k}>
              {v} ({k === "energy" ? "kcal" : "g"})
              <input
                name={k}
                type="number"
                min="0"
                step="any"
                placeholder="Neuvedeno"
                defaultValue={initial?.nutrients[k as keyof Nutrients]}
              />
            </label>
          ))}
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="button" type="submit">
          {initial ? "Uložit a přepočítat →" : "Vyhodnotit potravinu →"}
        </button>
        {onCancel && (
          <button type="button" className="text-button" onClick={onCancel}>
            Zrušit úpravy
          </button>
        )}
      </form>
    </section>
  );
}
