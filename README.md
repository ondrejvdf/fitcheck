# FitCheck 3.0

Aktuální verze obsahuje český katalog 37 základních surovin, vlastní recepty s přepočtem podle výsledné hmotnosti, opakování celých jídel a doporučení konkrétních porcí podle zapsaného dne. Najdete je v **Můj jídelníček → Katalog surovin / Moje recepty / Zopakovat jídlo** a v **Přehled → Co mi dnes chybí?**. Navigace a místní ukládání zůstávají zachované.

Recepty a zapsané porce jsou soukromé údaje v prohlížeči, nikoliv součást repozitáře nebo veřejného buildu. Veřejná adresa a localhost mají oddělená úložiště; přenos mezi nimi je možný výslovným exportem/importem vlastní zálohy. Tyto zálohy nenahrávejte do GitHubu.

Aktuálně jsou implementované ochrana dat, věkové výpočty NASEM 2023 a opravená personalizace hodnocení. Automatické cíle i všech pět ukazatelů fungují také ve věku 15, 16, 17 a 18 let. Přesný rozsah, výsledky testů, modelové hodnoty a omezení: [IMPLEMENTACE-3.md](IMPLEMENTACE-3.md). Starší dokumenty popisují předchozí verze; zejména původní blokování cílů pod 18 let již neplatí.

Česká mobilní webová aplikace pro orientační hodnocení potravin podle sportovního cíle. React 19 + TypeScript + Vite, bez serveru a bez účtu. Nejde o zdravotní doporučení ani o validované procento „zdravosti“.

Nově obsahuje denní jídelníček, automatické i vlastní cíle, přehled Můj den a týdenní souhrny. Podrobný popis výpočtů, ukládání a omezení je v [FITCHECK-2.md](FITCHECK-2.md). Původní hodnocení výrobků zůstává samostatné a nezávislé na tom, co už uživatel snědl.

Rozšířené mapování OFF, ověřená reference Emco, původ jednotlivých živin a personalizace podle profilu/porce jsou popsány v [DATA-A-PERSONALIZACE.md](DATA-A-PERSONALIZACE.md). Automatické doplnění z výrobce je omezené na jedinou ověřenou referenci, nejde o univerzální vyhledávač etiket.

## Spuštění

Vyžaduje Node.js 24 s npm. V terminálu otevřete tuto složku:

```sh
npm ci --legacy-peer-deps
npm run dev
npm test
npm run build
npm run preview
```

Po buildu lze spustit také `npm run check:pwa`. Přehled provedených kontrol a skutečných omezení je v [OVERENI.md](OVERENI.md).

Výstup je v `dist/`. Neotvírejte `index.html` přímo přes file://. Pro testování kamery na telefonu potřebujete HTTPS, například nasazení na GitHub Pages. `localhost` je povolen na samotném počítači.

## Funkce

- Onboarding se třemi cíli, nepovinný profil a NASEM 2023 pro orientační denní energii. Pro věk 14–18,99 model s růstem bez dospělého deficitu či přebytku, od 19 let model pro dospělé. Vlastní cíle se nepřepisují automatickým výpočtem.
- Můj den s pěti ukazateli příjmu, skutečnými procenty včetně překročení a pravidlovými návrhy z uložených potravin.
- Můj jídelníček: snídaně, oběd, večeře a svačiny; skutečné množství v g/ml či porcích, potvrzení, úprava, mazání a historická data. Týdenní průměry vynechávají dny bez záznamů.
- Kamera přes ZXing (EAN a další běžné formáty), ruční kód, hledání podle názvu v Open Food Facts.
- Ruční etiketa v kcal a gramech živin, přepočet z porce na 100 g/ml, validace a zachování neznámých hodnot. kJ z databáze se převádějí /4,184.
- Jedno hlavní osobní skóre, kruhový graf, plusy a mínusy, pravidlové návrhy zlepšení a úplnost podkladů. Kategoriální kvalita a vhodnost porce mají nezávislé výpočty; u nápojů se nepřidává bonus za nízkou energii.
- IndexedDB: historie, oblíbené a sedmidenní cache produktů. Každé otevření produktu aktualizuje datum; historie je jeden poslední záznam na výrobek, nikoliv deník všech skenů.
- Porovnání dvou uložených výrobků na 100 g/ml nebo vlastní porci; při nekompatibilních jednotkách, kategoriích a neúplnosti nevyslovuje jednoznačné pořadí.
- Export/import JSON s kontrolou před zápisem a potvrzením kolizí, obnovovací kopie před aktualizací, importem a smazáním historie; mazání všech osobních dat odstraní i kopie. Světlý a tmavý režim zůstává.
- PWA s ikonami 192/512 px, verzovaným precache rozhraní a výzvou k aktualizaci. Uložené nutriční údaje a hodnocení fungují offline. Externí fotografie nejsou garantované offline.

