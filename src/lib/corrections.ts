import type { Food, Nutrients } from "../types";
import { labels } from "../types";
export type Correction = Pick<
  Food,
  "name" | "category" | "unit" | "portion" | "nutrients"
>;
const snapshot = (f: Food) => ({
  name: f.name,
  category: f.category,
  unit: f.unit,
  portion: f.portion,
  nutrients: { ...f.nutrients },
});
export function applyCorrections(food: Food, patch: Correction): Food {
  const fields = new Set(food.localEdits?.fields || []);
  for (const key of ["name", "category", "unit", "portion"] as const)
    if (food[key] !== patch[key]) fields.add(key);
  for (const key of Object.keys(labels) as (keyof Nutrients)[])
    if (food.nutrients[key] !== patch.nutrients[key])
      fields.add("nutrients." + key);
  return {
    ...food,
    ...patch,
    nutrients: { ...patch.nutrients },
    originalNutrients:
      food.source === "off"
        ? (food.originalNutrients ?? { ...food.nutrients })
        : food.originalNutrients,
    categoryCertain: fields.has("category") ? true : food.categoryCertain,
    originalOff:
      food.source === "off"
        ? (food.originalOff ?? snapshot(food))
        : food.originalOff,
    localEdits: fields.size
      ? { fields: [...fields], updatedAt: new Date().toISOString() }
      : food.localEdits,
  };
}
export function mergeLocalEdits(incoming: Food, saved?: Food): Food {
  if (
    saved &&
    (incoming.id !== saved.id ||
      (incoming.barcode && saved.barcode && incoming.barcode !== saved.barcode))
  )
    return incoming;
  if (!saved?.localEdits || incoming.localEdits) return incoming;
  const merged: Food = {
    ...incoming,
    nutrients: { ...incoming.nutrients },
    favorite: saved.favorite,
    originalOff:
      incoming.source === "off" ? snapshot(incoming) : saved.originalOff,
    localEdits: saved.localEdits,
  };
  for (const field of saved.localEdits.fields) {
    if (field.startsWith("nutrients.")) {
      const key = field.slice(10) as keyof Nutrients;
      if (Object.hasOwn(labels, key))
        merged.nutrients[key] = saved.nutrients[key];
    } else if (field === "name") merged.name = saved.name;
    else if (field === "category") {
      merged.category = saved.category;
      merged.categoryCertain = true;
    } else if (field === "unit") merged.unit = saved.unit;
    else if (field === "portion") merged.portion = saved.portion;
  }
  return merged;
}
