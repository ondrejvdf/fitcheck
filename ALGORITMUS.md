# FitCheck – algoritmus 2.0 (29. 10. 2026)

Tento dokument popisuje základní kategorická pravidla. Aktuální výsledkové skóre dále používá osobní plán a porci podle [DATA-A-PERSONALIZACE.md](DATA-A-PERSONALIZACE.md). Nutriční kvalita níže zůstává samostatná; denní příjem ji nemění.

## Zjištěné chyby a rozsah opravy

Původní kategorizace porovnávala podřetězce ve zřetězených tagách, například obecné slovo „nuts“. To mohlo zaměnit ořechovou sladkost a čisté ořechy. Vysvětlení pak používala téměř univerzální pravidla: nulová sůl byla plus i u limonád, a cíl nabírání automaticky vytýkal málo bílkovin každému nápoji. Ořechy měly textovou penalizaci za absolutní množství nasycených tuků místo poměru. Výpočet „úplnosti“ byl váženým pokrytím pravidel, nikoliv skutečným počtem známých živin. I jediná známá hodnota mohla dát skóre 100. Složení četlo pouze cs nebo generický text. Chyběla editace a ochrana lokálních doplnění před novým načtením OFF.

Změny jsou v algoritmu, mapování a práci s daty. Stávající navigace, barvy, CSS, typografie, profil, kruhový ukazatel, PWA a GitHub Pages konfigurace zůstaly stejné. Výsledková obrazovka dostala jen nutné údaje o podkladech, jazyku, lokálních úpravách a tlačítko doplnění. Dříve odstraněný velký úvodní panel se nevrátil.

## Klasifikace

`src/lib/categories.ts` porovnává celé identifikátory `categories_tags` z OFF. Název potraviny se pro kategorii nepoužívá. Konkrétnější skupiny mají přednost: oleje; proteinové doplňky/tyčinky; mléčné; sladkosti; pečivo; maso/ryby; nápoje; ořechy; ovoce/zelenina. Proteinová tyčinka s obecným čokoládovým tagem tedy patří mezi proteinové výrobky, mléčný nápoj s obecným tagem beverages mezi mléčné a sladká ořechová pomazánka mezi sladkosti. Proteinový jogurt zůstává mléčným výrobkem, proteinovou hodnotu dokládá etiketa.

Nepodporované či pouze obecné tagy dávají kategorii „ostatní“ s upozorněním a omezenými podklady. Toto je rozpoznání taxonomického zařazení, nikoliv nezávislé ověření jeho pravdivosti. Ruční výběr kategorie se považuje za uživatelskou informaci, nikoliv za ověřený údaj OFF. Starší uložené záznamy nadále fungují; nové načtení EAN získá aktuální metadata. Nová verze mapperu obnoví starou cache při online dotazu.

## Výpočet kvality

Jednotlivá dílčí pravidla mají hodnotu 0–100, omezenou na tento interval. Známá pravidla se váženě průměrují. Neznámá hodnota se nepovažuje za nulu. Volitelné neznámé pravidlo nesnižuje bodově výsledek jako nulová živina, ale snižuje pokrytí podkladů. Přesný výsledek se zveřejní až po splnění minimálních podkladů níže.

| Kategorie          | Bílkoviny | Vláknina | Sůl | Nasycené | Cukry | Energie | Nenasycené |
| ------------------ | --------: | -------: | --: | -------: | ----: | ------: | ---------: |
| Ostatní            |        15 |       20 |  20 |       20 |    15 |      10 |          — |
| Mléčné             |        25 |        5 |  10 |       25 |    25 |      10 |          — |
| Nápoje             |         — |        — |  10 |        — |    65 |      25 |          — |
| Pečivo/obiloviny   |        10 |       35 |  30 |        5 |    10 |      10 |          — |
| Ořechy/semena      |         5 |       20 |  25 |       25 |     5 |       — |         20 |
| Oleje/tuky         |         — |        — |  10 |       60 |     — |       — |         30 |
| Ovoce/zelenina     |         — |       45 |  10 |        — |    15 |      30 |          — |
| Maso/ryby          |        30 |        — |  35 |       30 |     — |       5 |          — |
| Sladkosti          |         5 |       10 |   5 |       30 |    40 |      10 |          — |
| Proteinové doplňky |        40 |       10 |   5 |       20 |    20 |       5 |          — |

Prahy jsou **heuristika FitCheck**, nikoliv odborně validovaná procenta zdravosti ani přímý převod denních limitů WHO na výrobek:

