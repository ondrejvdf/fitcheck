import type { Profile } from "../types";
export const youthSource =
  "https://www.nutrition.org.uk/nutrition-for/teenagers/";
export function profileGuidance(p: Profile): string[] {
  const advice: string[] = [];
  const minor = p.age !== undefined && p.age < 19;
  if (minor)
    advice.push(
      "Při růstu je důležité pravidelné a pestré jídlo, dostatek tekutin a odpočinek. Deník porovnává zapsaný příjem s věkově přizpůsobeným orientačním plánem; nejde o povinnost přesně dorovnat nebo omezit jídlo. Individuální výživový plán řeš s rodičem a kvalifikovaným odborníkem.",
    );
  if (p.sport && p.sport !== "none") {
    if (["running", "cycling", "swimming"].includes(p.sport))
      advice.push(
        "U vytrvalostního sportu mysli na běžné zdroje sacharidů v pestrém jídelníčku a na pití kolem tréninku. Samotný název sportu neurčuje energetický výdej.",
      );
    else if (p.sport === "strength")
      advice.push(
        "U posilování rozlož pestré jídlo a běžné zdroje bílkovin během dne; samotný trénink nenahrazuje odpočinek ani ostatní živiny.",
      );
    else if (p.sport === "combat")
      advice.push(
        "U bojových sportů se vyhýbej rychlému shazování hmotnosti a odvodňování. Výživu pro soutěžní hmotnost řeš individuálně s kvalifikovaným odborníkem.",
      );
    else
      advice.push(
        "Kolem sportu mysli na pravidelné jídlo, tekutiny a regeneraci. Potřeby závisí i na délce a intenzitě tréninku.",
      );
  }
  if (p.trainingsPerWeek !== undefined) {
    if (p.trainingsPerWeek === 0)
      advice.push(
        "Aktuálně uvádíš 0 tréninků týdně. Pravidelný jídelníček má smysl i ve dnech bez tréninku.",
      );
    else if (p.trainingsPerWeek >= 4)
      advice.push(
        `Tréninky týdně: ${p.trainingsPerWeek}. Mysli na prostor pro odpočinek a pravidelné jídlo; samotný počet tréninků neříká jejich délku ani intenzitu.`,
      );
    else
      advice.push(
        `Tréninky týdně: ${p.trainingsPerWeek}. Mysli na jídlo a pití i mezi tréninkovými dny.`,
      );
    if (p.sport === "none" && p.trainingsPerWeek > 0)
      advice.push(
        "Máš uvedeno Nesportuji i kladný počet tréninků. Zkontroluj, které nastavení tě vystihuje; hodnoty sami nepřepisujeme.",
      );
  }
  if (p.sport || p.trainingsPerWeek !== undefined)
    advice.push(
      "Sport a počet tréninků upřesňují obecné rady, nepřidávají další kalorie. Dosavadní úroveň fyzické aktivity už zahrnuje tvůj obvyklý pohyb i sport.",
    );
  return advice;
}
