import type { Food, Goal, Nutrients, Category } from "../types";
import { labels } from "../types";
import { portion, validate } from "./nutrition";
export const WEIGHTS = { quality: 0.6, goal: 0.4 };
export const ALGORITHM_VERSION = "2.0";
type Key = keyof Nutrients;
type Rule = { weights: Partial<Record<Key, number>>; critical: Key[] };
const base = {
  protein: 15,
  fiber: 20,
  salt: 20,
  saturated: 20,
  sugars: 15,
  energy: 10,
};
export const CATEGORY_RULES: Record<Category, Rule> = {
  general: { weights: base, critical: ["energy", "protein", "sugars", "salt"] },
  dairy: {
    weights: {
      protein: 25,
      fiber: 5,
      salt: 10,
      saturated: 25,
      sugars: 25,
      energy: 10,
    },
    critical: ["energy", "protein", "sugars"],
  },
  drink: {
    weights: { sugars: 65, energy: 25, salt: 10 },
    critical: ["energy", "sugars"],
  },
  bread: {
    weights: {
      fiber: 35,
      salt: 30,
      protein: 10,
      sugars: 10,
      saturated: 5,
      energy: 10,
    },
    critical: ["energy", "fiber", "salt"],
  },
  nuts: {
    weights: {
      fiber: 20,
      salt: 25,
      protein: 5,
      sugars: 5,
      saturated: 25,
      unsaturated: 20,
    },
    critical: ["energy", "fat", "salt", "fiber"],
  },
  oil: {
    weights: { saturated: 60, unsaturated: 30, salt: 10 },
    critical: ["energy", "fat", "saturated"],
  },
  fruit: {
    weights: { fiber: 45, salt: 10, sugars: 15, energy: 30 },
    critical: ["energy", "fiber", "sugars"],
  },
  meat: {
    weights: { protein: 30, salt: 35, saturated: 30, energy: 5 },
    critical: ["energy", "protein", "salt", "saturated"],
  },
  sweets: {
    weights: {
      sugars: 40,
      saturated: 30,
      fiber: 10,
      salt: 5,
      protein: 5,
      energy: 10,
    },
    critical: ["energy", "sugars", "saturated"],
  },
  protein: {
    weights: {
      protein: 40,
      sugars: 20,
      saturated: 20,
      fiber: 10,
      salt: 5,
      energy: 5,
    },
    critical: ["energy", "protein", "sugars", "saturated"],
  },
};
const clamp = (v: number) => Math.max(0, Math.min(100, v));
const up = (v: number, max: number) => clamp((v / max) * 100);
const down = (v: number, low: number, high: number) =>
  clamp((100 * (high - v)) / (high - low));
type Part = { name: string; score: number; weight: number };
const mean = (p: Part[]) =>
  p.length
    ? p.reduce((s, x) => s + x.score * x.weight, 0) /
      p.reduce((s, x) => s + x.weight, 0)
    : null;
const fmt = (v: number) =>
  v.toLocaleString("cs-CZ", { maximumFractionDigits: 1 });
