import { recommendFoods } from "./recommendations";
import type {
  DiaryEntry,
  DiaryDay,
  DailyTargets,
  TrackedKey,
  Food,
  Meal,
} from "../types";
import { portion, validate } from "./nutrition";
export const trackedKeys: TrackedKey[] = [
  "energy",
  "protein",
  "carbs",
  "fat",
  "fiber",
];
export function dayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function validDay(s: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + "T12:00:00");
  return Number.isFinite(d.getTime()) && dayKey(d) === s;
}
export function shiftDay(day: string, delta: number) {
  if (!validDay(day)) throw Error("Neplatné datum");
  const d = new Date(day + "T12:00:00");
  d.setDate(d.getDate() + delta);
  return dayKey(d);
}
export function weekDays(day: string) {
  const d = new Date(day + "T12:00:00");
  const start = shiftDay(day, -(d.getDay() + 6) % 7);
  return Array.from({ length: 7 }, (_, i) => shiftDay(start, i));
}
export function entryNutrients(entry: DiaryEntry) {
  return portion(entry.food.nutrients, entry.amount);
}
export function makeEntry(
  food: Food,
  day: string,
  meal: Meal,
  amount: number,
  id: string = crypto.randomUUID(),
): DiaryEntry {
  if (
    !validDay(day) ||
    !["breakfast", "lunch", "dinner", "snack"].includes(meal) ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    amount > 5000 ||
    validate(food.nutrients).length
  )
    throw Error("Neplatný den, jídlo nebo množství (0–5 000 g/ml).");
  const now = new Date().toISOString();
  return {
    id,
    day,
    meal,
    amount,
    food: structuredClone(food),
    createdAt: now,
    updatedAt: now,
  };
}
export function aggregate(entries: DiaryEntry[]) {
  return Object.fromEntries(
    trackedKeys.map((k) => {
      let value = 0,
        missing = 0,
        known = 0;
      for (const entry of entries) {
        const n = entryNutrients(entry)[k];
        if (n === undefined) missing++;
        else {
          value += n;
          known++;
        }
      }
      return [k, { value, missing, known }];
    }),
  ) as Record<TrackedKey, { value: number; missing: number; known: number }>;
}
export function progress(value: number, target?: number, missing = 0) {
  return {
    percent: target && target > 0 ? (value / target) * 100 : null,
    fill: target && target > 0 ? Math.min(100, (value / target) * 100) : 0,
    remaining: target !== undefined && missing === 0 ? target - value : null,
  };
}
export function weeklySummary(
  entries: DiaryEntry[],
  day: string,
  days: DiaryDay[],
) {
  const dates = weekDays(day);
  const recorded = dates.filter((d) => entries.some((e) => e.day === d));
  return {
    dates,
    recordedDays: recorded.length,
    metrics: Object.fromEntries(
      trackedKeys.map((k) => {
        const usable = recorded
          .map((d) => ({
            day: d,
            total: aggregate(entries.filter((e) => e.day === d))[k],
          }))
          .filter((r) => r.total.missing === 0);
        const paired = usable.filter(
          (r) => days.find((d) => d.day === r.day)?.targets?.[k] !== undefined,
        );
        return [
          k,
          {
            days: usable.length,
            average: usable.length
              ? usable.reduce((s, r) => s + r.total.value, 0) / usable.length
              : null,
            targetAverage: paired.length
              ? paired.reduce(
                  (s, r) => s + days.find((d) => d.day === r.day)!.targets![k]!,
                  0,
                ) / paired.length
              : null,
            pairedActual: paired.length
              ? paired.reduce((s, r) => s + r.total.value, 0) / paired.length
              : null,
            pairedDays: paired.length,
          },
        ];
      }),
    ) as Record<
      TrackedKey,
      {
        days: number;
        average: number | null;
        targetAverage: number | null;
        pairedActual: number | null;
        pairedDays: number;
      }
    >,
  };
}
export function suggestions(
  foods: Food[],
  entries: DiaryEntry[],
  targets: DailyTargets | null,
) {
  return recommendFoods(foods, entries, targets);
}
