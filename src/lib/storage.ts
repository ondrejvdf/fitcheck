import { database as db } from "./database";
import type { Food, Profile, DiaryEntry, DiaryDay } from "../types";
import type { IDBPTransaction } from "idb";
import { makeEntry, validDay } from "./diary";
export const defaultProfile: Profile = {
  goal: "health",
  activity: 1.55,
  theme: "dark",
  onboarded: false,
  targetMode: "auto",
};
export function loadProfile(): Profile {
  try {
    return {
      ...defaultProfile,
      ...JSON.parse(localStorage.getItem("fitcheck-profile") || "{}"),
    };
  } catch {
    return defaultProfile;
  }
}
export const saveProfile = (p: Profile) =>
  localStorage.setItem("fitcheck-profile", JSON.stringify(p));
export const listFoods = async (): Promise<Food[]> =>
  (await (await db).getAll("foods")).sort((a: Food, b: Food) =>
    b.date.localeCompare(a.date),
  );
export const putFood = async (f: Food) => {
  await (await db).put("foods", f);
};
export const getSaved = async (id: string): Promise<Food | undefined> =>
  (await db).get("foods", id);
export const deleteFood = async (id: string) => {
  await (await db).delete("foods", id);
};
export const clearFoods = async () => {
  const tx = (await db).transaction(
    ["foods", "diary", "days", "recoveries"],
    "readwrite",
  );
  await recoveryInTransaction(tx, "before-history-clear");
  await tx.objectStore("foods").clear();
  await tx.done;
};
export const cacheFood = async (f: Food) => {
  await (await db).put("cache", { ...f, cachedAt: Date.now() });
};
export const getCached = async (id: string): Promise<Food | undefined> =>
  (await db).get("cache", id);
export const searchLocal = async (term: string): Promise<Food[]> => {
  const d = await db;
  const all: Food[] = [
    ...(await d.getAll("cache")),
    ...(await d.getAll("foods")),
  ];
  const unique = new Map(all.map((f) => [f.id, f]));
  const normalize = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  return [...unique.values()]
    .filter((f) =>
      normalize(f.name + " " + (f.brand || "")).includes(normalize(term)),
    )
    .slice(0, 20);
};
export const clearAll = async () => {
  const d = await db;
  const tx = d.transaction(
    ["foods", "cache", "diary", "days", "recoveries"],
    "readwrite",
  );
  await tx.objectStore("foods").clear();
  await tx.objectStore("cache").clear();
  await tx.objectStore("diary").clear();
  await tx.objectStore("days").clear();
  await tx.objectStore("recoveries").clear();
  await tx.done;
  localStorage.removeItem("fitcheck-profile");
};
export const listEntries = async (): Promise<DiaryEntry[]> =>
  (await db).getAll("diary");
export const listDays = async (): Promise<DiaryDay[]> =>
  (await db).getAll("days");
