[![Support Server](https://i.imgur.com/3CDbHx5.png)](https://discord.gg/C83h4Sk)

# RAD.io - inb4 gyakran ismételt kérdések
A szerver ugyan még csak indulóban van, de van pár magától értetődő kérdés, amit jó előre tisztázni.
#### Mi az a RAD.io?
Egy Discord musicbot, ami eredetileg online rádiók lejátszására készült, de már YouTube-audió lejátszására is képes, és vannak még tervek...
#### Hogyan működik?
Ezt talán a redesign-ok miatt nem egy FAQ-ban részletezném, de azért van ez a szerver, hogy választ kapjál olyan működésbeli kérdésekre is, amik a bot súgójából nem derülnek ki.
#### "Magyar bot"?
Minthogy a készítők magyarok, és a terjesztés is a magyar közösségben indult el, ezért tekinthetjük amolyan "magyar botnak" is, bár a hosszútávú tervek között szerepel további nyelvek (minimum angol) bevezetése és a nemzetközi terjesztés.
#### Hogyan szerezhetem be?
A bot jelenleg általam (Nemokosch#9980) bérelt VPS-ről fut, megfelelő jogosultsággal bárki behívhatja egy szerverre [ezzel a linkkel](https://discordapp.com/oauth2/authorize?client_id=430326522146979861&permissions=8&scope=bot). Egyébként a forráskód publikus, a [githubon](https://github.com/2colours/rad.io) elérhető. Igény esetén segítek beüzemelni, ezzel kapcsolatban jó lenne egy kis tutorial a jövőben. :)
#### Hogyan készül? Hogyan működik?
A bot eredetileg JavaScript-ben íródott, mostanra TypeScript-re váltottunk, és minden függőségnél ez a preferencia, ha lehet könyvtárak közül választani. A [Node.JS](https://nodejs.org/) nevű platformon futtatható, ami nagyjából minden OS alatt elérhető. A Discordos szolgáltatásokhoz a [discord.js](https://discord.js.org/) nevű könyvtárat használjuk. Részletekért újfent a [github repositoryra](https://github.com/2colours/rad.io) tudnék hivatkozni. _Ami a kódot illeti: igyekszünk a JS és a TS újabb verzióinak lehetőségeit követni (főleg az ES6-ra gondolok), mellesleg nem publikus botokból másolgatunk, mondjuk szerintem amint meglátja valaki a this-bindinggal való bűvészkedést, nem fog ebben többé kételkedni._ :D
#### Milyen jogosultságok kellenek a botnak a működéshez?
Nyilván tudjon írni azokba a szobákba, ahol parancsokat kap, illetve tudjon belépni a hangcsatornára, ahol használni fogjátok. A "hallását" is nyugodtan ki lehet kapcsolni, ha aggódnátok az adatbiztonság miatt - amúgy eleve nem hallgatózik, mint az a forráskódból is látható.  
Az egyetlen nem magától értetődő jog, amit érdemes megadni a botnak, az a reakcióhasználat, mert bizonyos visszajelzéseket (pl. zeneválasztási opciók) ezzel kínál fel.
#### Mennyire biztonságos a RAD.io?
A RAD.io verifikált bot, ez többek között azt jelenti, hogy a felhasználóktól egyáltalán nem is gyűjthet adatot. A forráskódban is látható, hogy a bot csak a következő adatokat teszi elérhetővé, leginkább a frissítések ütemezéséhez és a kapcsolattartáshoz:
- a szerver alapadatai: név, tagok száma, létrehozási dátum, owner
- éppen aktív hangcsatornák száma, nevei, szerverük neve, a bent levő nem-bot tagok **száma** (csak a száma, a nevük nem)
A bot képes üzeneteket továbbítani a szerverekre (adott szerver/összes szerver/ahol zenét hallgatnak), ha egy készítő erre parancsot ad. Ez elég ritkán, leginkább fejlesztések publikásálakor fordul elő, nem abuzáljuk ezt a funkciót, mivel tudjuk, hogy az emberek általában nem szeretik az ilyesmit.
#### Miért nincs `xy` rádióadó? Az `yz` meg nem is működik...
A rádióadókat kézzel listázott URL-ekkel érjük el, így előfordulhat, hogy valamelyik érvénytelenné válik. Ha jelzel a szerveren, valószínűleg találunk neki új linket. Új rádióadók hozzáadása hasonló feltételek mellett lehetséges: ha hozol linket/tudunk találni, akkor semmi akadálya.
#### Milyen ütemben zajlik a fejlesztés?
Egyenetlenül, nincs semmilyen ütemterv. Amíg nem létezett a [szerver](https://discord.gg/C83h4Sk), gyakorlatilag teljesen önkényes módon választottuk ki a megvalósításra érdemes és alkalmas fejlesztéseket, és egyébként sem tudnám garantálni, hogy adott feature x időpontra kész lesz. De talán ez a szerver változtat majd ezen.
#### Mik a tervek?
Ez megint nemigazán FAQ-kompatibilis kérdés, de a hosszabb távú vagy kevésbé funkcionális tervek közül megemlítek néhányat: a jogosultság-rendszer továbbfejlesztése, nem parancs-, hanem website-alapú konfigrendszer, több nyelv támogatása, több audio streaming szolgáltatás (Soundcloud, ad abszurdum Spotify) támogatása.
#### Hogy lehet részt venni a fejlesztésben?
Mivel a bot open source, bárki hozzá tud nyúlni, és akár elkészíteni a saját verzióját - legfeljebb nem kerül be a "hivatalos verzióba".
Egyébként pedig legegyszerűbben azzal, ha bugreportokat és feature requesteket írsz, aminek egyetlen igazi előfeltétele van, hogy használd a botot. :D

`Frissített verzió, 2021.05.08.`
