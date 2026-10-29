# FitCheck 3.0 – skutečně implementované kroky 1–3

Stav ověření: 29. 10. 2026. Verze balíčku `3.0.0-preview.1`. Tento dokument je záznam implementace, nikoliv změna schváleného plánu. Původní React/TypeScript projekt a CSS zůstávají zachované.

## 1. Ochrana dat

- IndexedDB se nedestruktivně aktualizuje z verze 2 na 3. Přidává pouze úložiště obnovovacích kopií; produkty, oblíbené, cache, jídelníček i historické denní cíle zachovává.
- Před prvním uložením upraveného profilu/plánu vzniká pevná kopie původního profilu a uložených potravin, jídel a dnů. Tato kopie se nepřepisuje. Před importem a smazáním historie se ukládají další dvě samostatné kopie posledního předchozího stavu.
- V Nastavení → Obnovovací kopie dat lze kopie stáhnout jako JSON a použít běžný import. Nejde o automatické vracení změn jedním tlačítkem.
- Import kontroluje data a kolize ID. Bez výslovného potvrzení nedojde k přepsání odlišných záznamů. Kolize se znovu kontrolují v zapisovací transakci; neúspěch neprovede částečný import.
- Profil zůstává v LocalStorage, ostatní data v IndexedDB. Tyto dva systémy netvoří jednu atomickou transakci. Obnovovací kopie obsahuje i profil pro případnou ruční obnovu.
- Zálohy JSON jsou nadále verze 2 a import přijímá staré verze 1 i 2. Nové recepty/katalog zatím neexistují, takže se nevytváří předčasně nekompatibilní formát 3.
- Úplné vymazání osobních dat odstraňuje i obnovovací kopie. Tyto kopie jsou pouze místní; nezávislou staženou zálohu nenahrazují.

## 2. Věkové výpočty a denní přehled

Původní problém způsobovala explicitní podmínka, která pro věk pod 18 let vracela prázdné cíle, a další podmínky skrývající přehled/doporučení. Starý dospělý odhad navíc používal Mifflin–St Jeor. Tyto vazby byly nahrazeny věkovým výpočtem a dostupností podle platnosti vstupních údajů, nikoliv zákazem funkcí podle věku.

- Energie: rovnice NASEM 2023 podle věku, pohlaví, výšky, hmotnosti a jedné ze čtyř kategorií celodenní aktivity. Výška je v cm a hmotnost v kg.
- Věk 14–18,99 roku: model pro dospívající včetně příslušné energie na růst. Výběr hubnutí/nabírání nezavádí dospělý kalorický deficit/přebytek. Věk 18 let tedy stále patří do této skupiny.
- Věk 19+: model pro dospělé. Zdravý životní styl používá udržovací odhad; redukce orientačně −10 %, nabírání +5 %. Tyto dvě úpravy jsou pravidlo aplikace, nikoliv součást rovnic NASEM. Při podváze se automatický redukční deficit neuplatní.
- Implementace obsahuje i příslušné mladší věkové větve od 1 roku a věkovou vlákninu; první verze a hlavní ověření jsou zaměřené na dospívající a dospělé. Neřeší zvláštní modely pro těhotenství, kojení nebo onemocnění.
- Makroživiny nejsou výstupem samotné energetické rovnice NASEM. Pro věk 4–18,99 jsou orientačně rozdělené jako 15 % energie bílkoviny, 30 % tuky a zbytek sacharidy; to leží ve věkovém referenčním rozmezí DRI. Pro věk pod 4 roky je poměr 10/35/zbytek. Pro dospělé se bílkoviny odvíjejí od hmotnosti/cíle, tuky jsou 30 % a sacharidy dopočtený zbytek. Dospělý proteinový cíl je omezen 25 % energie. Přepočet je přibližně 4/4/9 kcal/g.
- Vláknina používá referenční hodnoty DRI podle věku a pohlaví, nikoliv jednu konstantu pro všechny.
- Sport ani počet tréninků nepřičítají další energii k již započtené celodenní aktivitě. Sport může ovlivnit relevantnost živin v hodnocení. Staré číselné aktivity se převádějí podle původních popisů s upozorněním ke kontrole; původní profil zůstává čitelný.
- Vlastní cíle se při změně profilu automaticky nepřepisují. Jejich varování o makroživinách respektují věkové rozmezí. Historie jídel se změnou nastavení nemaže.
- Přehled, jídelníček, historie, náhled dopadu porce, skóre, oblíbené i doporučení fungují i pro dospívající. Chybějící/invalidní profil nezablokuje zápis jídel; bez podloženého cíle se nezobrazuje nulový cíl ani progress proti nule.

### Referenční testovací profil

Jde o **syntetický profil**, nikoliv o údaje konkrétního uživatele: mužské pohlaví pro výpočet, 180 cm, 80 kg, kategorie Aktivní, cíl Zdravý životní styl, automatické nastavení. Kategorie aktivity podstatně ovlivňuje výsledek; čísla nejsou univerzální doporučení pro daný věk.

| Věk | Energie kcal | Bílkoviny g | Sacharidy g | Tuky g | Vláknina g | Model |
|---|---:|---:|---:|---:|---:|---|
| 15 | 3603 | 135,1 | 495,4 | 120,1 | 38 | NASEM 2023, 14–18,99, růst +20 kcal |
| 16 | 3606 | 135,2 | 495,9 | 120,2 | 38 | NASEM 2023, 14–18,99, růst +20 kcal |
| 17 | 3610 | 135,4 | 496,4 | 120,3 | 38 | NASEM 2023, 14–18,99, růst +20 kcal |
| 18 | 3614 | 135,5 | 496,9 | 120,5 | 38 | NASEM 2023, 14–18,99, růst +20 kcal |
| 19 | 3245 | 96 | 471,8 | 108,2 | 38 | NASEM 2023, dospělí 19+ |

