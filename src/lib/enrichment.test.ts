import { describe, it, expect, vi, afterEach } from "vitest";
vi.mock("./storage", () => ({
  cacheFood: vi.fn(),
  getCached: vi.fn(),
  getSaved: vi.fn(),
}));
import { mapProduct } from "./off";
import {
  supplement,
  emcoReference,
  evidenceFor,
  conflictLabels,
} from "./nutrient-data";
import { evaluatePersonal } from "./personalization";
import { evaluate } from "./scoring";
import { applyCorrections, mergeLocalEdits } from "./corrections";
import { parseBackup } from "./backup";
import { aggregate, makeEntry, progress } from "./diary";
import type { Food, Profile } from "../types";
const profile: Profile = {
  goal: "gain",
  age: 30,
  height: 180,
  weight: 80,
  sex: "male",
  activity: 1.55,
  theme: "dark",
  onboarded: true,
};
const raw = (code = "8595229932871", salt?: number) => ({
  code,
  product_name: "Emco Protein Bar Chocolate",
  brands: "Emco",
  quantity: "45 g",
  categories_tags: ["en:protein-bars"],
  serving_quantity: 45,
  nutriments: {
    "energy-kcal_100g": 394,
    proteins_100g: 30,
    carbohydrates_100g: 38,
    sugars_100g: 2.2,
    fat_100g: 17,
    "saturated-fat_100g": 9.3,
    fiber_100g: 6.9,
    salt_100g: salt,
  },
});
afterEach(() => vi.useRealTimers());
describe("Doplnění a původ živin", () => {
  it("Emco: přesný EAN a odpovídající etiketa doplní sůl, zachová původ a odkaz", () => {
    const f = mapProduct(raw());
    expect(f.nutrients.salt).toBe(0.31);
    expect(f.originalNutrients?.salt).toBeUndefined();
    expect(f.nutrientSources?.salt?.[0].url).toBe(emcoReference.url);
    expect(f.nutrientSources?.salt?.[0].source).toBe("manufacturer");
    expect(evaluate(f, "gain").quality).not.toBeNull();
  });
  it("podobný název s odlišným EAN není shoda", () => {
    const f = mapProduct(raw("8595229932872"));
    expect(f.nutrients.salt).toBeUndefined();
    expect(f.nutrientSources?.salt).toBeUndefined();
  });
  it("bez EAN ani s nedostatečným otiskem etikety nic nehádá", () => {
    expect(
      mapProduct({ ...raw(), code: undefined }).nutrients.salt,
    ).toBeUndefined();
    expect(
      mapProduct({
        code: emcoReference.barcode,
        product_name: "Emco",
        nutriments: { proteins_100g: 30 },
      }).nutrients.salt,
    ).toBeUndefined();
  });
  it("při odlišné receptuře nepoužije referenci, ukáže rozpor", () => {
    const r = raw();
    r.nutriments.proteins_100g = 20;
    const f = mapProduct(r);
    expect(f.nutrients.salt).toBeUndefined();
    expect(f.sourceNotes?.join()).toContain("nelze potvrdit");
    expect(conflictLabels(f)).toContain("Bílkoviny");
  });
  it("rozdílnou sůl nepřepíše vyšším ani nižším číslem", () => {
    for (const salt of [0.1, 0.8]) {
      const f = mapProduct(raw(undefined, salt));
      expect(f.nutrients.salt).toBe(salt);
      expect(conflictLabels(f)).toContain("Sůl");
    }
  });
  it("expirovaná reference se automaticky nepoužije", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2027-06-01"));
    expect(mapProduct(raw()).nutrients.salt).toBeUndefined();
  });
  it("nepřidává hodnoty mezi g a ml", () => {
    expect(
      mapProduct({ ...raw(), product_quantity_unit: "ml" }).nutrients.salt,
    ).toBeUndefined();
  });
  it("hledá chybějící hodnotu v legacy polích i při existujícím agregátu", () => {
    const f = mapProduct({
      code: "12345678",
      nutrition: {
        aggregated_set: {
          per: "100g",
          nutrients: { proteins: { value: 8, source: "packaging" } },
        },
      },
      nutriments: { salt_100g: 0.31 },
    });
    expect(f.nutrients.salt).toBe(0.31);
    expect(f.nutrientSources?.salt?.[0].detail).toContain(
      "nutriments.salt_100g",
    );
  });
  it("sodík mg převede na gramy a sůl × 2,5", () => {
    const f = mapProduct({
      code: "12345678",
      nutrition: {
        aggregated_set: {
          per: "100g",
          nutrients: {
            sodium: { value: 124, unit: "mg", source: "packaging" },
          },
        },
      },
    });
    expect(f.nutrients.salt).toBeCloseTo(0.31);
    expect(f.nutrientSources?.salt?.[0].detail).toContain("sodík × 2,5");
  });
  it("legacy _100g je normalizované, neaplikuje dvakrát vstupní mg", () => {
    expect(
      mapProduct({
        code: "1",
        nutriments: { sodium_100g: 0.124, sodium_unit: "mg" },
      }).nutrients.salt,
    ).toBeCloseTo(0.31);
  });
  it("v3 hodnoty na porci normalizuje jen se známou velikostí a jednotkou", () => {
    const nutrition = {
      aggregated_set: {
        per: "serving",
        per_quantity: 50,
        per_unit: "g",
        nutrients: { salt: { value: 0.15, unit: "g" } },
      },
    };
    expect(mapProduct({ code: "1", nutrition }).nutrients.salt).toBeCloseTo(
      0.3,
    );
    expect(
      mapProduct({
        code: "1",
        nutrition: {
          aggregated_set: {
            ...nutrition.aggregated_set,
            per_quantity: undefined,
          },
        },
      }).nutrients.salt,
    ).toBeUndefined();
  });
  it("nepoužívá připravený výrobek, neznámé jednotky, odhady ani mezní hodnoty", () => {
    for (const item of [
      { value: 1, source: "estimate" },
      { value: 1, modifier: "<" },
      { value: 1, unit: "kg" },
    ]) {
      expect(
        mapProduct({
          code: "1",
          nutrition: {
            aggregated_set: { per: "100g", nutrients: { salt: item } },
          },
        }).nutrients.salt,
      ).toBeUndefined();
    }
    expect(
      mapProduct({
        code: "1",
        nutrition: {
          aggregated_set: {
            per: "100g",
            preparation: "prepared",
            nutrients: { salt: { value: 1 } },
          },
        },
      }).nutrients.salt,
    ).toBeUndefined();
  });
  it("rozpor v3 a legacy zachová obě hodnoty a prioritu v3", () => {
    const f = mapProduct({
      code: "1",
      nutrition: {
        aggregated_set: { per: "100g", nutrients: { salt: { value: 0.2 } } },
      },
      nutriments: { salt_100g: 0.8 },
    });
    expect(f.nutrients.salt).toBe(0.2);
    expect(f.nutrientSources?.salt?.map((x) => x.value)).toEqual([0.2, 0.8]);
    expect(conflictLabels(f)).toContain("Sůl");
  });
  it("ruční doplnění soli uchová zdroj i při obnovení OFF", () => {
    const before = mapProduct(raw("12345678"));
    const corrected = applyCorrections(before, {
      ...before,
      nutrients: { ...before.nutrients, salt: 0.31 },
    });
    expect(evidenceFor(corrected, "salt")[0].source).toBe("manual");
    expect(corrected.originalOff?.nutrients.salt).toBeUndefined();
    expect(
      mergeLocalEdits(mapProduct(raw("12345678", 0.1)), corrected).nutrients
        .salt,
    ).toBe(0.31);
    const erased = applyCorrections(mapProduct(raw()), {
      ...mapProduct(raw()),
      nutrients: { ...before.nutrients, salt: undefined },
    });
    expect(supplement(erased).nutrients.salt).toBeUndefined();
  });
  it("záloha zachová zdroje a odmítne nebezpečný nebo neplatný podklad", () => {
    const f = mapProduct(raw());
    const backup = { version: 2, foods: [f], profile, entries: [], days: [] };
    expect(
      parseBackup(JSON.stringify(backup)).foods[0].nutrientSources,
    ).toEqual(f.nutrientSources);
    f.nutrientSources!.salt![0].url = "javascript:alert(1)";
    expect(() => parseBackup(JSON.stringify(backup))).toThrow();
  });
});
describe("Tři nezávislé pohledy", () => {
  const food = (): Food => mapProduct(raw());
  it("profil a porce ovlivňují vhodnost, nikoliv kvalitu", () => {
    const f = food(),
      a = evaluatePersonal(f, profile);
    const b = evaluatePersonal(
      { ...f, portion: 200 },
      { ...profile, weight: 60, activity: 1.2 },
    );
    expect(a.quality).toBe(b.quality);
    expect(a.fit).not.toBe(b.fit);
  });
  it("při změně cíle zůstává stejná kvalita", () => {
    const scores = (["lose", "gain", "health"] as const).map((goal) =>
      evaluatePersonal(food(), { ...profile, goal }),
    );
    expect(new Set(scores.map((s) => s.quality)).size).toBe(1);
    expect(new Set(scores.map((s) => s.fit)).size).toBeGreaterThan(1);
  });
  it("bez profilu ponechá obecné hodnocení s omezenou personalizací; dospívajícímu umožní osobní skóre", () => {
    expect(
      evaluatePersonal(food(), { ...profile, age: undefined }).quality,
    ).not.toBeNull();
    expect(
      evaluatePersonal(food(), { ...profile, age: undefined }).personalLabel,
    ).toContain("Omezené");
    expect(
      evaluatePersonal(food(), { ...profile, age: 17 }).fit,
    ).not.toBeNull();
  });
  it("bez kategorie zůstane označená nejistota, bez klíčových živin není přesné skóre", () => {
    const f = mapProduct({ code: "1", nutriments: { proteins_100g: 30 } });
    expect(evaluatePersonal(f, profile).quality).toBeNull();
    expect(evaluatePersonal(f, profile).warnings.join()).toContain("Kategorie");
  });
  it("jídlo mění součty a progress; nemění žádné produktové skóre", () => {
    const f = food(),
      before = evaluatePersonal(f, profile);
    const entry = makeEntry(f, "2026-10-29", "snack", 45);
    const total = aggregate([entry]);
    expect(total.energy.value).toBeCloseTo(177.3);
    expect(progress(total.energy.value, 2700).percent).toBeGreaterThan(0);
    expect(aggregate([]).energy.value).toBe(0);
    expect(evaluatePersonal(f, profile)).toEqual(before);
  });
  it("nápoj nedostává proteinové hodnocení ani chybějící proteinovou podmínku", () => {
    const f = mapProduct({
      code: "12345678",
      categories_tags: ["en:beverages"],
      nutriments: { "energy-kcal_100g": 42, sugars_100g: 10.6, salt_100g: 0 },
    });
    const s = evaluatePersonal(f, profile);
    expect(s.fit).not.toBeNull();
    expect(s.personalExplanation).not.toContain("cíle bílkovin");
  });
});