Automatické testy používají oddělené testovací potraviny. Historie uživatele se neplní falešnými výrobky. Skutečná data přicházejí z etikety nebo Open Food Facts.

## GitHub Pages zdarma

1. Vytvořte repozitář a do jeho kořene nahrajte **obsah této složky**, včetně `.github`, `public`, `src` a lockfile. Nenahrávejte `node_modules`, `.pnpm-store`, osobní zálohy ani přístupové údaje.
2. Výchozí větev pojmenujte `main` (nebo upravte workflow).
3. V Settings → Pages → Build and deployment vyberte **GitHub Actions**.
4. Push do `main` spustí testy, build a publikaci. Výslednou HTTPS adresu najdete v Actions a Settings → Pages.

Vite používá `base: './'`, takže JS, CSS, manifest i service worker fungují pod `/nazev-repozitare/` i na vlastní doméně. Navigace je lokální stav, nevytváří serverové podadresy, které by na Pages vracely 404. Nevyžaduje žádné API klíče ani secrets. Projekt nebyl automaticky nahrán na GitHub: není připojen cílový repozitář.

## Instalace

Android: otevřete HTTPS adresu v Chrome → nabídka → Nainstalovat aplikaci / Přidat na plochu. Pokud je dostupná `beforeinstallprompt`, tlačítko je i na obrazovce „Aplikace do telefonu“.

iPhone: otevřete v Safari → Sdílet → Přidat na plochu. iOS nepoužívá `beforeinstallprompt`. Offline nejprve vyžaduje jedno úspěšné online načtení a aktivaci service workeru.

## Open Food Facts: technické a licenční podmínky

Ověřeno v oficiální dokumentaci 28. 10. 2026:

