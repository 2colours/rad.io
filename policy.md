## Reply vs Send:
Reply, ha a felhasználó olyasmit csinál, amit egyáltalán nem volna szabad csinálnia ("user error") - **mindig félkövér**  
Send, ha belső hiba történt, de erről a felhasználót nem kioktatni kell, csak informálni (pl. config error, nincs találat)
- félkövér, ha kritikus információt ad mellékhatással járó parancsról
- sima, ha a program funkciója háttérinfó szolgáltatása (pl. vc) adminnak

Reaction, ha csak meg kell erősíteni a sikert változó információ nélkül.  
## Modulbontás:
Ha egy típus nem alkot önálló szerkezeti egységet: common-types.  
Ez érvényes akkor is, ha egy önálló szerkezeti egységben csak publikus interfész-funkciót lát el.  
Ha egy függvény privát és csak kódrefaktorálási célt szolgál (nem önálló funkcionalitás), akkor a használó modulba kerüljön.  
Ellenkező esetben: util megfontolandó.
## Elnevezések:
A kódban legyen minden angolul.
Soundcloud, Youtube a nevek  
camelCase a preferált const, let és var és függvények esetében  
PascalCase a típusok esetében  
catch ág hibája: _e_
## Indexelés, számok:
- a GuildPlayer elég magas szintűnek minősül, ezért az indexelés a queue-ban 1-től kezdődik, akárcsak a felhasználói interfészen
  - a validációt is neki kell elvégeznie
## null vs undefined:
A null értelmes értéket jelent, értelmes válasz a kérdésre, amit az adateléréssel felteszünk. Például ha az a kérdés, hogy "Milyen zene szól éppen?", amikor csönd van, arra értelmes válasz az, hogy "Semmilyen.", tehát null.  
Az undefined azt jelenti, hogy az adateléréshez vezető kérdésnek az adott kontextusban nincs értelme. Például annak a kérdésnek, hogy "Mennyi ideje szól a zene?", nincs értelme akkor, ha semmi nem szól, és ezért nem mérhető az előrehaladás. Ugyancsak nincs értelme annak a kérdésnek, hogy "Ki kérte ezt a zenét?", ha éppen a fallback szól vagy semmi nem szól - ezeket ugyanis nem is lehet "kérni".
## Formázás
- kapcsos zárójelek alapvetően JS-ben megszokott módon
- üres zárójelpár: `{ }`