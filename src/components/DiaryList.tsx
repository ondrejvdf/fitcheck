import type { DiaryEntry, Meal } from "../types";
import { meals } from "../types";
import { entryNutrients } from "../lib/diary";
import { number } from "./Progress";
import Icon from "./Icon";
export default function DiaryList({
  entries,
  onEdit,
  onDelete,
  onAdd,
  onOpen,
  onRepeat,
}: {
  entries: DiaryEntry[];
  onEdit: (e: DiaryEntry) => void;
  onDelete: (id: string) => void;
  onAdd: (meal: Meal) => void;
  onOpen: (e: DiaryEntry) => void;
  onRepeat?: (entries: DiaryEntry[]) => void;
}) {
  return (
    <div className="meal-sections">
      {Object.entries(meals).map(([key, label]) => {
        const rows = entries
          .filter((e) => e.meal === key)
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        return (
          <section className="card meal-card" key={key}>
            <div className="section-heading">
              <h3>{label}</h3>
              {!!rows.length && onRepeat && (
                <button className="text-button" onClick={() => onRepeat(rows)}>
                  Zopakovat celé jídlo
                </button>
              )}
              <button
                className="text-button"
                onClick={() => onAdd(key as Meal)}
              >
                <Icon name="Plus" size={17} />
                Přidat jídlo
              </button>
            </div>
            {rows.length ? (
              rows.map((e) => {
                const n = entryNutrients(e);
                return (
                  <div className="diary-row" key={e.id}>
                    <button className="diary-name" onClick={() => onOpen(e)}>
                      <strong>{e.food.name}</strong>
                      <small>
                        {number(e.amount)} {e.food.unit} ·{" "}
                        {n.energy === undefined
                          ? "energie neznámá"
                          : number(n.energy) + " kcal"}{" "}
                        ·{" "}
                        {n.protein === undefined
                          ? "bílkoviny neznámé"
                          : number(n.protein) + " g bílkovin"}
                      </small>
                    </button>
                    <button
                      className="icon-button"
                      aria-label={"Upravit porci " + e.food.name}
                      onClick={() => onEdit(e)}
                    >
                      <Icon name="ClipboardPen" size={18} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label={"Odstranit jídlo " + e.food.name}
                      onClick={() => onDelete(e.id)}
                    >
                      <Icon name="Trash2" size={18} />
                    </button>
                  </div>
                );
              })
            ) : (
              <p className="meal-empty">Zatím bez záznamu.</p>
            )}
          </section>
        );
      })}
    </div>
  );
}
