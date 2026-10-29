# Nutriční zdroje a personalizace – 29. 10. 2026

## Použité zdroje a jejich hranice

Open Food Facts zůstává hlavní živý zdroj přes veřejné API. Mapper nyní hledá jednotlivé živiny v `nutrition.aggregated_set`, poté v nejvýše osmi `input_sets` a v normalizovaných legacy `nutriments.*_100g`. Přítomnost agregátu už neblokuje fallback každé chybějící živiny. Dokumentace: [OFF Get Product Data](https://openfoodfacts.github.io/documentation/docs/Product-Opener/v3/products/get-api-v3-product-code/), [normalizované jednotky a převod sodíku](https://github.com/openfoodfacts/data-imports/blob/master/docs/data-formats.md).

Z oficiální stránky [Emco – Proteinová tyčinka čokoláda 45 g](https://www.emco.cz/proteinova-tycinka-cokolada-45-g/) je v aplikaci malá ručně ověřená faktická reference pro EAN **8595229932871**. Obsahuje identifikační otisk etikety a sůl **0,31 g/100 g**, ověřeno 29. 10. 2026. Není to živé API výrobce ani automatický scraper a nejde o univerzální databázi výrobců. Nepřebíráme fotografie ani reklamní texty. Po 180 dnech se reference při novém mapování automaticky nepoužije bez dalšího ověření; dříve uložené hodnoty se zpětně nemažou a mají viditelné datum zdroje.

Doplnění vyžaduje přesný EAN, stejnou základní jednotku, alespoň čtyři známé údaje odpovídající referenci a žádný známý rozpor. Pokud kterýkoli údaj nesouhlasí, výrobek mohl změnit recepturu: reference se nabídne jen jako nepoužitý podklad, bez přepsání aktuálních čísel. Neexistuje spojování výrobků podle podobného názvu ani automatická náhrada chybějícího EAN. Jiné balení či jiný EAN se nedoplňuje. U neověřené varianty zůstává ruční etiketa a potvrzení uživatelem.

[USDA FoodData Central](https://fdc.nal.usda.gov/api-guide/) bylo prověřeno, ale nepřipojeno: vyžaduje API klíč a dokumentace výslovně požaduje jeho nezveřejnění. Sdílený DEMO_KEY s nízkými limity není řešením produkčního provozu. Obecné nebalené potraviny navíc nejsou spolehlivou náhradou konkrétní české tyčinky. U webů výrobců nemáme ověřené obecné veřejné API, povolení k hromadnému přebírání ani garantované CORS. Proto je pro automatické živé dotazy nepoužíváme a neobcházíme jejich omezení proxy službou. Klient neobsahuje tajné klíče ani placenou AI.

## Jednotky, rozpory a původ

V3 vstupy v mg/µg se normalizují na gramy. Energie v kJ se dělí 4,184. Sodík v gramech se násobí 2,5 pro sůl. Legacy `_100g` už OFF normalizuje; původní vstupní `*_unit` se na ně podruhé neaplikuje. Porční sada se převádí pouze se známou kladnou velikostí a jednotkou g/ml. Bez hustoty se nespojují údaje na 100 ml a 100 g. Připravené výrobky, výslovné odhady a hodnoty s nerovností se nepovažují za přesné údaje etikety. Neznámá nebo nesmyslná hodnota se nedoplňuje nulou.

Každá známá nově načtená živina uchovává normalizované podklady s původem, cestou pole, odkazem a datem načtení/ověření. `originalNutrients` obsahuje hodnoty před doplňkovou referencí; ruční změny zachovávají také dosavadní `originalOff`. U starých záznamů nelze zpětně vymyslet původní API pole: zobrazí se označení staršího OFF záznamu. Datum načtení není datum revize receptury.

Rozdíl větší než max(0,001 jednotky, 1 % vybrané hodnoty) vytváří upozornění na rozpor. Zachováme oba podklady a prioritu agregovaného OFF pole před vstupní/legacy sadou; nevybíráme vyšší nebo nižší číslo ani je neprůměrujeme. U výrobce při rozporu nedoplňujeme. Aktuální obal lze výslovně potvrdit ruční opravou; ta má lokální přednost i po dalším načtení databáze. Opravy se navíc nespojí s jiným ID/EAN. Kontrola EAN se provádí i na odpovědi barcode API.

Podklady jsou dostupné v rozbalovací sekci **Zdroje a původní nutriční hodnoty**. Ruční formulář předem upozorňuje na nahrazení existující hodnoty; údaje se neposílají výrobci ani OFF. Neúplné, ale dostatečné hodnocení je označené jako předběžné; při chybějících klíčových údajích zůstane skóre prázdné.

## Tři pohledy

1. **Nutriční kvalita** používá původní kategorická pravidla `scoring.ts`. Nemění ji profil, porce ani denní příjem. Změnit se může po doplnění údajů nebo upřesnění kategorie.
2. **Vhodnost pro osobní cíl** nově používá `evaluatePersonal`. Denní plán vychází z existujícího profilu nebo uložených vlastních cílů (podrobnosti v `FITCHECK-2.md`). Vhodnost = 70 % původní pravidla cíle + 30 % příspěvek konkrétní porce k osobnímu plánu. Energetická dílčí hodnota je `clamp(100 − max(0, podíl energie porce − práh) × 200)`, práh 0,25 pro nabírání a 0,15 pro ostatní cíle. Pro relevantní kategorie a redukci/nabírání se zprůměruje s bílkovinnou dílčí hodnotou `min(100, bílkoviny porce / (0,2 × denní cíl) × 100)`. Pro zdravý životní styl a ostatní kategorie se používá energetická dílčí hodnota. Nápoje se nepenalizují za chybějící proteinovou porci. Všechny prahy jsou transparentní heuristika FitCheck, nikoliv klinická validace nebo příkaz k velikosti jídla. Kruh stále kombinuje 60 % kvality a 40 % vhodnosti. Historie a porovnání používají stejnou personalizaci.
3. **Zapadnutí do dne** samostatně ukazuje zapsaný příjem, budoucí součet energie/bílkovin/sacharidů/tuků/vlákniny a rozdíl proti cíli. Čte skutečný deník, ale nevstupuje do obou produktových skóre. Neúplné součty jsou označené. Malé překročení se nepovažuje za zdravotní problém.

Bez kompletního profilu funguje obecné hodnocení s označením omezené personalizace. Nezletilý nemá osobní kalorické/makroživinové skóre ani automatický deficit/přebytek; obecná nutriční kvalita zůstává. U dospělého s vlastním uloženým plánem se používají jeho vlastní cíle. Věk, výška, hmotnost, pohlaví a aktivita ovlivňují automatický plán, nikoliv samotnou kvalitu etikety.

## Data, změněné soubory a kompatibilita

Nová metadata jsou volitelná pole potraviny: `nutrientSources`, `originalNutrients`, `sourceNotes`. Není potřeba nové databázové schéma: IndexedDB zůstává verze 2. Stará data, oblíbené, ruční opravy i snědené kopie zůstávají. Záloha v2 metadata uchovává a validuje; import v1 nadále funguje. Mapper cache se zvýšil na `dataVersion: 3`, takže online nové vyhledání obnoví starou cache. Offline staré záznamy zůstávají dostupné. Uložená historie se nepřepisuje hromadně bez načtení výrobku.

Nové moduly: `src/lib/nutrient-data.ts`, `src/lib/personalization.ts`, `src/lib/enrichment.test.ts`. Upravené: `src/lib/off.ts`, `src/lib/corrections.ts`, `src/lib/backup.ts`, `src/types.ts`, `src/pages/Result.tsx`, `src/pages/Compare.tsx`, `src/pages/Manual.tsx`, `src/components/DailyFit.tsx`, `src/App.tsx`. Plus dokumentace. Bez změny CSS, navigace, PWA konfigurace a GitHub Actions.

Build zůstává statický a používá relativní cesty pro GitHub Pages i `/fitcheck/` na XAMPP. Backend ani klíče nejsou potřeba. Živá dostupnost OFF zůstává závislá na síti a službě; při výpadku je k dispozici místní historie a ruční doplnění. Fyzická instalace na telefonu a vzdálený běh GitHub Actions v této změně nebyly provedeny.
