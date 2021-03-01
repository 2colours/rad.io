import { actions, CommandExtraData, Command, Filter } from './internal';

const aliases: Map<string, string> = new Map();
export const commands: Map<string, Command> = new Map();

export function translateAlias(cmdOrAlias: string): string {
	return aliases.get(cmdOrAlias) || cmdOrAlias;
}
function setupCommand(commandData: CommandExtraData): void {
	const cmdName = commandData.name;
	for (const alias of commandData.aliases)
		aliases.set(alias, cmdName);
	commands.set(cmdName, new Command(Object.assign({
		action: actions.get(cmdName)
	}, commandData)));
}

setupCommand({
	name: 'setprefix',
	aliases: ['sp'],
	params: ['prefix'],
	descrip: 'Bot prefixének átállítása.',
	type: 'adminOnly',
	filters: new Set([Filter.adminNeeded, Filter.parameterNeeded])
});

setupCommand({
	name: 'join',
	aliases: ['j'],
	params: ['ID (opcionális)'],
	descrip: 'Bot csatlakoztatása a felhasználó voice csatornájába. Rádió id megadása esetén az adott rádió egyből indításra kerül.',
	type: 'unlimited',
	filters: new Set([Filter.noBotVcNeeded, Filter.vcUserNeeded, Filter.eventualVcBotNeeded])
});

setupCommand({
	name: 'joinfallback',
	aliases: ['joinf', 'jf'],
	params: [],
	descrip: 'Bot csatlakoztatása egyből fallback állapotban.',
	type: 'unlimited',
	filters: new Set([Filter.noBotVcNeeded, Filter.vcUserNeeded, Filter.eventualVcBotNeeded, Filter.playingFallbackNeeded])
});

setupCommand({
	name: 'yt',
	aliases: [],
	params: ['URL / cím'],
	descrip: 'Youtube stream sorba ütemezése URL vagy keresőszó alapján. Keresőszó esetén a választás a bot által elhelyezett reakciók szerint történik.',
	type: 'unlimited',
	filters: new Set([Filter.vcUserNeeded, Filter.eventualVcBotNeeded, Filter.sameOrNoBotVcNeeded, Filter.parameterNeeded])
});

/*setupCommand({
	name: 'soundcloud',
	aliases: ['sc'],
	params: ['cím'],
	descrip: 'Soundcloud stream sorba ütemezése keresőszó alapján. A választás a bot által elhelyezett reakciók szerint történik.',
	type: 'unlimited',
	filters: new Set([Filter.vcUserNeeded, Filter.eventualVcBotNeeded, Filter.sameOrNoBotVcNeeded, Filter.parameterNeeded])
});*/

setupCommand({
	name: 'custom',
	aliases: ['c'],
	params: ['streamURL'],
	descrip: 'Egyéni stream sorba ütemezése URL alapján. A stream nem fog rádióadóként viselkedni, tehát nem skippelődik automatikusan a sor bővítése esetén.',
	type: 'unlimited',
	filters: new Set([Filter.vcUserNeeded, Filter.eventualVcBotNeeded, Filter.sameOrNoBotVcNeeded, Filter.parameterNeeded])
});

setupCommand({
	name: 'leave',
	aliases: ['l'],
	params: [],
	descrip: 'Bot lecsatlakoztatása.',
	type: 'grantable',
	filters: new Set([Filter.vcBotNeeded, Filter.leaveCriteria])
});

setupCommand({
	name: 'repeat',
	aliases: [],
	params: ['max (opcionális)'],
	descrip: 'Az épp szóló szám ismétlése. Ha nincs megadva, hogy hányszor, akkor a szám korlátlan alkalommal ismétlődhet.',
	type: 'grantable',
	filters: new Set([Filter.dedicationNeeded, Filter.vcBotNeeded, Filter.vcUserNeeded, Filter.sameVcNeeded, Filter.naturalErrorNoNeeded])
});

setupCommand({
	name: 'radios',
	aliases: [],
	params: [],
	descrip: 'Rádió lista megjelenítése.',
	type: 'unlimited',
	filters: new Set()
});

setupCommand({
	name: 'shuffle',
	aliases: ['sh'],
	params: [],
	descrip: 'Várakozási sor megkeverése.',
	type: 'grantable',
	filters: new Set([Filter.dedicationNeeded, Filter.vcBotNeeded, Filter.vcUserNeeded, Filter.sameVcNeeded, Filter.naturalErrorNoNeeded])
});


setupCommand({
	name: 'clear',
	aliases: ['cl'],
	params: [],
	descrip: 'Várakozási sor törlése.',
	type: 'grantable',
	filters: new Set([Filter.dedicationNeeded, Filter.vcBotNeeded, Filter.vcUserNeeded, Filter.sameVcNeeded, Filter.naturalErrorNoNeeded])
});

setupCommand({
	name: 'toplast',
	aliases: ['top'],
	params: [],
	descrip: 'A sor utolsó elemének a sor elejére helyezése.',
	type: 'grantable',
	filters: new Set([Filter.dedicationNeeded, Filter.vcBotNeeded, Filter.vcUserNeeded, Filter.sameVcNeeded, Filter.naturalErrorNoNeeded])
});

