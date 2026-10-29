import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { Profile, ActivityLevel } from "../types";
import { estimateEnergy } from "./energy";
import { dailyPlan, targetValidation } from "./targets";
import { fixtures } from "./fixtures";
import { makeEntry, aggregate, suggestions } from "./diary";
import { evaluatePersonal } from "./personalization";
import Home from "../pages/Home";
import Diary from "../pages/Diary";
import TargetSettings from "../pages/TargetSettings";
import { parseBackup } from "./backup";
const profile: Profile = {
  age: 15,
  height: 180,
  weight: 80,
  sex: "male",
  activity: 1.55,
  activityLevel: "active",
  targetMode: "auto",
  goal: "health",
  theme: "dark",
  onboarded: true,
};
const noop = () => {};
describe("NASEM a plně dostupný denní plán", () => {
  it("vlastní cíle kontrolují věkové rozmezí makroživin bez zákazu zápisu", () => {
    const targets = {
      energy: 2000,
      protein: 165,
      carbs: 225,
      fat: 49,
      fiber: 25,
    };
    const teen = targetValidation(targets, 18);
    const adult = targetValidation(targets, 19);
    expect(teen.errors).toEqual([]);
    expect(teen.warnings.some((w) => w.includes("25–35"))).toBe(true);
    expect(teen.warnings.some((w) => w.includes("30 %"))).toBe(true);
    expect(
      adult.warnings.some(
        (w) => w.includes("Podíl tuků") || w.includes("Bílkoviny tvoří"),
      ),
    ).toBe(false);
  });
  it.each([
    [15, 3603],
    [16, 3606],
    [17, 3610],
    [18, 3614],
    [19, 3245],
  ])("věk %s má referenční energii %s a všechny funkce", (age, energy) => {
    const p = { ...profile, age },
      plan = dailyPlan(p),
      t = plan.targets!;
    expect(t.energy).toBe(energy);
    expect(t.protein).toBeGreaterThan(0);
    expect(t.carbs).toBeGreaterThan(0);
    expect(t.fat).toBeGreaterThan(0);
    expect(t.fiber).toBe(38);
    expect(
      Math.abs(t.energy - (4 * t.protein + 4 * t.carbs + 9 * t.fat)),
    ).toBeLessThan(1);
    expect(plan.model).toContain(age < 19 ? "dospívající" : "dospělí");
    const entry = makeEntry(fixtures[4], "2026-10-29", "breakfast", 150);
    expect(aggregate([entry]).energy.value).toBe(105);
    expect(evaluatePersonal(fixtures[4], p).total).not.toBeNull();
    expect(suggestions([fixtures[4]], [entry], t).foods).toHaveLength(1);
    const home = renderToStaticMarkup(
      <Home
        profile={p}
        foods={[fixtures[4]]}
        entries={[entry]}
        date="2026-10-29"
        targets={t}
        onDate={noop}
        onFind={noop}
        onDiary={noop}
        onSettings={noop}
        onFood={noop}
        onManual={noop}
      />,
    );
    expect(home.match(/role="progressbar"/g)).toHaveLength(5);
    expect(home).toContain("CO MI DNES CHYBÍ?");
    const diary = renderToStaticMarkup(
      <Diary
        profile={p}
        date="2026-10-29"
        onDate={noop}
        entries={[entry]}
        days={[]}
        targets={t}
        foods={[fixtures[4]]}
        onEdit={noop}
        onDelete={noop}
        onPick={noop}
        onFind={noop}
        onOpen={noop}
      />,
    );
    expect(diary.match(/role="progressbar"/g)).toHaveLength(5);
    const settings = renderToStaticMarkup(
      <TargetSettings profile={p} onChange={noop} />,
    );
    expect(settings).toContain("Automatický odhad");
    expect(settings).toContain("Vlastní nastavení");
    expect(settings).not.toContain("disabled");
  });
  it.each([15, 16, 17, 18])(
    "věk %s nemá dospělý deficit/přebytek ani růst přičtený podruhé",
    (age) => {
      const plans = (["lose", "gain", "health"] as const).map((goal) =>
        dailyPlan({ ...profile, age, goal }),
      );
      expect(new Set(plans.map((p) => p.targets?.energy)).size).toBe(1);
      expect(estimateEnergy({ ...profile, age })?.growth).toBe(20);
    },
  );
  it("od 19 let oddělí dospělé úpravy od základního EER", () => {
    expect(
      dailyPlan({ ...profile, age: 19, goal: "lose" }).targets?.energy,
    ).toBe(2921);
    expect(
      dailyPlan({ ...profile, age: 19, goal: "gain" }).targets?.energy,
    ).toBe(3408);
    expect(estimateEnergy({ ...profile, age: 19 })?.growth).toBe(0);
    expect(estimateEnergy({ ...profile, age: 18.99 })?.model).toContain(
      "dospívající",
    );
  });
  it.each([
    ["male", 15, "inactive", 3021.49],
    ["male", 15, "low", 3268.32],
    ["male", 15, "active", 3602.61],
    ["male", 15, "very", 4031.85],
    ["female", 15, "inactive", 2624.84],
    ["female", 15, "low", 2865.71],
    ["female", 15, "active", 3077.1],
    ["female", 15, "very", 3396.26],
    ["male", 19, "inactive", 2845.3],
    ["male", 19, "low", 3064.9],
    ["male", 19, "active", 3245.45],
    ["male", 19, "very", 3614.95],
    ["female", 19, "inactive", 2418.11],
    ["female", 19, "low", 2601.78],
    ["female", 19, "active", 2741.46],
    ["female", 19, "very", 3016.04],
  ] as const)(
    "referenční větev %s / %s / %s",
    (sex, age, activityLevel, expected) => {
      expect(
        estimateEnergy({ ...profile, sex, age, activityLevel })?.value,
      ).toBeCloseTo(expected, 2);
    },
  );
  it("vlastní cíle zůstávají stejné při změně věku a aktivit", () => {
    const customTargets = {
      energy: 2500,
      protein: 150,
      carbs: 300,
      fat: 77.8,
      fiber: 25,
    };
    for (const age of [15, 16, 17, 18, 19])
      expect(
        dailyPlan({ ...profile, age, targetMode: "custom", customTargets })
          .targets,
      ).toEqual(customTargets);
  });
  it("starý profil se mapuje bez výmazu a nové nastavení přežije zálohu", () => {
    expect(
      estimateEnergy({ ...profile, activityLevel: undefined })?.value,
    ).toBe(estimateEnergy(profile)?.value);
    const backup = parseBackup(
      JSON.stringify({
        version: 2,
        profile,
        foods: [fixtures[4]],
        entries: [],
        days: [],
      }),
    );
    expect(backup.profile.activityLevel).toBe("active");
    expect(backup.foods).toEqual([fixtures[4]]);
    expect(() =>
      parseBackup(
        JSON.stringify({
          version: 2,
          profile: { ...profile, activityLevel: "invalid" },
          foods: [],
          entries: [],
          days: [],
        }),
      ),
    ).toThrow();
  });
  it("sportovní údaje nepřičítají další výdej", () => {
    for (const age of [15, 16, 17, 18, 19])
      expect(
        dailyPlan({ ...profile, age, sport: "running", trainingsPerWeek: 7 })
          .targets,
      ).toEqual(
        dailyPlan({ ...profile, age, sport: "none", trainingsPerWeek: 0 })
          .targets,
      );
  });
  it("mladší věkové větve a jejich nižší energie nejsou odmítnuty importem", () => {
    const p: Profile = { ...profile, age: 2, height: 90, weight: 12 };
    const plan = dailyPlan(p);
    expect(plan.targets?.energy).toBe(1086);
    expect(estimateEnergy(p)?.growth).toBe(20);
    const day = {
      day: "2026-10-29",
      targets: plan.targets,
      goal: p.goal,
      mode: "auto",
      capturedAt: new Date().toISOString(),
    };
    expect(
      parseBackup(
        JSON.stringify({
          version: 2,
          profile: p,
          foods: [],
          entries: [],
          days: [day],
        }),
      ).days[0].targets?.energy,
    ).toBe(1086);
    for (const [age, growth] of [
      [3, 20],
      [4, 15],
      [9, 25],
      [14, 20],
    ] as const)
      expect(estimateEnergy({ ...profile, age })?.growth).toBe(growth);
  });
  it("chybějící či neplatné údaje nejsou nahrazeny nulovým cílem", () => {
    for (const patch of [
      { height: undefined },
      { weight: NaN },
      { sex: undefined },
      { activityLevel: "invalid" as ActivityLevel },
    ])
      expect(dailyPlan({ ...profile, ...patch }).targets).toBeNull();
  });
});
