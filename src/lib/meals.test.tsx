import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { catalog, searchCatalog, libraryFoods } from "./catalog";
import { recipeFood, repeatEntries, recentMeals } from "./recipes";
import { assertFood, parseBackup } from "./backup";
import { makeEntry, aggregate, suggestions } from "./diary";
import { fixtures } from "./fixtures";
import FoodLibrary from "../components/FoodLibrary";
import type { Food, Profile } from "../types";
const profile: Profile = {
  age: 17,
  goal: "health",
  activity: 1.55,
  activityLevel: "active",
  height: 180,
  weight: 80,
  sex: "male",
  theme: "dark",
  onboarded: true,
};
const rice = catalog.find((f) => f.id === "catalog:usda:169757")!;
const ingredients = [
  { food: fixtures[4], amount: 100 },
  { food: rice, amount: 100 },
];
const recipe = () => recipeFood("Jogurt s rýží – test", ingredients, 400, 2);
const targets = { energy: 2500, protein: 150, carbs: 300, fat: 78, fiber: 30 };
describe("Český katalog a skutečná jídla", () => {
  it("má 37 dohledatelných položek bez falešných nul či seedování historie", () => {
    expect(catalog).toHaveLength(37);
    expect(new Set(catalog.map((f) => f.id)).size).toBe(37);
    for (const f of catalog) {
      expect(() => assertFood(structuredClone(f))).not.toThrow();
      expect(f.catalog?.fdcId).toBeGreaterThan(0);
      expect(f.nutrients.energy).toBeDefined();
    }
  });
  it("hledá bez diakritiky a odděluje syrové a vařené gramáže", () => {
    expect(searchCatalog("ryze").length).toBe(2);
    expect(searchCatalog("ryze", "raw")).toHaveLength(1);
    expect(searchCatalog("ryze", "cooked")).toHaveLength(1);
    expect(searchCatalog("ryze", "raw")[0].nutrients.energy).toBe(365);
    expect(rice.nutrients.energy).toBe(130);
    expect(
      libraryFoods([{ ...rice, favorite: true }]).find((f) => f.id === rice.id)
        ?.favorite,
    ).toBe(true);
  });
  it("recept respektuje celkovou výtěžnost, porci i známé součty", () => {
    const f = recipe();
    expect(f.nutrients.energy).toBe(50);
    expect(f.portion).toBe(200);
    expect(
      aggregate([makeEntry(f, "2026-10-29", "lunch", 200)]).energy.value,
    ).toBe(100);
    const concentrated = recipeFood(f.name, ingredients, 200, 2);
    expect(concentrated.nutrients.energy).toBe(100);
    expect(concentrated.portion).toBe(100);
  });
  it("nepředpokládá hustotu ml a zachovává neznámé živiny", () => {
    const incomplete = {
      ...fixtures[4],
      unit: "ml" as const,
      nutrients: { energy: 70, protein: 12 },
    };
    const f = recipeFood(
      "Test kapaliny",
      [{ food: incomplete, amount: 100 }],
      80,
      1,
    );
    expect(f.nutrients.energy).toBe(87.5);
    expect(f.nutrients.fiber).toBeUndefined();
    expect(f.nutrients.fat).toBeUndefined();
  });
  it.each([0, -1, NaN, Infinity, 50001])(
    "odmítá nesmyslnou výtěžnost %s",
    (weight) =>
      expect(() => recipeFood("Test", ingredients, weight, 2)).toThrow(),
  );
  it("odmítá prázdné i vnořené recepty a nereálnou koncentraci", () => {
    expect(() => recipeFood("", ingredients, 400, 2)).toThrow();
    expect(() => recipeFood("Test", [], 400, 2)).toThrow();
    expect(() =>
      recipeFood("Test", [{ food: recipe(), amount: 100 }], 400, 2),
    ).toThrow();
    expect(() => recipeFood("Test", ingredients, 1, 1)).toThrow();
  });
  it("úprava receptu nezmění uložený snapshot jídla ani suroviny", () => {
    const f = recipe(),
      entry = makeEntry(f, "2026-10-28", "lunch", 200);
    const edited = recipeFood("Upravený", ingredients, 600, 3, f);
    expect(edited.id).toBe(f.id);
    expect(entry.food.recipe?.yield).toBe(400);
    expect(entry.food.name).toBe("Jogurt s rýží – test");
    expect(entry.food.nutrients.energy).toBe(50);
    expect(ingredients[0].food).toEqual(fixtures[4]);
  });
  it.each([1, 2, 3])(
    "čte zálohu formátu %s, nová data v3 jsou kontrolovaná",
    (version) => {
      const backup = {
        version,
        profile,
        foods: version === 3 ? [recipe()] : [fixtures[4]],
        entries: [],
        days: [],
      };
      expect(parseBackup(JSON.stringify(backup)).foods).toHaveLength(1);
    },
  );
  it("nepřijme podvržený přepočet receptu", () => {
    const f = recipe();
    f.nutrients.energy = 99;
    expect(() => assertFood(f)).toThrow(/neodpovídají/);
  });
  it("zopakuje celou vícesložkovou snídani do jiného dne bez změny originálu", () => {
    const old = [
      makeEntry(fixtures[4], "2026-10-28", "breakfast", 150, "old1"),
      makeEntry(rice, "2026-10-28", "breakfast", 100, "old2"),
    ];
    const repeated = repeatEntries(old, "2026-10-29", "snack", 0.5, [
      "new1",
      "new2",
    ]);
    expect(repeated.map((e) => e.amount)).toEqual([75, 50]);
    expect(
      repeated.every((e) => e.day === "2026-10-29" && e.meal === "snack"),
    ).toBe(true);
    expect(old.map((e) => e.amount)).toEqual([150, 100]);
    expect(old[0].day).toBe("2026-10-28");
    expect(repeated[0].food).not.toBe(old[0].food);
    expect(aggregate(repeated).energy.value).toBe(
      aggregate(old).energy.value / 2,
    );
    expect(recentMeals([...old, ...repeated])).toHaveLength(2);
  });
  it("opakování odmítne neplatné množství i den", () => {
    const e = makeEntry(fixtures[4], "2026-10-28", "snack", 150);
    for (const factor of [0, -1, NaN, Infinity, 11])
      expect(() => repeatEntries([e], "2026-10-29", "snack", factor)).toThrow();
    expect(() => repeatEntries([e], "2026-02-30", "snack", 1)).toThrow();
  });
  it("nové funkce jsou dostupné ve skutečně renderované knihovně", () => {
    const noop = () => {},
      asyncNoop = async () => {};
    const html = renderToStaticMarkup(
      <FoodLibrary
        foods={[]}
        entries={[]}
        onPick={noop}
        onOpen={noop}
        onFavorite={asyncNoop}
        onSave={asyncNoop}
        onRemove={asyncNoop}
        onRepeat={noop}
      />,
    );
    for (const text of [
      "Katalog surovin",
      "Moje recepty",
      "Oblíbené výrobky",
      "Zopakovat jídlo",
      "Rýže bílá",
    ])
      expect(html).toContain(text);
  });
});
describe("Doporučené porce podle dne", () => {
  const entry = makeEntry(fixtures[4], "2026-10-29", "breakfast", 150);
  it("používá katalog i recepty, vysvětluje návrhy a vejde porci do energie", () => {
    const r = suggestions([...catalog, recipe()], [entry], targets);
    expect(r.details.length).toBeGreaterThan(0);
    for (const d of r.details) {
      expect((d.amount * d.food.nutrients.energy!) / 100).toBeLessThanOrEqual(
        2395,
      );
      expect(d.reason).toContain("dodá přibližně");
      expect(d.food.catalog?.state).not.toBe("raw");
    }
  });
  it("mění pořadí podle chybějících živin, nikoliv jen množství bílkovin", () => {
    const common = {
      ...fixtures[4],
      source: "manual" as const,
      category: "general" as const,
      portion: 100,
    };
    const protein: Food = {
      ...common,
      id: "protein",
      nutrients: {
        energy: 200,
        protein: 25,
        carbs: 10,
        fat: 5,
        fiber: 0,
        sugars: 1,
        saturated: 1,
        salt: 0.1,
      },
    };
    const fiber: Food = {
      ...common,
      id: "fiber",
      nutrients: {
        energy: 200,
        protein: 1,
        carbs: 30,
        fat: 5,
        fiber: 15,
        sugars: 1,
        saturated: 1,
        salt: 0.1,
      },
    };
    const a = suggestions([protein, fiber], [entry], {
      energy: 2500,
      protein: 150,
      carbs: 6,
      fat: 0.3,
      fiber: 0,
    });
    const b = suggestions([protein, fiber], [entry], {
      energy: 2500,
      protein: 18,
      carbs: 6,
      fat: 0.3,
      fiber: 30,
    });
    expect(a.foods[0].id).toBe("protein");
    expect(b.foods[0].id).toBe("fiber");
  });
  it("neodvozuje chybějící příjem z prázdného nebo neúplného dne", () => {
    expect(suggestions(catalog, [], targets).details).toEqual([]);
    expect(suggestions(catalog, [entry], null).details).toEqual([]);
    expect(
      suggestions(
        catalog,
        [makeEntry(fixtures[9], "2026-10-29", "snack", 100)],
        targets,
      ).details,
    ).toEqual([]);
    expect(
      suggestions(catalog, [entry], { ...targets, energy: 100 }).details,
    ).toEqual([]);
  });
});
