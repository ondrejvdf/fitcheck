import { useState } from "react";
import type { Food, Goal, Profile } from "../types";
import { evaluatePersonal } from "../lib/personalization";
import { labels } from "../types";
import { portion } from "../lib/nutrition";
import Score from "../components/Score";
export default function Compare({
  foods,
  goal,
  profile,
  selected,
  onSelect,
}: {
  foods: Food[];
  goal: Goal;
  profile: Profile;
  selected: string[];
  onSelect: (v: string[]) => void;
}) {
  const [basis, setBasis] = useState("100");
  const pair = [selected[0], selected[1]].map((id) =>
    foods.find((f) => f.id === id),
  );
  const scores = pair.map((f) => (f ? evaluatePersonal(f, profile) : null));
  const compatible = pair[0] && pair[1] && pair[0].unit === pair[1].unit;
  const enough =
    compatible &&
    scores.every(
      (s) =>
        s &&
        s.total !== null &&
        s.reliability.level === "sufficient" &&
        s.categoryCertain,
    ) &&
    pair[0]?.category === pair[1]?.category;
  const diff = (scores[0]?.total ?? 0) - (scores[1]?.total ?? 0);
  return (
    <>
      <div className="eyebrow">LEPŠÍ VOLBA ZAČÍNÁ SROVNÁNÍM</div>
      <h1>Malý rozdíl. Lepší volba.</h1>
      <section className="card">
        <div className="compare-selects">
          {[0, 1].map((i) => (
            <label key={i}>
              Potravina {i + 1}
              <select
                value={selected[i] || ""}
                onChange={(e) => {
                  const next = [...selected];
                  next[i] = e.target.value;
                  onSelect(next);
                }}
              >
                <option value="">Vybrat uloženou potravinu</option>
                {foods
                  .filter((f) => f.id !== selected[1 - i])
                  .map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
              </select>
            </label>
          ))}
        </div>
        <label>
          Základ porovnání
          <select value={basis} onChange={(e) => setBasis(e.target.value)}>
            <option value="100">Stejné množství: 100 g / ml</option>
            <option value="portion">Skutečné porce (mohou být rozdílné)</option>
          </select>
        </label>
        {pair.every(Boolean) ? (
          <>
            <div className="compare-scores">
              {pair.map((f, i) => (
                <div key={f!.id}>
                  <h3>{f!.name}</h3>
                  <Score small value={scores[i]!.total} />
                  <p>
                    Porce {f!.portion} {f!.unit}
                  </p>
                </div>
              ))}
            </div>
            <p className="fine">
              Skóre FitCheck vždy zohledňuje nastavenou porci a cíl; přepínač
              mění tabulku živin.
            </p>
            {!compatible ? (
              <p className="notice">
                Jednotky g a ml nelze bez znalosti hustoty přímo porovnat.
              </p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>
                      {basis === "100"
                        ? "Na 100 " + pair[0]!.unit
                        : "Na vlastní porci"}
                    </th>
                    <th>A</th>
                    <th>B</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(labels).map(([k, v]) => (
                    <tr key={k}>
                      <td>
                        {v} ({k === "energy" ? "kcal" : "g"})
                      </td>
                      {pair.map((f) => (
                        <td key={f!.id}>
                          {(basis === "100"
                            ? f!.nutrients
                            : portion(f!.nutrients, f!.portion))[
                            k as keyof typeof labels
                          ]?.toLocaleString("cs-CZ", {
                            maximumFractionDigits: 2,
                          }) ?? "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="notice">
              {!enough
                ? "Pro jednoznačné pořadí chybí srovnatelná kategorie, jednotky nebo dostatek údajů."
                : Math.abs(diff) < 5
                  ? "Výsledky jsou velmi blízké. Rozhodni se podle porce, složení a vlastních preferencí."
                  : `${pair[diff > 0 ? 0 : 1]!.name} vychází podle pravidel FitCheck lépe pro zvolený cíl. Rozdíl tvoří nutriční kvalita (${scores[0]!.quality} vs. ${scores[1]!.quality}) a vhodnost porce (${scores[0]!.fit} vs. ${scores[1]!.fit}).`}
            </div>
            <p className="fine">Orientační hodnocení algoritmu FitCheck.</p>
          </>
        ) : (
          <div className="empty">
            Vyber dvě potraviny ze své historie. Nejprve je naskenuj nebo přidej
            ručně.
          </div>
        )}
      </section>
    </>
  );
}
