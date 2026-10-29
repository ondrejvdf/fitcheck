import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { dailyPlan } from "./targets";
import { profileGuidance } from "./profile-guidance";
import { sports } from "../types";
import type { Profile, Sport } from "../types";
import { makeEntry, aggregate } from "./diary";
import { fixtures } from "./fixtures";
import Progress from "../components/Progress";
import { evaluatePersonal } from "./personalization";
const p: Profile = {
  age: 18,
  height: 180,
  weight: 80,
  sex: "male",
  activity: 1.55,
  goal: "gain",
  theme: "dark",
  onboarded: true,
};
describe("Věk, sport a skutečný příjem", () => {
  it("17 let: cíle, jídelníček i nutriční kvalita jsou dostupné", () => {
    const profile = { ...p, age: 17 };
    expect(dailyPlan(profile).targets).not.toBeNull();
    const entry = makeEntry(fixtures[4], "2026-10-29", "breakfast", 150);
    expect(aggregate([entry]).energy.value).toBeGreaterThan(0);
    expect(evaluatePersonal(fixtures[4], profile).quality).not.toBeNull();
    expect(profileGuidance(profile).join()).toContain("Při růstu");
  });
  it("18 let: automatický model zahrnující růst je dostupný", () => {
    expect(dailyPlan(p).targets?.energy).toBeGreaterThan(0);
    expect(profileGuidance(p).join()).toContain("Při růstu");
  });
  it.each(Object.keys(sports) as Sport[])(
    "%s se nezapočítá jako druhý výdej",
    (sport) => {
      for (let n = 0; n <= 7; n++)
        expect(dailyPlan({ ...p, sport, trainingsPerWeek: n }).targets).toEqual(
          dailyPlan(p).targets,
        );
    },
  );
  it("sport a počet tréninků mění slovní doporučení", () => {
    expect(profileGuidance({ ...p, sport: "running" }).join()).toContain(
      "sacharidů",
    );
    expect(profileGuidance({ ...p, sport: "strength" }).join()).toContain(
      "bílkovin",
    );
    expect(profileGuidance({ ...p, trainingsPerWeek: 0 }).join()).not.toEqual(
      profileGuidance({ ...p, trainingsPerWeek: 5 }).join(),
    );
    expect(
      profileGuidance({ ...p, sport: "none", trainingsPerWeek: 5 }).join(),
    ).toContain("Zkontroluj");
  });
  it("platné tělesné údaje a aktivita přepočítávají automatiku", () => {
    for (const change of [
      { age: 25 },
      { height: 170 },
      { weight: 70 },
      { activity: 1.2 },
    ])
      expect(dailyPlan({ ...p, ...change }).targets?.energy).not.toBe(
        dailyPlan(p).targets?.energy,
      );
  });
  it("vlastní hodnoty přežijí všechny změny sportovního i tělesného profilu", () => {
    const customTargets = { energy: 2500, protein: 150, carbs: 300, fat: 77.8 };
    const profile: Profile = { ...p, targetMode: "custom", customTargets };
    expect(
      dailyPlan({
        ...profile,
        age: 35,
        height: 190,
        weight: 95,
        activity: 1.9,
        sport: "cycling",
        trainingsPerWeek: 7,
        goal: "lose",
      }).targets,
    ).toEqual(customTargets);
    expect(dailyPlan({ ...profile, age: 17 }).targets).toEqual(customTargets);
    expect(profile.customTargets).toEqual(customTargets);
  });
  it("bez cíle vykreslí pouze skutečné živiny, žádné progress bary ani nulové cíle", () => {
    const e = makeEntry(fixtures[4], "2026-10-29", "breakfast", 150);
    const html = renderToStaticMarkup(
      <Progress entries={[e]} targets={null} />,
    );
    expect(html).toContain("Skutečně zapsaný příjem");
    expect(html).not.toContain('role="progressbar"');
    expect(html).not.toContain("/ 0");
    const adult = renderToStaticMarkup(
      <Progress entries={[e]} targets={dailyPlan(p).targets} />,
    );
    expect(adult).toContain('role="progressbar"');
  });
  it("nezletilému nevrací rady závislé na redukčním cíli", () => {
    const a = evaluatePersonal(fixtures[4], { ...p, age: 17, goal: "lose" });
    const b = evaluatePersonal(fixtures[4], { ...p, age: 17, goal: "health" });
    expect(a.tips).toEqual(b.tips);
  });
});
