import { describe, it, expect } from "vitest";
import type { Profile } from "../types";
import { dailyPlan, targetValidation } from "./targets";
import { energyNeed } from "./nutrition";
const p: Profile = {
  age: 30,
  height: 180,
  weight: 80,
  sex: "male",
  activity: 1.55,
  goal: "health",
  theme: "dark",
  onboarded: true,
};
describe("Denní cíle", () => {
  it("navazuje na NASEM 2023 a kategorii aktivity", () => {
    expect(energyNeed(p)).toBe(3126);
    expect(dailyPlan(p).targets?.energy).toBe(3126);
  });
  it.each(["lose", "gain", "health"] as const)(
    "%s má konzistentní makra a energii",
    (goal) => {
      const plan = dailyPlan({ ...p, goal });
      const t = plan.targets!;
      expect(t.energy).toBe(
        Math.round(
          3126.32 * (goal === "lose" ? 0.9 : goal === "gain" ? 1.05 : 1),
        ),
      );
      expect(
        Math.abs(t.protein * 4 + t.carbs * 4 + t.fat * 9 - t.energy),
      ).toBeLessThan(1);
      expect(t.fiber).toBe(38);
      expect(t.protein).toBeGreaterThan(0);
      expect(t.carbs).toBeGreaterThan(0);
    },
  );
  it("přepočítá profil bez ztráty vlastních nastavení", () => {
    const custom = {
      energy: 2500,
      protein: 150,
      carbs: 295,
      fat: 80,
      fiber: 28,
    };
    expect(
      dailyPlan({ ...p, targetMode: "custom", customTargets: custom }).targets,
    ).toEqual(custom);
    expect(
      dailyPlan({ ...p, targetMode: "auto", customTargets: custom }).targets,
    ).not.toEqual(custom);
    expect(dailyPlan({ ...p, weight: 90 }).targets).not.toEqual(
      dailyPlan(p).targets,
    );
  });
  it("upozorní na nesoulad 4/4/9, není-li v toleranci", () => {
    expect(
      targetValidation({
        energy: 2500,
        protein: 100,
        carbs: 100,
        fat: 50,
      }).warnings.join(" "),
    ).toContain("1250 kcal");
    expect(
      targetValidation({
        energy: 2000,
        protein: 100,
        carbs: 250,
        fat: 66.7,
      }).warnings.join(" "),
    ).not.toContain("Makroživiny odpovídají");
  });
  it("odmítá neplatná či nepřiměřená čísla", () => {
    for (const energy of [NaN, -1, 0, 500, 9000])
      expect(
        targetValidation({ energy, protein: 100, carbs: 250, fat: 70 }, 30)
          .errors.length,
      ).toBeGreaterThan(0);
    expect(
      dailyPlan({
        ...p,
        targetMode: "custom",
        customTargets: { energy: 500, protein: 0, carbs: 0, fat: 0 },
      }).targets,
    ).toBeNull();
  });
  it.each(["lose", "gain", "health"] as const)(
    "dospívajícím poskytne %s plán bez automatického deficitu či přebytku",
    (goal) => {
      for (const targetMode of ["auto", "custom"] as const) {
        const r = dailyPlan({
          ...p,
          age: 17,
          goal,
          targetMode,
          customTargets: { energy: 2500, protein: 150, carbs: 300, fat: 70 },
        });
        expect(r.targets).not.toBeNull();
        expect(r.targets?.energy).toBe(targetMode === "auto" ? 3610 : 2500);
      }
    },
  );
  it("bez osobních údajů ani věku nevymyslí cíle", () => {
    expect(dailyPlan({ ...p, age: undefined }).targets).toBeNull();
    expect(dailyPlan({ ...p, height: undefined }).targets).toBeNull();
    expect(dailyPlan({ ...p, sex: undefined }).targets).toBeNull();
  });
  it("podváze nenavrhne automatický deficit", () =>
    expect(dailyPlan({ ...p, weight: 50, goal: "lose" }).targets?.energy).toBe(
      dailyPlan({ ...p, weight: 50, goal: "health" }).targets?.energy,
    ));
  it("extrémní kombinaci nepřepočítá na záporné sacharidy", () => {
    const t = dailyPlan({
      ...p,
      weight: 200,
      height: 150,
      age: 80,
      activity: 1.2,
      goal: "lose",
    }).targets;
    expect(t?.carbs).toBeGreaterThan(0);
    expect(
      dailyPlan({
        ...p,
        weight: 200,
        height: 150,
        age: 80,
        activity: 1.2,
        goal: "lose",
      }).warnings.length,
    ).toBeGreaterThan(0);
  });
});
