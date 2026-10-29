# Ověření FitCheck 2.0 – 29. 10. 2026

## Automatické kontroly

- TypeScript `tsc -b`: bez chyb.
- Vitest: **110 testů v 6 souborech**, všechny prošly. Původních 77 testů hodnocení, metadat a Open Food Facts zůstává.
- Nové testy pokrývají cíle a energetiku, vlastní nastavení, nezletilé, chybějící profil, krajní kombinace, porce g/ml, součty, editaci a mazání, neznámé hodnoty versus nuly, překročení 100 %, oddělení dnů, týdenní průměry a pravidlové návrhy.
- Testy se skutečným rozhraním IndexedDB přes fake-indexeddb ověřují migraci v1 → v2 včetně profilu, oblíbených, cache a ručních oprav; idempotentní zápis, historické kopie, import/export a přijetí staré zálohy v1.
- Produkční build Vite úspěšný. Hlavní JS přibližně 102 kB gzip; oddělený skener přibližně 108 kB gzip.
- `npm run check:pwa`: prošel manifest, ikony, standalone, relativní cesty, service worker a fallback. PWA precache obsahuje 10 položek. GitHub Pages workflow a relativní base zůstávají.

## Ověření v prohlížeči

Na lokálním produkčním náhledu s původními uloženými daty:

1. Zachování historie, oblíbeného výrobku a profilu po upgradu databáze a PWA.
2. Otevření hodnocení nezapsalo jídlo. Náhled dopadu na den neovlivnil skóre výrobku.
3. Výslovné přidání 2 porcí po 150 g: 300 g, 210 kcal a 36 g bílkovin.
4. Editace množství na 4000 g: 2800 kcal při cíli 2500, skutečných 112 % a překročení 300 kcal. Poté množství obnoveno.
5. Přesun položky do včerejšího dne, oddělené součty, zpětná editace a odstranění. Během této kontroly byla nalezena a opravena práce s datem v potvrzovacím formuláři; opravené chování znovu ověřeno.
6. Výběr uloženého výrobku, nové potvrzení porce a přepočet přehledu.
7. Automatické cíle, přechod na vlastní hodnoty, návrat k automatice a zachování vlastních hodnot po reloadu.
8. Věk 17 let: bez osobních číselných cílů, vlastní režim vypnutý; po testu vrácen dospělý profil.
9. Export přes skutečné tlačítko: JSON verze 2 se 3 výrobky, 1 testovací porcí a 2 uloženými dny. Import a slučování jsou ověřeny automatickými testy.
10. Mobilní viewport 390 × 844: přehled a prioritní spodní navigace, otevření nabídky Další a přechod do Historie. Ověřen tmavý i světlý režim; uložené náhledy jsou vedle projektu.

## Místní nasazení

Obsah finálního `dist/` byl přímo zkopírován do `<XAMPP_DOCUMENT_ROOT>/fitcheck`, odkud uživatel provozuje Apache. Shoda SHA-256 zdrojového a nasazeného indexu ověřena. Staré soubory dat prohlížeče se nasazením nemažou.

Při závěrečné kontrole adresa `http://localhost/fitcheck/` odmítala spojení: Apache právě neběžel nebo neposlouchal na portu 80. Je potřeba zapnout Apache v existujícím XAMPP. Nové soubory jsou na místě; úspěšnou HTTP odpověď finálního nasazení za tohoto stavu nelze potvrdit.

## Omezení ověření

Fyzická kamera, instalace na skutečný telefon a vzdálený běh GitHub Actions nebyly v tomto kroku provedeny. Přechod skutečné půlnoci nebyl ručně vyčkán; místní data a oddělení dnů pokrývají testy. Dostupnost externího hledání podle názvu závisí na Open Food Facts (dříve pozorovány chyby 503/CORS); databázový konektor se tímto rozšířením neměnil. Aplikace neví, jestli zapsané položky tvoří celý denní příjem. Výživové cíle jsou odhady, nikoliv klinicky validovaný osobní plán.

## Rozšíření nutričních zdrojů a personalizace – další ověření 29. 10. 2026

