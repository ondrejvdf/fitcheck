import { openDB, type IDBPDatabase } from "idb";
export const DB_VERSION = 3;
// Upgrade in the same transaction; v1 food and cache stores are untouched.
export function migrateDatabase(d: IDBPDatabase, oldVersion: number) {
  if (oldVersion < 1) {
    d.createObjectStore("foods", { keyPath: "id" });
    d.createObjectStore("cache", { keyPath: "id" });
  }
  if (oldVersion < 2) {
    const entries = d.createObjectStore("diary", { keyPath: "id" });
    entries.createIndex("day", "day");
    d.createObjectStore("days", { keyPath: "day" });
  }
  if (oldVersion < 3) d.createObjectStore("recoveries", { keyPath: "id" });
}
export let upgradeBlocked = false;
export const database = openDB("fitcheck", DB_VERSION, {
  upgrade: migrateDatabase,
  blocked() {
    upgradeBlocked = true;
    if (typeof window !== "undefined")
      window.dispatchEvent(new Event("fitcheck-db-blocked"));
  },
  blocking() {
    database.then((d) => d.close());
  },
});
