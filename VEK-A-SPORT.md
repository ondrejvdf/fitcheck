# Věk, skutečný příjem a sportovní profil

## Proč se denní plán nezobrazoval

`dailyPlan` záměrně vracel pro věk pod 18 let `targets: null`, protože Mifflin–St Jeor a dospělé korekce −10 %/+5 % nejsou v aplikaci podloženým individuálním modelem pro rostoucího člověka. Samotný deník věkem blokovaný nebyl. Rozhraní ale i bez plánu vykreslovalo prázdné progress bary a výzvu k doplnění nastavení. Vypadalo to, že uživatel udělal chybu nebo že chybí další údaje.

## Nové chování podle věku

- Pod 18 let: přehled zapsané energie, bílkovin, sacharidů, tuků a vlákniny; žádné cílové kalorie, deficit, přebytek ani progress bary vůči neexistujícímu cíli. Zapisování, porce, úpravy, odstranění, minulá data, vyhledávání, skener, historie a oblíbené zůstávají dostupné. Obecná nutriční kvalita se počítá dál. Rady výrobku nepoužívají redukční/nabírací pravidla pro nezletilé; osobní vhodnost zůstává bez číselného skóre. Nastavení jasně uvádí režim sledování příjmu, nenabízí nepoužitelnou automatiku/vlastní cíle a uchovává případné dříve zadané vlastní hodnoty.
- Od 18 do 100 let s platnými potřebnými údaji: beze změny dosavadní Mifflin–St Jeor × aktivita, s opatrnou úpravou podle cíle, validací a dosavadními omezeními. Makroživiny zůstávají podle pravidel v `FITCHECK-2.md`. Platný věk s chybějícími tělesnými údaji neblokuje deník ani obecné hodnocení.
- Vlastní režim u dospělých: změna profilu neodvozuje nová vlastní čísla. Při dočasném přepnutí věku pod 18 let se cíle nepoužijí, ale samotné uložené vlastní hodnoty se nemažou. Návrat k dospělému věku je obnoví v původním režimu.

Skutečný příjem není automaticky celý skutečně snědený den: jde o součet uživatelových záznamů. Prázdný deník není důkaz nulového jídla. Neznámé živiny se stále nepočítají jako nula. Bez číselného cíle se nevykreslují progress bary ani umělé jmenovatele; stejné pravidlo platí i pro nulové vlastní cíle jednotlivých makroživin.

## Dvě nová pole

`sport` je nepovinný výběr: posilování, běh, cyklistika, plavání, fotbal, basketbal, bojové sporty, jiný sport, nesportuji. `trainingsPerWeek` je nepovinné celé číslo 0–7. Žádné další pole nebylo přidáno.

Sport a počet tréninků ovlivňují pouze obecné slovní rady v profilu, přehledu a výsledku potraviny. Například vytrvalostní sport připomíná běžné zdroje sacharidů a pití; častější tréninky připomínají regeneraci. Nelze z nich poznat délku, intenzitu a výdej, proto **nepřidávají žádný kalorický koeficient**. Dosavadní fyzická aktivita už obsahuje sport. Bez dvojího započtení zůstává celá číselná část stejná při změně pouze sportu nebo počtu tréninků. Případný rozpor Nesportuji + kladné tréninky se vysvětlí, nepřepisuje se automaticky.

Obecné informace pro dospívající vycházejí z [British Nutrition Foundation](https://www.nutrition.org.uk/nutrition-for/teenagers/): pravidelnost, pestrost, tekutiny a výživa při růstu. Nejde o individuální kalorický předpis. Stránka je odkazovaná přímo v aplikaci.

## Přepočty a data

Změny věku, výšky, hmotnosti, pohlaví, aktivity a cíle nadále přepočítávají automatické cíle a na ně navazující pohledy. Sportovní údaje okamžitě mění relevantní rady. Historické položky a jejich kopie etiket se nepřepisují změnou profilu. Minulé uložené denní plány zůstávají; v režimu nezletilého se jejich číselné cíle pouze nezobrazují.

Nové vlastnosti jsou volitelná pole původního profilu v LocalStorage `fitcheck-profile`. Stará nastavení se načtou bez nich, nevymýšlí se sport ani počet tréninků. IndexedDB zůstává verze 2 bez změny schématu. JSON záloha v1/v2 nová pole zachovává; import kontroluje podporovaný sport a celé rozmezí 0–7. Neexistuje nová služba ani synchronizace.

## Ověření

150 automatických testů v 8 souborech. Nové kontroly: věk 17/18, deník a nutriční kvalita u nezletilého, všech 9 sportů při všech počtech 0–7 bez změny energie, změna slovních doporučení, automatické přepočty podle tělesných údajů, zachování vlastních hodnot, HTML bez progress barů a nulových cílů, lokální uložení a export/import sportu, zachování starého profilu a oblíbených, odmítnutí neplatných nových hodnot.

Živý prohlížeč: 17 let, basketbal a 4 tréninky; zápis svačiny 45 g zvýšil příjem ze 105 na 282,3 kcal bez cílů a po odstranění této testovací položky se součet vrátil. V 18 letech profil 180 cm/80 kg/mužské/Střední vytvořil 2852 kcal pro zdravý životní styl. Změna na běh a 7 tréninků energetiku nezvýšila a hodnoty přežily reload. Poté byl kontrolní profil vrácen na původních 30 let a vlastní cíle 2500 kcal bez změny původní položky a oblíbených.

TypeScript, produkční build a kontrola PWA musí projít před nasazením. CSS, navigace, Vite konfigurace a GitHub Pages workflow zůstávají beze změny. Fyzická instalace na telefonu a vzdálený běh GitHub Actions se v této úpravě znovu neprováděly.
