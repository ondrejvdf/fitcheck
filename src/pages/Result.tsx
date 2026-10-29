import type { Food, Goal, Profile, DiaryEntry, DailyTargets } from "../types";
import { evaluatePersonal } from "../lib/personalization";
import { evidenceFor, conflictLabels } from "../lib/nutrient-data";
import DailyFit from "../components/DailyFit";
import { goals, labels, categories } from "../types";
import { verdict } from "../lib/scoring";
import { portion } from "../lib/nutrition";
import Score from "../components/Score";
import Icon from "../components/Icon";
import { languageLabel } from "../lib/ingredients";
import ProfileGuidance from "../components/ProfileGuidance";
export default function Result({
  food,
  goal,
  profile,
  onFavorite,
  onCompare,
  onPortion,
  onEdit,
  onAdd,
  todayEntries,
  targets,
}: {
  food: Food;
  goal: Goal;
  profile: Profile;
  onFavorite: () => void;
  onCompare: () => void;
  onPortion: (v: number) => void;
  onEdit: () => void;
  onAdd: () => void;
  todayEntries: DiaryEntry[];
  targets: DailyTargets | null;
}) {
  const s = evaluatePersonal(food, profile);
  const p = portion(food.nutrients, food.portion);
  return (
    <>
      <div className="section-heading">
        <div>
          <div className="eyebrow">TVŮJ VÝSLEDEK</div>
          <h1>Podívej se pod obal.</h1>
        </div>
        <button className="button secondary" onClick={onFavorite}>
          <Icon name="Heart" />
          {food.favorite ? "Uloženo" : "Do oblíbených"}
        </button>
      </div>
      <div className="result-layout">
        <section className="card result-main">
          <div className="product-top">
            {food.image ? (
              <img className="product-photo" src={food.image} alt={food.name} />
            ) : (
              <div className="product-placeholder">
                <Icon name="Leaf" size={44} />
              </div>
            )}
            <div>
              <span className="badge">{categories[food.category]}</span>
              <h2>{food.name}</h2>
              <p>
                {food.brand || "Vlastní zadání"}{" "}
                {food.quantity && " · " + food.quantity}
              </p>
              {food.localEdits && (
                <p className="fine">
                  Obsahuje tvoje lokální úpravy; nejsou ověřené databází.
                </p>
              )}
            </div>
          </div>
          {food.source === "demo" && (
            <div className="notice">
              DEMONSTRAČNÍ PŘÍKLAD · Smyšlený výrobek, nikoliv záznam databáze.
            </div>
          )}
          <Score value={s.total} />
          {s.total !== null && s.completeness < 100 && (
            <p className="notice">
              Předběžné hodnocení · neúplná etiketa. Chybějící hodnoty nejsou
              nuly; výsledek se po doplnění může změnit.
            </p>
          )}
          <h2 className="center">{verdict(s.total)}</h2>
          <p className="center">Pro cíl: {goals[goal]}</p>
          <p className="fine center">
            Všechna skóre jsou orientační hodnocení algoritmu FitCheck.
          </p>
          <p className="fine">
            <strong>{s.personalLabel}</strong> · {s.personalExplanation}
          </p>
          <ProfileGuidance profile={profile} />
          {food.sourceNotes?.map((note) => (
            <p className="notice" key={note}>
              {note}
            </p>
          ))}
          {conflictLabels(food).length > 0 && (
            <p className="notice">
              Rozdílné hodnoty zdrojů: {conflictLabels(food).join(", ")}.
              Hodnoty jsme nezvolili podle vyššího či nižšího čísla. Ověř
              aktuální obal; původní podklady najdeš níže.
            </p>
          )}
          <div className="confidence">
            <Icon name="ShieldCheck" />
            <span>
              Úplnost dat <strong>{s.completeness} %</strong>
            </span>
          </div>
          <p className="fine">
            Dostupných je {Math.round((s.completeness * 8) / 100)} z 8
            základních nutričních údajů. Přidané cukry a nenasycené tuky jsou
            doplňkové údaje.
          </p>
          <p className="fine">
            Podklady pro kategorii: <strong>{s.reliability.label}</strong>. Toto
            není statistická jistota ani ověření etikety.
          </p>
          {s.warnings.map((w) => (
            <p className="notice" key={w}>
              {w}
            </p>
          ))}
          {!food.recipe && (
            <button className="button secondary full" onClick={onEdit}>
              <Icon name="ClipboardPen" />
              Doplnit chybějící údaje
            </button>
          )}
          {food.recipe && (
            <p className="fine">
              Suroviny a výslednou hmotnost upravíš v Můj jídelníček → Moje
              recepty. Dříve zapsané porce zůstanou zachované.
            </p>
          )}
          {food.catalog && (
            <p className="fine">
              <a
                href={
                  "https://fdc.nal.usda.gov/food-details/" +
                  food.catalog.fdcId +
                  "/nutrients"
                }
                target="_blank"
                rel="noreferrer"
              >
                Zdroj USDA · FDC {food.catalog.fdcId}
              </a>{" "}
              · {food.catalog.description}
            </p>
          )}
          <button className="button secondary full" onClick={onCompare}>
            <Icon name="ChartNoAxesCombined" />
            Přidat do porovnání
          </button>
        </section>
        <div className="stack">
          <DailyFit
            food={food}
            entries={todayEntries}
            targets={targets}
            onAdd={onAdd}
          />
          <section className="card">
            <h3>Co říkají údaje</h3>
            <div className="pros">
              <Icon name="Plus" />
              <div>
                <strong>PLUSY</strong>
                {s.plus.length ? (
                  s.plus.map((x) => <p key={x}>{x}</p>)
                ) : (
                  <p>
                    V dostupných údajích jsme pro tuto kategorii nenašli
                    významnou výhodu.
                  </p>
                )}
              </div>
            </div>
            <div className="cons">
              <Icon name="Scale" />
              <div>
                <strong>NA CO SI DÁT POZOR</strong>
                {s.minus.length ? (
                  s.minus.map((x) => <p key={x}>{x}</p>)
                ) : (
                  <p>
                    V dostupných údajích pravidla neodhalila výraznou nevýhodu.
                  </p>
                )}
              </div>
            </div>
          </section>
          <section className="card advice">
            <div className="eyebrow">
              <Icon name="Sparkles" /> VYLEPŠI MOJI VOLBU
            </div>
            {s.tips.map((x) => (
              <p key={x}>{x}</p>
            ))}
          </section>
          <section className="card">
            <h3>Nutriční hodnoty</h3>
            <label className="portion-field">
              Tvoje porce
              <input
                aria-label="Velikost porce"
                type="number"
                min="1"
                max="5000"
                value={food.portion}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (v >= 1 && v <= 5000) onPortion(v);
                }}
              />
              {food.unit}
            </label>
            <table>
              <thead>
                <tr>
                  <th>Hodnota</th>
                  <th>100 {food.unit}</th>
                  <th>Porce</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(labels).map(([k, v]) => {
                  const key = k as keyof typeof p;
                  return (
                    <tr key={k}>
                      <td>
                        {v}
                        {food.localEdits?.fields.includes(
                          "nutrients." + key,
                        ) && <small> · tvoje úprava</small>}
                      </td>
                      <td>
                        {food.nutrients[key] === undefined
                          ? "—"
                          : food.nutrients[key]!.toLocaleString("cs-CZ", {
                              maximumFractionDigits: 2,
                            })}{" "}
                        {k === "energy" ? "kcal" : "g"}
                      </td>
                      <td>
                        {p[key] === undefined
                          ? "—"
                          : p[key]!.toLocaleString("cs-CZ", {
                              maximumFractionDigits: 2,
                            })}{" "}
                        {k === "energy" ? "kcal" : "g"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="fine">— údaj není dostupný</p>
            <details>
              <summary>Zdroje a původní nutriční hodnoty</summary>
              <p className="fine">
                Zdroje jsou na 100 {food.unit}; ruční úpravy se ukládají pouze
                lokálně. Rozdíly větší než 1 % (nejméně 0,001) označujeme jako
                rozpor, nikoliv jako důkaz chybné etikety.
              </p>
              {(Object.keys(labels) as (keyof typeof p)[]).map((key) => (
                <div key={key}>
                  <strong>{labels[key]}</strong>
                  {evidenceFor(food, key).length ? (
                    evidenceFor(food, key).map((e, i) => (
                      <p className="fine" key={i}>
                        {e.value.toLocaleString("cs-CZ", {
                          maximumFractionDigits: 4,
                        })}{" "}
                        {key === "energy" ? "kcal" : "g"} · {e.detail} ·
                        načteno/ověřeno{" "}
                        {new Date(e.checkedAt).toLocaleDateString("cs-CZ")}{" "}
                        {e.url && (
                          <a href={e.url} target="_blank" rel="noreferrer">
                            Zdroj
                          </a>
                        )}
                      </p>
                    ))
                  ) : (
                    <p className="fine">Zdroj hodnoty není dostupný.</p>
                  )}
                  {food.originalNutrients?.[key] !== undefined && (
                    <p className="fine">
                      Původně načteno:{" "}
                      {food.originalNutrients[key]?.toLocaleString("cs-CZ")}{" "}
                      {key === "energy" ? "kcal" : "g"}.
                    </p>
                  )}
                  {food.originalNutrients &&
                    food.originalNutrients[key] === undefined &&
                    food.nutrients[key] !== undefined && (
                      <p className="fine">
                        V původně načtených datech údaj chyběl.
                      </p>
                    )}
                </div>
              ))}
            </details>
          </section>
          <section className="card">
            <h3>Složení</h3>
            {food.ingredients && food.ingredientsLanguage !== "cs" && (
              <p className="fine">
                Jazyk: {languageLabel(food.ingredientsLanguage)} · původní text
                bez překladu
              </p>
            )}
            <p>{food.ingredients || "Složení není dostupné"}</p>
          </section>
          {food.source === "off" && (
            <p className="fine">
              Zdroj:{" "}
              <a
                href={"https://world.openfoodfacts.org/product/" + food.barcode}
                target="_blank"
                rel="noreferrer"
              >
                Open Food Facts a přispěvatelé
              </a>{" "}
              · Databáze ODbL, jednotlivý obsah DbCL, fotografie CC BY-SA. Ověř
              aktuální obal.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
