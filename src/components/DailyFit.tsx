import type { Food, DiaryEntry, DailyTargets } from "../types";
import { portion } from "../lib/nutrition";
import { aggregate } from "../lib/diary";
import { labels } from "../types";
import { number } from "./Progress";
import Icon from "./Icon";
export default function DailyFit({
  food,
  entries,
  targets,
  onAdd,
}: {
  food: Food;
  entries: DiaryEntry[];
  targets: DailyTargets | null;
  onAdd: () => void;
}) {
  const n = portion(food.nutrients, food.portion),
    total = aggregate(entries);
  return (
    <section className="card daily-fit">
      <div className="eyebrow">ZAPADNUTÍ DO DNEŠNÍHO PLÁNU</div>
      <h3>Co by změnila tato porce?</h3>
      <p>
        {food.portion} {food.unit} dodá{" "}
        {n.energy === undefined
          ? "neznámé množství energie"
          : number(n.energy) + " kcal"}
        {n.protein === undefined
          ? food.category === "drink"
            ? ""
            : "; bílkoviny nejsou uvedené"
          : ` a ${number(n.protein)} g bílkovin`}
        .
      </p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Živina</th>
              <th>Zapsáno</th>
              <th>Po této porci</th>
            </tr>
          </thead>
          <tbody>
            {(["energy", "protein", "carbs", "fat", "fiber"] as const).map(
              (key) => {
                const known = total[key].missing === 0 && n[key] !== undefined;
                const after = total[key].value + (n[key] ?? 0);
                const unit = key === "energy" ? "kcal" : "g";
                return (
                  <tr key={key}>
                    <td>{labels[key]}</td>
                    <td>
                      {total[key].missing ? "≥ " : ""}
                      {number(total[key].value)} {unit}
                    </td>
                    <td>
                      {known ? `${number(after)} ${unit}` : "Neúplné údaje"}
                      {known && targets?.[key] !== undefined && (
                        <small>
                          {" "}
                          ·{" "}
                          {after > targets[key]!
                            ? `o ${number(after - targets[key]!)} ${unit} nad cílem`
                            : `zbývalo by ${number(targets[key]! - after)} ${unit}`}
                        </small>
                      )}
                    </td>
                  </tr>
                );
              },
            )}
          </tbody>
        </table>
      </div>
      <p className="fine">
        Jde o náhled zaznamenaného příjmu, nikoliv důkaz celého dnešního
        jídelníčku. Malá odchylka od cíle sama o sobě není zdravotní problém.
      </p>
      {targets && n.energy !== undefined && total.energy.missing === 0 && (
        <p>
          Po přidání bys měl zapsáno{" "}
          <strong>
            {number(total.energy.value + n.energy)} / {number(targets.energy)}{" "}
            kcal
          </strong>
          .{" "}
          {total.energy.value + n.energy > targets.energy
            ? "Překročení orientačního cíle samo o sobě nemění nutriční kvalitu výrobku."
            : "Záleží na celém jídelníčku a skutečně snědené porci."}
        </p>
      )}
      {total.energy.missing > 0 && (
        <p className="fine">
          Dnešní deník má neznámé hodnoty, úplný budoucí součet proto nelze
          určit.
        </p>
      )}
      {!targets && (
        <p className="fine">
          Denní cíle nejsou nastavené. Potravinu přesto můžeš zapsat.
        </p>
      )}
      <button className="button full" onClick={onAdd}>
        <Icon name="Plus" />
        Přidat do mého dne
      </button>
      <p className="fine">
        Zatím nic nepřičítáme. Nejdřív zvolíš množství, jídlo a přidání
        potvrdíš.
      </p>
    </section>
  );
}
