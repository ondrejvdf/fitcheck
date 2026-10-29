import type { Food, Nutrients, NutrientEvidence } from "../types";
import { labels } from "../types";
type Raw = Record<string, any>;
const valid = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= 0;
export const differs = (a: number, b: number) =>
  Math.abs(a - b) > Math.max(0.001, Math.abs(a) * 0.01);
export function nutritionUnit(raw: Raw): "g" | "ml" | undefined {
  const a = raw.nutrition?.aggregated_set;
  if (a?.per === "100g") return "g";
  if (a?.per === "100ml") return "ml";
  if (a?.per === "serving" && ["g", "ml"].includes(a.per_unit))
    return a.per_unit;
  if (["g", "ml"].includes(raw.product_quantity_unit))
    return raw.product_quantity_unit;
  const input = raw.nutrition?.input_sets?.find(
    (s: any) =>
      (!s.preparation || s.preparation === "as_sold") &&
      ["100g", "100ml"].includes(s.per),
  );
  return input ? (input.per === "100ml" ? "ml" : "g") : undefined;
}
export function readNutrition(raw: Raw) {
  const nutrients: Nutrients = {},
    sources: NonNullable<Food["nutrientSources"]> = {};
  const aggregate = raw.nutrition?.aggregated_set;
  const sets = [
    aggregate,
    ...(Array.isArray(raw.nutrition?.input_sets)
      ? raw.nutrition.input_sets.slice(0, 8)
      : []),
  ].filter(Boolean);
  const legacy = raw.nutriments || {};
  const url =
    "https://world.openfoodfacts.org/product/" +
    encodeURIComponent(String(raw.code));
  const now = new Date().toISOString();
  const read = (name: string): NutrientEvidence[] => {
    // Never disguise an explicitly estimated or bounded aggregate as an exact label value.
    const head = aggregate?.nutrients?.[name];
    if (
      head?.source === "estimate" ||
      (head?.modifier && head.modifier !== "=")
    )
      return [];
    const values: NutrientEvidence[] = [];
    for (const set of sets) {
      if (set.preparation && set.preparation !== "as_sold") continue;
      const item = set.nutrients?.[name];
      if (
        !item ||
        item.source === "estimate" ||
        (item.modifier && item.modifier !== "=") ||
        !valid(item.value)
      )
        continue;
      if (item.unit !== undefined && typeof item.unit !== "string") continue;
      let factor = 1;
      if (!["100g", "100ml"].includes(set.per)) {
        if (
          set.per !== "serving" ||
          !["g", "ml"].includes(set.per_unit) ||
          !valid(set.per_quantity) ||
          set.per_quantity <= 0
        )
          continue;
        factor = 100 / set.per_quantity;
      }
      // Never mix a mass basis with a volume basis without a known density.
      const basis =
        set.per === "serving" ? set.per_unit : set.per === "100ml" ? "ml" : "g";
      const expected = nutritionUnit(raw) ?? "g";
      if (basis !== expected) continue;
      if (name.startsWith("energy")) {
        if (
          item.unit &&
          item.unit.toLowerCase() !== (name === "energy-kcal" ? "kcal" : "kj")
        )
          continue;
      } else if (item.unit) {
        const scale: Record<string, number> = {
          g: 1,
          mg: 0.001,
          µg: 0.000001,
          ug: 0.000001,
          mcg: 0.000001,
        };
        if (scale[item.unit] === undefined) continue;
        factor *= scale[item.unit];
      }
      values.push({
        value: item.value * factor,
        source: "off",
        url,
        checkedAt: now,
        detail: `OFF ${set === aggregate ? "aggregated_set" : "input_set"} · ${name} · ${set.per}${factor !== 1 ? " → na 100" : ""}${item.source ? " · " + item.source : ""}`,
      });
    }
    // Legacy _100g values are already normalized to g/kcal/kJ by OFF; *_unit belongs to the input label.
    if (
      (!aggregate?.per ||
        aggregate.per === "100g" ||
        aggregate.per === "100ml") &&
      (!aggregate?.preparation || aggregate.preparation === "as_sold") &&
      valid(legacy[name + "_100g"])
    )
      values.push({
        value: legacy[name + "_100g"],
        source: "off",
        url,
        checkedAt: now,
        detail: `OFF nutriments.${name}_100g`,
      });
    return values;
  };
  const assign = (key: keyof Nutrients, values: NutrientEvidence[]) => {
    const usable = values.filter(
      (x) => valid(x.value) && x.value <= (key === "energy" ? 1000 : 100),
    );
    if (usable.length) {
      nutrients[key] = usable[0].value;
      sources[key] = usable;
    }
  };
  const mapping: Partial<Record<keyof Nutrients, string>> = {
    protein: "proteins",
    carbs: "carbohydrates",
    sugars: "sugars",
    fat: "fat",
    saturated: "saturated-fat",
    fiber: "fiber",
    salt: "salt",
    addedSugar: "added-sugars",
    unsaturated: "unsaturated-fat",
  };
  for (const [key, name] of Object.entries(mapping))
    assign(key as keyof Nutrients, read(name));
  const kj = [...read("energy-kj"), ...read("energy")].map((x) => ({
    ...x,
    value: x.value / 4.184,
    detail: x.detail + " · kJ / 4,184",
  }));
  assign("energy", [...read("energy-kcal"), ...kj]);
  const sodium = read("sodium").map((x) => ({
    ...x,
    value: x.value * 2.5,
    detail: x.detail + " · sodík × 2,5 = sůl",
  }));
  assign("salt", [...(sources.salt || []), ...sodium]);
  if (nutrients.unsaturated === undefined) {
    const mono = read("monounsaturated-fat"),
      poly = read("polyunsaturated-fat");
    if (mono.length && poly.length)
      assign("unsaturated", [
        {
          ...mono[0],
          value: mono[0].value + poly[0].value,
          detail: "OFF · součet mono- a polynenasycených tuků",
        },
      ]);
  }
  return {
    nutrients,
    nutrientSources: sources,
    originalNutrients: { ...nutrients },
  };
}

