import type { Category } from "../types";

// Explicit taxonomy identifiers, never product-name substrings. More specific
// mixed products (protein bars, dairy drinks, confectionery with nuts) win first.
const groups: [Category, string[]][] = [
  [
    "oil",
    ["olive-oils", "vegetable-oils", "oils", "fats", "butters", "margarines"],
  ],
  [
    "protein",
    [
      "protein-bars",
      "protein-powders",
      "protein-supplements",
      "protein-shakes",
      "whey-proteins",
      "sports-nutrition",
      "meal-replacements",
    ],
  ],
  [
    "dairy",
    [
      "dairies",
      "yogurts",
      "yoghurts",
      "skyrs",
      "fermented-milk-products",
      "milks",
      "cheeses",
      "fromages-blancs",
      "quarks",
      "dairy-desserts",
    ],
  ],
  [
    "sweets",
    [
      "sweets",
      "confectioneries",
      "chocolates",
      "chocolate-bars",
      "biscuits",
      "cakes",
      "sweet-spreads",
      "confectionary-based-spreads",
      "ice-creams",
    ],
  ],
  [
    "bread",
    [
      "breads",
      "wholemeal-breads",
      "whole-wheat-breads",
      "wholegrain-breads",
      "bread-rolls",
      "crispbreads",
      "cereal-flakes",
      "breakfast-cereals",
    ],
  ],
  [
    "meat",
    [
      "meats",
      "fish",
      "fishes",
      "seafood",
      "poultry",
      "processed-meats",
      "sausages",
    ],
  ],
  [
    "drink",
    [
      "beverages",
      "waters",
      "mineral-waters",
      "spring-waters",
      "sodas",
      "sweetened-beverages",
      "fruit-juices",
      "energy-drinks",
      "unsweetened-beverages",
    ],
  ],
  [
    "nuts",
    [
      "nuts",
      "seeds",
      "nuts-and-their-products",
      "oilseed-products",
      "almonds",
      "walnuts",
      "peanuts",
      "hazelnuts",
      "mixed-nuts",
      "salted-nuts",
    ],
  ],
  [
    "fruit",
    [
      "fruits",
      "vegetables",
      "fruits-and-vegetables",
      "fresh-fruits",
      "fresh-vegetables",
      "dried-fruits",
    ],
  ],
];
export function classify(tags: string[]) {
  const normalized = new Set(tags.map((t) => t.toLowerCase()));
  for (const [category, ids] of groups) {
    const evidence = ids.filter((id) => normalized.has("en:" + id));
    if (evidence.length) return { category, certain: true, evidence };
  }
  return {
    category: "general" as Category,
    certain: false,
    evidence: [] as string[],
  };
}
