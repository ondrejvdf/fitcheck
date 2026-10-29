import data from "../data/catalog.json";
import type { Food } from "../types";
export const catalog = data as Food[];
export const preparationLabels = {
  raw: "Syrové / suché – před úpravou",
  cooked: "Vařené / tepelně upravené",
  ready: "K přímé spotřebě",
};
export const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("cs");
export function searchCatalog(query: string, state = "all") {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  return catalog.filter(
    (f) =>
      words.every((w) => normalize(f.name).includes(w)) &&
      (state === "all" || f.catalog?.state === state),
  );
}
export function libraryFoods(saved: Food[]) {
  return [...new Map([...catalog, ...saved].map((f) => [f.id, f])).values()];
}