// A single manually checked factual reference, not a live manufacturer API or a scraped database.
export const emcoReference = {
  barcode: "8595229932871",
  unit: "g",
  portion: 45,
  url: "https://www.emco.cz/proteinova-tycinka-cokolada-45-g/",
  checkedAt: "2026-10-29T00:00:00.000Z",
  nutrients: {
    energy: 394,
    protein: 30,
    carbs: 38,
    sugars: 2.2,
    fat: 17,
    saturated: 9.3,
    fiber: 6.9,
    salt: 0.31,
  } as Nutrients,
};
export function supplement(food: Food): Food {
  const r = emcoReference;
  if (food.source !== "off" || food.barcode !== r.barcode) return food;
  const notes = (food.sourceNotes || []).filter((n) => !n.startsWith("Emco:"));
  const matches = Object.entries(r.nutrients).filter(
    ([k]) => food.nutrients[k as keyof Nutrients] !== undefined,
  );
  const conflict = matches.some(([k, v]) =>
    differs(food.nutrients[k as keyof Nutrients]!, v!),
  );
  // EAN alone does not prove that a historical recipe still matches this checked reference.
  if (
    food.unit !== r.unit ||
    matches.length < 4 ||
    conflict ||
    Date.now() - Date.parse(r.checkedAt) > 180 * 86400000
  ) {
    return {
      ...food,
      sourceNotes: [
        ...notes,
        "Emco: existuje referenční etiketa pro tento EAN, ale shodu jednotek, receptury nebo aktuálnosti nelze potvrdit. Údaje automaticky neměníme; ověř obal a doplň je ručně.",
      ],
      nutrientSources: {
        ...food.nutrientSources,
        ...Object.fromEntries(
          Object.entries(r.nutrients).map(([k, value]) => [
            k,
            [
              ...(food.nutrientSources?.[k as keyof Nutrients] || []),
              {
                value,
                source: "manufacturer",
                detail: "Emco · referenční etiketa 45 g · na 100 g (nepoužito)",
                url: r.url,
                checkedAt: r.checkedAt,
              },
            ],
          ]),
        ),
      },
    };
  }
  const nutrients = { ...food.nutrients },
    sources = { ...food.nutrientSources };
  let filled = false;
  for (const key of Object.keys(r.nutrients) as (keyof Nutrients)[]) {
    const evidence: NutrientEvidence = {
      value: r.nutrients[key]!,
      source: "manufacturer",
      detail: "Emco · ručně ověřená reference stejného EAN · na 100 g",
      url: r.url,
      checkedAt: r.checkedAt,
    };
    sources[key] = [...(sources[key] || []), evidence];
    if (
      nutrients[key] === undefined &&
      !food.localEdits?.fields.includes("nutrients." + key)
    ) {
      nutrients[key] = evidence.value;
      filled = true;
    }
  }
  return {
    ...food,
    nutrients,
    nutrientSources: sources,
    originalNutrients: food.originalNutrients ?? { ...food.nutrients },
    sourceNotes: [
      ...notes,
      filled
        ? "Emco: chybějící údaje doplněny z ověřené reference stejného EAN a odpovídající etikety. Reference má omezenou platnost; přednost má aktuální obal."
        : "Emco: porovnáno s referencí stejného EAN; původní hodnoty zůstávají.",
    ],
  };
}
export function evidenceFor(
  food: Food,
  key: keyof Nutrients,
): NutrientEvidence[] {
  if (food.nutrients[key] === undefined)
    return food.nutrientSources?.[key] || [];
  const manual =
    food.source === "manual" ||
    food.localEdits?.fields.includes("nutrients." + key);
  const list = food.nutrientSources?.[key] || [];
  return manual
    ? [
        {
          value: food.nutrients[key]!,
          source: "manual",
          detail: "Ručně zadaná lokální hodnota",
          checkedAt: food.localEdits?.updatedAt ?? food.date,
        },
        ...list,
      ]
    : list.length
      ? list
      : [
          {
            value: food.nutrients[key]!,
            source: "off",
            detail:
              food.source === "demo"
                ? "Demonstrační údaj"
                : "Open Food Facts · starší uložený záznam",
            checkedAt: food.date,
          },
        ];
}
export function conflictLabels(food: Food) {
  return (Object.keys(labels) as (keyof Nutrients)[])
    .filter(
      (k) =>
        food.nutrients[k] !== undefined &&
        evidenceFor(food, k).some((x) => differs(food.nutrients[k]!, x.value)),
    )
    .map((k) => labels[k]);
}
