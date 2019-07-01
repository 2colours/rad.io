## Reply vs Send:
Reply, ha a felhasználó olyasmit csinál, amit egyáltalán nem volna szabad csinálnia ("user error") - **mindig félkövér**
Send, ha belső hiba történt, de erről a felhasználót nem kioktatni kell, csak informálni (pl. config error, nincs találat)
- félkövér, ha kritikus információt ad mellékhatással járó parancsról
- sima, ha a program funkciója háttérinfó szolgáltatása (pl. vc) adminnak

Reaction, ha csak meg kell erősíteni a sikert változó információ nélkül.  
## Modulbontás:
Ha egy típus nem alkot önálló szerkezeti egységet: common-types.
Ha egy függvény privát és csak kódrefaktorálási célt szolgál (nem önálló funkcionalitás), akkor a használó modulba kerüljön.
Ellenkező esetben: util megfontolandó.
