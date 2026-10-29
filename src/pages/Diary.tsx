import { useState } from "react";
import type {
  DiaryEntry,
  Food,
  Meal,
  DiaryDay,
  DailyTargets,
  Profile,
} from "../types";
import { dailyPlan } from "../lib/targets";
import { labels } from "../types";
import { dayKey, shiftDay, weekDays, weeklySummary } from "../lib/diary";
import DiaryList from "../components/DiaryList";
import Progress, { number } from "../components/Progress";
import Icon from "../components/Icon";
import FoodLibrary from "../components/FoodLibrary";
import { libraryFoods, normalize } from "../lib/catalog";
export function DatePicker({
  date,
  onChange,
}: {
  date: string;
  onChange: (s: string) => void;
}) {
  return (
    <div className="date-picker">
      <button
        className="icon-button"
        aria-label="Předchozí den"
        onClick={() => onChange(shiftDay(date, -1))}
      >
        <Icon name="ArrowLeft" />
      </button>
      <input
        aria-label="Zvolený den"
        type="date"
        value={date}
        max={dayKey()}
        onInput={(e) => {
          if (e.currentTarget.value && e.currentTarget.validity.valid)
            onChange(e.currentTarget.value);
        }}
        onChange={(e) => {
          if (e.target.value && e.target.validity.valid)
            onChange(e.target.value);
        }}
      />
      <button className="text-button" onClick={() => onChange(dayKey())}>
        Dnes
      </button>
    </div>
  );
}
export default function Diary({
  date,
  onDate,
  entries,
  days,
  targets,
  profile,
  foods,
  onEdit,
  onDelete,
  onPick,
  onFind,
  onOpen,
  onFavorite,
  onRecipeSave,
  onRemoveFood,
  onRepeat,
}: {
  date: string;
  onDate: (s: string) => void;
  entries: DiaryEntry[];
  days: DiaryDay[];
  targets: DailyTargets | null;
  profile: Profile;
  foods: Food[];
  onEdit: (e: DiaryEntry) => void;
  onDelete: (id: string) => void;
  onPick: (f: Food, meal: Meal) => void;
  onFind: (meal: Meal) => void;
  onOpen: (e: DiaryEntry) => void;
  onFavorite?: (f: Food) => Promise<void>;
  onRecipeSave?: (f: Food) => Promise<void>;
  onRemoveFood?: (id: string) => Promise<void>;
  onRepeat?: (entries: DiaryEntry[]) => void;
}) {
  const [pick, setPick] = useState<Meal | null>(null);
  const [filter, setFilter] = useState("");
  const selected = entries.filter((e) => e.day === date);
  const week = weeklySummary(entries, date, days);
  const dates = weekDays(date);
  return (
    <>
      <div className="section-heading">
        <div>
          <div className="eyebrow">JÍDLO, KTERÉ JSI OPRAVDU SNĚDL</div>
          <h1>
            Můj jídelníček<span className="green">.</span>
          </h1>
          <p>Záznam patří vybranému dni. Množství můžeš kdykoliv opravit.</p>
        </div>
        <DatePicker date={date} onChange={onDate} />
      </div>
      {onFavorite && onRecipeSave && onRemoveFood && onRepeat && (
        <FoodLibrary
          foods={foods}
          entries={entries}
          onPick={(f) => onPick(f, "snack")}
          onOpen={(f) => onOpen({ food: f } as DiaryEntry)}
          onFavorite={onFavorite}
          onSave={onRecipeSave}
          onRemove={onRemoveFood}
          onRepeat={onRepeat}
        />
      )}
      <section className="card">
        {!targets && (
          <p className="notice">
            Sleduješ skutečně zapsaný příjem bez číselných cílů.{" "}
            {profile.age !== undefined && profile.age < 19
              ? dailyPlan(profile).reason
              : "Zapisování, úpravy i historie jsou dostupné také bez automatického plánu."}
          </p>
        )}
        <Progress entries={selected} targets={targets} />
      </section>
      <DiaryList
        onRepeat={onRepeat}
        entries={selected}
        onEdit={onEdit}
        onDelete={onDelete}
        onAdd={(meal) => {
          setPick(meal);
          setFilter("");
        }}
        onOpen={onOpen}
      />
      <section className="card">
        <div className="eyebrow">DLOUHODOBĚ, BEZ TLAKU NA DOKONALOST</div>
        <h2>Týdenní přehled</h2>
        <p>
          {dates[0]} – {dates[6]} · {week.recordedDays} ze 7 dnů má záznam.
          Prázdné dny nepovažujeme za nulový příjem; i zapsaný den může být jen
          částečný.
        </p>
        <div className="week-days">
          {dates.map((d) => (
            <button
              key={d}
              className={d === date ? "selected" : ""}
              disabled={d > dayKey()}
              onClick={() => onDate(d)}
            >
              <span>
                {new Date(d + "T12:00:00").toLocaleDateString("cs-CZ", {
                  weekday: "short",
                })}
              </span>
              <strong>{new Date(d + "T12:00:00").getDate()}</strong>
              <small>
                {entries.some((e) => e.day === d) ? "zapsáno" : "bez záznamu"}
              </small>
            </button>
          ))}
        </div>
        <table>
          <thead>
            <tr>
              <th>Denní průměr</th>
              <th>Záznamy</th>
              <th>Cíl*</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(week.metrics).map(([k, m]) => (
              <tr key={k}>
                <td>{labels[k as keyof DailyTargets]}</td>
                <td>
                  {m.average === null ? "—" : number(m.average)}{" "}
                  {k === "energy" ? "kcal" : "g"}
                  <small> · {m.days} dní</small>
                </td>
                <td>
                  {m.targetAverage === null ? "—" : number(m.targetAverage)}
                  <small> · {m.pairedDays} dní</small>
                  {m.pairedActual !== null && m.pairedDays !== m.days && (
                    <small className="paired-average">
                      Srovnatelný příjem: {number(m.pairedActual)}{" "}
                      {k === "energy" ? "kcal" : "g"}
                    </small>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="fine">
          * Cíle jsou průměrem uložených cílů pouze dostupných odpovídajících
          dnů. Dny s neznámou hodnotou se pro danou živinu vynechávají. Nejde o
          průměr nezapsaného skutečného příjmu.
        </p>
      </section>
      {pick && (
        <div className="modal-backdrop">
          <section className="modal food-picker">
            <button
              className="close icon-button"
              aria-label="Zavřít výběr jídla"
              onClick={() => setPick(null)}
            >
              <Icon name="X" />
            </button>
            <h2>Vyber potravinu</h2>
            <p>Z katalogu, historie, oblíbených a vlastních receptů.</p>
            <input
              aria-label="Filtrovat uložené potraviny"
              placeholder="Hledat v uložených…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            <div className="picker-list">
              {libraryFoods(foods)
                .filter((f) => normalize(f.name).includes(normalize(filter)))
                .sort((a, b) => Number(!!b.favorite) - Number(!!a.favorite))
                .map((f) => (
                  <button
                    key={f.id}
                    onClick={() => {
                      onPick(f, pick);
                      setPick(null);
                    }}
                  >
                    <Icon name={f.favorite ? "Heart" : "Leaf"} size={18} />
                    <span>
                      {f.name}
                      <small>
                        {f.portion} {f.unit} / porce
                      </small>
                    </span>
                    <Icon name="ChevronRight" size={16} />
                  </button>
                ))}
            </div>
            <button
              className="button full"
              onClick={() => {
                onFind(pick);
                setPick(null);
              }}
            >
              <Icon name="Search" />
              Najít, naskenovat nebo zadat ručně
            </button>
          </section>
        </div>
      )}
    </>
  );
}