const CORE: Key[] = [
  "energy",
  "protein",
  "carbs",
  "sugars",
  "fat",
  "saturated",
  "fiber",
  "salt",
];
export function evaluate(food: Food, goal: Goal) {
  const n = food.nutrients;
  if (validate(n).length) throw Error("Neplatné nutriční údaje");
  const p = portion(n, food.portion),
    c = food.category;
  const drink = c === "drink",
    dairy = c === "dairy",
    nuts = c === "nuts",
    oil = c === "oil",
    fruit = c === "fruit";
  const proteinRelevant = ["general", "dairy", "meat", "protein"].includes(c);
  const rule = CATEGORY_RULES[c] ?? CATEGORY_RULES.general;
  const parts: Part[] = [];
  for (const [key, weight] of Object.entries(rule.weights) as [Key, number][]) {
    let value = n[key];
    if (key === "sugars" && n.addedSugar !== undefined) value = n.addedSugar;
    if (key === "saturated" && (oil || nuts))
      value =
        n.saturated !== undefined && n.fat !== undefined && n.fat > 0
          ? (n.saturated / n.fat) * 100
          : undefined;
    if (key === "unsaturated")
      value =
        n.unsaturated !== undefined && n.fat !== undefined && n.fat > 0
          ? (n.unsaturated / n.fat) * 100
          : undefined;
    if (value === undefined) continue;
    const score =
      key === "protein"
        ? up(value, c === "protein" ? 25 : nuts ? 20 : 12)
        : key === "fiber"
          ? up(value, 6)
          : key === "salt"
            ? down(value, 0.1, 1.5)
            : key === "saturated"
              ? down(value, oil || nuts ? 10 : 1.5, oil || nuts ? 50 : 5)
              : key === "unsaturated"
                ? up(value, 80)
                : key === "energy"
                  ? down(value, drink ? 5 : 100, drink ? 60 : 500)
                  : key === "sugars"
                    ? n.addedSugar !== undefined
                      ? down(value, 0, drink ? 10 : 20)
                      : fruit
                        ? 70
                        : down(
                            value,
                            drink ? 0 : dairy ? 5 : 5,
                            drink ? 11 : dairy ? 20 : 30,
                          )
                    : 50;
    parts.push({
      name:
        key === "sugars" && n.addedSugar !== undefined
          ? labels.addedSugar
          : labels[key],
      score,
      weight,
    });
  }
  const rawQuality = mean(parts);
  const relevantCoverage = Math.round(
    (parts.reduce((s, x) => s + x.weight, 0) /
      Object.values(rule.weights).reduce((a, b) => a + b, 0)) *
      100,
  );
  const completeness = Math.round(
    (CORE.filter((k) => n[k] !== undefined).length / CORE.length) * 100,
  );
  const missingCritical = rule.critical.filter((k) => n[k] === undefined);
  const categoryCertain = food.categoryCertain ?? c !== "general";
  const sufficient =
    rawQuality !== null &&
    missingCritical.length === 0 &&
    relevantCoverage >= 60;
  const level = !sufficient
    ? "insufficient"
    : relevantCoverage < 85 || !categoryCertain
      ? "limited"
      : "sufficient";
  const reliability = {
    level,
    label:
      level === "insufficient"
        ? "Nedostatek údajů"
        : level === "limited"
          ? "Omezené podklady"
          : "Dostatečné podklady",
    coverage: relevantCoverage,
  };
  const warnings: string[] = [];
  if (missingCritical.length)
    warnings.push(
      "Pro tuto kategorii chybí: " +
        missingCritical.map((k) => labels[k].toLowerCase()).join(", ") +
        ".",
    );
  if (!categoryCertain)
    warnings.push(
      "Kategorie není spolehlivě určena. Používáme obecná pravidla; kategorii můžeš upřesnit.",
    );
  if (level === "limited")
    warnings.push("Výsledek je orientační a vychází z omezených podkladů.");
  if (!sufficient && !missingCritical.length)
    warnings.push(
      "Pro hodnocení chybí dostatek relevantních nutričních údajů.",
    );
  const target: Part[] = [];
  const t = (
    name: string,
    v: number | undefined,
    score: (v: number) => number,
    weight: number,
  ) => {
    if (v !== undefined) target.push({ name, score: score(v), weight });
  };
  if (drink) {
    // Hydration is not a protein serving, even when the goal is muscle gain.
    if (rawQuality !== null)
      target.push({ name: "Kvalita nápoje", score: rawQuality, weight: 70 });
    t(
      "Cukry v porci",
      p.sugars,
      (v) => down(v, 0, goal === "lose" ? 25 : 40),
      30,
    );
  } else if (goal === "health") {
    target.push(...parts);
  } else if (goal === "lose") {
    t("Energie porce", p.energy, (v) => down(v, 150, 600), 35);
    if (proteinRelevant) t("Bílkoviny porce", p.protein, (v) => up(v, 20), 35);
    if (!oil && c !== "meat") t("Vláknina porce", p.fiber, (v) => up(v, 6), 30);
    if (nuts || oil)
      t(
        "Velikost porce",
        food.portion,
        (v) => down(v, nuts ? 30 : 15, nuts ? 100 : 50),
        30,
      );
  } else {
    if (proteinRelevant) {
      t("Bílkoviny porce", p.protein, (v) => up(v, 25), 50);
      t(
        "Bílkoviny na 100 kcal",
        n.energy !== undefined && n.energy > 0 && n.protein !== undefined
          ? (n.protein / n.energy) * 100
          : undefined,
        (v) => up(v, 10),
        30,
      );
    } else if (rawQuality !== null)
      target.push({ name: "Nutriční kvalita", score: rawQuality, weight: 60 });
    t("Energie porce", p.energy, (v) => clamp(100 - Math.abs(v - 350) / 5), 20);
  }
  const rawFit = mean(target);
  const fitValue =
    goal === "lose" && !drink && rawFit !== null && p.energy !== undefined
      ? (rawFit * down(p.energy, 400, 1000)) / 100
      : rawFit;
  const targetRequired: Key[] = drink
    ? ["sugars"]
    : goal === "gain" && proteinRelevant
      ? ["energy", "protein"]
      : goal === "lose"
        ? ["energy"]
        : [];
  const targetAvailable =
    targetRequired.every((k) => n[k] !== undefined) && fitValue !== null;
  const quality = sufficient ? Math.round(rawQuality!) : null;
  const fit = sufficient && targetAvailable ? Math.round(fitValue!) : null;
  // No silently renormalized 100%-quality score when the goal cannot be evaluated.
  const total =
    sufficient && targetAvailable
      ? Math.round(
          clamp(rawQuality! * WEIGHTS.quality + fitValue! * WEIGHTS.goal),
        )
      : null;
  if (sufficient && !targetAvailable)
    warnings.push(
      "Pro vybraný cíl chybí důležité údaje; celkové skóre nelze určit.",
    );
  const plus: string[] = [],
    minus: string[] = [],
    tips: string[] = [];
  if (proteinRelevant && n.protein !== undefined && n.protein >= 12)
    plus.push("Výrazný obsah bílkovin na 100 " + food.unit + ".");
  if (!drink && !oil && n.fiber !== undefined && n.fiber >= 6)
    plus.push("Alespoň 6 g vlákniny na 100 " + food.unit + ".");
  if (!drink && !oil && n.salt !== undefined && n.salt <= 0.3)
    plus.push("Nízký obsah soli.");
  if (n.salt !== undefined && n.salt > 1.5) {
    minus.push("Vyšší obsah soli.");
    tips.push("Porovnej variantu s menším množstvím soli ve stejné kategorii.");
  }
  if (
    (oil || nuts) &&
    n.unsaturated !== undefined &&
    n.fat !== undefined &&
    n.fat > 0 &&
    n.unsaturated / n.fat >= 0.7
  )
    plus.push("Podle uvedených údajů převažují nenasycené tuky.");
  if (
    n.saturated !== undefined &&
    (!oil && !nuts
      ? n.saturated > 5
      : n.fat !== undefined && n.fat > 0 && n.saturated / n.fat > 0.35)
  ) {
    minus.push(
      oil || nuts
        ? "Vyšší podíl nasycených tuků na celkovém tuku."
        : "Vyšší obsah nasycených tuků.",
    );
    tips.push("Hledej podobný výrobek s menším podílem nasycených tuků.");
  }
  if (drink) {
    if (n.sugars !== undefined && n.sugars >= 5) {
      minus.push(
        "Nápoj obsahuje " +
          fmt(n.sugars) +
          " g celkových cukrů na 100 ml" +
          (p.sugars !== undefined
            ? " a " + fmt(p.sugars) + " g v porci."
            : "."),
      );
      if (
        n.energy !== undefined &&
        n.protein !== undefined &&
        n.energy > 0 &&
        n.protein <= 1 &&
        (n.sugars * 4) / n.energy >= 0.65
      )
        tips.push(
          "Tento nápoj dodává především cukry a energii, ale téměř žádné bílkoviny. Pro běžné pití preferuj vodu nebo neslazené nápoje." +
            (goal === "gain"
              ? " Potřebnou energii a bílkoviny doplňuj vhodnou stravou."
              : ""),
        );
      else
        tips.push(
          "Pro běžné pití porovnej vodu nebo neslazený nápoj; zohledni i cukry v celé porci.",
        );
    } else if (n.sugars === 0 && n.energy === 0) {
      plus.push("Bez uvedených cukrů a energie.");
      tips.push(
        "Nápoj může doplnit pitný režim. Výběr posuzuj i podle složení, které samotná tabulka nezachycuje.",
      );
    }
  } else {
    if (n.addedSugar !== undefined && n.addedSugar > 10) {
      minus.push("Více než 10 g přidaných cukrů na 100 " + food.unit + ".");
      tips.push("Porovnej variantu s méně přidanými cukry.");
    } else if (
      dairy &&
      n.addedSugar === undefined &&
      n.sugars !== undefined &&
      n.sugars > 10
    ) {
      minus.push(
        "Vyšší obsah celkových cukrů: " +
          fmt(n.sugars) +
          " g na 100 " +
          food.unit +
          ".",
      );
      tips.push(
        "Porovnej podobný mléčný výrobek s menším množstvím celkových cukrů. Část může být přirozená laktóza; přidané cukry neznáme.",
      );
    }
    if (
      goal === "gain" &&
      proteinRelevant &&
      p.protein !== undefined &&
      p.protein < 15
    ) {
      minus.push("Porce obsahuje méně než 15 g bílkovin.");
      tips.push(
        "Pokud má být tato porce hlavním zdrojem bílkovin svačiny, porovnej podobný výrobek s více bílkovinami.",
      );
    }
    if (
      dairy &&
      n.protein !== undefined &&
      n.protein >= 10 &&
      n.sugars !== undefined &&
      n.sugars <= 5 &&
      n.saturated !== undefined &&
      n.saturated <= 1.5
    )
      tips.unshift(
        "Výrobek může být vhodným zdrojem bílkovin. Pro vydatnější svačinu jej můžeš doplnit například ovocem nebo ovesnými vločkami.",
      );
    if ((nuts || oil) && n.energy !== undefined && n.energy >= 400)
      tips.push(
        "Vyšší energetická hustota je u této kategorie běžná. Zvaž skutečnou porci " +
          fmt(food.portion) +
          " " +
          food.unit +
          " podle zbytku jídelníčku.",
      );
    if (goal === "lose" && p.energy !== undefined && p.energy > 400) {
      minus.push("Porce přesahuje 400 kcal.");
      tips.push("Zvaž menší porci podle zbytku svého jídelníčku.");
    }
    if (c === "bread" && n.fiber !== undefined && n.fiber < 3) {
      minus.push("Méně než 3 g vlákniny na 100 " + food.unit + ".");
      tips.push("Porovnej pečivo s vyšším uvedeným obsahem vlákniny.");
    }
  }
  if (!sufficient)
    tips.unshift(
      "Doplň chybějící údaje z aktuální etikety. Bez nich nelze výrobek přiměřeně ohodnotit.",
    );
  if (!tips.length)
    tips.push(
      "Při výběru zohledni pestrost jídelníčku, složení a skutečnou velikost porce.",
    );
  return {
    total,
    quality,
    fit,
    confidence: relevantCoverage,
    completeness,
    reliability,
    categoryCertain,
    missingCritical,
    warnings,
    plus,
    minus,
    tips: [...new Set(tips)].slice(0, 3),
    parts,
  };
}
export const verdict = (v: number | null) =>
  v === null
    ? "Nedostatek údajů"
    : v >= 80
      ? "Velmi dobrá volba"
      : v >= 60
        ? "Dobrá volba"
        : v >= 40
          ? "Spíše nevhodné"
          : "Nízké hodnocení";
