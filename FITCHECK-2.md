# FitCheck 2.0 – denní výživa

Rozšíření původního projektu; jeho hodnocení výrobků, taxonomie, ruční opravy, vyhledávání, oblíbené, porovnání a PWA zůstávají. Velký marketingový panel se nevrací. Tmavý vzhled je výchozí pro nové profily; uložená volba vzhledu se zachovává.

## Denní cíle

Pro dospělého s vyplněným profilem používáme původní Mifflin–St Jeor: BMR = 10 × kg + 6,25 × cm − 5 × věk + konstanta (+5 mužské, −161 ženské pohlaví). Násobení koeficientem aktivity dává orientační udržovací potřebu. Tři cíle nastaví energii na 90 % této potřeby (redukce), 105 % (nabírání) nebo 100 % (zdravý životní styl). Tyto násobky jsou opatrná pravidla aplikace, nikoliv ověřený individuální předpis.

Bílkoviny: 1,6 g/kg pro redukci/nabírání, 1,2 g/kg pro zdravý životní styl, nejvýše 25 % denní energie. Tuky: 30 % energie. Sacharidy: zbývající energie po odečtení bílkovin a tuků. Vláknina: 25 g/den. Energie se zaokrouhluje na celé kcal, makroživiny na desetiny; odchylka přepočtu 4/4/9 je do přibližně 1 kcal. Proteinový strop zachovává prostor pro ostatní živiny; jeho použití je vysvětlené v aplikaci.

Pod 18 let se nezobrazují ani automatické, ani vlastní osobní číselné cíle; zapisování jídel a obecné hodnocení fungují dál. Při chybějících údajích lze rovněž zapisovat a hodnotit. U dospělého s BMI pod 18,5 se automaticky nenavrhuje redukce. Automatický plán mimo podporovaný rozsah 1200–8000 kcal se nevytvoří. Tento technický rozsah není potvrzením zdravotní vhodnosti; aplikace neposuzuje těhotenství, kojení ani onemocnění.

Vlastní režim ukládá energii, bílkoviny, sacharidy, tuky a nepovinnou vlákninu. Validace odmítá nečíselné, záporné a extrémní hodnoty; při odchylce energie od 4 × bílkoviny + 4 × sacharidy + 9 × tuky větší než max(100 kcal, 5 %) zobrazí upozornění. Malé rozdíly mohou způsobovat zaokrouhlení a další zdroje energie. Návrat do automatického režimu uchovává poslední vlastní nastavení.

Podklady: [Mifflin–St Jeor](https://pubmed.ncbi.nlm.nih.gov/2305711/), [ISSN – protein a cvičení](https://pmc.ncbi.nlm.nih.gov/articles/PMC5477153/), [EFSA – sacharidy, tuky a vláknina](https://www.efsa.europa.eu/en/press/news/nda100326). Číselné cíle i porce jsou orientační; přesný gram není povinnost.

## Jídelníček a výpočty

Pouhé otevření nebo ohodnocení výrobku nic nezapisuje. Tlačítko Přidat do mého dne otevře formulář množství, jednotky, jídla a data. Teprve potvrzení zapíše položku; stejná probíhající operace má stabilní ID a ochranu proti dvojkliku. Opakované samostatně potvrzené porce jsou dovolené.

Každá položka obsahuje kopii údajů o potravině a množství v základních g/ml. Porce se převádějí podle velikosti porce produktu. Živiny = hodnota na 100 × množství / 100. Původní produktová historie zůstává seznamem výrobků a není zaměněná za záznam skutečného jídla. Úprava produktu zpětně nemění staré snědené porce. Doplnění etikety konkrétní položky vyžaduje výslovné potvrzení.

Ukazatele energie, bílkovin, sacharidů, tuků a vlákniny používají aktuální součty. Graf končí na 100 %, text uvádí skutečné procento i překročení. Neznámá hodnota není nula: součet je označen jako nejméně známá část a nelze tvrdit přesný zbytek do cíle.

Dny používají místní datum. Přepínač umožňuje zpětné doplnění, editaci i smazání položky. Dnešní cíle se aktualizují s profilem, minulé dny uchovávají svůj uložený plán. Při prvním doplnění dosud prázdného minulého dne se uloží právě platný plán; aplikace nezná starší profil, který nebyl uložen. Změna dne se kontroluje při návratu do aplikace a každých 30 sekund.

Týden je pondělí–neděle. Prázdné dny nejsou nulový příjem. Pro každou živinu se průměrují pouze zapsané dny s úplnými hodnotami této živiny; přehled uvádí počet použitých dnů. Porovnání s cíli používá odpovídající historické plány a stejné páry dnů. Ani zapsaný den nezaručuje, že člověk zaznamenal všechno jídlo.

Denní návrhy používají skutečné záznamy, dostupné cíle a uložené potraviny; dávají přednost bílkovinám či vláknině s přihlédnutím ke zbývající energii. Nevolají AI. Pokud nejsou dostatečné údaje nebo vhodné potraviny, uvádějí to. Skóre kvality potraviny tím nemění.

## Uložení a migrace

LocalStorage `fitcheck-profile` obsahuje profil, režim a vlastní cíle. IndexedDB `fitcheck` přechází z verze 1 na 2: původní `foods` a `cache` se nemění, přibývají `diary` (ID položky, index dne) a `days` (kopie denního plánu). Upgrade je transakční. Otevřená stará karta může upgrade blokovat; aplikace požádá o její zavření.

Záloha JSON verze 2 obsahuje profil, výrobky, jídelníčky a denní plány. Import přijímá i verzi 1, nejprve validuje obsah a zapisuje databázové kolekce v jediné transakci. Import slučuje podle ID; nejde o vymazání všeho a nahrazení. Export čte konzistentní stav databáze. Smazání historie výrobků nemaže jídelníček; smazání všech osobních dat odstraní i nové kolekce.

Data zůstávají v konkrétním prohlížeči a původu adresy. `localhost/fitcheck` a `127.0.0.1:4173` mají oddělená data. Není synchronizace ani vlastní server. Zdrojový projekt neobsahuje osobní záznamy; pro přesun mezi zařízeními slouží místní záloha.

## Soubory

Výpočty: `src/lib/targets.ts`, `diary.ts`. Databáze: `database.ts`, `storage.ts`, `backup.ts`. Rozhraní: `Home.tsx`, `Diary.tsx`, `TargetSettings.tsx`, `Progress.tsx`, `AddToDay.tsx`, `DiaryList.tsx`, `DailyFit.tsx`. Zapojení do stávající aplikace: `App.tsx`, `types.ts`, `Result.tsx`, `Profile.tsx`, `styles.css`.

Produkční sestavení zůstává statické, s relativními cestami pro XAMPP i GitHub Pages. Instalace PWA na telefonu a kamera vyžadují bezpečný kontext; pro vzdálený telefon použij HTTPS. Zobrazení uložených dat funguje offline, nové síťové vyhledávání vyžaduje dostupné Open Food Facts.
