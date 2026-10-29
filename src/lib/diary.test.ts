import { describe, it, expect } from "vitest";
import type { DiaryDay, DailyTargets } from "../types";
import { fixtures } from "./fixtures";
import {
  makeEntry,
  entryNutrients,
  aggregate,
  progress,
  dayKey,
  shiftDay,
  weekDays,
  weeklySummary,
  suggestions,
  validDay,
} from "./diary";
const targets: DailyTargets = {
  energy: 2500,
  protein: 150,
  carbs: 300,
  fat: 77.8,
  fiber: 25,
};
describe("Jídelníček a přepočty", () => {
  it("výrobek bez potvrzeného záznamu není příjmem", () => {
    expect(aggregate([]).energy.value).toBe(0);
    const food = fixtures[4];
    expect(food.portion).toBe(150);
    expect(aggregate([]).protein.value).toBe(0);
  });
  it("počítá gramy, mililitry i přepočtené porce bez změny výrobku", () => {
    const f = structuredClone(fixtures[4]);
    const e = makeEntry(f, "2026-10-29", "breakfast", 150, "id");
    expect(entryNutrients(e).energy).toBe(105);
    expect(entryNutrients(e).protein).toBe(18);
    expect(
      entryNutrients(makeEntry(fixtures[0], "2026-10-29", "snack", 330, "cola"))
        .energy,
    ).toBeCloseTo(139.92);
    e.food.name = "změna kopie";
    expect(f.name).not.toBe(e.food.name);
  });
  it("úprava a odstranění přepočítají součet", () => {
    const e = makeEntry(fixtures[4], "2026-10-29", "breakfast", 150, "id");
    expect(aggregate([e]).energy.value).toBe(105);
    expect(aggregate([{ ...e, amount: 300 }]).energy.value).toBe(210);
    expect(aggregate([]).energy.value).toBe(0);
  });
  it("neznámé hodnoty nejsou nula", () => {
    const e = makeEntry(fixtures[9], "2026-10-29", "snack", 100, "unknown");
    const a = aggregate([e]);
    expect(a.energy).toEqual({ value: 0, known: 0, missing: 1 });
    expect(a.protein).toEqual({ value: 10, known: 1, missing: 0 });
    expect(
      progress(a.energy.value, 2000, a.energy.missing).remaining,
    ).toBeNull();
  });
  it("procenta a překročení nekončí na 100", () => {
    expect(progress(3000, 2500)).toEqual({
      percent: 120,
      fill: 100,
      remaining: -500,
    });
    expect(progress(100)).toEqual({ percent: null, fill: 0, remaining: null });
  });
  it("rozlišuje známou nulu od chybějící hodnoty", () => {
    const e = makeEntry(fixtures[1], "2026-10-29", "snack", 250, "water");
    expect(aggregate([e]).energy).toEqual({ value: 0, known: 1, missing: 0 });
  });
  it("odmítá nesmyslné množství a datum", () => {
    expect(() => makeEntry(fixtures[4], "2026-02-30", "snack", 100)).toThrow();
    for (const amount of [0, -1, NaN, Infinity, 5001])
      expect(() =>
        makeEntry(fixtures[4], "2026-10-29", "snack", amount),
      ).toThrow();
  });
  it("den se odvozuje lokálně a bezpečně přechází přes měsíc i změnu času", () => {
    expect(dayKey(new Date(2026, 9, 29, 23, 59))).toBe("2026-10-29");
    expect(shiftDay("2026-10-31", 1)).toBe("2026-11-01");
    expect(shiftDay("2026-10-25", 1)).toBe("2026-10-26");
    expect(validDay("2026-02-30")).toBe(false);
    expect(weekDays("2026-10-29")).toEqual([
      "2026-10-26",
      "2026-10-27",
      "2026-10-28",
      "2026-10-29",
      "2026-10-30",
      "2026-10-31",
      "2026-11-01",
    ]);
  });
  it("nový den má vlastní součet a nesmaže starý", () => {
    const entries = [
      makeEntry(fixtures[4], "2026-10-28", "breakfast", 150, "a"),
      makeEntry(fixtures[4], "2026-10-29", "breakfast", 300, "b"),
    ];
    expect(
      aggregate(entries.filter((e) => e.day === "2026-10-28")).energy.value,
    ).toBe(105);
    expect(
      aggregate(entries.filter((e) => e.day === "2026-10-29")).energy.value,
    ).toBe(210);
    expect(entries).toHaveLength(2);
  });
  it("týden nevydává nezapsané dny za nuly ani neznámé živiny za úplné", () => {
    const entries = [
      makeEntry(fixtures[4], "2026-10-28", "breakfast", 100, "a"),
      makeEntry(fixtures[4], "2026-10-29", "breakfast", 200, "b"),
      makeEntry(fixtures[9], "2026-10-30", "snack", 100, "c"),
    ];
    const days: DiaryDay[] = [
      {
        day: "2026-10-28",
        goal: "gain",
        mode: "auto",
        targets,
        capturedAt: "2026-10-28T10:00:00Z",
      },
    ];
    const s = weeklySummary(entries, "2026-10-29", days);
    expect(s.recordedDays).toBe(3);
    expect(s.metrics.energy.average).toBe(105);
    expect(s.metrics.energy.days).toBe(2);
    expect(s.metrics.energy.pairedActual).toBe(70);
    expect(s.metrics.energy.targetAverage).toBe(2500);
    expect(s.metrics.energy.pairedDays).toBe(1);
  });
  it("prázdný týden má neznámý průměr", () =>
    expect(
      weeklySummary([], "2026-10-29", []).metrics.energy.average,
    ).toBeNull());
  it("doporučení zohledňuje energii, data a skutečné uložené potraviny", () => {
    const entries = [
      makeEntry(fixtures[4], "2026-10-29", "breakfast", 150, "a"),
    ];
    expect(suggestions([fixtures[4]], entries, targets).foods[0].id).toBe(
      fixtures[4].id,
    );
    expect(
      suggestions([fixtures[4]], entries, { ...targets, energy: 80 }).foods,
    ).toEqual([]);
    expect(
      suggestions(
        [fixtures[4]],
        [makeEntry(fixtures[9], "2026-10-29", "snack", 100)],
        targets,
      ).foods,
    ).toEqual([]);
    expect(suggestions([fixtures[4]], [], targets).foods).toEqual([]);
  });
});
