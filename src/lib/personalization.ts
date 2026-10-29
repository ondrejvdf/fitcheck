import type { Food, Profile, Nutrients } from "../types";
import { evaluate } from "./scoring";
import { dailyPlan } from "./targets";
import { portion } from "./nutrition";
export const PERSONAL_ALGORITHM = "3.0";
export const QUALITY_WEIGHT = 0.8;
const clamp = (v: number, low = 0, high = 100) =>
  Math.max(low, Math.min(high, v));
export function evaluatePersonal(
  food: Food,
  profile: Profile,
  qualityWeight = QUALITY_WEIGHT,
) {
  const growing = profile.age !== undefined && profile.age < 19;
  const goal = growing && profile.goal === "lose" ? "health" : profile.goal;
  const base = evaluate(food, goal),
    plan = dailyPlan(profile);
  const common = { ...base, algorithmVersion: PERSONAL_ALGORITHM };
  if (!plan.targets)
    return {
      ...common,
      total: base.quality,
      fit: null,
      personalLabel: "Omezené podklady pro personalizaci",
      personalExplanation: `Obecné hodnocení nutriční kvality bez osobního plánu. ${plan.reason || "Doplň profil nebo vlastní cíle."}`,
    };
  const n = portion(food.nutrients, food.portion),
    t = plan.targets;
  const insufficient = (reason: string) => ({
    ...common,
    total: null,
    fit: null,
    personalLabel: "Nedostatek údajů",
    personalExplanation: reason,
  });
  if (base.quality === null || n.energy === undefined)
    return insufficient(
      "Pro osobní hodnocení porce chybí důležité hodnoty etikety. Neznámé hodnoty nejsou nuly.",
    );
  const energyShare = n.energy / t.energy;
  const proteinRelevant = ["general", "dairy", "meat", "protein"].includes(
    food.category,
  );
  const carbRelevant = ["general", "bread", "fruit"].includes(food.category);
  const fiberRelevant = ["general", "bread", "fruit", "nuts"].includes(
    food.category,
  );
  const endurance = ["running", "cycling", "swimming"].includes(
    profile.sport || "",
  );
  const proteinWeight = proteinRelevant
    ? goal === "gain"
      ? endurance
        ? 20
        : 30
      : goal === "lose"
        ? 25
        : 10
    : 0;
  const carbWeight =
    carbRelevant && (goal === "gain" || endurance) ? (endurance ? 30 : 20) : 0;
  const fiberWeight = fiberRelevant && goal !== "gain" ? 20 : 0;
  // No automatic 100 points for a tiny serving: neutral baseline and nutrient density relative to the plan.
  const signals: { key: "protein" | "carbs" | "fiber"; weight: number }[] = [
    { key: "protein", weight: proteinWeight },
    { key: "carbs", weight: carbWeight },
    { key: "fiber", weight: fiberWeight },
  ];
  let contribution = 0;
  for (const { key, weight } of signals) {
    if (!weight || t[key] === undefined || t[key] === 0) continue;
    if (n[key] === undefined)
      return insufficient(
        `Pro osobní porovnání chybí údaj ${key === "protein" ? "bílkovin" : key === "carbs" ? "sacharidů" : "vlákniny"}. Doplň etiketu.`,
      );
    const densityRatio = n.energy > 0 ? n[key]! / t[key]! / energyShare : 0;
    contribution += weight * clamp(densityRatio - 1, 0, 1);
  }
  const allowance =
    food.category === "oil"
      ? 0.1
      : ["nuts", "drink"].includes(food.category)
        ? 0.15
        : growing || goal === "gain"
          ? 0.35
          : goal === "lose"
            ? 0.2
            : 0.25;
  const penalty = 50 * clamp((energyShare - allowance) / (1 - allowance), 0, 1);
  const fit = Math.round(clamp(50 + contribution - penalty));
  // Drinks receive their category quality, never a sugar-energy or missing-protein bonus.
  const total =
    food.category === "drink"
      ? Math.round(clamp(base.quality - penalty))
      : Math.round(
          clamp(qualityWeight * base.quality + (1 - qualityWeight) * fit),
        );
  const details =
    food.category === "drink"
      ? "U nápojů vycházíme z kvality kategorie a případně velikosti porce, bez bonusu za nízkou energii nebo požadavku na bílkoviny."
      : `Hodnocení: ${Math.round(qualityWeight * 100)} % kategoriální kvalita a ${Math.round((1 - qualityWeight) * 100)} % osobní vhodnost porce. Osobní složka začíná na neutrálních 50 bodech; zohledňuje jen relevantní živiny vůči tvému plánu a velikost porce. Mikroporce nedostává automatický bonus.`;
  return {
    ...common,
    fit,
    total,
    personalLabel: "Osobní plán a zvolená porce",
    personalExplanation: `Porce představuje ${(energyShare * 100).toLocaleString("cs-CZ", { maximumFractionDigits: 1 })} % orientační denní energie. ${details} Dnešní snědené množství toto skóre nemění. Jde o transparentní pravidla FitCheck, ne procento zdravosti.${growing ? " Plán zahrnuje růst bez dospělého kalorického deficitu/přebytku; redukční cíl posuzujeme jako vyváženou výživu." : ""}`,
  };
}
