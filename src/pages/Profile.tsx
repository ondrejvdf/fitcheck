import type { Profile as ProfileType, Goal } from "../types";
import { goals, sports, activityLabels, type ActivityLevel } from "../types";
import {
  activityLevel,
  legacyActivity,
  estimateEnergy,
  ENERGY_SOURCE,
} from "../lib/energy";
import ProfileGuidance from "../components/ProfileGuidance";
import { energyNeed } from "../lib/nutrition";
import Icon from "../components/Icon";
export default function Profile({
  profile,
  onChange,
  onDone,
}: {
  profile: ProfileType;
  onChange: (p: ProfileType) => void;
  onDone?: () => void;
}) {
  const update = (v: Partial<ProfileType>) => onChange({ ...profile, ...v });
  const need = energyNeed(profile);
  const estimate = estimateEnergy(profile);
  return (
    <section className="card form-card">
      <div className="eyebrow">TVŮJ CÍL. TVOJE CESTA.</div>
      <h2>{onDone ? "Vítej ve FitChecku." : "Tvůj profil"}</h2>
      <p>Vyber, co je pro tebe důležité. Vše můžeš kdykoliv změnit.</p>
      <div className="goal-grid">
        {Object.entries(goals).map(([k, v], i) => (
          <button
            key={k}
            className={"goal-option " + (profile.goal === k ? "selected" : "")}
            onClick={() => update({ goal: k as Goal })}
          >
            <Icon
              name={i === 0 ? "Scale" : i === 1 ? "Dumbbell" : "Leaf"}
              size={24}
            />
            <strong>{v}</strong>
            <span>
              {i === 0
                ? "Promyšlenější porce"
                : i === 1
                  ? "Podpora tvého tréninku"
                  : "Rovnováha každý den"}
            </span>
            {profile.goal === k && <Icon name="Check" />}
          </button>
        ))}
      </div>
      <h3>
        Něco o tobě <small>nepovinné</small>
      </h3>
      <p>
        Údaje zůstanou pouze v tomto prohlížeči. Bez nich hodnocení funguje
        také.
      </p>
      <div className="form-grid">
        {(
          [
            ["age", "Věk", 1, 100],
            ["height", "Výška (cm)", 50, 250],
            ["weight", "Hmotnost (kg)", 3, 350],
          ] as const
        ).map(([k, label, min, max]) => (
          <label key={k}>
            {label}
            <input
              type="number"
              min={min}
              max={max}
              value={profile[k] ?? ""}
              onChange={(e) => {
                const v =
                  e.target.value === "" ? undefined : Number(e.target.value);
                update({ [k]: v });
              }}
            />
          </label>
        ))}
        <label>
          Pohlaví pro výpočet
          <select
            value={profile.sex ?? ""}
            onChange={(e) =>
              update({
                sex: (e.target.value || undefined) as ProfileType["sex"],
              })
            }
          >
            <option value="">Nechci uvádět</option>
            <option value="female">Ženské</option>
            <option value="male">Mužské</option>
          </select>
        </label>
        <label>
          Fyzická aktivita
          <select
            value={activityLevel(profile) ?? ""}
            onChange={(e) => {
              const level = e.target.value as ActivityLevel;
              update({ activityLevel: level, activity: legacyActivity[level] });
            }}
          >
            <option value="" disabled>
              Vyber celkovou aktivitu
            </option>
            {Object.entries(activityLabels).map(([v, t]) => (
              <option key={v} value={v}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label>
          Hlavní sport
          <select
            value={profile.sport ?? ""}
            onChange={(e) =>
              update({
                sport: (e.target.value || undefined) as ProfileType["sport"],
              })
            }
          >
            <option value="">Nechci uvádět</option>
            {Object.entries(sports).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Kolikrát týdně trénuješ?
          <select
            value={profile.trainingsPerWeek ?? ""}
            onChange={(e) =>
              update({
                trainingsPerWeek:
                  e.target.value === "" ? undefined : Number(e.target.value),
              })
            }
          >
            <option value="">Nechci uvádět</option>
            {Array.from({ length: 8 }, (_, n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>
      <ProfileGuidance profile={profile} />
      <p className="fine">
        Aktivita zahrnuje celý den včetně sportu. Kategorie NASEM nejsou
        násobitel výdeje; počet tréninků další kalorie nepřičítá.{" "}
        <a href={ENERGY_SOURCE} target="_blank" rel="noreferrer">
          Popis kategorií a modelu
        </a>
      </p>
      {need && estimate && (
        <div className="notice">
          Orientační udržovací potřeba: <strong>{need} kcal / den</strong>.
          {estimate.model}
          {estimate.growth ? ` · včetně ${estimate.growth} kcal na růst` : ""}.
          Orientační odhad, nikoliv zdravotní doporučení.
        </div>
      )}
      {onDone && (
        <button className="button" onClick={onDone}>
          Začít vybírat chytře <Icon name="ArrowUpRight" />
        </button>
      )}
    </section>
  );
}
