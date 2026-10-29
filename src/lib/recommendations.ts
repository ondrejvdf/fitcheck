import type { Food, DiaryEntry, DailyTargets } from "../types";
import { evaluatePersonal } from "./personalization";
import { portion, validate } from "./nutrition";

export function recommendFoods(
  foods: Food[],
  entries: DiaryEntry[],
  targets: DailyTargets | null,
) {
  const empty = (text: string) => ({
    text,
    foods: [] as Food[],
    details: [] as { food: Food; amount: number; reason: string }[],
  });
  if (!targets)
    return empty(
      "Bez nastavených cílů neodhadujeme, co ti zbývá. Dál můžeš zapisovat a hodnotit potraviny.",
    );
  if (!entries.length)
    return empty(
      "Zatím nemáš zapsané jídlo. Zapiš skutečně snědené porce; prázdný den neznamená nulový skutečný příjem.",
    );
  const keys = ["energy", "protein", "carbs", "fat", "fiber"] as const;
  const sums = Object.fromEntries(
    keys.map((k) => [
      k,
      entries.reduce(
        (sum, e) => sum + ((e.food.nutrients[k] ?? 0) * e.amount) / 100,
        0,
      ),
    ]),
  ) as Record<(typeof keys)[number], number>;
  if (
    entries.some((e) =>
      keys.some(
        (k) => targets[k] !== undefined && e.food.nutrients[k] === undefined,
      ),
    )
  )
    return empty(
      "Některá jídla nemají úplné údaje. Zbývající příjem ani konkrétní doporučení proto neumíme spolehlivě určit.",
    );
  const energyLeft = targets.energy - sums.energy;
  if (energyLeft <= 0)
    return empty(
      "Zapsaná energie dosáhla orientačního cíle. Není potřeba za každou cenu dorovnávat každý gram; zohledni hlad, aktivitu a celý jídelníček.",
    );
  const names = {
    protein: "bílkovin",
    carbs: "sacharidů",
    fat: "tuků",
    fiber: "vlákniny",
  };
  const needs = (["protein", "fiber", "carbs", "fat"] as const)
    .map((k) => ({
      key: k,
      left: Math.max(0, (targets[k] ?? 0) - sums[k]),
      target: targets[k] ?? 0,
    }))
    .filter((n) => n.target > 0 && n.left / n.target > 0.08);
  if (!needs.length)
    return empty(
      "Podle zapsaných hodnot není potřeba cíle přesně dorovnávat. Důležitý je dlouhodobý průměr a pestrost.",
    );
  const candidates = [...new Map(foods.map((f) => [f.id, f])).values()]
    .flatMap((f) => {
      if (
        validate(f.nutrients).length ||
        f.source === "demo" ||
        f.catalog?.state === "raw" ||
        ["oil", "sweets", "drink"].includes(f.category) ||
        !f.nutrients.energy ||
        keys.some(
          (k) => targets[k] !== undefined && f.nutrients[k] === undefined,
        )
      )
        return [];
      // Explicitly use category quality, never the daily-personal combined score, as a basic eligibility check.
      const quality = evaluatePersonal(f, {
        goal: "health",
        theme: "dark",
        activity: 1.55,
        onboarded: true,
      }).quality;
      if (quality === null || quality < 45) return [];
      const amount =
        Math.floor(
          Math.min(f.portion, (energyLeft * 100) / f.nutrients.energy) * 10,
        ) / 10;
      if (amount < Math.min(20, f.portion * 0.25)) return [];
      const n = portion(f.nutrients, amount);
      const gains = needs.map((need) => ({
        ...need,
        coverage: Math.min(n[need.key] ?? 0, need.left) / need.target,
        amount: n[need.key] ?? 0,
      }));
      const ranked = gains.sort(
        (a, b) =>
          b.coverage * (b.key === "fiber" ? 1.3 : 1) -
          a.coverage * (a.key === "fiber" ? 1.3 : 1),
      );
      if (!ranked.length || ranked[0].coverage < 0.015) return [];
      const focus = ranked[0];
      const score =
        gains.reduce(
          (s, g) => s + g.coverage * (g.key === "fiber" ? 1.3 : 1),
          0,
        ) *
        (entries.some((e) => e.food.id === f.id) ? 0.8 : 1) *
        (f.favorite ? 1.03 : 1);
      return [
        {
          food: { ...f, portion: amount },
          amount,
          score,
          reason: `Porce ${amount.toLocaleString("cs-CZ")} ${f.unit} dodá přibližně ${Math.round(n.energy!)} kcal a ${focus.amount.toLocaleString("cs-CZ", { maximumFractionDigits: 1 })} g ${names[focus.key]}. Podle záznamů zbývá asi ${Math.round(focus.left)} g ${names[focus.key]}.`,
        },
      ];
    })
    .sort((a, b) => b.score - a.score || a.food.id.localeCompare(b.food.id));
  const chosen: typeof candidates = [];
  for (const c of candidates) {
    if (chosen.length >= 3) break;
    if (
      chosen.some((x) => x.food.category === c.food.category) &&
      candidates.some(
        (x) => !chosen.some((y) => y.food.category === x.food.category),
      )
    )
      continue;
    chosen.push(c);
  }
  const details = chosen.map(({ food, amount, reason }) => ({
    food,
    amount,
    reason,
  }));
  return {
    text: details.length
      ? "Návrhy podle zbývající energie a poměru živin v zapsaném dni. Každá porce je samostatná alternativa; nezapisuj automaticky všechny. Cíle nemusíš přesně dorovnávat."
      : "V katalogu a uložených jídlech nyní nemáme vhodnou porci s dostatečnými údaji. Nemusíš za každou cenu dorovnávat cíle.",
    foods: details.map((d) => d.food),
    details,
  };
}
