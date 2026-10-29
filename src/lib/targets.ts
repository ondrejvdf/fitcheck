import type { DailyTargets, Profile } from "../types";
import { estimateEnergy, fiberTarget } from "./energy";
export function targetValidation(t: DailyTargets, age?: number) {
  const errors: string[] = [],
    warnings: string[] = [];
  for (const k of ["energy", "protein", "carbs", "fat"] as const)
    if (!Number.isFinite(t[k]) || t[k] < 0)
      errors.push("Vyplň všechny hlavní cíle nezáporným číslem.");
  if (
    t.energy <= 0 ||
    t.energy > 10000 ||
    (age !== undefined && age >= 19 && (t.energy < 1200 || t.energy > 8000))
  )
    errors.push(
      "Vyplň kladnou energii v podporovaném rozsahu; vlastní plán pro dospělé 19+ podporuje 1 200–8 000 kcal. Jde o kontrolu vstupu, nikoliv potvrzení zdravotní vhodnosti.",
    );
  if (
    t.protein > 500 ||
    t.carbs > 1500 ||
    t.fat > 400 ||
    (t.fiber !== undefined &&
      (!Number.isFinite(t.fiber) || t.fiber < 0 || t.fiber > 100))
  )
    errors.push("Některá hodnota je mimo podporovaný rozsah.");
  if (t.protein === 0 || t.carbs === 0 || t.fat === 0)
    warnings.push(
      "Nulový cíl některé hlavní makroživiny neodpovídá běžnému vyváženému plánu. Ověř vhodnost individuálně.",
    );
  const macroEnergy = t.protein * 4 + t.carbs * 4 + t.fat * 9;
  if (
    Number.isFinite(macroEnergy) &&
    Math.abs(macroEnergy - t.energy) > Math.max(100, t.energy * 0.05)
  )
    warnings.push(
      `Makroživiny odpovídají asi ${Math.round(macroEnergy)} kcal, ale energetický cíl je ${t.energy} kcal. Zkontroluj rozdíl; jde o přepočet 4/4/9 bez energie vlákniny a dalších složek.`,
    );
  const fatMin =
    age !== undefined && age < 4
      ? 0.3
      : age !== undefined && age < 19
        ? 0.25
        : 0.2;
  const fatMax = age !== undefined && age < 4 ? 0.4 : 0.35;
  if (
    t.energy > 0 &&
    ((t.fat * 9) / t.energy < fatMin || (t.fat * 9) / t.energy > fatMax)
  )
    warnings.push(
      `Podíl tuků je mimo věkové referenční rozmezí ${Math.round(fatMin * 100)}–${Math.round(fatMax * 100)} % energie. Vlastní cíle nejsou automatické odborné doporučení.`,
    );
  const proteinMax =
    age !== undefined && age < 4
      ? 0.2
      : age !== undefined && age < 19
        ? 0.3
        : 0.35;
  if (t.protein * 4 > t.energy * proteinMax)
    warnings.push(
      `Bílkoviny tvoří více než ${Math.round(proteinMax * 100)} % plánované energie. Ověř vhodnost svého cíle individuálně.`,
    );
  return { errors: [...new Set(errors)], warnings, macroEnergy };
}
export function dailyPlan(p: Profile): {
  targets: DailyTargets | null;
  maintenance?: number;
  model?: string;
  warnings: string[];
  reason?: string;
} {
  if (!p.age || !Number.isFinite(p.age) || p.age < 1 || p.age > 100)
    return {
      targets: null,
      warnings: [],
      reason:
        "Doplň platný věk v profilu. Zapisování a obecné hodnocení funguje i bez osobního odhadu.",
    };
  const growing = p.age < 19;
  if (p.targetMode === "custom") {
    if (!p.customTargets)
      return {
        targets: null,
        warnings: [],
        reason: "Vyplň a ulož vlastní denní cíle.",
      };
    const check = targetValidation(p.customTargets, p.age);
    return {
      targets: check.errors.length ? null : { ...p.customTargets },
      model: "Vlastní nastavení",
      warnings: [
        ...check.warnings,
        ...(growing
          ? [
              "Vlastní hodnoty nejsou ověřený plán pro růst. Automatika pro tvůj věk nezavádí dospělý deficit ani přebytek; případné individuální úpravy prober s odborníkem.",
            ]
          : []),
      ],
      reason: check.errors.join(" ") || undefined,
    };
  }
  const estimate = estimateEnergy(p);
  if (!estimate)
    return {
      targets: null,
      warnings: [],
      reason:
        "Doplň platnou výšku, hmotnost, pohlaví pro výpočet a aktivitu. Neúplné nebo mimo-modelové údaje neblokují zapisování jídel.",
    };
  const maintenance = Math.round(estimate.value),
    warnings: string[] = [];
  let factor = growing
    ? 1
    : p.goal === "lose"
      ? 0.9
      : p.goal === "gain"
        ? 1.05
        : 1;
  if (
    !growing &&
    p.goal === "lose" &&
    p.weight! / (p.height! / 100) ** 2 < 18.5
  ) {
    factor = 1;
    warnings.push(
      "Při nízké hmotnosti automatický deficit nenavrhujeme. Zobrazený plán odpovídá udržovacímu odhadu.",
    );
  }
  const energy = Math.round(estimate.value * factor);
  if (energy <= 0 || energy > 10000)
    return {
      targets: null,
      maintenance,
      model: estimate.model,
      warnings: [],
      reason:
        "Odhad je mimo podporovaný výpočtový rozsah; zkontroluj údaje. Deník zůstává dostupný.",
    };
  let protein: number, fat: number;
  if (growing) {
    protein = Math.round(((energy * (p.age < 4 ? 0.1 : 0.15)) / 4) * 10) / 10;
    fat = Math.round(((energy * (p.age < 4 ? 0.35 : 0.3)) / 9) * 10) / 10;
    warnings.push(
      "Odhad zahrnuje růst. Volba hubnutí ani nabírání zde automaticky nesnižuje ani nezvyšuje kalorie. Rozdělení makroživin je orientační, ne povinnost splnit přesný gram.",
    );
  } else {
    const wanted = p.weight! * (p.goal === "health" ? 1.2 : 1.6);
    protein = Math.round(Math.min(wanted, (energy * 0.25) / 4) * 10) / 10;
    fat = Math.round(((energy * 0.3) / 9) * 10) / 10;
    if (protein < wanted - 1)
      warnings.push(
        "Bílkovinný odhad je omezen na 25 % energie, aby zbyl prostor pro další živiny. Tato kombinace údajů může vyžadovat individuální posouzení.",
      );
  }
  if (p.activityLevel === undefined)
    warnings.push(
      "Dřívější popis aktivity byl převeden na kategorii NASEM. Zkontroluj výběr Fyzická aktivita; starý číselný koeficient už energii nenásobí.",
    );
  const carbs = Math.round(((energy - 4 * protein - 9 * fat) / 4) * 10) / 10;
  return {
    targets: { energy, protein, carbs, fat, fiber: fiberTarget(p) },
    maintenance,
    model: estimate.model,
    warnings,
  };
}
