export type Goal = "lose" | "gain" | "health";
export type Category =
  | "general"
  | "dairy"
  | "nuts"
  | "oil"
  | "drink"
  | "fruit"
  | "bread"
  | "meat"
  | "sweets"
  | "protein";
export type Nutrients = {
  energy?: number;
  protein?: number;
  carbs?: number;
  sugars?: number;
  fat?: number;
  saturated?: number;
  fiber?: number;
  salt?: number;
  addedSugar?: number;
  unsaturated?: number;
};
export interface Food {
  catalog?: { fdcId: number; description: string; state: "raw" | "cooked" | "ready" };
  recipe?: { ingredients: { food: Food; amount: number }[]; yield: number; servings: number };
  nutrientSources?: Partial<Record<keyof Nutrients, NutrientEvidence[]>>;
  originalNutrients?: Nutrients;
  sourceNotes?: string[];
  id: string;
  name: string;
  brand?: string;
  barcode?: string;
  image?: string;
  quantity?: string;
  ingredients?: string;
  ingredientsLanguage?: string;
  ingredientsVariants?: Record<string, string>;
  ingredientsOriginal?: string;
  ingredientsOriginalLanguage?: string;
  categoryTags?: string[];
  categoryCertain?: boolean;
  localEdits?: { fields: string[]; updatedAt: string };
  originalOff?: {
    name: string;
    category: Category;
    unit: "g" | "ml";
    portion: number;
    nutrients: Nutrients;
  };
  category: Category;
  unit: "g" | "ml";
  portion: number;
  nutrients: Nutrients;
  source: "manual" | "off" | "demo" | "catalog" | "recipe";
  date: string;
  favorite?: boolean;
  cachedAt?: number;
  dataVersion?: number;
}
export interface NutrientEvidence {
  value: number;
  source: "off" | "manufacturer" | "manual";
  detail: string;
  url?: string;
  checkedAt: string;
}
export interface Profile {
  activityLevel?: ActivityLevel;
  sport?: Sport;
  trainingsPerWeek?: number;
  goal: Goal;
  age?: number;
  height?: number;
  weight?: number;
  sex?: "male" | "female";
  activity: number;
  theme: "light" | "dark";
  onboarded: boolean;
  targetMode?: "auto" | "custom";
  customTargets?: DailyTargets;
}
export type ActivityLevel = "inactive" | "low" | "active" | "very";
export const activityLabels: Record<ActivityLevel, string> = {
  inactive: "Nízká – převážně běžné denní činnosti",
  low: "Lehce aktivní – pravidelný lehký pohyb",
  active: "Aktivní – více pohybu a pravidelný sport",
  very: "Velmi aktivní – vysoký celkový objem pohybu",
};
export const sports = {
  strength: "Posilování",
  running: "Běh",
  cycling: "Cyklistika",
  swimming: "Plavání",
  football: "Fotbal",
  basketball: "Basketbal",
  combat: "Bojové sporty",
  other: "Jiný sport",
  none: "Nesportuji",
} as const;
export type Sport = keyof typeof sports;
export interface DailyTargets {
  energy: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
}
export type TrackedKey = keyof DailyTargets;
export type Meal = "breakfast" | "lunch" | "dinner" | "snack";
export const meals: Record<Meal, string> = {
  breakfast: "Snídaně",
  lunch: "Oběd",
  dinner: "Večeře",
  snack: "Svačiny",
};
export interface DiaryEntry {
  id: string;
  day: string;
  meal: Meal;
  amount: number;
  food: Food;
  createdAt: string;
  updatedAt: string;
}
export interface DiaryDay {
  model?: string;
  day: string;
  targets: DailyTargets | null;
  goal: Goal;
  mode: "auto" | "custom";
  capturedAt: string;
}
export const goals: Record<Goal, string> = {
  lose: "Hubnutí a redukce tuku",
  gain: "Nabírání svalů",
  health: "Zdravý životní styl",
};
export const categories: Record<Category, string> = {
  general: "Ostatní potraviny",
  dairy: "Mléčné výrobky",
  nuts: "Ořechy a semínka",
  oil: "Oleje a tuky",
  drink: "Nápoje",
  fruit: "Ovoce a zelenina",
  bread: "Pečivo a obiloviny",
  meat: "Maso a ryby",
  sweets: "Sladkosti",
  protein: "Proteinové doplňky a tyčinky",
};
export const labels: Record<keyof Nutrients, string> = {
  energy: "Energie",
  protein: "Bílkoviny",
  carbs: "Sacharidy",
  sugars: "Z toho cukry",
  fat: "Tuky",
  saturated: "Nasycené tuky",
  fiber: "Vláknina",
  salt: "Sůl",
  addedSugar: "Přidané cukry",
  unsaturated: "Nenasycené tuky",
};