- Čtení výrobku: aktuálně doporučené `/api/v3.6/product/{barcode}`. Aplikace čte novou strukturu `nutrition.aggregated_set` (normalizované údaje na 100 g/ml) a ignoruje hodnoty označené zdrojem `estimate`. Pro legacy hledání umí mapovat také `nutriments`. Hledání: dokumentované `/cgi/search.pl` s JSON a omezeným `fields`.
- Aktuální [limity](https://github.com/openfoodfacts/openfoodfacts-server/blob/main/docs/api/index.md): **15 product dotazů/min/IP**, **10 search dotazů/min/IP**. Aplikace dodržuje minimálně 4,2 s / 6,5 s mezi voláními v dané relaci, nehledá při psaní, omezuje výsledky na 12 a ukládá výrobky do cache. Limity IP sdílejí i jiná zařízení a karty; odpověď 429 zobrazí srozumitelnou chybu.
- OFF žádá identifikaci vlastní hlavičkou User-Agent a vyplnění API usage form. Prohlížeč tuto hlavičku nemůže spolehlivě nastavit. Aplikace ji **nenastavuje**. Posílá pouze veřejný parametr `app_name=FitCheck`, který není náhradou garantované identifikace hlavičkou. Před širší distribucí vyplňte formulář odkazovaný v dokumentaci a dohodněte s OFF provoz čistě prohlížečové aplikace. Nevkládejte přihlašovací údaje do klienta.
- Přímé veřejné GET dotazy závisejí na CORS a politice OFF. Timeout, offline stav, omezení prohlížeče a změna API mají skutečný fallback: ruční zadání etikety a již uložené výrobky. Žádný veřejný neověřený proxy server ani skryté placené API se nepoužívají.
- Při této realizaci fungovalo čtení výrobku přímo v prohlížeči, ale legacy textové hledání vracelo HTTP 503 bez CORS. Oficiální Search-a-licious odpověděl ze serverového testu, avšak neposkytl CORS povolení pro tento původ, proto jej nepředstíráme jako prohlížečové řešení. `/api/v2/search` fulltext nepodporuje a parametr `search_terms` ignoruje. V aplikaci zůstává hledání dostupné pro obnovení služby, vyhledávání v lokálně uložených potravinách a odkaz na skutečné hledání na webu OFF.
- [Licenční dokumentace OFF](https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/tutorials/license-be-on-the-legal-side/): databáze **ODbL**, jednotlivý obsah **DbCL**, fotografie **CC BY-SA**, mohou obsahovat další práva k obalu. Aplikace u skutečných výrobků zobrazuje zdroj a odkaz. Export zachovává `source` a čárový kód. Při zveřejňování upravené databáze respektujte ODbL/share-alike a při dalším použití fotografií příslušnou CC BY-SA licenci. Osobní data nejsou součástí distribuovaného kódu.

## Algoritmus 2.0

Poměr **60 % nutriční kvalita + 40 % vhodnost pro cíl** zůstává. Výpočet je nyní řízen kategorií z taxonomie OFF a vyžaduje minimální podklady. Úplnost osmi základních hodnot se vykazuje odděleně od dostatečnosti relevantních podkladů. Podrobné váhy, prahy, důvody, příklady a hranice interpretace popisuje [ALGORITMUS.md](ALGORITMUS.md).

Na výsledku lze použít **Doplnit údaje**: změnit název, kategorii, jednotku, porci a živiny podle etikety. Editace zachová fotografii, EAN i původní zdroj. Změněná pole jsou označená, ukládají se lokálně, přežijí opětovné načtení databáze a export/import. OFF se těmito úpravami nemění. Složení se vybírá v pořadí cs → sk → en → jiná skutečně dostupná varianta, nikdy se automaticky nepřekládá.

## Architektura

`components/` sdílené UI a líně načtená kamera, `pages/` formuláře, výsledky a porovnání, `lib/scoring.ts` algoritmus, `lib/nutrition.ts` přepočty a validace, `lib/off.ts` síť a mapování, `lib/storage.ts` IndexedDB, `lib/backup.ts` kontrola importu. `App.tsx` spojuje navigaci a lokální stav, `types.ts` typy. Vite PWA generuje manifest a service worker.

## Omezení a další verze

Nástroj nehodnotí alergie, diagnózy, bezpečnost, mikronutrienty ani kompletní jídelníček. Není určen k výpočtu kalorických cílů dětí. Kategorie a etikety v komunitní databázi mohou být chybné. Bez internetu nejsou nové dotazy. Konkrétní alternativní výrobky nejsou automaticky stahovány: doporučení jsou podložená pravidla a skutečné nalezené výrobky lze ručně porovnat. Více karet a uživatelů na stejné IP může vyčerpat společný limit. Osobní data mohou zmizet při smazání úložiště prohlížeče; používejte export. Písmo z Google Fonts je volitelné, bez sítě se použije systémové.

Doporučený další vývoj: odborné posouzení a kalibrace kategorií, vyšší pokrytí potravin, úplná automatizace uživatelských testů PWA/kamery na fyzických telefonech, testy migrací IndexedDB, předvolby porcí a validovaná lokalizace OFF taxonomie.