Skok na hranici 19 let vychází z přechodu mezi publikovanými modely, nikoliv ze ztráty funkce aplikace. Výsledky jsou odhady, nikoliv přesně změřený výdej.

## 3. Hodnoticí algoritmus

- Jedno hlavní procentuální skóre. Kategoriální kvalita Q se nejprve počítá z etikety nezávisle na profilu a dnes snědeném jídle.
- Osobní složka G začíná na neutrálních 50 bodech; zohledňuje hustotu relevantních živin vůči dennímu plánu a energii porce. Q není znovu vloženo do G.
- Malá porce automaticky nezískává 100 bodů. Nadměrná porce může osobní vhodnost snížit; absolutní velikost porce se nemění na důkaz nutriční kvality.
- Nápoje nemají bonus z osobní složky za nulovou energii ani proteinovou penalizaci. Jejich výsledek vychází z Q, případně se snižuje o nepřiměřenost porce. Voda má 100, slazená limonáda nezískává bonus pro nabírání.
- Pro ostatní kategorie je zvolena konzervativnější váha **80 % Q / 20 % G**. Ověřeny byly i varianty 60/40 a 70/30 na matici 13 potravin × 5 věků × 3 cíle × 3 porce × 3 váhy = 1755 vyhodnocení. Samostatné regrese kontrolují pořadí jogurtů, nápoje, olej, mikroporce a nezávislost složek.
- Tyto testy ověřují konzistenci a konkrétní nežádoucí chování, **ne klinickou validitu ani optimálnost zvoleného poměru**. Bodové prahy zůstávají transparentní heuristikou FitCheck. Není to procento zdravosti.
- Dnešní příjem nemění skóre výrobku. Náhled zapadnutí do dne a denní doporučení jsou oddělené. Chybějící relevantní údaje se nevydávají za nulu nebo jisté osobní skóre.

## Provedené ověření

- **198 automatických testů v 10 souborech: všechny prošly.** Zahrnují v2→v3 migraci s existujícími daty, obnovovací kopie, kolize importu a rollback, nepřepisování stejného denního snapshotu, staré zálohy, 16 větví NASEM podle pohlaví/aktivity, hranici 18,99/19, věky 15/16/17/18/19, vlastní cíle, chybějící údaje, nedvojité započtení sportu, propojení s jídelníčkem a regresní testy hodnocení/OFF.
- **TypeScript `tsc -b`: prošel. Produkční Vite build: prošel.**
- **Kontrola PWA: prošla** – relativní cesty, manifest, ikony 192/512, service worker a fallback. GitHub Pages workflow a základní cesty nebyly změněné. Publikace do konkrétního GitHub repozitáře nebyla provedena.
- **Skutečný prohlížeč, izolovaný testovací origin 127.0.0.1:4174:** onboarding 15 let a všech pět progress barů; změny věku 16/17/18/19 s očekávanými cíli a pěti bary. Pro 17 let ruční testovací jogurt, skóre 88, oblíbené, náhled porce bez zápisu a následně potvrzený zápis 150 g = 105 kcal, 18 g bílkovin, 6 g sacharidů, 0,3 g tuku; přehled a doporučení se aktualizovaly. Ovládání obnovovacích kopií je dostupné v Nastavení. Testovací potravina nebyla vkládána do skutečného uživatelského profilu na localhost.
- Nasazení do existujícího XAMPP používá skutečný DocumentRoot `<XAMPP_DOCUMENT_ROOT>/fitcheck`, adresu `http://localhost/fitcheck/` a tentýž produkční build. Staré hashované soubory se při kopírování nemažou. Uživatelská databáze v prohlížeči se kopírováním webových souborů nenahrazuje.
- Po nasazení všech 10 výstupních souborů souhlasí SHA256 se zdrojovým buildem. Hlavní stránka i nový JavaScript vracejí HTTP 200. V prohlížeči na XAMPP byla přes stávající výzvu provedena aktualizace PWA z verze 2.0 na 3.0: původní nevyplněný profil zůstal nevyplněný, zvolený cíl zůstal zachovaný, oblíbené zůstaly 1 a objevila se sekce obnovovacích kopií. Skutečný profil na tomto originu nebyl nahrazován testovacím.

## Co zbývá

Český katalog základních surovin s rozlišením syrové/vařené, vlastní recepty a jejich přepočty, rychlé opakování jídel a širší ověření doporučení jsou další etapy. Nejsou vydávané za hotové. Současné oblíbené výrobky a pravidlové návrhy z uložených potravin fungují. Design se v této etapě nepřepracovával. Reálná kamera na telefonu, instalace na fyzický iPhone/Android a klinické ověření doporučení nebyly touto sadou testů provedeny.

## Zdroje výpočtů

- [NASEM 2023 – Dietary Reference Intakes for Energy](https://www.nationalacademies.org/read/26818/chapter/2), tabulky S-2/S-3.
- [Health Canada – rovnice EER podle NASEM 2023, jednotky, věkové skupiny a růst](https://www.canada.ca/en/health-canada/services/food-nutrition/healthy-eating/dietary-reference-intakes/tables/equations-estimate-energy-requirement.html).
- [DRI – věkové referenční hodnoty a rozmezí makroživin/vlákniny](https://www.canada.ca/en/health-canada/services/food-nutrition/healthy-eating/dietary-reference-intakes/tables/reference-values-macronutrients.html).
