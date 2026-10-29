import { useState } from "react";
import type { Profile, DailyTargets } from "../types";
import { labels } from "../types";
import { dailyPlan, targetValidation } from "../lib/targets";
import { number } from "../components/Progress";
import { ENERGY_SOURCE } from "../lib/energy";
export default function TargetSettings({
  profile,
  onChange,
}: {
  profile: Profile;
  onChange: (p: Profile) => void;
}) {
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const plan = dailyPlan(profile);
  return (
    <section className="card form-card">
      <div className="eyebrow">PLÁN, KTERÝ PATŘÍ TOBĚ</div>
      <h2>Denní výživové cíle</h2>
      <div className="tabs">
        <button
          className={profile.targetMode !== "custom" ? "active" : ""}
          onClick={() => {
            onChange({ ...profile, targetMode: "auto" });
            setError("");
            setNotice("");
          }}
        >
          Automatický odhad
        </button>
        <button
          className={profile.targetMode === "custom" ? "active" : ""}
          onClick={() => {
            onChange({ ...profile, targetMode: "custom" });
            setError("");
            setNotice("");
          }}
        >
          Vlastní nastavení
        </button>
      </div>
      {profile.targetMode === "custom" ? (
        <>
          <p>
            Vlastní čísla si určuješ sám. Rozdíly mezi energií a přepočtem
            makroživin se zobrazí jako upozornění. Nejde o odborně předepsaný
            plán.
          </p>
          <form
            key={JSON.stringify(profile.customTargets)}
            onSubmit={(e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              const t = {} as DailyTargets;
              for (const k of [
                "energy",
                "protein",
                "carbs",
                "fat",
                "fiber",
              ] as const) {
                const v = data.get(k);
                if (v !== "" && v !== null) t[k] = Number(v);
              }
              const check = targetValidation(t, profile.age);
              if (check.errors.length) {
                setError(check.errors.join(" "));
                return;
              }
              onChange({ ...profile, targetMode: "custom", customTargets: t });
              setError("");
              setNotice("Vlastní cíle jsou uložené v tomto zařízení.");
            }}
          >
            <div className="form-grid">
              {(["energy", "protein", "carbs", "fat", "fiber"] as const).map(
                (k) => (
                  <label key={k}>
                    {labels[k]} ({k === "energy" ? "kcal" : "g"} / den)
                    <input
                      name={k}
                      type="number"
                      min={0}
                      step="any"
                      required={k !== "fiber"}
                      defaultValue={
                        profile.customTargets?.[k] ??
                        dailyPlan({ ...profile, targetMode: "auto" }).targets?.[
                          k
                        ] ??
                        ""
                      }
                    />
                  </label>
                ),
              )}
            </div>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            <button className="button" type="submit">
              Uložit vlastní cíle
            </button>
          </form>
          {notice && (
            <p role="status" className="notice">
              {notice}
            </p>
          )}
        </>
      ) : (
        <p>
          {plan.model || "NASEM 2023"}. Výpočet zahrnuje celodenní aktivitu. Do
          19 let zahrnuje růst bez dospělého deficitu či přebytku. Od 19 let:
          redukce −10 %, nabírání +5 %, zdravý životní styl udržovací odhad. Jde
          o orientační plán, nikoliv přesně změřenou potřebu.
        </p>
      )}
      {plan.reason && <p className="notice">{plan.reason}</p>}
      {plan.targets && (
        <>
          <div className="target-values">
            {Object.entries(plan.targets).map(([k, v]) => (
              <div key={k}>
                <small>{labels[k as keyof DailyTargets]}</small>
                <strong>
                  {number(v)} <small>{k === "energy" ? "kcal" : "g"}</small>
                </strong>
              </div>
            ))}
          </div>
          <p className="fine">
            Makroživiny se přepočítávají přibližně 4/4/9 kcal na gram. Vláknina
            a další složky mohou energetiku skutečných etiket ovlivnit. Rozumné
            rozmezí a dlouhodobý průměr mají větší význam než přesný gram.
          </p>
        </>
      )}
      {plan.warnings.map((w) => (
        <p className="notice" key={w}>
          {w}
        </p>
      ))}
      <p className="fine">
        Věkově přizpůsobené orientační odhady, nikoliv lékařská doporučení.
        Podklady:{" "}
        <a href={ENERGY_SOURCE} target="_blank" rel="noreferrer">
          NASEM 2023
        </a>
        ,{" "}
        <a
          href="https://pmc.ncbi.nlm.nih.gov/articles/PMC5477153/"
          target="_blank"
          rel="noreferrer"
        >
          ISSN
        </a>
        ,{" "}
        <a
          href="https://www.canada.ca/en/health-canada/services/food-nutrition/healthy-eating/dietary-reference-intakes/tables/reference-values-macronutrients.html"
          target="_blank"
          rel="noreferrer"
        >
          DRI makroživiny
        </a>
        . Těhotenství, kojení, onemocnění a individuální sportovní zátěž
        vyžadují jiné posouzení.
      </p>
    </section>
  );
}
