import { describe, it, expect, vi } from "vitest";
vi.mock("./storage", () => ({
  cacheFood: vi.fn(),
  getCached: vi.fn(),
  getSaved: vi.fn(),
}));
import { classify } from "./categories";
import { mapProduct } from "./off";
import { selectIngredients } from "./ingredients";
import { applyCorrections, mergeLocalEdits } from "./corrections";
import { evaluate } from "./scoring";
import { fixtures } from "./fixtures";
import { parseBackup } from "./backup";

describe("Klasifikace z taxonomie", () => {
  it.each([
    ["en:beverages", "drink"],
    ["en:skyrs", "dairy"],
    ["en:whole-wheat-breads", "bread"],
    ["en:fish", "meat"],
    ["en:fruits", "fruit"],
    ["en:almonds", "nuts"],
    ["en:chocolates", "sweets"],
    ["en:protein-powders", "protein"],
    ["en:olive-oils", "oil"],
    ["en:food", "general"],
  ])("%s → %s", (tag, category) =>
    expect(classify([tag]).category).toBe(category),
  );
  it("slova v názvu ani částečná shoda nemohou rozhodovat", () => {
    const f = mapProduct({
      code: "1",
      product_name: "Protein Skyr Nuts cola",
      categories_tags: ["en:coconut-flavoured-desserts"],
    });
    expect(f.category).toBe("general");
    expect(f.categoryCertain).toBe(false);
  });
  it("proteinová tyčinka má přednost před čokoládou, mléčný nápoj před obecnými nápoji", () => {
    expect(classify(["en:protein-bars", "en:chocolates"]).category).toBe(
      "protein",
    );
    expect(classify(["en:beverages", "en:milks"]).category).toBe("dairy");
  });
  it("nezařadí sladkou pomazánku mezi čisté ořechy", () =>
    expect(classify(["en:hazelnuts", "en:sweet-spreads"]).category).toBe(
      "sweets",
    ));
});
describe("Složení bez automatických překladů", () => {
  it("preferuje cs, sk, en a zachovává původní text", () => {
    const raw = {
      ingredients_text_cs: "Mléko",
      ingredients_text_sk: "Mlieko",
      ingredients_text_en: "Milk",
      ingredients_text: "Leche",
      lang: "es",
    };
    expect(selectIngredients(raw).ingredients).toBe("Mléko");
    expect(
      selectIngredients({ ...raw, ingredients_text_cs: "  " })
        .ingredientsLanguage,
    ).toBe("sk");
    expect(
      selectIngredients({
        ...raw,
        ingredients_text_cs: "",
        ingredients_text_sk: "",
      }).ingredientsLanguage,
    ).toBe("en");
    expect(selectIngredients(raw).ingredientsOriginal).toBe("Leche");
  });
  it("použije skutečný jiný jazyk, nebo označí jazyk jako neznámý", () => {
    expect(
      selectIngredients({ ingredients_text_es: "Agua" }).ingredientsLanguage,
    ).toBe("es");
    expect(
      selectIngredients({ ingredients_text: "Agua" }).ingredientsLanguage,
    ).toBe("und");
    expect(selectIngredients({}).ingredients).toBeUndefined();
  });
  it("mapování skutečně použije jazykové preference", () =>
    expect(
      mapProduct({
        code: "1",
        ingredients_text_sk: "Mlieko",
        ingredients_text: "Leche",
        lang: "es",
      }).ingredients,
    ).toBe("Mlieko"));
  it("nezamění prázdnou agregaci v3 za absenci platných legacy údajů", () =>
    expect(
      mapProduct({
        code: "1",
        nutrition: { aggregated_set: { nutrients: {} } },
        nutriments: { proteins_100g: 10 },
      }).nutrients.protein,
    ).toBe(10));
  it("nenasycené tuky neodvozuje odčítáním nasycených od celkových", () => {
    const f = mapProduct({
      code: "1",
      nutriments: { fat_100g: 50, "saturated-fat_100g": 5 },
    });
    expect(f.nutrients.unsaturated).toBeUndefined();
  });
});
describe("Lokální opravy zachovávají původ a data", () => {
  const incomplete = {
    ...fixtures[9],
    image: "https://example.com/photo.png",
    name: "Nepojmenovaný výrobek",
  };
  const patch = {
    name: "Doplněný jogurt",
    category: "dairy" as const,
    unit: "g" as const,
    portion: 150,
    nutrients: { ...fixtures[4].nutrients },
  };
  it("po doplnění získá skóre a zachová fotografii, EAN, id a originál", () => {
    const changed = applyCorrections(incomplete, patch);
    expect(evaluate(incomplete, "gain").total).toBeNull();
    expect(evaluate(changed, "gain").total).not.toBeNull();
    expect(changed.image).toBe(incomplete.image);
    expect(changed.id).toBe(incomplete.id);
    expect(changed.barcode).toBe(incomplete.barcode);
    expect(changed.source).toBe("off");
    expect(changed.originalOff?.name).toBe(incomplete.name);
    expect(changed.localEdits?.fields).toContain("nutrients.energy");
    expect(incomplete.nutrients).toEqual({ protein: 10 });
  });
  it("opravy i výslovně vymazaná hodnota přežijí nové načtení databáze", () => {
    const f = applyCorrections(fixtures[4], {
      ...patch,
      nutrients: { ...patch.nutrients, fiber: undefined },
    });
    const roundtrip = JSON.parse(JSON.stringify(f));
    const remote = {
      ...fixtures[4],
      name: "Nový název z OFF",
      nutrients: { ...fixtures[4].nutrients, energy: 80, fiber: 5 },
    };
    const merged = mergeLocalEdits(remote, roundtrip);
    expect(merged.name).toBe(patch.name);
    expect(merged.nutrients.fiber).toBeUndefined();
    expect(merged.nutrients.energy).toBe(80);
    expect(merged.originalOff?.nutrients.fiber).toBe(5);
  });
  it("další úprava nepřepíše původní originál", () => {
    const first = applyCorrections(incomplete, patch);
    const next = applyCorrections(first, { ...patch, name: "Druhé jméno" });
    expect(next.originalOff).toEqual(first.originalOff);
    expect(mergeLocalEdits(next, first).name).toBe("Druhé jméno");
  });
  it("záloha zachovává označení lokálních úprav a odmítá podvržené klíče", () => {
    const f = applyCorrections(incomplete, patch);
    const b = {
      version: 1,
      profile: { goal: "gain", theme: "light", activity: 1.55 },
      foods: [f],
    };
    expect(parseBackup(JSON.stringify(b)).foods[0].originalOff).toEqual(
      f.originalOff,
    );
    expect(() =>
      parseBackup(
        JSON.stringify({
          ...b,
          foods: [
            { ...f, localEdits: { ...f.localEdits, fields: ["__proto__"] } },
          ],
        }),
      ),
    ).toThrow();
  });
});