- Bílkoviny: lineární bonus se stropem 12 g / 100 g, u ořechů 20 g, u proteinových doplňků 25 g. Další bílkoviny nenavyšují tento dílčí bonus neomezeně.
- Vláknina: lineární bonus se stropem 6 g / 100 g.
- Sůl: 100 bodů do 0,1 g / 100 g nebo ml, lineární pokles k 0 při 1,5 g.
- Nasycené tuky: 100 bodů do 1,5 g, 0 při 5 g. U olejů a ořechů místo absolutního obsahu používáme známý podíl nasycených na celkovém tuku: 100 bodů do 10 %, 0 při 50 %. Vyžaduje to oba vstupy.
- Nenasycené tuky olejů/ořechů: bonus ze známého podílu na celkovém tuku, strop při 80 %. Bereme uvedené nenasycené tuky nebo součet známých mono- a polynenasycených; neodhadujeme je jako tuk minus nasycené.
- Přidané cukry, pokud jsou známé, nahrazují celkové cukry v bodování: lineární pokles od 0 do 20 g, u nápojů do 10 g.
- Když přidané cukry nejsou známé: celkové cukry 100 bodů do 5 g, 0 při 30 g; mléčné do 5 a 20 g; nápoje 0 až 11 g. Přirozenou laktózu neodhadujeme, pouze u mléčných nepenalizujeme malé množství celkových cukrů. U ovoce má samotný obsah celkových cukrů neutrální dílčí hodnotu 70; není důkazem přidaného cukru.
- Energetická hustota: 100 bodů do 100 kcal, 0 při 500 kcal; u nápojů do 5 a 60 kcal / 100 ml. Ořechy a oleje nemají za vysokou hustotu automatickou bodovou penalizaci; energii a porci zohledňuje cílová část a text.

Důvody změn: u limonád absence soli/tuku nepřekryje cukry a energii. U mléčných se nespravedlivě nevyžaduje vláknina ve stejné váze jako u pečiva. U pečiva mají hlavní slovo vláknina a sůl; u masa bílkoviny, sůl a nasycené tuky. U ořechů záleží na kvalitě tuku, soli a porci. Žádné pravidlo neobsahuje konkrétní EAN nebo značku.

## Cílová část a celkový výsledek

Celkem = **0,6 × kvalita + 0,4 × vhodnost pro cíl**. Počítá se s nezaokrouhlenými dílčími hodnotami; zaokrouhluje se až zobrazení. Proto přepočet ze dvou už zaokrouhlených čísel může být o bod jiný.

- **Nápoje pro všechny cíle:** 70 % kvalita nápoje + 30 % cukry v celé porci. Porční cukry lineárně 100 bodů při 0 g až 0 při 25 g pro redukci nebo 40 g pro ostatní cíle. Nápoj není hodnocen jako proteinová svačina; ani voda nemá proteinovou penalizaci. Jde o běžné pití, nikoliv sportovní výživu během vytrvalostního výkonu.
- **Redukce u ostatních kategorií:** energie porce váha 35 (100 bodů do 150 kcal, 0 při 600); bílkoviny váha 35 pouze u mléčných, masa, proteinových a obecných výrobků (strop 20 g); vláknina váha 30 mimo oleje a maso (strop 6 g). Oleje/ořechy mají navíc váhu 30 pro velikost porce: 100 bodů do 15 g oleje/30 g ořechů, 0 při 50/100 g. Nad 400 kcal se cílová část násobí lineárním koeficientem k nule při 1000 kcal, aby velké porce nevítězily přes proteinové bonusy.
- **Nabírání u bílkovinně relevantních kategorií:** bílkoviny v porci váha 50 (strop 25 g), bílkoviny na 100 kcal váha 30 (strop 10 g), energie porce váha 20 (maximum 350 kcal, pokles 1 bod na 5 kcal vzdálenosti).
- **Nabírání u ostatních nenápojových kategorií:** nutriční kvalita váha 60 a energie porce váha 20, normalizované mezi dostupnými pravidly. Ořechům, ovoci a pečivu se tedy automaticky nevytýká, že nejsou samostatnou proteinovou porcí.
- **Zdravý životní styl mimo nápoje:** cílová část odpovídá obecné kvalitě.

Pokud nelze vypočítat cílovou část z potřebných podkladů, nepřeváží se celek potichu na 100 % kvality. Celkové skóre zůstane nedostupné a objeví se vysvětlení.

## Úplnost a dostatečnost podkladů

**Úplnost dat** = počet skutečně známých hodnot z osmi základních: energie, bílkoviny, sacharidy, cukry, tuky, nasycené tuky, vláknina, sůl. Zobrazuje se i počet (například 7 z 8 = 88 %). Přidané cukry a nenasycené tuky jsou doplňkové; neznámé přidané cukry nejsou nula. Úplnost neověřuje správnost etikety.

**Dostatečnost podkladů kategorie** vychází z váženého pokrytí pravidel a kritických údajů:

