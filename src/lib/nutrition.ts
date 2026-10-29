import { estimateEnergy } from "./energy";
import type { Nutrients, Profile } from "../types";
export function validate(n: Nutrients): string[] {
  const e: string[] = [];
  for (const [k, v] of Object.entries(n))
    if (
      v !== undefined &&
      (!Number.isFinite(v) || v < 0 || v > (k === "energy" ? 1000 : 100))
    )
      e.push("Hodnoty na 100 g/ml musí být nezáporné a v reálném rozsahu.");
  if (n.sugars !== undefined && n.carbs !== undefined && n.sugars > n.carbs)
    e.push("Cukry nemohou převyšovat sacharidy.");
  if (
    n.addedSugar !== undefined &&
    n.sugars !== undefined &&
    n.addedSugar > n.sugars
  )
    e.push("Přidané cukry nemohou převyšovat cukry celkem.");
  if (n.saturated !== undefined && n.fat !== undefined && n.saturated > n.fat)
    e.push("Nasycené tuky nemohou převyšovat tuky.");
  if (
    n.unsaturated !== undefined &&
    n.fat !== undefined &&
    n.unsaturated > n.fat
  )
    e.push("Nenasycené tuky nemohou převyšovat tuky.");
  if (
    n.unsaturated !== undefined &&
    n.saturated !== undefined &&
    n.fat !== undefined &&
    n.unsaturated + n.saturated > n.fat + 0.5
  )
    e.push("Součet nasycených a nenasycených tuků převyšuje tuky celkem.");
  if (
    ["protein", "carbs", "fat", "fiber"].reduce(
      (s, k) => s + (n[k as keyof Nutrients] ?? 0),
      0,
    ) > 105
  )
    e.push("Součet makroživin převyšuje 100 g.");
  return [...new Set(e)];
}
export function portion(n: Nutrients, size: number): Nutrients {
  if (!Number.isFinite(size) || size <= 0) throw Error("Neplatná porce");
  return Object.fromEntries(
    Object.entries(n).map(([k, v]) => [
      k,
      v === undefined ? undefined : (v * size) / 100,
    ]),
  );
}
export function energyNeed(p: Profile) {
  const estimate = estimateEnergy(p);
  return estimate ? Math.round(estimate.value) : undefined;
}
