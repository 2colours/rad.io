# RAD.io - inb4 gyakran ismételt kérdések
A szerver ugyan még csak indulóban van, de van pár magától értetődő kérdés, amit jó előre tisztázni.
#### Mi az a RAD.io?
Egy Discord musicbot, ami eredetileg online rádiók lejátszására készült, de már YouTube-audió lejátszására is képes, és vannak még tervek...
#### Hogyan működik?
Ezt talán a redesign-ok miatt nem egy FAQ-ban részletezném, de azért van ez a szerver, hogy választ kapjál olyan működésbeli kérdésekre is, amik a bot súgójából nem derülnek ki.
#### "Magyar bot"?
Minthogy a készítők magyarok, és a terjesztés is a magyar közösségben indult el, ezért tekinthetjük amolyan "magyar botnak" is, bár a hosszútávú tervek között szerepel további nyelvek (minimum angol) bevezetése és a nemzetközi terjesztés.
#### Hogyan szerezhetem be?
A bot jelenleg _glitch.com_-ról fut, megfelelő jogosultsággal bárki behívhatja egy szerverre [ezzel a linkkel](https://discordapp.com/oauth2/authorize?client_id=430326522146979861&permissions=8&scope=bot). A host limitáltsága miatt tervben van a bot forráskódjának publikálása, hogy bárki futtathassa magának a lehetőségeihez mérten - persze az is lehetséges, hogy a későbbiekben a "hivatalos verzió" is komolyabb hostra kerül.
#### Hogyan készül? Hogyan működik?
A bot eredetileg JavaScript-ben íródott, mostanra nagyjából TypeScript-re váltottunk. A [Node.JS](https://nodejs.org/) nevű platformon futtatható, ami nagyjából minden OS alatt elérhető. A Discordos szolgáltatásokhoz a [discord.js](https://discord.js.org/) nevű könyvtárat használjuk. Git repo egyelőre nincs, opensource-olás esetén nyilván majd lesz. _Ami a kódot illeti: igyekszünk a JS és a TS újabb verzióinak lehetőségeit követni (főleg az ES6-ra gondolok), mellesleg nem publikus botokból másolgatunk, mondjuk szerintem amint meglátja valaki a this-bindinggal való bűvészkedést, nem fog ebben többé kételkedni._ :D
#### Miért nincs `xy` rádióadó? Az `yz` meg nem is működik...
A rádióadókat kézzel listázott URL-ekkel érjük el, így előfordulhat, hogy valamelyik érvénytelenné válik. Ha jelzel a szerveren, valószínűleg találunk neki új linket. Új rádióadók hozzáadása hasonló feltételek mellett lehetséges: ha hozol linket/tudunk találni, akkor semmi akadálya.
#### Milyen ütemben zajlik a fejlesztés?
Egyenetlenül, nincs semmilyen ütemterv. Eddig, hogy nem volt ez a szerver, gyakorlatilag teljesen önkényes módon választottuk ki a megvalósításra érdemes és alkalmas fejlesztéseket, és egyébként sem tudnám garantálni, hogy adott feature x időpontra kész lesz. De talán ez a szerver változtat majd ezen.
#### Mik a tervek?
Ez megint nemigazán FAQ-kompatibilis kérdés, de a hosszabb távú vagy kevésbé funkcionális tervek közül megemlítek néhányat: a jogosultság-rendszer továbbfejlesztése, nem parancs-, hanem website-alapú konfigrendszer, több nyelv támogatása, több audio streaming szolgáltatás (Soundcloud, ad abszurdum Spotify) támogatása, további YouTube-feature-ök (seeking, playlistek).
#### Hogy lehet részt venni a fejlesztésben?
Ha a bot opensource lesz, akkor de facto bárki megismerheti és hozzá tud nyúlni, legfeljebb nem kerül be a "hivatalos verzióba".
Egyébként pedig legegyszerűbben azzal, ha bugreportokat és feature requesteket írsz, aminek egyetlen igazi előfeltétele van, hogy használd a botot. :D

`2018.11.17.`
