/*const Discord=require('discord.js');
let userCommands = [
{name:'join',attributes:['ID (opcionális)'],description:'Bot csatlakoztatása.'},
{name:'tune',attributes:['ID'],description:'Rádió hangolása.'},
{name:'leave',description:'Bot lecsatlakoztatása.'},
{name:'skip',description:'Az aktuálisan játszott stream átugrása.'},
{name:'radios',description:'Rádió lista megjelenítése.'},
{name:'shuffle',description:'Várakozási sor megkeverése.'},
{name:'custom',attributes:['streamURL'],description:'Egyéni stream lejátszása.'},
{name:'yt',attributes:['URL / Cím'],description:'Egyéni YouTube stream lejátszása.'},
{name:'queue',description:'A várakozási sor tartalmának kiírása.'},
{name:'nowplaying',description:'Az aktuálisan játszott stream lekérése.'},
{name:'repeat',attributes:['max (opcionális)'],description:'Az épp szóló szám ismétlése.'}
];
let adminCommands = [
  {name:'fallback',attributes:['leave/silence/radio'],description:'Lejátszási lista végetértével való visszatérés.'},
  {name:'fallbackradio',attributes:['ID / streamURL'],description:'Rádió fallback esetén játszandó adó beállítása.'},
  {name:'setprefix',attributes:['prefix'],description:'Bot prefixének átállítása.'},
  {name:'grant',attributes:['parancs1|parancs2|...','role neve'],description:'Új parancsok elérhetővé tétele egy role számára.'},
  {name:'deny',attributes:['parancs1|parancs2|...','role neve'],description:'Parancshasználat visszavonása egy role-tól.'}
  ];
function addHelpEmbed(client,prefix) {
  let {tag:nemokoschTag='Nemokosch#9980'} = client.users.get('297037173541175296') || {};
	let {tag:gartonTag = 'garton#8800'}=client.users.get('419447790675165195') || {};
  return this
	.addField('❯ Felhasználói parancsok',userCommands.map(command=>`__${prefix}${command.name}${(command.attributes)?command.attributes.map(attr=>` <${attr}>`).join(''):''}__\n${command.description}`).join('\n'))
  .addField('❯ Adminisztrátori parancsok',adminCommands.map(command=>`__${prefix}${command.name}${(command.attributes)?command.attributes.map(attr=>` <${attr}>`).join(''):''}__\n${command.description}`).join('\n'))
	.addField('Egyéb információ', `**RAD.io meghívása saját szerverre: **[Ide kattintva](https://discordapp.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot)
**Meghívó a RAD.io Development szerverre:** [discord.gg/C83h4Sk](https://discord.gg/C83h4Sk)`)
	.addField('Credits',
`**Ötletadó és kivitelező: ** *${gartonTag}*
**Kivitelező: ** *${nemokoschTag}*`);
}
module.exports = {addHelpEmbed}*/
let helpCommands = {
  userCommands: {
    'join':{attributes:['ID (opcionális)'],description:'Bot csatlakoztatása a felhasználó voice csatornájába. Rádió id megadása esetén az adott rádió egyből indításra kerül.',requirements:'A felhasználónak voice csatornán kell lennie, a botnak pedig nem szabad.'},
    'tune':{attributes:['ID'],description:'Rádióadó ütemezése a sor végére (id szerint, lásd `radios` parancs). Ha rádió lejátszása van folyamatban, akkor az újonnan ütemezett rádió egyből behangolásra kerül.',requirements:'A botnak és a felhasználónak egyazon voice csatornán kell lennie.'},
    'leave':{description:'Bot lecsatlakoztatása.',requirements:'A parancs használatához jogosultságra van szükség (lásd `grant` és `deny` parancsok), kivéve, ha a bot egyedül van vagy a parancsot kiadó felhasználóval kettesben.'},
    'skip':{description:'Az aktuálisan játszott stream átugrása. Ha ez a sor utolsó száma volt, fallback üzemmódba kerülünk.',requirements:'A botnak és a felhasználónak közös voice csatornán kell lennie. A parancs használatához jogosultságra van szükség (lásd `grant` és `deny` parancsok), kivéve, ha a bot a parancsot kiadó felhasználóval kettesben van. Fallback mód nem skippelhető.'},
    'radios':{description:'Rádió lista megjelenítése.'},
    'shuffle':{description:'Várakozási sor megkeverése.',requirements:'A botnak és a felhasználónak közös voice csatornán kell lennie. A parancs használatához jogosultságra van szükség (lásd `grant` és `deny` parancsok), kivéve, ha a bot a parancsot kiadó felhasználóval kettesben van.'},
    'custom':{attributes:['streamURL'],description:'Egyéni stream sorba ütemezése URL alapján. A stream nem fog rádióadóként viselkedni, tehát nem skippelődik automatikusan a sor bővítése esetén.',requirements:'A felhasználónak voice csatornán kell lennie, a bot pedig nem lehet ettől eltérő csatornán.'},
    'yt':{attributes:['URL / Cím'],description:'YouTube stream sorba ütemezése URL vagy keresőszó alapján. Keresőszó esetén a választás a bot által elhelyezett reakciók szerint történik.',requirements:'A felhasználónak voice csatornán kell lennie, a bot pedig nem lehet ettől eltérő csatornán.'},
    'queue':{description:'A várakozási sor tartalmának kiírása.',requirements:'A botnak voice csatornában kell lennie.'},
    'nowplaying':{description:'Az aktuálisan játszott stream lekérése.',requirements:'A botnak voice csatornában kell lennie.'},
    'repeat':{attributes:['max (opcionális)'],description:'Az épp szóló szám ismétlése. Ha nincs megadva, hogy hányszor, akkor a szám korlátlan alkalommal ismétlődhet.',requirements:'A felhasználónak és a botnak is egyazon voice csatornában kell lennie.'},
    'volume':{attributes:['hangerő (1-15)'],description:'A bot hangerejének állítása. A beállítás a bot kilépéséig érvényes, a kezdőérték 5, ahol a 10 jelenti a teljes hangerőt, a 10 fölötti értékek arányos erősítést.',requirements:'A felhasználónak és a botnak is egyazon voice csatornában kell lennie.'},
    'mute':{description:'A bot némítása - a megelőző hangerő visszaállítható (lásd `unmute` parancs).',requirements:'A felhasználónak és a botnak is egyazon voice csatornában kell lennie.'},
    'unmute':{description:'A bot hangerejének visszaállítása a némítás előtti értékre.',requirements:'A felhasználónak és a botnak is egyazon voice csatornában kell lennie.'}
  },
  adminCommands: {
    'fallback':{attributes:['leave/silence/radio'],description:'Fallback mód beállítása. A bot akkor kerül fallback módba, ha kiürül a játszási sor. A választható üzemmódok: kilépés (leave), csendes jelenlét (silence), az erre a célra beállított rádió stream lejátszása (radio, lásd még `fallbackradio` parancs).',requirements:'Adminisztrátori jogosultság szükséges.'},
    'fallbackradio':{attributes:['ID / streamURL'],description:'Rádió fallback esetén játszandó adó beállítása stream URL vagy rádió id alapján. (Lásd még: `fallback` parancs.)',requirements:'Adminisztrátori jogosultság szükséges.'},
    'setprefix':{attributes:['prefix'],description:'Bot prefixének átállítása.',requirements:'Adminisztrátori jogosultság szükséges.'},
    'grant':{attributes:['parancs1|parancs2|...','role neve'],description:'Új parancsok elérhetővé tétele egy role számára. Alapértelmezésben a `skip`, `leave` és `shuffle` parancsok csak adminisztrátoroknak elérhetők, ezt lehet felülírni ezzel a paranccsal.',requirements:'Adminisztrátori jogosultság szükséges.'},
    'deny':{attributes:['parancs1|parancs2|...','role neve'],description:'Parancshasználat visszavonása egy role-tól. (Lásd még: `grant` parancs.)',requirements:'Adminisztrátori jogosultság szükséges.'}
  }
};
module.exports={helpCommands};