import { describe, it, expect } from "vitest";
import { mapProduct } from "./off";
import { vi } from "vitest";
vi.mock("./storage", () => ({ cacheFood: vi.fn(), getCached: vi.fn() }));
describe("Open Food Facts mapování", () => {
  it("podporuje doporučené API v3.6 a nezaměňuje odhady za etiketu", () => {
    const f = mapProduct({
      code: "12345678",
      nutrition: {
        aggregated_set: {
          per: "100ml",
          nutrients: {
            "energy-kcal": { value: 50, source: "manufacturer" },
            proteins: { value: 8, source: "packaging" },
            fiber: { value: 0, source: "estimate" },
            salt: { value: 0, source: "packaging" },
          },
        },
        input_sets: [
          {
            per: "serving",
            per_unit: "ml",
            per_quantity: 250,
            preparation: "as_sold",
          },
        ],
      },
    });
    expect(f.nutrients.energy).toBe(50);
    expect(f.nutrients.fiber).toBeUndefined();
    expect(f.nutrients.salt).toBe(0);
    expect(f.unit).toBe("ml");
    expect(f.portion).toBe(250);
  });
  it("zachovává nuly, neznámé hodnoty a převádí kJ", () => {
    const f = mapProduct({
      code: "12345678",
      product_name: "Test",
      nutriments: { "energy-kj_100g": 418.4, salt_100g: 0 },
    });
    expect(f.nutrients.energy).toBeCloseTo(100);
    expect(f.nutrients.salt).toBe(0);
    expect(f.nutrients.protein).toBeUndefined();
    expect(f.nutrients.addedSugar).toBeUndefined();
  });
  it("použije český název a kategorii", () => {
    const f = mapProduct({
      code: "12345678",
      product_name: "Yogurt",
      product_name_cs: "Jogurt",
      categories_tags: ["en:yogurts"],
    });
    expect(f.name).toBe("Jogurt");
    expect(f.category).toBe("dairy");
  });
  it("odmítne rozpornou etiketu", () =>
    expect(() =>
      mapProduct({
        code: "12345678",
        nutriments: { carbohydrates_100g: 2, sugars_100g: 20 },
      }),
    ).toThrow());
});
