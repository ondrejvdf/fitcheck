import type { DailyTargets, DiaryEntry } from "../types";
import { labels } from "../types";
import { aggregate, progress, trackedKeys } from "../lib/diary";
export const number = (n: number) =>
  n.toLocaleString("cs-CZ", { maximumFractionDigits: 1 });
export default function Progress({
  entries,
  targets,
}: {
  entries: DiaryEntry[];
  targets: DailyTargets | null;
}) {
  const total = aggregate(entries);
  return (
    <div className="nutrition-progress">
      {trackedKeys.map((k) => {
        const item = total[k],
          target =
            targets?.[k] !== undefined && targets[k]! > 0
              ? targets[k]
              : undefined;
        const p = progress(item.value, target, item.missing);
        return (
          <article
            className={
              "nutrient-progress " + (k === "energy" ? "energy-progress" : "")
            }
            key={k}
          >
            <div className="progress-heading">
              <strong>{labels[k]}</strong>
              <span>
                {item.known === 0 && entries.length
                  ? "—"
                  : (item.missing ? "≥ " : "") + number(item.value)}{" "}
                {target !== undefined && <> / {number(target)} </>}{" "}
                {k === "energy" ? "kcal" : "g"}
              </span>
            </div>
            {target !== undefined && (
              <div
                className="progress-track"
                role="progressbar"
                aria-label={labels[k]}
                aria-valuemin={0}
                aria-valuemax={target ?? 100}
                aria-valuenow={target ? Math.min(target, item.value) : 0}
                aria-valuetext={`${number(item.value)} ${k === "energy" ? "kcal" : "g"}${target !== undefined ? " z cíle " + number(target) : ", bez cíle"}${item.missing ? ", neúplné údaje" : ""}`}
              >
                <span style={{ width: p.fill + "%" }} />
              </div>
            )}
            <p>
              {item.missing
                ? `Chybí údaje u ${item.missing} položek; zobrazen je pouze známý součet.`
                : p.remaining === null
                  ? "Skutečně zapsaný příjem · bez číselného cíle."
                  : p.remaining < 0
                    ? `Nad orientačním cílem o ${number(-p.remaining)} ${k === "energy" ? "kcal" : "g"} (${number(p.percent!)} % cíle).`
                    : `Zbývá přibližně ${number(p.remaining)} ${k === "energy" ? "kcal" : "g"} · ${number(p.percent!)} % cíle`}
            </p>
          </article>
        );
      })}
    </div>
  );
}
