import { describe, it, expect } from "vitest";
import { evaluate } from "./scoring";
import { portion, validate, energyNeed } from "./nutrition";
import { fixtures } from "./fixtures";
import { classify } from "./categories";
import { parseBackup } from "./backup";
import type { Food, Goal, Nutrients } from "../types";
const food = (
  nutrients: Nutrients = {},
  category: Food["category"] = "general",
): Food => ({
  id: "test",
  name: "Test",
  category,
  unit: "g",
  portion: 150,
  nutrients,
  source: "manual",
  date: "2026-10-28T12:00:00.000Z",
});
const yogurt = food(
  {
    energy: 70,
    protein: 12,
    carbs: 4,
    sugars: 4,
    fat: 0.2,
    saturated: 0.1,
    fiber: 0,
    salt: 0.1,
  },
  "dairy",
);
describe("Kategorie a cíle", () => {
  it("regresní matice výsledků pro všechny cíle", () => {
    expect(
      Object.fromEntries(
        fixtures.map((f) => [
          f.id,
          Object.fromEntries(
            (["lose", "gain", "health"] as Goal[]).map((g) => [
              g,
              evaluate(f, g).total,
            ]),
          ),
        ]),
      ),
    ).toMatchInlineSnapshot(`
      {
        "5449000000996": {
          "gain": 19,
          "health": 19,
          "lose": 18,
        },
        "bread": {
          "gain": 73,
          "health": 75,
          "lose": 79,
        },
        "incomplete": {
          "gain": null,
          "health": null,
          "lose": null,
        },
        "nuts": {
          "gain": 97,
          "health": 100,
          "lose": 91,
        },
        "protein-bar": {
          "gain": 76,
          "health": 76,
          "lose": 80,
        },
        "protein-yogurt": {
          "gain": 87,
          "health": 95,
          "lose": 84,
        },
        "salted-nuts": {
          "gain": 74,
          "health": 75,
          "lose": 76,
        },
        "sweet-yogurt": {
          "gain": 50,
          "health": 60,
          "lose": 54,
        },
        "water": {
          "gain": 100,
          "health": 100,
          "lose": 100,
        },
        "yogurt": {
          "gain": 61,
          "health": 75,
          "lose": 63,
        },
      }
    `);
  });
  it.each(
    fixtures.flatMap((f) =>
      ["lose", "gain", "health"].map((goal) => ({
        food: f,
        goal: goal as Goal,
      })),
    ),
  )("$food.name / $goal: deterministické skóre i texty", ({ food, goal }) => {
    const s = evaluate(food, goal);
    expect(evaluate(food, goal)).toEqual(s);
    expect(classify(food.categoryTags || []).category).toBe(food.category);
    expect(s.tips.length).toBeGreaterThanOrEqual(1);
    expect(s.tips.length).toBeLessThanOrEqual(3);
    expect(new Set(s.tips).size).toBe(s.tips.length);
    expect(s.plus.every((t) => typeof t === "string")).toBe(true);
    expect(s.minus.every((t) => typeof t === "string")).toBe(true);
    if (food.id === "incomplete") {
      expect(s.total).toBeNull();
      expect(s.quality).toBeNull();
      expect(s.fit).toBeNull();
      expect(s.reliability.level).toBe("insufficient");
      expect(s.plus).toEqual([]);
      expect(s.tips[0]).toContain("Doplň");
    } else {
      expect(s.total).toBeGreaterThanOrEqual(0);
      expect(s.total).toBeLessThanOrEqual(100);
      expect(s.quality).not.toBeNull();
      expect(s.fit).not.toBeNull();
    }
    if (food.category === "drink") {
      expect(s.plus.join(" ")).not.toContain("soli");
      expect(s.minus.join(" ")).not.toContain("bílkovin");
      expect(s.tips.join(" ")).not.toContain("Doplň další zdroj");
    }
  });
  it("Coca-Cola: relevantní vysvětlení a obě množství cukrů", () => {
    const s = evaluate(fixtures[0], "gain");
    expect(s.plus).toEqual([]);
    expect(s.minus.join(" ")).toContain("10,6");
    expect(s.minus.join(" ")).toContain("35");
    expect(s.tips.join(" ")).toContain("vodu nebo neslazené");
    expect(s.tips.join(" ")).not.toContain("přidaných cukrů");
    expect(s.total).toBeLessThan(40);
  });
  it("voda nepotřebuje vlákninu pro spolehlivé hodnocení", () => {
    const s = evaluate(fixtures[1], "gain");
    expect(s.completeness).toBe(88);
    expect(s.reliability.level).toBe("sufficient");
    expect(s.total).toBeGreaterThan(90);
    expect(s.minus).toEqual([]);
    expect(s.plus.join(" ")).toContain("Bez uvedených cukrů");
  });
  it("cukry v jogurtu nepovažuje automaticky za přidané", () => {
    const plain = evaluate(fixtures[2], "health"),
      sweet = evaluate(fixtures[3], "health");
    expect(plain.minus.join(" ")).not.toContain("cukr");
    expect(sweet.total).toBeLessThan(plain.total!);
    expect(sweet.minus.join(" ")).toContain("celkových cukrů");
    expect(sweet.tips.join(" ")).toContain("laktóza");
  });
  it("proteinový jogurt má vhodnou svačinovou radu", () => {
    const s = evaluate(fixtures[4], "gain");
    expect(s.plus.join(" ")).toContain("bílkovin");
    expect(s.tips[0]).toContain("ovesnými vločkami");
    expect(s.minus).toEqual([]);
  });
  it("celozrnné pečivo zvýrazňuje vlákninu", () =>
    expect(evaluate(fixtures[5], "health").plus.join(" ")).toContain(
      "vlákniny",
    ));
  it("ořechy netrestá za celkový tuk, rozlišuje sůl a známé nenasycené tuky", () => {
    const a = evaluate(fixtures[6], "health"),
      b = evaluate(fixtures[7], "health");
    expect(a.plus.join(" ")).toContain("nenasycené");
    expect(a.minus).toEqual([]);
    expect(b.total).toBeLessThan(a.total!);
    expect(b.minus.join(" ")).toContain("soli");
    expect(b.tips.join(" ")).toContain("soli");
    const unknown = {
      ...fixtures[6],
      nutrients: { ...fixtures[6].nutrients, unsaturated: undefined },
    };
    expect(evaluate(unknown, "health").plus.join(" ")).not.toContain(
      "nenasycené",
    );
  });
  it("proteinová tyčinka stále přizná nasycené tuky", () => {
    const s = evaluate(fixtures[8], "gain");
    expect(s.plus.join(" ")).toContain("bílkovin");
    expect(s.minus.join(" ")).toContain("nasycených tuků");
    expect(s.tips.join(" ")).toContain("podílem nasycených tuků");
  });
  it("změna cíle přepočítá výsledek, vstupy nemutuje", () => {
    const f = structuredClone(fixtures[4]),
      before = JSON.stringify(f);
    expect(evaluate(f, "lose").total).not.toEqual(evaluate(f, "gain").total);
    expect(JSON.stringify(f)).toBe(before);
  });
  it("chybějící klíčová hodnota zabrání přesnému skóre", () => {
    for (const f of fixtures.slice(0, 9)) {
      const key =
        evaluate(f, "health").missingCritical[0] ||
        (f.category === "bread"
          ? "fiber"
          : f.category === "nuts"
            ? "salt"
            : "energy");
      const s = evaluate(
        { ...f, nutrients: { ...f.nutrients, [key]: undefined } },
        "gain",
      );
      expect(s.total).toBeNull();
      expect(s.warnings.length).toBeGreaterThan(0);
    }
  });
  it("nulová sůl samotná nestačí na 100 bodů", () =>
    expect(evaluate(food({ salt: 0 }), "health").total).toBeNull());
  it("nedostatek dat není záměnou nuly za neznámou", () => {
    expect(evaluate(food(), "health").completeness).toBe(0);
    expect(evaluate(food({ salt: 0 }), "health").completeness).toBe(13);
  });
  it("odmítá záporné hodnoty a NaN", () => {
    expect(() => evaluate(food({ energy: -1 }), "health")).toThrow();
    expect(() => evaluate(food({ salt: NaN }), "health")).toThrow();
  });
  it("bílkovinný bonus má strop", () => {
    const base = fixtures[8];
    expect(
      evaluate(
        {
          ...base,
          nutrients: {
            energy: 360,
            protein: 60,
            carbs: 0,
            sugars: 0,
            fat: 0,
            saturated: 0,
            fiber: 0,
            salt: 0,
          },
        },
        "health",
      ).quality,
    ).toBe(
      evaluate(
        {
          ...base,
          nutrients: {
            energy: 360,
            protein: 90,
            carbs: 0,
            sugars: 0,
            fat: 0,
            saturated: 0,
            fiber: 0,
            salt: 0,
          },
        },
        "health",
      ).quality,
    );
  });
  it("větší energetická porce při redukci nezíská převahu díky bílkovinám", () => {
    const f = {
      ...fixtures[4],
      nutrients: { ...fixtures[4].nutrients, energy: 300, fiber: 4 },
    };
    expect(evaluate({ ...f, portion: 50 }, "lose").fit).toBeGreaterThan(
      evaluate({ ...f, portion: 400 }, "lose").fit!,
    );
  });
  it("neznámá kategorie má explicitní upozornění", () => {
    const s = evaluate(
      { ...fixtures[4], category: "general", categoryCertain: false },
      "health",
    );
    expect(s.warnings.join(" ")).toContain("Kategorie není");
    expect(s.reliability.level).toBe("limited");
  });
});
describe("Výpočty a validace", () => {
  it("správně přepočítává porci a zachovává chybějící hodnoty", () => {
    expect(portion({ energy: 100, salt: 0, protein: undefined }, 150)).toEqual({
      energy: 150,
      salt: 0,
      protein: undefined,
    });
  });
  it("odmítá neplatnou porci", () =>
    expect(() => portion({ energy: 1 }, 0)).toThrow());
  it("kontroluje vztahy živin", () => {
    expect(validate({ carbs: 4, sugars: 7 }).length).toBeGreaterThan(0);
    expect(validate({ fat: 2, saturated: 3 }).length).toBeGreaterThan(0);
    expect(validate({ protein: 80, fat: 80 }).length).toBeGreaterThan(0);
  });
  it("NASEM funguje pouze s dostatečnými údaji", () => {
    expect(
      energyNeed({
        goal: "health",
        activity: 1.2,
        theme: "light",
        onboarded: true,
      }),
    ).toBeUndefined();
    expect(
      energyNeed({
        goal: "health",
        activity: 1.2,
        theme: "light",
        onboarded: true,
        age: 30,
        height: 180,
        weight: 80,
        sex: "male",
      }),
    ).toBe(2726);
  });
  it("import odmítá chybný soubor před zápisem", () => {
    expect(() => parseBackup('{"version":2}')).toThrow();
    expect(() =>
      parseBackup(
        JSON.stringify({
          version: 1,
          profile: { goal: "gain", theme: "light", activity: 1.55 },
          foods: [food({ salt: -1 })],
        }),
      ),
    ).toThrow();
  });
});