setupCommand({
	name: 'remove',
	aliases: ['rm'],
	params: ['sorszám'],
	descrip: 'A várakozási sor adott elemének törlése sorszám szerint.',
	type: 'grantable',
	filters: new Set([Filter.dedicationNeeded, Filter.vcBotNeeded, Filter.vcUserNeeded, Filter.sameVcNeeded, Filter.naturalErrorNoNeeded, Filter.parameterNeeded])
});

setupCommand({
	name: 'help',
	aliases: ['h'],
	params: ['parancs (opcionális)'],
	descrip: 'A bot általános tudnivalóinak megjelenítése. Parancsnév megadása esetén a megadott parancsról részletesebb ismertetés.',
	type: 'unlimited',
	filters: new Set()
});

setupCommand({
	name: 'guilds',
	aliases: [],
	params: [],
	descrip: 'A bot által elért szerverek listázása.',
	type: 'creatorsOnly',
	filters: new Set([Filter.creatorNeeded])
});

setupCommand({
	name: 'connections',
	aliases: ['conn'],
	params: [],
	descrip: 'A bot által éppen használt voice csatornák listázása.',
	type: 'creatorsOnly',
	filters: new Set([Filter.creatorNeeded])
});


setupCommand({
	name: 'testradios',
	aliases: ['tr'],
	params: [],
	descrip: 'A bot által éppen használt voice csatornák listázása.',
	type: 'creatorsOnly',
	filters: new Set([Filter.creatorNeeded])
});

setupCommand({
	name: 'announce',
	aliases: ['a'],
	params: ['ID/all/conn','üzenet JS-sztringként'],
	descrip: 'A paraméterben megadott szerverekre üzenet küldése. Az üzenetet egy soros JS-sztringként kell megírni! all=összes szerver, conn=a botot éppen használó szerverek',
	type: 'creatorsOnly',
	filters: new Set([Filter.creatorNeeded, Filter.parameterNeeded])
});

setupCommand({
	name: 'partner',
	aliases: [],
	params: ['invite link\\n', 'üzenet JS-sztringként\\n','felhasználónév\\n','szerver neve\\n'],
	descrip: 'A partner webhookra küld egy üzenetet a felhasználó nevében. Ennek szövege az invite link, és mellé kerül egy embed, aminek a footerje a szerver neve, a tartalma pedig az üzenet sztringként kiértékelve.',
	type: 'creatorsOnly',
	filters: new Set([Filter.creatorNeeded, Filter.parameterNeeded])
});

setupCommand({
	name: 'leaveguild',
	aliases: ['lg'],
	params: ['ID'],
	descrip: 'A bot kiléptetése a megadott ID-jű szerverről.',
	type: 'creatorsOnly',
	filters: new Set([Filter.creatorNeeded])
});

setupCommand({
	name: 'voicecount',
	aliases: ['vc'],
	params: [],
	descrip: 'Az aktív voice csatlakozások összeszámolása.',
	type: 'creatorsOnly',
	filters: new Set([Filter.creatorNeeded])
});

setupCommand({
	name: 'queue',
	aliases: ['q'],
	params: [],
	descrip: 'A várakozási sor tartalmának kiírása.',
	type: 'unlimited',
	filters: new Set([Filter.vcBotNeeded])
});

setupCommand({
	name: 'fallback',
	aliases: ['f'],
	params: ['leave/silence/radio'],
	descrip: 'Fallback mód beállítása. A bot akkor kerül fallback módba, ha kiürül a játszási sor. A választható üzemmódok: kilépés (leave), csendes jelenlét (silence), az erre a célra beállított rádió stream lejátszása (radio, lásd még `fallbackradio` parancs).',
	type: 'grantable',
	filters: new Set([Filter.dedicationNeeded, Filter.parameterNeeded])
});

setupCommand({
	name: 'fallbackradio',
	aliases: ['fr'],
	params: ['ID / streamURL'],
	descrip: 'Rádió fallback esetén játszandó adó beállítása stream URL vagy rádió id alapján. (Lásd még: `fallback` parancs.)',
	type: 'grantable',
	filters: new Set([Filter.dedicationNeeded, Filter.parameterNeeded])
});

setupCommand({
	name: 'skip',
	aliases: ['s'],
	params: [],
	descrip: 'Az aktuálisan játszott stream átugrása. Ha ez a sor utolsó száma volt, fallback üzemmódba kerülünk.',
	type: 'grantable',
	filters: new Set([Filter.dedicationNeeded, Filter.vcBotNeeded, Filter.vcUserNeeded, Filter.sameVcNeeded, Filter.nonFallbackNeeded, Filter.nonSilenceNeded])
});