- Finální stav: **131 testů v 7 souborech prošlo**, TypeScript i produkční build bez chyb. Nových 21 testů je v `enrichment.test.ts`.
- Pokryto: Emco bez soli a ruční doplnění, odlišné/chybějící EAN, rozpor receptury a soli, expirace reference, neslučitelné jednotky, fallback z agregátu do legacy, sodík v mg, správná interpretace normalizovaného legacy pole, porční normalizace, odmítnutí odhadů/mezních údajů, zachování obou rozporných podkladů, lokální opravy a export/import zdrojových metadat.
- Dále: změna profilu, porce a cíle ovlivňuje vhodnost bez změny nutriční kvality; neúplný profil, nezletilí, chybějící kategorie, oddělení denních součtů od produktových skóre a správné chování nápojů.
- Živý prohlížeč: EAN 8595229932871 nalezen v OFF; sůl v odpovědi chyběla, reference ji doplnila na 0,31 g/100 g. Rozbalené podklady ukázaly odkaz výrobce a nepřítomnost v původních datech. OFF neměl kategorii, proto správně zůstalo upozornění na obecná pravidla; název se nepoužil pro odhad kategorie.
- Změna porce na 45 g dala 177,3 kcal a 13,5 g bílkovin, náhled z 105 kcal na 282,3 kcal. Návrat na Můj den ukázal stále jen původních 105 kcal a jednu položku: prohlížení nic nezapsalo.
- Aktualizace PWA zachovala profil, vlastní cíle, oblíbený výrobek a jídelníček. Dříve odstraněná boční karta zůstává odstraněná.
- Mobilní viewport 390 × 844 ověřen: náhled všech živin se vejde, navigace zůstává dostupná. Náhledy `FitCheck-Emco-personalizace.png` a `FitCheck-Emco-mobil.png` jsou vedle projektu.
- Hlavní JS přibližně 106 kB gzip, skener 108 kB gzip; CSS zůstalo shodné. PWA kontrola prošla, cesty jsou relativní. Živý GitHub Pages deployment/Actions ani fyzická instalace na telefonu nebyly spuštěny.
- Přesný rozsah použitých zdrojů, pravidel a upravených souborů je v `DATA-A-PERSONALIZACE.md`. Automaticky se nestahují weby výrobců; doplňková reference je záměrně jen jedna a má datum ověření.

Finální nasazení tohoto rozšíření: všechny soubory dist přímo nahrány do <XAMPP_DOCUMENT_ROOT>/fitcheck a ověřeny SHA-256. Apache http://localhost/fitcheck/ nyní odpověděl HTTP 200 a index odkazuje na finální index-BiZlC9Mq.js (předchozí poznámka o vypnutém Apache popisuje dřívější kontrolu).

## Věk a sportovní profil – finální kontrola 29. 10. 2026

- 150 testů v 8 souborech prošlo. TypeScript, produkční build a check:pwa bez chyb.
- Nových 16 testů profilu/rozhraní a 3 kontroly místního uložení: věk 17/18, sport a 0–7 tréninků bez dvojího energetického výdeje, přepočty automatiky, ochrana vlastních cílů, žádné progress bary bez dostupného cíle, zachování starého profilu, deníku a oblíbených, export/import nových hodnot a odmítnutí neplatných vstupů.
- V prohlížeči ověřeno: 17letý uživatel může přidat a odstranit testovací svačinu, součty 105 → 282,3 → 105 kcal bez číselných cílů. 18letý profil získal automaticky 2852 kcal; změna basketbalu/4 tréninků na běh/7 tréninků tuto energii nezměnila. Sport a tréninky přežily reload. Původní věk 30 a vlastní plán 2500 kcal pak byly obnoveny.
- Tmavé rozhraní ověřeno, náhledy FitCheck-rezim-17-let.png a FitCheck-sportovni-profil.png vedle projektu. CSS, navigace, PWA konfigurace a GitHub Pages workflow beze změny. Podrobnosti v VEK-A-SPORT.md.
- Nasazeno přímo do <XAMPP_DOCUMENT_ROOT>/fitcheck. Shoda všech souborů dist ověřena SHA-256, Apache HTTP 200 a finální index-DQLj_z0H.js.
- Fyzický telefon a vzdálený GitHub Actions v tomto kroku nebyly znovu testovány. Pro dospívající nebyl zaveden nepodložený individuální výpočtový model; dospělá automatika zůstává od 18 let a s potřebnými platnými údaji.
