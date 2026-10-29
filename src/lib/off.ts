import type { Food, Category } from "../types";
import { cacheFood, getCached, getSaved } from "./storage";
import { validate } from "./nutrition";
import { classify } from "./categories";
import { selectIngredients } from "./ingredients";
import { mergeLocalEdits } from "./corrections";
import { readNutrition, supplement, nutritionUnit } from "./nutrient-data";
const fields =
  "code,product_name,product_name_cs,product_name_sk,product_name_en,product_name_de,product_name_fr,product_name_nl,generic_name_cs,generic_name_sk,generic_name_en,generic_name,lang,brands,image_front_url,quantity,ingredients_text_cs,ingredients_text_sk,ingredients_text_en,ingredients_text,languages_codes,categories_tags,nutrition,nutriments,serving_quantity,product_quantity_unit";
let lastSearch = 0,
  lastProduct = 0;
async function request(path: string, search = false) {
  const now = Date.now(),
    last = search ? lastSearch : lastProduct;
  const gap = search ? 6500 : 4200;
  if (now - last < gap)
    throw Error(
      "Chvilku počkej před dalším dotazem. Respektujeme limity databáze.",
    );
  if (search) lastSearch = now;
  else lastProduct = now;
  const url = new URL(path, "https://world.openfoodfacts.org");
  url.searchParams.set("fields", fields);
  url.searchParams.set("app_name", "FitCheck");
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (r.status === 429)
      throw Error("Databáze je vytížená. Zkus to za minutu.");
    if (!r.ok) throw Error("Databáze nyní neodpovídá.");
    return await r.json();
  } catch (e) {
    if (e instanceof Error && e.message.includes("Databáze")) throw e;
    throw Error(
      "Připojení k Open Food Facts se nezdařilo. Použij uložené potraviny nebo ruční zadání.",
    );
  }
}
export function mapProduct(raw: Record<string, any>): Food {
  const firstText = (...values: unknown[]) =>
    values
      .find((v): v is string => typeof v === "string" && !!v.trim())
      ?.trim();
  const categoryTags = Array.isArray(raw.categories_tags)
    ? raw.categories_tags.filter((v: unknown) => typeof v === "string")
    : [];
  const classification = classify(categoryTags);
  const category: Category = classification.category;
  const data = readNutrition(raw);
  const nutrients = data.nutrients;
  if (validate(nutrients).length)
    throw Error(
      "Databáze obsahuje rozporné nutriční údaje. Opiš aktuální etiketu ručně.",
    );
  const unit = nutritionUnit(raw) ?? (category === "drink" ? "ml" : "g");
  const serving = raw.nutrition?.input_sets?.find(
    (set: any) =>
      set.per === "serving" &&
      set.per_unit === unit &&
      set.preparation === "as_sold",
  )?.per_quantity;
  return supplement({
    id: String(raw.code),
    barcode: String(raw.code),
    name:
      firstText(
        raw.product_name_cs,
        raw.product_name_sk,
        raw.product_name_en,
        raw.product_name,
        raw.product_name_de,
        raw.product_name_fr,
        raw.product_name_nl,
        raw.generic_name_cs,
        raw.generic_name_sk,
        raw.generic_name_en,
        raw.generic_name,
      ) || "Nepojmenovaný výrobek",
    brand: Array.isArray(raw.brands) ? raw.brands.join(", ") : raw.brands,
    image:
      typeof raw.image_front_url === "string" &&
      raw.image_front_url.startsWith("https://")
        ? raw.image_front_url
        : undefined,
    quantity: raw.quantity,
    ...selectIngredients(raw),
    categoryTags,
    categoryCertain: classification.certain,
    category,
    unit,
    portion:
      Number(serving || raw.serving_quantity) > 0
        ? Math.min(Number(serving || raw.serving_quantity), 5000)
        : 100,
    ...data,
    source: "off",
    dataVersion: 3,
    date: new Date().toISOString(),
  });
}
export async function lookup(code: string) {
  if (!/^(\d{8}|\d{12,14})$/.test(code))
    throw Error("Zadej čárový kód s 8 nebo 12–14 číslicemi.");
  const cached = await getCached(code);
  if (
    cached &&
    (!navigator.onLine ||
      (cached.dataVersion === 3 &&
        Date.now() - (cached.cachedAt || 0) < 7 * 86400000))
  )
    return mergeLocalEdits(
      { ...cached, date: new Date().toISOString() },
      await getSaved(code),
    );
  const data = await request("/api/v3.6/product/" + code);
  if (data.result?.id !== "product_found")
    throw Error("Výrobek jsme nenašli. Můžeš jej přidat ručně.");
  if (String(data.product?.code) !== code)
    throw Error(
      "Databáze vrátila jiný EAN. Údaje těchto výrobků nebudeme spojovat.",
    );
  const food = mapProduct(data.product);
  await cacheFood(food);
  return mergeLocalEdits(food, await getSaved(code));
}
export async function searchFoods(term: string) {
  if (term.trim().length < 3) throw Error("Napiš alespoň 3 znaky.");
  const data = await request(
    "/cgi/search.pl?search_terms=" +
      encodeURIComponent(term.trim()) +
      "&search_simple=1&action=process&json=1&page_size=12",
    true,
  );
  const products: Food[] = [];
  for (const r of data.products || []) {
    try {
      const f = mapProduct(r);
      products.push(f);
      await cacheFood(f);
    } catch {
      /* Ignore inconsistent database records. */
    }
  }
  return products;
}
