export function selectIngredients(raw: Record<string, unknown>) {
  const ingredientsOriginal =
    typeof raw.ingredients_text === "string" ? raw.ingredients_text : undefined;
  const ingredientsOriginalLanguage =
    typeof raw.lang === "string" ? raw.lang : undefined;
  const variants: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw))
    if (
      /^ingredients_text_[a-z]{2,3}$/.test(key) &&
      typeof value === "string" &&
      value.trim()
    )
      variants[key.slice("ingredients_text_".length)] = value.trim();
  for (const language of ["cs", "sk", "en", ...Object.keys(variants).sort()])
    if (variants[language])
      return {
        ingredients: variants[language],
        ingredientsLanguage: language,
        ingredientsVariants: variants,
        ingredientsOriginal,
        ingredientsOriginalLanguage,
      };
  const text =
    typeof raw.ingredients_text === "string" ? raw.ingredients_text.trim() : "";
  const language =
    typeof raw.lang === "string" && /^[a-z]{2,3}$/.test(raw.lang)
      ? raw.lang
      : "und";
  return {
    ingredients: text || undefined,
    ingredientsLanguage: text ? language : undefined,
    ingredientsVariants: variants,
    ingredientsOriginal,
    ingredientsOriginalLanguage,
  };
}
export function languageLabel(code?: string) {
  return (
    (
      {
        cs: "čeština",
        sk: "slovenština",
        en: "angličtina",
        es: "španělština",
        fr: "francouzština",
        de: "němčina",
        nl: "nizozemština",
        pl: "polština",
        und: "jazyk neuveden",
      } as Record<string, string>
    )[code || "und"] || code
  );
}
