import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { openDB, deleteDB } from "idb";
import { migrateDatabase, database, DB_VERSION } from "./database";
import {
  listEntries,
  listDays,
  saveEntry,
  saveEntries,
  removeEntry,
  putFood,
  listFoods,
  clearFoods,
  importRecords,
  exportRecords,
  loadProfile,
  saveProfile,
  ensureRecovery,
  readRecovery,
  importConflicts,
  clearAll,
  saveDay,
} from "./storage";
import { makeEntry } from "./diary";
import { fixtures } from "./fixtures";
import { parseBackup } from "./backup";
import { recipeFood, repeatEntries } from "./recipes";
import type { Profile, DiaryDay } from "../types";
const local = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => local.get(k) ?? null,
  setItem: (k: string, v: string) => local.set(k, v),
  removeItem: (k: string) => local.delete(k),
});
const profile: Profile = {
  goal: "gain",
  theme: "dark",
  activity: 1.55,
  onboarded: true,
  age: 30,
  targetMode: "custom",
  customTargets: {
    energy: 2500,
    protein: 150,
    carbs: 300,
    fat: 77.8,
    fiber: 25,
  },
};
const day: DiaryDay = {
  day: "2026-10-29",
  targets: profile.customTargets!,
  goal: "gain",
  mode: "custom",
  capturedAt: "2026-10-29T10:00:00Z",
};
beforeEach(async () => {
  const d = await database;
  for (const store of ["foods", "cache", "diary", "days", "recoveries"])
    await d.clear(store);
  local.clear();
});
describe("Ukládání a bezpečná migrace", () => {
  it("ukládá recept i celou opakovanou skupinu, zachová historii a exportuje v3", async () => {
    saveProfile(profile);
    const f = recipeFood(
      "Snídaně",
      [{ food: fixtures[4], amount: 300 }],
      300,
      2,
    );
    await putFood({ ...f, favorite: true });
    const old = makeEntry(f, "2026-10-28", "breakfast", 150, "original");
    await saveEntry(old, { ...day, day: "2026-10-28" });
    const repeated = repeatEntries(
      [old, makeEntry(fixtures[4], "2026-10-28", "breakfast", 100, "other")],
      day.day,
      "lunch",
      1,
      ["r1", "r2"],
    );
    await saveEntries(repeated, day);
    await putFood(
      recipeFood(
        "Upravený recept",
        [{ food: fixtures[4], amount: 300 }],
        600,
        2,
        { ...f, favorite: true },
      ),
    );
    const records = await exportRecords();
    expect(records.entries).toHaveLength(3);
    expect(
      records.entries.find((e) => e.id === "original")?.food.recipe?.yield,
    ).toBe(300);
    expect(records.foods[0].recipe?.yield).toBe(600);
    expect(records.foods[0].favorite).toBe(true);
    const parsed = parseBackup(
      JSON.stringify({ version: 3, profile, ...records }),
    );
    expect(parsed.entries).toHaveLength(3);
    expect(parsed.foods[0].recipe?.yield).toBe(600);
    expect(
      (await listDays()).find((d) => d.day === "2026-10-28")?.targets,
    ).toEqual(day.targets);
  });
  it("neuloží první položku, pokud je jiná část skupiny neplatná", async () => {
    const valid = makeEntry(fixtures[4], day.day, "lunch", 150, "valid");
    await expect(
      saveEntries([valid, { ...valid, id: "bad", amount: 0 }], day),
    ).rejects.toThrow();
    expect(await listEntries()).toEqual([]);
    expect(await listDays()).toEqual([]);
  });
  it("v2 → v3 zachová všechny původní kolekce a přidá pouze obnovovací úložiště", async () => {
    const name = "fitcheck-real-v2-migration";
    await deleteDB(name);
    const old = await openDB(name, 2, {
      upgrade(d) {
        d.createObjectStore("foods", { keyPath: "id" });
        d.createObjectStore("cache", { keyPath: "id" });
        const diary = d.createObjectStore("diary", { keyPath: "id" });
        diary.createIndex("day", "day");
        d.createObjectStore("days", { keyPath: "day" });
      },
    });
    const f = { ...fixtures[4], favorite: true },
      e = makeEntry(f, day.day, "breakfast", 150, "old-v2");
    await old.put("foods", f);
    await old.put("cache", f);
    await old.put("diary", e);
    await old.put("days", day);
    old.close();
    const upgraded = await openDB(name, DB_VERSION, {
      upgrade: migrateDatabase,
    });
    expect(upgraded.objectStoreNames.contains("recoveries")).toBe(true);
    expect(await upgraded.get("foods", f.id)).toEqual(f);
    expect(await upgraded.get("cache", f.id)).toEqual(f);
    expect(await upgraded.get("diary", e.id)).toEqual(e);
    expect(await upgraded.get("days", day.day)).toEqual(day);
    upgraded.close();
    await deleteDB(name);
  });
  it("opakovaný zápis jídla nepřepisuje čas nezměněného denního plánu", async () => {
    await saveDay(day);
    await saveDay({ ...day, capturedAt: "2026-10-29T23:00:00Z" });
    expect((await listDays())[0].capturedAt).toBe(day.capturedAt);
    await saveDay({
      ...day,
      model: "NASEM 2023",
      capturedAt: "2026-10-29T23:00:00Z",
    });
    expect((await listDays())[0].model).toBe("NASEM 2023");
  });
  it("jednorázová obnovovací kopie zachová původní profil a historické podklady", async () => {
    saveProfile(profile);
    const f = { ...fixtures[4], favorite: true };
    const e = makeEntry(f, day.day, "breakfast", 150, "recovery");
    await putFood(f);
    await saveEntry(e, day);
    await ensureRecovery();
    saveProfile({ ...profile, age: 15, activityLevel: "active" });
    await saveEntry({ ...e, amount: 300 }, day);
    await ensureRecovery();
    const r = await readRecovery();
    expect(r.backup.profile).toEqual(profile);
    expect(r.backup.foods[0].favorite).toBe(true);
    expect(r.backup.entries).toEqual([e]);
    expect(r.backup.days).toEqual([day]);
    expect(parseBackup(JSON.stringify(r.backup)).entries).toEqual([e]);
  });
  it("konfliktní import bez potvrzení nic nezapíše, potvrzený uchová předchozí stav", async () => {
    const e = makeEntry(fixtures[4], day.day, "breakfast", 150, "conflict");
    await saveEntry(e, day);
    const changed = { ...e, amount: 300 };
    expect(await importConflicts([], [changed], [])).toBe(1);
    await expect(importRecords([fixtures[2]], [changed], [])).rejects.toThrow(
      "Bez potvrzení",
    );
    expect(await listEntries()).toEqual([e]);
    expect(await listFoods()).toEqual([]);
    await importRecords([], [changed], [], true);
    expect((await listEntries())[0].amount).toBe(300);
    expect((await readRecovery("before-import")).backup.entries).toEqual([e]);
  });
  it("smazání historie zachová obnovovací kopii a deník; úplné smazání odstraní i kopie", async () => {
    await putFood({ ...fixtures[4], favorite: true });
    await saveEntry(
      makeEntry(fixtures[4], day.day, "breakfast", 150, "clear"),
      day,
    );
    await clearFoods();
    expect(
      (await readRecovery("before-history-clear")).backup.foods[0].favorite,
    ).toBe(true);
    expect(await listEntries()).toHaveLength(1);
    await clearAll();
    expect(await listEntries()).toHaveLength(0);
    expect(await readRecovery("before-history-clear")).toBeUndefined();
  });
  it("uloží sport a tréninky bez změny jídelníčku a oblíbených", async () => {
    const e = makeEntry(
      fixtures[4],
      day.day,
      "breakfast",
      150,
      "sport-profile",
    );
    await saveEntry(e, day);
    await putFood({ ...fixtures[4], favorite: true });
    saveProfile({ ...profile, sport: "basketball", trainingsPerWeek: 4 });
    expect(loadProfile()).toMatchObject({
      ...profile,
      sport: "basketball",
      trainingsPerWeek: 4,
    });
    expect(await listEntries()).toEqual([e]);
    expect((await listFoods())[0].favorite).toBe(true);
    const backup = parseBackup(
      JSON.stringify({
        version: 2,
        profile: loadProfile(),
        ...(await exportRecords()),
      }),
    );
    expect(backup.profile.trainingsPerWeek).toBe(4);
    expect(backup.profile.sport).toBe("basketball");
  });
  it("starý profil zůstane platný; nové chybějící údaje se nevymýšlejí", () => {
    saveProfile(profile);
    expect(loadProfile().sport).toBeUndefined();
    expect(loadProfile().trainingsPerWeek).toBeUndefined();
    expect(loadProfile().customTargets).toEqual(profile.customTargets);
  });
  it("import odmítne neznámý sport, necelé nebo nepodporované tréninky", () => {
    for (const fields of [
      { sport: "invalid" },
      { trainingsPerWeek: -1 },
      { trainingsPerWeek: 8 },
      { trainingsPerWeek: 1.5 },
      { trainingsPerWeek: "3" },
    ]) {
      expect(() =>
        parseBackup(
          JSON.stringify({
            version: 2,
            foods: [],
            entries: [],
            days: [],
            profile: { ...profile, ...fields },
          }),
        ),
      ).toThrow();
    }
  });
  it("export čte konzistentně celou aktuální databázi", async () => {
    const e = makeEntry(fixtures[4], day.day, "breakfast", 150, "export-id");
    await saveEntry(e, day);
    await putFood(fixtures[4]);
    expect(await exportRecords()).toEqual({
      foods: [fixtures[4]],
      entries: [e],
      days: [day],
    });
  });

  it("v1 → v2 zachová historii, oblíbené, lokální úpravy, cache i profil", async () => {
    const name = "fitcheck-migration-test";
    await deleteDB(name);
    const v1 = await openDB(name, 1, {
      upgrade(d) {
        d.createObjectStore("foods", { keyPath: "id" });
        d.createObjectStore("cache", { keyPath: "id" });
      },
    });
    const food = {
      ...fixtures[4],
      favorite: true,
      localEdits: { fields: ["name"], updatedAt: "2026-10-29T10:00:00Z" },
    };
    await v1.put("foods", food);
    await v1.put("cache", fixtures[0]);
    saveProfile(profile);
    v1.close();
    const v2 = await openDB(name, 2, { upgrade: migrateDatabase });
    expect(await v2.get("foods", food.id)).toEqual(food);
    expect(await v2.get("cache", fixtures[0].id)).toEqual(fixtures[0]);
    expect(await v2.getAll("diary")).toEqual([]);
    expect(loadProfile()).toMatchObject(profile);
    v2.close();
    await deleteDB(name);
  });
  it("opakované potvrzení stejného id nevytvoří druhý zápis", async () => {
    const e = makeEntry(fixtures[4], day.day, "breakfast", 150, "unique");
    await saveEntry(e, day);
    await saveEntry(e, day);
    expect(await listEntries()).toHaveLength(1);
  });
  it("upravuje množství, maže položku a zachovává denní cíle", async () => {
    const e = makeEntry(fixtures[4], day.day, "breakfast", 150, "unique");
    await saveEntry(e, day);
    await saveEntry({ ...e, amount: 300 }, day);
    expect((await listEntries())[0].amount).toBe(300);
    await removeEntry(e.id);
    expect(await listEntries()).toEqual([]);
    expect(await listDays()).toEqual([day]);
  });
  it("změna profilu nepřepíše cíle minulého dne ani snědenou etiketu", async () => {
    const e = makeEntry(fixtures[4], day.day, "breakfast", 150, "unique");
    await saveEntry(e, day);
    await saveEntry(
      { ...e, amount: 200 },
      { ...day, targets: { ...day.targets!, energy: 3000 } },
    );
    expect((await listDays())[0].targets?.energy).toBe(2500);
    await putFood({ ...fixtures[4], nutrients: { energy: 300 } });
    expect((await listEntries())[0].food.nutrients.energy).toBe(70);
    await clearFoods();
    expect(await listEntries()).toHaveLength(1);
  });
  it("nová záloha přenáší deník, cíle a původní data; opakovaný import neduplikuje", async () => {
    const e = makeEntry(fixtures[4], day.day, "breakfast", 150, "unique");
    const b = parseBackup(
      JSON.stringify({
        version: 2,
        foods: fixtures,
        profile,
        entries: [e],
        days: [day],
      }),
    );
    await importRecords(b.foods, b.entries, b.days);
    await importRecords(b.foods, b.entries, b.days);
    saveProfile(b.profile);
    expect(await listEntries()).toEqual([e]);
    expect(await listDays()).toEqual([day]);
    expect(await listFoods()).toHaveLength(fixtures.length);
    expect(loadProfile().customTargets).toEqual(profile.customTargets);
  });
  it("přijímá starou zálohu bez deníku a neztratí dřívější data", async () => {
    const b = parseBackup(
      JSON.stringify({
        version: 1,
        foods: [fixtures[4]],
        profile: { goal: "gain", theme: "light", activity: 1.55 },
      }),
    );
    expect(b.entries).toEqual([]);
    expect(b.days).toEqual([]);
    await importRecords(b.foods, b.entries, b.days);
    expect((await listFoods())[0]).toEqual(fixtures[4]);
    expect(b.profile.targetMode).toBe("auto");
  });
  it("vadná záloha je odmítnuta před zápisem", () => {
    const e = makeEntry(fixtures[4], day.day, "breakfast", 150, "unique");
    expect(() =>
      parseBackup(
        JSON.stringify({
          version: 2,
          foods: [],
          profile,
          entries: [{ ...e, amount: -1 }],
          days: [day],
        }),
      ),
    ).toThrow();
    expect(() =>
      parseBackup(
        JSON.stringify({
          version: 2,
          foods: [],
          profile,
          entries: [e, e],
          days: [day],
        }),
      ),
    ).toThrow();
  });
});
