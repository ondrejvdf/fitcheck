import { describe, it, expect } from "vitest";
import type { Profile, Food } from "../types";
import { evaluatePersonal, QUALITY_WEIGHT } from "./personalization";
import { fixtures } from "./fixtures";
const profile: Profile = {
  age: 19,
  height: 180,
  weight: 80,
  sex: "male",
  activity: 1.55,
  activityLevel: "active",
  goal: "health",
  theme: "dark",
  onboarded: true,
};
export const matrixFoods: Food[] = [
  ...fixtures,
  {
    ...fixtures[4],
    id: "model-fruit",
    name: "Modelové ovoce – testovací údaje",
    category: "fruit",
    portion: 150,
    nutrients: {
      energy: 52,
      protein: 0.3,
      carbs: 14,
      sugars: 10,
      fat: 0.2,
      saturated: 0,
      fiber: 2.4,
      salt: 0,
    },
  },
  {
    ...fixtures[4],
    id: "model-oil",
    name: "Modelový olej – testovací údaje",
    category: "oil",
    portion: 10,
    nutrients: {
      energy: 884,
      protein: 0,
      carbs: 0,
      sugars: 0,
      fat: 100,
      saturated: 14,
      unsaturated: 86,
      fiber: 0,
      salt: 0,
    },
  },
  {
    ...fixtures[4],
    id: "model-meal",
    name: "Modelové smíšené jídlo – testovací údaje",
    category: "general",
    portion: 350,
    nutrients: {
      energy: 180,
      protein: 12,
      carbs: 20,
      sugars: 3,
      fat: 5,
      saturated: 1,
      fiber: 3,
      salt: 0.5,
    },
  },
];
describe("Skóre 3.0 – ověření vah a kategorií", () => {
  it.each([15, 16, 17, 18, 19])(
    "věk %s: matice tří cílů, tří poměrů a tří porcí",
    (age) => {
      for (const goal of ["lose", "gain", "health"] as const)
        for (const f of matrixFoods)
          for (const portion of [f.portion * 0.1, f.portion, f.portion * 2])
            for (const weight of [0.6, 0.7, 0.8]) {
              const s = evaluatePersonal(
                { ...f, portion },
                { ...profile, age, goal },
                weight,
              );
              if (f.id === "incomplete") {
                expect(s.total).toBeNull();
                continue;
              }
              expect(s.total).not.toBeNull();
              expect(s.total!).toBeGreaterThanOrEqual(0);
              expect(s.total!).toBeLessThanOrEqual(100);
            }
    },
  );
  it.each(["lose", "gain", "health"] as const)(
    "%s: voda bez proteinové penalizace, limonáda bez bonusu",
    (goal) => {
      for (const age of [15, 17, 19]) {
        const p = { ...profile, age, goal };
        expect(evaluatePersonal(fixtures[1], p).total).toBe(100);
        expect(evaluatePersonal(fixtures[0], p).total).toBeLessThanOrEqual(
          evaluatePersonal(fixtures[0], p).quality!,
        );
        expect(evaluatePersonal(fixtures[4], p).total!).toBeGreaterThan(
          evaluatePersonal(fixtures[2], p).total!,
        );
        expect(evaluatePersonal(fixtures[2], p).total!).toBeGreaterThan(
          evaluatePersonal(fixtures[3], p).total!,
        );
      }
    },
  );
  it("mikroporce nemá automaticky 100 a nadměrná porce nezlepší skóre", () => {
    for (const f of [
      fixtures[4],
      fixtures[6],
      matrixFoods[11],
      matrixFoods[12],
    ]) {
      const normal = evaluatePersonal(f, profile),
        tiny = evaluatePersonal({ ...f, portion: f.portion / 10 }, profile),
        huge = evaluatePersonal({ ...f, portion: 1500 }, profile);
      expect(tiny.total).toBe(normal.total);
      expect(huge.total!).toBeLessThan(normal.total!);
      expect(huge.quality).toBe(normal.quality);
    }
  });
  it("kvalita není podruhé součástí osobní složky", () => {
    const f = fixtures[4],
      a = evaluatePersonal(f, profile),
      b = evaluatePersonal(
        { ...f, nutrients: { ...f.nutrients, salt: 1.5 } },
        profile,
      );
    expect(a.fit).toBe(b.fit);
    expect(a.quality).not.toBe(b.quality);
    expect(a.total).toBe(
      Math.round(QUALITY_WEIGHT * a.quality! + (1 - QUALITY_WEIGHT) * a.fit!),
    );
  });
  it("osobní potřeby a sport mění relevantní složku, denní příjem není vstupem", () => {
    const f = fixtures[2];
    const a = evaluatePersonal(f, { ...profile, goal: "gain" });
    const b = evaluatePersonal(f, {
      ...profile,
      goal: "gain",
      targetMode: "custom",
      customTargets: { energy: 2000, protein: 250, carbs: 100, fat: 80 },
    });
    expect(a.fit).not.toBe(b.fit);
    const c = evaluatePersonal(fixtures[5], {
      ...profile,
      goal: "gain",
      sport: "running",
    });
    expect(c.fit).not.toBe(
      evaluatePersonal(fixtures[5], {
        ...profile,
        goal: "gain",
        sport: "strength",
      }).fit,
    );
    expect(a.personalExplanation).toContain(
      "Dnešní snědené množství toto skóre nemění",
    );
  });
});