| Kategorie          | Nutné údaje                              |
| ------------------ | ---------------------------------------- |
| Nápoje             | Energie, cukry                           |
| Mléčné             | Energie, bílkoviny, cukry                |
| Pečivo             | Energie, vláknina, sůl                   |
| Ořechy             | Energie, tuky, sůl, vláknina             |
| Oleje              | Energie, tuky, nasycené tuky             |
| Ovoce/zelenina     | Energie, vláknina, cukry                 |
| Maso/ryby          | Energie, bílkoviny, sůl, nasycené tuky   |
| Sladkosti          | Energie, cukry, nasycené tuky            |
| Proteinové doplňky | Energie, bílkoviny, cukry, nasycené tuky |
| Obecná pravidla    | Energie, bílkoviny, cukry, sůl           |

Chybí-li některý kritický údaj nebo vážené pokrytí nedosahuje 60 %, kruh i dílčí skóre ukazují pomlčku a „Nedostatek údajů“. Při pokrytí 60–84 % či nejasné kategorii je výsledek označen jako omezený a doplněn upozorněním. Od 85 % a s rozpoznanou kategorií jsou podklady „dostatečné“. **Není to statistická spolehlivost ani odborná validace.** Porovnání nevyhlašuje jednoznačné pořadí při nedostatečných či omezených podkladech.

## Vysvětlení, doporučení, jazyk a opravy

Texty používají známé hodnoty, kategorii, cíl a skutečnou porci. Ořechům se nasycené tuky vytýkají až při známém vysokém podílu (>35 % tuku); limonády nepochválí nulovou sůl a nedostanou radu doplnit protein. Celkové cukry v nápoji se uvádějí na 100 ml i na celou porci. Přidané cukry se nikdy nedovozují z celkových. Doporučení mají maximálně tři jedinečné položky. Bez doložených výhod je neutrální informace.

Složení: existující cs → sk → en → jiná dostupná varianta/generický text s jazykem. Žádný automatický překlad. Původní generický text, jeho jazyk a načtené varianty se zachovají. Historický záznam bez informace o jazyce má „jazyk neuveden“, dokud se neobnoví podle EAN. Když nic není, zobrazí se „Složení není dostupné“.

„Doplnit údaje“ otevře původní formulář s předvyplněnými hodnotami na 100 g/ml. Původní EAN, fotografie a zdroj se zachovají. Změněná pole mají značku „tvoje úprava“, kopie původních údajů OFF je uložená v `originalOff` a změny v `localEdits`. Při dalším dotazu se uplatní jen lokálně změněná pole, ostatní mohou převzít aktuálnější databázová data. I vědomě vymazaná hodnota zůstává neznámá. Změny se neposílají do OFF a přežívají export/import. Jednotku upravujte pouze podle skutečné etikety; g a ml bez znalosti hustoty nejsou zaměnitelné.

## Příklady z pevných testovacích etiket

| Výrobek            | Redukce | Svaly | Zdravý životní styl |
| ------------------ | ------: | ----: | ------------------: |
| Coca-Cola, 330 ml  |      18 |    19 |                  19 |
| Neslazená voda     |     100 |   100 |                 100 |
| Bílý jogurt        |      63 |    61 |                  75 |
| Slazený jogurt     |      54 |    50 |                  60 |
| Proteinový jogurt  |      84 |    87 |                  95 |
| Celozrnné pečivo   |      79 |    73 |                  75 |
| Ořechy bez soli    |      91 |    97 |                 100 |
| Solené ořechy      |      76 |    74 |                  75 |
| Proteinová tyčinka |      80 |    76 |                  76 |
| Neúplná etiketa    |       — |     — |                   — |

Tabulka je regresní kontrola algoritmu, nikoliv vědecká klasifikace těchto potravin. 100 znamená dosažení stropu daných pravidel ve své kategorii, ne 100% zdravost ani úplnost všech mikronutrientů. Číselně srovnávat vodu a ořechy jako univerzálního vítěze není smysluplné. Aktuální záznamy OFF se mohou od testovacích etiket lišit.

## Podklady a limity

[WHO Healthy diet](https://www.who.int/news-room/fact-sheets/detail/healthy-diet) podporuje pestrost, vlákninu, kvalitu tuků a omezení volných cukrů či nadbytku soli v celém jídelníčku. Tato doporučení **nevalidují vlastní bodové prahy FitChecku**. Přidané a volné cukry nejsou totéž. Model neřeší diagnózy, alergie, individuální sportovní výkony, mikronutrienty ani úplný jídelníček. Příštím odborným krokem je kalibrace na širší sadě kategorií a recenze výživovým specialistou.

API a datová pole: [oficiální dokumentace OFF v3](https://openfoodfacts.github.io/documentation/docs/Product-Opener/v3/products/get-api-v3-product-code/). API endpointy, limity, licenční atribuce a fallback vyhledávání jsou zachovány; tato změna neslibuje opravu externích výpadků CORS nebo služby.
