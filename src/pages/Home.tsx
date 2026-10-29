import type { Profile, Food, DiaryEntry, DailyTargets } from "../types";
import { goals } from "../types";
import { dailyPlan } from "../lib/targets";
import { suggestions, aggregate, dayKey } from "../lib/diary";
import { DatePicker } from "./Diary";
import Progress from "../components/Progress";
import Icon from "../components/Icon";
import ProfileGuidance from "../components/ProfileGuidance";
export default function Home({
  profile,
  foods,
  entries,
  date,
  targets,
  onDate,
  onFind,
  onDiary,
  onSettings,
  onFood,
  onManual,
  onRecommend,
}: {
  profile: Profile;
  foods: Food[];
  entries: DiaryEntry[];
  date: string;
  targets: DailyTargets | null;
  onDate: (s: string) => void;
  onFind: () => void;
  onDiary: () => void;
  onSettings: () => void;
  onFood: (f: Food) => void;
  onManual: () => void;
  onRecommend?: (f: Food) => void;
}) {
  const items = entries.filter((e) => e.day === date);
  const advice = suggestions(foods, items, targets);
  const plan = dailyPlan(profile);
  const totals = aggregate(items);
  return (
    <>
      <div className="section-heading welcome">
        <div>
          <div className="eyebrow">KAŽDÝ DEN SE POČÍTÁ</div>
          <h1>
            {date === dayKey() ? "Můj den" : "Přehled dne"}
            <span className="green">.</span>
          </h1>
          <p>
            {goals[profile.goal]} ·{" "}
            {new Date(date + "T12:00:00").toLocaleDateString("cs-CZ", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <DatePicker date={date} onChange={onDate} />
      </div>
      <section className="card day-overview">
        <div className="section-heading">
          <div>
            <h2>{targets ? "Blíž ke svému cíli" : "Tvůj zapsaný příjem"}</h2>
            <p>
              {targets
                ? "Orientační plán, ne povinnost splnit přesně každý gram."
                : "Zapisovat můžeš i bez osobního plánu."}
            </p>
          </div>
          <button className="text-button" onClick={onSettings}>
            {targets ? "Upravit cíle" : "Upravit profil"}{" "}
            <Icon name="ChevronRight" size={16} />
          </button>
        </div>
        {!targets && (
          <div className="notice">
            {date === dayKey()
              ? plan.reason
              : "Pro tento historický den není uložený výživový cíl."}
            <button className="text-button" onClick={onSettings}>
              Doplnit nastavení
            </button>
          </div>
        )}
        <Progress entries={items} targets={targets} />
        {!items.length && (
          <p className="fine">
            Zatím nic zapsáno. Zobrazená nula znamená prázdný deník, ne že jsi
            nic nejedl.
          </p>
        )}
        {date === dayKey() &&
          plan.warnings.map((w) => (
            <p className="notice" key={w}>
              {w}
            </p>
          ))}
      </section>
      <div className="daily-actions">
        <button className="button" onClick={onDiary}>
          <Icon name="Plus" />
          Zapsat snědené jídlo
        </button>
        <button className="button secondary" onClick={onFind}>
          <Icon name="ScanLine" />
          Najít potravinu
        </button>
        <button className="button secondary" onClick={onManual}>
          <Icon name="ClipboardPen" />
          Zadat ručně
        </button>
        <button className="button secondary" onClick={onDiary}>
          Katalog a recepty
        </button>
      </div>
      <section className="card advice">
        <div className="eyebrow">
          <Icon name="Sparkles" size={16} /> CO MI DNES CHYBÍ?
        </div>
        <p>{advice.text}</p>
        <ProfileGuidance profile={profile} />
        {advice.foods.length > 0 && (
          <div className="suggestion-list">
            {advice.details.map(({ food: f, reason }) => (
              <article className="suggestion-card" key={f.id}>
                <strong>{f.name}</strong>
                <p className="fine">{reason}</p>
                <div className="action-row">
                  <button
                    className="button secondary"
                    onClick={() => (onRecommend ? onRecommend(f) : onFood(f))}
                  >
                    Zapsat navrženou porci
                  </button>
                  <button className="text-button" onClick={() => onFood(f)}>
                    Podrobnosti
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      <section className="card">
        <div className="section-heading">
          <div>
            <h2>
              {date === dayKey() ? "Dnes zapsaná jídla" : "Zapsaná jídla"}
            </h2>
            <p>
              {items.length} položek ·{" "}
              {totals.energy.missing
                ? "neúplná energetická data"
                : "součet podle zapsaných porcí"}
            </p>
          </div>
          <button className="text-button" onClick={onDiary}>
            Můj jídelníček <Icon name="ArrowUpRight" size={17} />
          </button>
        </div>
        {items.length ? (
          <div className="day-foods">
            {items.map((e) => (
              <button key={e.id} onClick={onDiary}>
                <span>{e.food.name}</span>
                <small>
                  {e.amount.toLocaleString("cs-CZ")} {e.food.unit}
                </small>
                <Icon name="ChevronRight" size={16} />
              </button>
            ))}
          </div>
        ) : (
          <div className="empty">
            <Icon name="Leaf" size={30} />
            <h3>Tvůj den začíná prvním záznamem.</h3>
            <p>
              Vyhledání a hodnocení potraviny nic nepřičítá. Jídlo přidáš až po
              potvrzení skutečně snědeného množství.
            </p>
            <button className="button secondary" onClick={onDiary}>
              Přidat první jídlo
            </button>
          </div>
        )}
      </section>
      <p className="fine">
        Data jsou pouze v tomto zařízení. Dělej si zálohy v nastavení. Uvedené
        cíle jsou orientační a nejsou lékařským doporučením.
      </p>
    </>
  );
}