export const removeEntry = async (id: string) => {
  await (await db).delete("diary", id);
};
export const saveDay = async (day: DiaryDay) => {
  const tx = (await db).transaction("days", "readwrite");
  const old = await tx.store.get(day.day);
  if (
    !old ||
    stable({
      targets: old.targets,
      goal: old.goal,
      mode: old.mode,
      model: old.model,
    }) !==
      stable({
        targets: day.targets,
        goal: day.goal,
        mode: day.mode,
        model: day.model,
      })
  )
    await tx.store.put(day);
  await tx.done;
};
export async function saveEntry(entry: DiaryEntry, day: DiaryDay) {
  return saveEntries([entry], day);
}
export async function saveEntries(entries: DiaryEntry[], day: DiaryDay) {
  if (
    !validDay(day.day) ||
    !entries.length ||
    entries.some(
      (e) => e.day !== day.day || typeof e.id !== "string" || !e.id,
    ) ||
    new Set(entries.map((e) => e.id)).size !== entries.length
  )
    throw Error("Nesouhlasí den zapisovaného jídla.");
  for (const e of entries) makeEntry(e.food, e.day, e.meal, e.amount, e.id);
  const d = await db;
  const tx = d.transaction(["diary", "days"], "readwrite");
  for (const entry of entries) await tx.objectStore("diary").put(entry);
  const old = await tx.objectStore("days").get(day.day);
  if (!old) await tx.objectStore("days").put(day);
  await tx.done;
}
export async function importRecords(
  foods: Food[],
  entries: DiaryEntry[],
  days: DiaryDay[],
  overwrite = false,
) {
  const tx = (await db).transaction(
    ["foods", "diary", "days", "recoveries"],
    "readwrite",
  );
  if (!overwrite) {
    let conflicts = 0;
    for (const [store, rows, key] of [
      ["foods", foods, "id"],
      ["diary", entries, "id"],
      ["days", days, "day"],
    ] as const) {
      for (const row of rows) {
        const old = await tx.objectStore(store).get((row as any)[key]);
        if (old && stable(old) !== stable(row)) conflicts++;
      }
    }
    if (conflicts) {
      tx.abort();
      await tx.done.catch(() => {});
      throw Error(
        `Import by přepsal ${conflicts} existujících záznamů. Bez potvrzení nebylo nic změněno.`,
      );
    }
  }
  await recoveryInTransaction(tx, "before-import");
  for (const f of foods) await tx.objectStore("foods").put(f);
  for (const e of entries) await tx.objectStore("diary").put(e);
  for (const d of days) await tx.objectStore("days").put(d);
  await tx.done;
}
function stable(value: any): string {
  if (Array.isArray(value)) return "[" + value.map(stable).join(",") + "]";
  if (value && typeof value === "object")
    return (
      "{" +
      Object.keys(value)
        .filter((k) => value[k] !== undefined)
        .sort()
        .map((k) => JSON.stringify(k) + ":" + stable(value[k]))
        .join(",") +
      "}"
    );
  return JSON.stringify(value);
}
async function recoveryInTransaction(
  tx: IDBPTransaction<unknown, string[], "readwrite">,
  id: string,
) {
  const [foods, entries, days] = await Promise.all([
    tx.objectStore("foods").getAll(),
    tx.objectStore("diary").getAll(),
    tx.objectStore("days").getAll(),
  ]);
  await tx.objectStore("recoveries").put({
    id,
    createdAt: new Date().toISOString(),
    backup: { version: 3, profile: loadProfile(), foods, entries, days },
  });
}
export async function ensureRecovery() {
  const tx = (await db).transaction(
    ["foods", "diary", "days", "recoveries"],
    "readwrite",
  );
  if (!(await tx.objectStore("recoveries").get("before-fitcheck-3")))
    await recoveryInTransaction(tx, "before-fitcheck-3");
  await tx.done;
}
export async function readRecovery(id = "before-fitcheck-3") {
  return (await db).get("recoveries", id);
}
export async function importConflicts(
  foods: Food[],
  entries: DiaryEntry[],
  days: DiaryDay[],
) {
  const tx = (await db).transaction(["foods", "diary", "days"], "readonly");
  let count = 0;
  for (const [store, rows, key] of [
    ["foods", foods, "id"],
    ["diary", entries, "id"],
    ["days", days, "day"],
  ] as const)
    for (const row of rows) {
      const old = await tx.objectStore(store).get((row as any)[key]);
      if (old && stable(old) !== stable(row)) count++;
    }
  await tx.done;
  return count;
}
export async function exportRecords() {
  const tx = (await db).transaction(["foods", "diary", "days"], "readonly");
  const [foods, entries, days] = await Promise.all([
    tx.objectStore("foods").getAll(),
    tx.objectStore("diary").getAll(),
    tx.objectStore("days").getAll(),
  ]);
  await tx.done;
  return {
    foods: foods as Food[],
    entries: entries as DiaryEntry[],
    days: days as DiaryDay[],
  };
}
