import type { Food, Profile, DiaryEntry, DiaryDay } from "../types";
import { categories, goals, sports } from "../types";
import { validate } from "./nutrition";
import { labels } from "../types";
import { validDay } from "./diary";
import { targetValidation } from "./targets";
import { recipeFood } from "./recipes";
export function assertFood(f: any): asserts f is Food {
  if (
    !f ||
    typeof f.id !== "string" ||
    typeof f.name !== "string" ||
    !f.name.trim() ||
    !Object.hasOwn(categories, f.category) ||
    !["g", "ml"].includes(f.unit) ||
    !["manual", "off", "demo", "catalog", "recipe"].includes(f.source) ||
    !Number.isFinite(f.portion) ||
    f.portion <= 0 ||
    f.portion > 5000 ||
    typeof f.date !== "string" ||
    !Number.isFinite(Date.parse(f.date)) ||
    !f.nutrients ||
    typeof f.nutrients !== "object" ||
    validate(f.nutrients).length
  )
    throw Error("Záloha obsahuje neplatnou potravinu.");
  if (
    f.catalog !== undefined &&
    (!f.catalog ||
      !Number.isInteger(f.catalog.fdcId) ||
      f.catalog.fdcId <= 0 ||
      typeof f.catalog.description !== "string" ||
      f.catalog.description.length > 500 ||
      !["raw", "cooked", "ready"].includes(f.catalog.state))
  )
    throw Error("Neplatný původ suroviny.");
  if (f.source === "catalog" && !f.catalog)
    throw Error("Chybí původ katalogové suroviny.");
  if (f.source === "recipe" && !f.recipe)
    throw Error("Chybí suroviny receptu.");
  if (f.recipe !== undefined) {
    const r = f.recipe;
    if (
      !r ||
      !Array.isArray(r.ingredients) ||
      !r.ingredients.length ||
      r.ingredients.length > 50
    )
      throw Error("Neplatné suroviny receptu.");
    for (const i of r.ingredients) {
      if (!i?.food || i.food.recipe) throw Error("Recepty nelze vnořovat.");
      assertFood(i.food);
    }
    const computed = recipeFood(f.name, r.ingredients, r.yield, r.servings, f);
    for (const k of Object.keys(labels) as (keyof Food["nutrients"])[]) {
      const a = f.nutrients[k],
        b = computed.nutrients[k];
      if (
        (a === undefined) !== (b === undefined) ||
        (a !== undefined && b !== undefined && Math.abs(a - b) > 1e-6)
      )
        throw Error("Nutriční hodnoty receptu neodpovídají jeho surovinám.");
    }
  }
  for (const k of [
    "brand",
    "barcode",
    "ingredients",
    "ingredientsOriginal",
    "ingredientsOriginalLanguage",
    "quantity",
    "image",
  ])
    if (f[k] !== undefined && typeof f[k] !== "string")
      throw Error("Neplatná metadata potraviny.");
  if (f.image && !f.image.startsWith("https://")) delete f.image;
  if (
    f.originalNutrients !== undefined &&
    (!f.originalNutrients ||
      typeof f.originalNutrients !== "object" ||
      Object.keys(f.originalNutrients).some((k) => !Object.hasOwn(labels, k)) ||
      validate(f.originalNutrients).length)
  )
    throw Error("Neplatné původní nutriční hodnoty.");
  if (
    f.sourceNotes !== undefined &&
    (!Array.isArray(f.sourceNotes) ||
      f.sourceNotes.length > 20 ||
      f.sourceNotes.some(
        (s: unknown) => typeof s !== "string" || s.length > 2000,
      ))
  )
    throw Error("Neplatné poznámky ke zdrojům.");
  if (f.nutrientSources !== undefined) {
    if (
      !f.nutrientSources ||
      typeof f.nutrientSources !== "object" ||
      Array.isArray(f.nutrientSources)
    )
      throw Error("Neplatné zdroje živin.");
    for (const [key, items] of Object.entries(f.nutrientSources)) {
      if (
        !Object.hasOwn(labels, key) ||
        !Array.isArray(items) ||
        items.length > 40 ||
        items.some(
          (e) =>
            !e ||
            !Number.isFinite(e.value) ||
            e.value < 0 ||
            e.value > (key === "energy" ? 1000 : 100) ||
            !["off", "manufacturer", "manual"].includes(e.source) ||
            typeof e.detail !== "string" ||
            e.detail.length > 1000 ||
            typeof e.checkedAt !== "string" ||
            !Number.isFinite(Date.parse(e.checkedAt)) ||
            (e.url !== undefined &&
              (typeof e.url !== "string" || !e.url.startsWith("https://"))),
        )
      )
        throw Error("Neplatný zdroj nutriční hodnoty.");
    }
  }
  if (
    f.categoryTags !== undefined &&
    (!Array.isArray(f.categoryTags) ||
      f.categoryTags.some((t: unknown) => typeof t !== "string"))
  )
    throw Error("Neplatné kategorie v záloze.");
  if (f.categoryCertain !== undefined && typeof f.categoryCertain !== "boolean")
    throw Error("Neplatné určení kategorie.");
  if (
    f.ingredientsLanguage !== undefined &&
    typeof f.ingredientsLanguage !== "string"
  )
    throw Error("Neplatný jazyk složení.");
  if (
    f.ingredientsVariants !== undefined &&
    (!f.ingredientsVariants ||
      typeof f.ingredientsVariants !== "object" ||
      Object.values(f.ingredientsVariants).some((v) => typeof v !== "string"))
  )
    throw Error("Neplatné jazykové varianty.");
  if (
    f.localEdits !== undefined &&
    (!f.localEdits ||
      !Array.isArray(f.localEdits.fields) ||
      f.localEdits.fields.some(
        (k: unknown) =>
          typeof k !== "string" ||
          !(
            ["name", "category", "unit", "portion"].includes(k) ||
            (k.startsWith("nutrients.") && Object.hasOwn(labels, k.slice(10)))
          ),
      ) ||
      typeof f.localEdits.updatedAt !== "string" ||
      !Number.isFinite(Date.parse(f.localEdits.updatedAt)))
  )
    throw Error("Neplatné lokální úpravy.");
  if (
    f.originalOff !== undefined &&
    (!f.originalOff ||
      typeof f.originalOff.name !== "string" ||
      !Object.hasOwn(categories, f.originalOff.category) ||
      !["g", "ml"].includes(f.originalOff.unit) ||
      !Number.isFinite(f.originalOff.portion) ||
      f.originalOff.portion <= 0 ||
      f.originalOff.portion > 5000 ||
      !f.originalOff.nutrients ||
      validate(f.originalOff.nutrients).length)
  )
    throw Error("Neplatný původní záznam.");
}
export function parseBackup(text: string): {
  foods: Food[];
  profile: Profile;
  entries: DiaryEntry[];
  days: DiaryDay[];
} {
  const b = JSON.parse(text);
  if (
    ![1, 2, 3].includes(b.version) ||
    !Array.isArray(b.foods) ||
    b.foods.length > 10000 ||
    !b.profile ||
    !Object.hasOwn(goals, b.profile.goal) ||
    !["light", "dark"].includes(b.profile.theme) ||
    ![1.2, 1.375, 1.55, 1.725, 1.9].includes(b.profile.activity)
  )
    throw Error("Neplatný formát zálohy.");
  for (const f of b.foods) assertFood(f);
  if (
    b.profile.activityLevel !== undefined &&
    !["inactive", "low", "active", "very"].includes(b.profile.activityLevel)
  )
    throw Error("Neplatná kategorie aktivity NASEM.");
  if (
    b.profile.sport !== undefined &&
    (typeof b.profile.sport !== "string" ||
      !Object.hasOwn(sports, b.profile.sport))
  )
    throw Error("Neplatný hlavní sport v záloze.");
  if (
    b.profile.trainingsPerWeek !== undefined &&
    (!Number.isInteger(b.profile.trainingsPerWeek) ||
      b.profile.trainingsPerWeek < 0 ||
      b.profile.trainingsPerWeek > 7)
  )
    throw Error("Neplatný počet tréninků v záloze.");

  for (const [key, min, max] of [
    ["age", 1, 100],
    ["height", 50, 250],
    ["weight", 3, 350],
  ] as const) {
    const v = b.profile[key];
    if (v !== undefined && (!Number.isFinite(v) || v < min || v > max))
      throw Error("Neplatný profil v záloze.");
  }
  if (
    b.profile.sex !== undefined &&
    !["male", "female"].includes(b.profile.sex)
  )
    throw Error("Neplatný profil.");
  if (
    b.profile.targetMode !== undefined &&
    !["auto", "custom"].includes(b.profile.targetMode)
  )
    throw Error("Neplatný režim cílů.");
  if (
    b.profile.customTargets &&
    targetValidation(b.profile.customTargets, b.profile.age).errors.length
  )
    throw Error("Neplatné vlastní cíle.");
  const entries = b.version >= 2 ? b.entries : [];
  const days = b.version >= 2 ? b.days : [];
  if (
    !Array.isArray(entries) ||
    entries.length > 100000 ||
    !Array.isArray(days) ||
    days.length > 40000
  )
    throw Error("Neplatný deník v záloze.");
  for (const e of entries) {
    if (
      !e ||
      typeof e.id !== "string" ||
      !e.id ||
      !validDay(e.day) ||
      !["breakfast", "lunch", "dinner", "snack"].includes(e.meal) ||
      !Number.isFinite(e.amount) ||
      e.amount <= 0 ||
      e.amount > 5000 ||
      !Number.isFinite(Date.parse(e.createdAt)) ||
      !Number.isFinite(Date.parse(e.updatedAt))
    )
      throw Error("Neplatná položka jídelníčku.");
    assertFood(e.food);
  }
  for (const d of days) {
    if (
      d.model !== undefined &&
      (typeof d.model !== "string" || d.model.length > 200)
    )
      throw Error("Neplatný model denního plánu.");
    if (
      !d ||
      !validDay(d.day) ||
      !Object.hasOwn(goals, d.goal) ||
      !["auto", "custom"].includes(d.mode) ||
      !Number.isFinite(Date.parse(d.capturedAt)) ||
      (d.targets !== null &&
        (!d.targets || targetValidation(d.targets).errors.length))
    )
      throw Error("Neplatný souhrn dne.");
  }
  if (
    new Set(entries.map((e) => e.id)).size !== entries.length ||
    new Set(days.map((d) => d.day)).size !== days.length
  )
    throw Error("Záloha obsahuje duplicitní záznamy.");
  return {
    foods: b.foods,
    profile: {
      ...b.profile,
      targetMode: b.profile.targetMode ?? "auto",
      onboarded: true,
    },
    entries,
    days,
  };
}
