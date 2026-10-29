"""Rebuild the curated Czech catalogue from the official USDA SR Legacy CSV archive.
Usage: python scripts/build-catalog.py path/to/SR-CSV-directory
Source: https://fdc.nal.usda.gov/download-datasets/ (SR Legacy, April 2018).
US total carbohydrates include fibre: subtract fibre for the app's EU-style carbs.
Sodium mg -> salt g uses * 2.5 / 1000. Missing data stays missing.
"""
import csv, json, sys
from pathlib import Path

ITEMS = [
 (169756,'Rýže bílá dlouhozrnná – syrová','bread','raw',75),
 (169757,'Rýže bílá dlouhozrnná – vařená bez soli','bread','cooked',180),
 (168927,'Těstoviny – suché','bread','raw',80),
 (168928,'Těstoviny – vařené bez soli','bread','cooked',200),
 (173904,'Ovesné vločky – suché','bread','ready',60),
 (173905,'Ovesná kaše – vařená ve vodě bez soli','bread','cooked',250),
 (170685,'Pohanka pražená – suchá','bread','raw',70),
 (170686,'Pohanka pražená – vařená','bread','cooked',180),
 (170438,'Brambory – vařené ve slupce, oloupané, bez soli','fruit','cooked',200),
 (170440,'Brambory – vařené bez slupky a soli','fruit','cooked',200),
 (172421,'Čočka – vařená bez soli','general','cooked',150),
 (173744,'Fazole červené – suché','general','raw',70),
 (175194,'Fazole červené – vařené bez soli','general','cooked',150),
 (173756,'Cizrna – suchá','general','raw',70),
 (173757,'Cizrna – vařená bez soli','general','cooked',150),
 (170420,'Hrášek zelený – vařený bez soli','fruit','cooked',150),
 (171477,'Kuřecí prsa bez kůže – pečená','meat','cooked',150),
 (171478,'Kuřecí prsa bez kůže – dušená','meat','cooked',150),
 (175167,'Losos atlantský z chovu – syrový','meat','raw',150),
 (175168,'Losos atlantský z chovu – tepelně upravený','meat','cooked',150),
 (171287,'Vejce celé – syrové bez skořápky','meat','raw',50),
 (173424,'Vejce celé – vařené natvrdo bez skořápky','meat','cooked',50),
 (170886,'Jogurt bílý nízkotučný','dairy','ready',150),
 (172205,'Mléko 2 % tuku (vážené v gramech)','dairy','ready',200),
 (172475,'Tofu pevné, s vápenatou srážecí solí','general','ready',150),
 (172684,'Chléb žitný','bread','ready',60),
 (172688,'Chléb celozrnný pšeničný','bread','ready',60),
 (171688,'Jablko se slupkou – syrové','fruit','ready',150),
 (173944,'Banán bez slupky – syrový','fruit','ready',120),
 (170393,'Mrkev – syrová','fruit','ready',100),
 (170379,'Brokolice – syrová','fruit','raw',150),
 (169967,'Brokolice – vařená bez soli','fruit','cooked',150),
 (168409,'Okurka se slupkou – syrová','fruit','ready',150),
 (170457,'Rajčata červená – syrová','fruit','ready',150),
 (170567,'Mandle přírodní','nuts','ready',30),
 (171413,'Olivový olej','oil','ready',10),
 (173430,'Máslo nesolené','oil','ready',10),
]
root=Path(sys.argv[1])
foods={int(r['fdc_id']):r for r in csv.DictReader(open(root/'food.csv',encoding='utf-8-sig'))}
selected={i[0] for i in ITEMS}
values={i:{} for i in selected}
for r in csv.DictReader(open(root/'food_nutrient.csv',encoding='utf-8-sig')):
 if int(r['fdc_id']) in selected:
  values[int(r['fdc_id'])][int(r['nutrient_id'])]=float(r['amount'])
out=[]
for ident,name,category,state,portion in ITEMS:
 v=values[ident]
 n={key:v[num] for num,key in [(1008,'energy'),(1003,'protein'),(1004,'fat'),(2000,'sugars'),(1258,'saturated'),(1079,'fiber')] if num in v}
 if 1005 in v and 1079 in v: n['carbs']=round(max(0,v[1005]-v[1079]),6)
 if 1093 in v: n['salt']=round(v[1093]*.0025,6)
 notes=['Obecná referenční surovina USDA SR Legacy 2018, nikoliv konkrétní česká značka. Hodnoty na 100 g jedlého podílu; sacharidy bez vlákniny, sůl přepočtená ze sodíku.']
 if 'sugars' in n and 'carbs' in n and n['sugars']>n['carbs']:
  notes.append(f"Zdroj uvádí cukry {n['sugars']} g a sacharidy {n['carbs']} g na 100 g z různých stanovení. Cukry proto zobrazujeme jako neznámé; hodnoty jsme svévolně nesrovnávali.")
  del n['sugars']
 out.append(dict(id=f'catalog:usda:{ident}',name=name,category=category,categoryCertain=True,unit='g',portion=portion,nutrients=n,source='catalog',date='2026-10-29T00:00:00.000Z',brand='USDA · základní surovina',catalog=dict(fdcId=ident,description=foods[ident]['description'],state=state),sourceNotes=notes))
target=Path(__file__).resolve().parents[1]/'src/data/catalog.json'
target.parent.mkdir(exist_ok=True)
target.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f'Created {len(out)} sourced Czech catalogue entries: {target}')
