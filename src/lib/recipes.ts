import type { Food, Nutrients, DiaryEntry, Meal } from "../types";
import { labels } from "../types";
import { validate } from "./nutrition";
import { makeEntry } from "./diary";

export function recipeFood(
  name: string,
  ingredients: { food: Food; amount: number }[],
  weight: number,
  servings: number,
  original?: Food,
): Food {
  if (
    !name.trim() ||
    name.length > 150 ||
    !ingredients.length ||
    ingredients.length > 50 ||
    !Number.isFinite(weight) ||
    weight <= 0 ||
    weight > 50000 ||
    !Number.isFinite(servings) ||
    servings < 1 ||
    servings > 100 ||
    weight / servings > 5000
  )
    throw Error(
      "Vyplň název, suroviny, výslednou hmotnost a počet porcí (1–100, porce nejvýše 5 000 g).",
    );
  for (const i of ingredients)
    if (
      i.food.recipe ||
      !Number.isFinite(i.amount) ||
      i.amount <= 0 ||
      i.amount > 5000 ||
      validate(i.food.nutrients).length
    )
      throw Error(
        "Zkontroluj množství surovin (0–5 000 g/ml). Recepty nelze vnořovat.",
      );
  const nutrients: Nutrients = {};
  for (const k of Object.keys(labels) as (keyof Nutrients)[]) {
    if (ingredients.every((i) => i.food.nutrients[k] !== undefined))
      nutrients[k] =
        (ingredients.reduce(
          (sum, i) => sum + (i.food.nutrients[k]! * i.amount) / 100,
          0,
        ) *
          100) /
        weight;
  }
  if (validate(nutrients).length)
    throw Error(
      "Výsledná hmotnost neodpovídá surovinám: přepočet by vytvořil nereálné hodnoty na 100 g. Zkontroluj ji.",
    );
  return {
    id: original?.id ?? "recipe:" + crypto.randomUUID(),
    name: name.trim(),
    category: "general",
    categoryCertain: true,
    unit: "g",
    portion: weight / servings,
    nutrients,
    source: "recipe",
    date: new Date().toISOString(),
    favorite: original?.favorite,
    brand: "Vlastní recept",
    ingredients: ingredients
      .map((i) => `${i.food.name}: ${i.amount} ${i.food.unit}`)
      .join("; "),
    sourceNotes: [
      "Vypočteno ze zadaných surovin a výsledné hmotnosti. Neznámé živiny zůstávají neznámé; změny při vaření mimo změnu hmotnosti nejsou modelovány.",
    ],
    recipe: {
      ingredients: structuredClone(ingredients),
      yield: weight,
      servings,
    },
  };
}
export function repeatEntries(
  source: DiaryEntry[],
  day: string,
  meal: Meal,
  factor: number,
  ids?: string[],
) {
  if (
    !source.length ||
    source.length > 100 ||
    !Number.isFinite(factor) ||
    factor <= 0 ||
    factor > 10
  )
    throw Error("Zvol jídlo a platný násobek porce (0–10).");
  return source.map((e, i) =>
    makeEntry(e.food, day, meal, e.amount * factor, ids?.[i]),
  );
}
export function recentMeals(entries: DiaryEntry[]) {
  const groups = new Map<string, DiaryEntry[]>();
  for (const e of entries) {
    const key = e.day + ":" + e.meal;
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }
  return [...groups.values()]
    .sort(
      (a, b) =>
        b[0].day.localeCompare(a[0].day) ||
        b[0].createdAt.localeCompare(a[0].createdAt),
    )
    .slice(0, 20);
}
