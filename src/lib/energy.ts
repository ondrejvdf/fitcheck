import type { Profile, ActivityLevel } from "../types";
export const ENERGY_SOURCE =
  "https://www.canada.ca/en/health-canada/services/food-nutrition/healthy-eating/dietary-reference-intakes/tables/equations-estimate-energy-requirement.html";
export const legacyActivity: Record<ActivityLevel, number> = {
  inactive: 1.2,
  low: 1.375,
  active: 1.55,
  very: 1.725,
};
export function activityLevel(p: Profile): ActivityLevel | undefined {
  if (p.activityLevel !== undefined)
    return ["inactive", "low", "active", "very"].includes(p.activityLevel)
      ? p.activityLevel
      : undefined;
  // Compatibility mapping of the old descriptions, not a multiplication by their PAL numbers.
  return (
    {
      1.2: "inactive",
      1.375: "low",
      1.55: "active",
      1.725: "very",
      1.9: "very",
    } as Record<number, ActivityLevel>
  )[p.activity];
}
type Coefficients = Record<
  "male" | "female",
  Record<ActivityLevel, readonly number[]>
>;
const youth: Coefficients = {
  male: {
    inactive: [-447.51, 3.68, 13.01, 13.15],
    low: [19.12, 3.68, 8.62, 20.28],
    active: [-388.19, 3.68, 12.66, 20.46],
    very: [-671.75, 3.68, 15.38, 23.25],
  },
  female: {
    inactive: [55.59, -22.25, 8.43, 17.07],
    low: [-297.54, -22.25, 12.77, 14.73],
    active: [-189.55, -22.25, 11.74, 18.34],
    very: [-709.59, -22.25, 18.22, 14.25],
  },
};
const adult: Coefficients = {
  male: {
    inactive: [753.07, -10.83, 6.5, 14.1],
    low: [581.47, -10.83, 8.3, 14.94],
    active: [1004.82, -10.83, 6.52, 15.91],
    very: [-517.88, -10.83, 15.61, 19.11],
  },
  female: {
    inactive: [584.9, -7.01, 5.72, 11.71],
    low: [575.77, -7.01, 6.6, 12.14],
    active: [710.25, -7.01, 6.54, 12.34],
    very: [511.83, -7.01, 9.07, 12.56],
  },
};
export function estimateEnergy(p: Profile) {
  const { age, height, weight, sex } = p;
  const activity = activityLevel(p);
  if (
    age === undefined ||
    height === undefined ||
    weight === undefined ||
    ![age, height, weight].every(Number.isFinite) ||
    age < 1 ||
    age > 100 ||
    height < 50 ||
    height > 250 ||
    weight < 3 ||
    weight > 350 ||
    !sex ||
    !["male", "female"].includes(sex) ||
    !activity
  )
    return null;
  let value: number,
    growth = 0,
    model: string;
  if (age < 3) {
    growth = sex === "male" ? 20 : 15;
    value =
      sex === "male"
        ? -716.45 - age + 17.82 * height + 15.06 * weight + growth
        : -69.15 + 80 * age + 2.65 * height + 54.15 * weight + growth;
    model = "NASEM 2023 · 1–2,99 roku";
  } else {
    if (age < 19)
      growth =
        age >= 14
          ? 20
          : sex === "male"
            ? age < 4
              ? 20
              : age < 9
                ? 15
                : 25
            : age < 9
              ? 15
              : 30;
    const [a, b, c, d] = (age < 19 ? youth : adult)[sex][activity];
    value = a + b * age + c * height + d * weight + growth;
    model =
      age < 19
        ? age >= 14
          ? "NASEM 2023 · dospívající 14–18,99"
          : "NASEM 2023 · děti 3–13,99"
        : "NASEM 2023 · dospělí 19+";
  }
  if (!Number.isFinite(value) || value <= 0 || value > 10000) return null;
  return { value, growth, model, activity };
}
export function fiberTarget(p: Profile) {
  const age = p.age!;
  if (age < 4) return 19;
  if (age < 9) return 25;
  if (age < 14) return p.sex === "male" ? 31 : 26;
  if (age < 19) return p.sex === "male" ? 38 : 26;
  return p.sex === "male" ? (age < 51 ? 38 : 30) : age < 51 ? 25 : 21;
}