setupCommand({
	name: 'pause',
	aliases: [],
	params: [],
	descrip: 'Az aktuálisan játszott stream szüneteltetése. (Figyelem: online stream eközben tovább haladhat.)',
	type: 'grantable',
	filters: new Set([Filter.dedicationNeeded, Filter.vcBotNeeded, Filter.vcUserNeeded, Filter.sameVcNeeded, Filter.naturalErrorNoNeeded, Filter.nonSilenceNeded])
});

setupCommand({
	name: 'resume',
	aliases: ['r'],
	params: [],
	descrip: 'Felfüggesztett stream folytatása. (Figyelem: online stream esetében ez ugrással járhat.)',
	type: 'grantable',
	filters: new Set([Filter.dedicationNeeded, Filter.vcBotNeeded, Filter.vcUserNeeded, Filter.sameVcNeeded, Filter.naturalErrorNoNeeded, Filter.nonSilenceNeded])
});

setupCommand({
	name: 'tune',
	aliases: ['t'],
	params: ['ID'],
	descrip: 'Rádióadó ütemezése a sor végére (id szerint, lásd `radios` parancs). Ha rádió lejátszása van folyamatban, akkor az újonnan ütemezett rádió egyből behangolásra kerül.',
	type: 'unlimited',
	filters: new Set([Filter.vcBotNeeded, Filter.vcUserNeeded, Filter.sameVcNeeded, Filter.parameterNeeded])
});

setupCommand({
	name: 'grant',
	aliases: ['g'],
	params: ['parancs1|parancs2|... / all', 'role neve'],
	descrip: 'Új parancsok elérhetővé tétele egy role számára. Alapértelmezésben egyes parancsok csak adminisztrátoroknak elérhetők, ezt lehet felülírni ezzel a paranccsal.',
	type: 'adminOnly',
	filters: new Set([Filter.adminNeeded, Filter.parameterNeeded])
});

setupCommand({
	name: 'granteveryone',
	aliases: ['ge'],
	params: ['parancs1|parancs2|... / all'],
	descrip: 'Új parancsok elérhetővé tétele mindenki (az @everyone role) számára. Alapértelmezésben egyes parancsok csak adminisztrátoroknak elérhetők, ezt lehet felülírni ezzel a paranccsal.',
	type: 'adminOnly',
	filters: new Set([Filter.adminNeeded, Filter.parameterNeeded])
});

setupCommand({
	name: 'deny',
	aliases: ['d'],
	params: ['parancs1|parancs2|... / all', 'role neve'],
	descrip: 'Parancshasználat visszavonása egy role-tól. (Lásd még: `grant` parancs.)',
	type: 'adminOnly',
	filters: new Set([Filter.adminNeeded, Filter.parameterNeeded])
});

setupCommand({
	name: 'denyeveryone',
	aliases: ['de'],
	params: ['parancs1|parancs2|... / all'],
	descrip: 'Parancshasználat visszavonása az @everyone role - tól. (Lásd még: `grant` parancs.)',
	type: 'adminOnly',
	filters: new Set([Filter.adminNeeded, Filter.parameterNeeded])
});

setupCommand({
	name: 'nowplaying',
	aliases: ['np'],
	params: [],
	descrip: 'Az aktuálisan játszott stream lekérése.',
	type: 'unlimited',
	filters: new Set([Filter.vcBotNeeded])
});

setupCommand({
	name: 'volume',
	aliases: ['vol'],
	params: ['hangerő (1-15)'],
	descrip: 'A bot hangerejének állítása. A beállítás a bot kilépéséig érvényes, a kezdőérték 5, ahol a 10 jelenti a teljes hangerőt, a 10 fölötti értékek arányos erősítést.',
	type: 'grantable',
	filters: new Set([Filter.parameterNeeded, Filter.vcBotNeeded, Filter.sameVcNeeded, Filter.naturalErrorNoNeeded, Filter.dedicationNeeded])
});

setupCommand({
	name: 'seek',
	aliases: [],
	params: ['időpont (másodperc)'],
	descrip: 'Az éppen játszott stream pozíciójának állítása.',
	type: 'grantable',
	filters: new Set([Filter.parameterNeeded, Filter.vcBotNeeded, Filter.sameVcNeeded, Filter.naturalErrorNoNeeded, Filter.dedicationNeeded]) //TODO: rádiónál lehessen?
});

setupCommand({
	name: 'mute',
	aliases: [],
	params: [],
	descrip: 'A bot némítása - a megelőző hangerő visszaállítható (lásd `unmute` parancs).',
	type: 'grantable',
	filters: new Set([Filter.vcBotNeeded, Filter.vcUserNeeded, Filter.sameVcNeeded, Filter.naturalErrorNoNeeded, Filter.dedicationNeeded])
});

setupCommand({
	name: 'unmute',
	aliases: [],
	params: [],
	descrip: 'A bot hangerejének visszaállítása a némítás előtti értékre.',
	type: 'grantable',
	filters: new Set([Filter.vcBotNeeded, Filter.vcUserNeeded, Filter.sameVcNeeded, Filter.naturalErrorNoNeeded, Filter.dedicationNeeded])
});

export const debatedCommands = [...commands].filter(entry => entry[1].type == 'grantable').map(entry=>entry[0]);