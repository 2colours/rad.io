import { actions, Command, Filter, CommandExtraData, DeepReadonly, ParameterData, ThisBinding, Resolvable, ApplicationCommandOptionTypes } from '../internal.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';

const token = process.env.radioToken;
const clientId = process.env.botId;
const rest = new REST({ version: '9' }).setToken(token);

const aliases: Map<string, string> = new Map();
export const commands: Map<string, Command> = new Map();

export function translateAlias(cmdOrAlias: string): string {
	return aliases.get(cmdOrAlias) || cmdOrAlias;
}

function addParam(commandBuilder: SlashCommandBuilder, param: ParameterData) {
	type SupportedCommandOptionTypes = ApplicationCommandOptionTypes & 'String' | 'Number' | 'Boolean' | 'Role';
	type SupportedAddOptionName = `add${SupportedCommandOptionTypes}Option`;
	type SupportedOption = Exclude<Parameters<SlashCommandBuilder[SupportedAddOptionName]>[0], Function>
	const currentMethod = commandBuilder[`add${param.type}Option` as SupportedAddOptionName];
	const optionBuilder = (option: SupportedOption) => {
		option.setDescription(param.description.slice(0, 100));
		option.setRequired(param.required);
		option.setName(param.name.toLowerCase());
		return option;
	}
	currentMethod.call(commandBuilder, optionBuilder);
}
async function setupMessageCommands(allCommandData: CommandData) {
	const restCommands = Object.entries(allCommandData).map(([cmdName, cmdInfo]) => {
		for (const alias of cmdInfo.aliases)
			aliases.set(alias, cmdName);
		commands.set(cmdName, new Command(Object.assign({
			action: actions[cmdName as keyof CommandData],
			name: cmdName
		}, cmdInfo)));
		const res = new SlashCommandBuilder()
			.setName(cmdName.toLowerCase())
			.setDescription(cmdInfo.descrip.slice(0, 100));
		for (const param of cmdInfo.params) {
			addParam(res, param);
		}
		return res;
	}).map(command => command.toJSON());
	await rest.put(Routes.applicationCommands(clientId), { body: restCommands });
}
type CommandValueData = Omit<DeepReadonly<CommandExtraData>, 'name'>;
type CommandDataConstraint = {
	[name: CommandExtraData['name']]: CommandValueData
}

function constrainedCommandData<T extends CommandDataConstraint>(arg: T) {
	return arg;
}

const commandData = constrainedCommandData({
	'skip': {
		aliases: ['s'],
		params: [{
				name: 'n',
				description: 'n (opcionális)',
				required: false,
				type: 'Number'
			}
		],
		descrip: 'Az aktuálisan játszott stream (vagy azt is beleértve az n soron következő stream) átugrása. Ha a sor végére érnénk, fallback üzemmódba kerülünk.',
		type: 'grantable',
		filters: new Set([Filter.dedicationNeeded, Filter.vcBotNeeded, Filter.vcUserNeeded, Filter.sameVcNeeded, Filter.nonFallbackNeeded, Filter.nonSilenceNeded])
	},
	'queue': {
		aliases: ['q'],
		params: [],
		descrip: 'A várakozási sor tartalmának kiírása.',
		type: 'grantable',
		filters: new Set([Filter.dedicationNeeded, Filter.vcBotNeeded, Filter.vcUserNeeded, Filter.sameVcNeeded, Filter.nonFallbackNeeded, Filter.nonSilenceNeded])
	},
	'setprefix': {
		aliases: ['sp'],
		params: [{
				name: 'prefix',
				description: 'prefix',
				required: true,
				type: 'String'
			}
		],
		descrip: 'Bot prefixének átállítása.',
		type: 'adminOnly',
		filters: new Set([Filter.adminNeeded, Filter.parameterNeeded])
	},
	'join': {
		aliases: ['j'],
		params: [{
				name: 'id',
				description: 'id (opcionális)',
				required: false,
				type: 'String'
			}
		],
		descrip: 'Bot csatlakoztatása a felhasználó voice csatornájába. Rádió id megadása esetén az adott rádió egyből indításra kerül.',
		type: 'unlimited',
		filters: new Set([Filter.noBotVcNeeded, Filter.vcUserNeeded, Filter.eventualVcBotNeeded])
	},
	'joinfallback': {
		aliases: ['joinf', 'jf'],
		params: [],
		descrip: 'Bot csatlakoztatása egyből fallback állapotban.',
		type: 'unlimited',
		filters: new Set([Filter.noBotVcNeeded, Filter.vcUserNeeded, Filter.eventualVcBotNeeded, Filter.playingFallbackNeeded])
	},
	'yt': {
		aliases: [],
		params: [{
				name: 'ytQuery',
				description: 'URL / cím',
				required: true,
				type: 'String'
				
			}
		],
		descrip: 'Youtube stream sorba ütemezése URL vagy keresőszó alapján. Keresőszó esetén a választás a bot által elhelyezett reakciók szerint történik.',
		type: 'unlimited',
		filters: new Set([Filter.vcUserNeeded, Filter.eventualVcBotNeeded, Filter.sameOrNoBotVcNeeded, Filter.parameterNeeded])
	},
	'custom': {
		aliases: ['c'],
		params: [
			{
				name: 'streamURL',
				description: 'streamURL',
				required: true,
				type: 'String'
			}
		],
		descrip: 'Egyéni stream sorba ütemezése URL alapján. A stream nem fog rádióadóként viselkedni, tehát nem skippelődik automatikusan a sor bővítése esetén.',
		type: 'unlimited',
		filters: new Set([Filter.vcUserNeeded, Filter.eventualVcBotNeeded, Filter.sameOrNoBotVcNeeded, Filter.parameterNeeded])
	},
	'leave': {
		aliases: ['l'],
		params: [],
		descrip: 'Bot lecsatlakoztatása.',
		type: 'grantable',
		filters: new Set([Filter.vcBotNeeded, Filter.leaveCriteria])
	},
	'repeat': {
		aliases: [],
		params: [
			{
				name: 'max',
				description: 'max (opcionális)',
				required: false,
				type: 'Number'
			}
		],
		descrip: 'Az épp szóló szám ismétlése. Ha nincs megadva, hogy hányszor, akkor a szám korlátlan alkalommal ismétlődhet.',
		type: 'grantable',
		filters: new Set([Filter.dedicationNeeded, Filter.vcBotNeeded, Filter.vcUserNeeded, Filter.sameVcNeeded, Filter.naturalErrorNoNeeded])
	},
	'radios': {
		aliases: [],
		params: [],
		descrip: 'Rádió lista megjelenítése.',
		type: 'unlimited',
		filters: new Set()
	},
	'shuffle': {
		aliases: ['sh'],
		params: [],
		descrip: 'Várakozási sor megkeverése.',
		type: 'grantable',
		filters: new Set([Filter.dedicationNeeded, Filter.vcBotNeeded, Filter.vcUserNeeded, Filter.sameVcNeeded, Filter.naturalErrorNoNeeded])
	},
	'clear': {
		aliases: ['cl'],
		params: [],
		descrip: 'Várakozási sor törlése.',
		type: 'grantable',
		filters: new Set([Filter.dedicationNeeded, Filter.vcBotNeeded, Filter.vcUserNeeded, Filter.sameVcNeeded, Filter.naturalErrorNoNeeded])
	},
	'toplast': {
		aliases: ['top'],
		params: [],
		descrip: 'A sor utolsó elemének a sor elejére helyezése.',
		type: 'grantable',
		filters: new Set([Filter.dedicationNeeded, Filter.vcBotNeeded, Filter.vcUserNeeded, Filter.sameVcNeeded, Filter.naturalErrorNoNeeded])
	},
	'remove': {
		aliases: ['rm'],
		params: [
			{
				name: 'no',
				description: 'sorszám',
				required: true,
				type: 'Number'
			}
		],
		descrip: 'A várakozási sor adott elemének törlése sorszám szerint.',
		type: 'grantable',
		filters: new Set([Filter.dedicationNeeded, Filter.vcBotNeeded, Filter.vcUserNeeded, Filter.sameVcNeeded, Filter.naturalErrorNoNeeded, Filter.parameterNeeded])
	},
	'help': {
		aliases: ['h'],
		params: [
			{
				name: 'cmd',
				description: 'parancs (opcionális)',
				required: false,
				type: 'String'
			}
		],
		descrip: 'A bot általános tudnivalóinak megjelenítése. Parancsnév megadása esetén a megadott parancsról részletesebb ismertetés.',
		type: 'unlimited',
		filters: new Set()
	},
	'perms': {
		aliases: ['powers'],
		params: [],
		descrip: 'A parancsot kiadó felhasználó jogosultságainak listázása.',
		type: 'unlimited',
		filters: new Set()
	},
	'guilds': {
		aliases: [],
		params: [],
		descrip: 'A bot által elért szerverek listázása.',
		type: 'creatorsOnly',
		filters: new Set([Filter.creatorNeeded])
	},
	'connections': {
		aliases: ['conn'],
		params: [],
		descrip: 'A bot által éppen használt voice csatornák listázása.',
		type: 'creatorsOnly',
		filters: new Set([Filter.creatorNeeded])
	},
	'testradios': {
		aliases: ['tr'],
		params: [],
		descrip: 'A bot által éppen használt voice csatornák listázása.',
		type: 'creatorsOnly',
		filters: new Set([Filter.creatorNeeded])
	},
	'announce': {
		aliases: ['a'],
		params: [
			{
				name: 'target',
				description: 'ID/all/conn',
				required: true,
				type: 'String'
			},
			{
				name: 'msg',
				description: 'üzenet JS-sztringként',
				required: true,
				type: 'String'
			}
		],
		descrip: 'A paraméterben megadott szerverekre üzenet küldése. Az üzenetet egy soros JS-sztringként kell megírni! all=összes szerver, conn=a botot éppen használó szerverek',
		type: 'creatorsOnly',
		filters: new Set([Filter.creatorNeeded, Filter.parameterNeeded])
	},
	'partner': {
		aliases: [],
		params: [
			{
				name: 'inv',
				description: 'invite link\\n',
				required: true,
				type: 'String'
			},
			{
				name: 'msg',
				description: 'üzenet JS-sztringként\\n',
				required: true,
				type: 'String'
			},
			{
				name: 'username',
				description: 'felhasználónév\\n',
				required: true,
				type: 'String'
			},
			{
				name: 'serverName',
				description: 'szerver neve\\n',
				required: true,
				type: 'String'
			}],
		descrip: 'A partner webhookra küld egy üzenetet a felhasználó nevében. Ennek szövege az invite link, és mellé kerül egy embed, aminek a footerje a szerver neve, a tartalma pedig az üzenet sztringként kiértékelve.',
		type: 'creatorsOnly',
		filters: new Set([Filter.creatorNeeded, Filter.parameterNeeded])
	},
	'leaveguild': {
		aliases: ['lg'],
		params: [
			{
				name: 'id',
				description: 'ID',
				required: true,
				type: 'String'
			}
		],
		descrip: 'A bot kiléptetése a megadott ID-jű szerverről.',
		type: 'creatorsOnly',
		filters: new Set([Filter.creatorNeeded])
	},
	'voicecount': {
		aliases: ['vc'],
		params: [],
		descrip: 'Az aktív voice csatlakozások összeszámolása.',
		type: 'creatorsOnly',
		filters: new Set([Filter.creatorNeeded])
	},
	'fallback': {	
		aliases: ['f'],
		params: [
			{
				name: 'leave/silence/radio',
				description: 'leave/silence/radio',
				required: true,
				type: 'String'
			}
		],
		descrip: 'Fallback mód beállítása. A bot akkor kerül fallback módba, ha kiürül a játszási sor. A választható üzemmódok: kilépés (leave), csendes jelenlét (silence), az erre a célra beállított rádió stream lejátszása (radio, lásd még `fallbackradio` parancs).',
		type: 'grantable',
		filters: new Set([Filter.dedicationNeeded, Filter.parameterNeeded])
	},
	'fallbackradio': {
		aliases: ['fr'],
		params: [
			{
				name: 'ID / streamURL',
				description: 'ID / streamURL',
				required: true,
				type: 'String'
			}
		],
		descrip: 'Rádió fallback esetén játszandó adó beállítása stream URL vagy rádió id alapján. (Lásd még: `fallback` parancs.)',
		type: 'grantable',
		filters: new Set([Filter.dedicationNeeded, Filter.parameterNeeded])
	},
	'pause': {
		aliases: [],
		params: [],
		descrip: 'Az aktuálisan játszott stream szüneteltetése. (Figyelem: online stream eközben tovább haladhat.)',
		type: 'grantable',
		filters: new Set([Filter.dedicationNeeded, Filter.vcBotNeeded, Filter.vcUserNeeded, Filter.sameVcNeeded, Filter.naturalErrorNoNeeded, Filter.nonSilenceNeded])
	},
	'resume': {
		aliases: ['r'],
		params: [],
		descrip: 'Felfüggesztett stream folytatása. (Figyelem: online stream esetében ez ugrással járhat.)',
		type: 'grantable',
		filters: new Set([Filter.dedicationNeeded, Filter.vcBotNeeded, Filter.vcUserNeeded, Filter.sameVcNeeded, Filter.naturalErrorNoNeeded, Filter.nonSilenceNeded])
	},
	'tune': {
		aliases: ['t'],
		params: [
			{
				name: 'id',
				description: 'ID',
				required: true,
				type: 'String'
			}
		],
		descrip: 'Rádióadó ütemezése a sor végére (id szerint, lásd `radios` parancs). Ha rádió lejátszása van folyamatban, akkor az újonnan ütemezett rádió egyből behangolásra kerül.',
		type: 'unlimited',
		filters: new Set([Filter.vcBotNeeded, Filter.vcUserNeeded, Filter.sameVcNeeded, Filter.parameterNeeded])
	},
	'grant': {
		aliases: ['g'],
		params: [
			{
				name: 'commandSet',
				description: 'parancs1|parancs2|... / all',
				required: true,
				type: 'String'
			},
			{
				name: 'role',
				description: 'a kérdéses rang',
				required: true,
				type: 'Role'
			}
		],
		descrip: 'Új parancsok elérhetővé tétele egy role számára. Alapértelmezésben egyes parancsok csak adminisztrátoroknak elérhetők, ezt lehet felülírni ezzel a paranccsal.',
		type: 'adminOnly',
		filters: new Set([Filter.adminNeeded, Filter.parameterNeeded])
	},
	'granteveryone': {
		aliases: ['ge'],
		params: [
			{
				name: 'commandSet',
				description: 'parancs1|parancs2|... / all',
				required: true,
				type: 'String'
			}
		],
		descrip: 'Új parancsok elérhetővé tétele mindenki (az @everyone role) számára. Alapértelmezésben egyes parancsok csak adminisztrátoroknak elérhetők, ezt lehet felülírni ezzel a paranccsal.',
		type: 'adminOnly',
		filters: new Set([Filter.adminNeeded, Filter.parameterNeeded])
	},
	'deny': {
		aliases: ['d'],
		params: [
			{
				name: 'commandSet',
				description: 'parancs1|parancs2|... / all',
				required: true,
				type: 'String'
			},
			{
				name: 'role',
				description: 'a kérdéses rang',
				required: true,
				type: 'Role'
			}
		],
		descrip: 'Parancshasználat visszavonása egy role-tól. (Lásd még: `grant` parancs.)',
		type: 'adminOnly',
		filters: new Set([Filter.adminNeeded, Filter.parameterNeeded])
	},
	'denyeveryone': {
		aliases: ['de'],
		params: [
			{
				name: 'commandSet',
				description: 'parancs1|parancs2|... / all',
				required: true,
				type: 'String'
			}
		],
		descrip: 'Parancshasználat visszavonása az @everyone role - tól. (Lásd még: `grant` parancs.)',
		type: 'adminOnly',
		filters: new Set([Filter.adminNeeded, Filter.parameterNeeded])
	},
	'nowplaying': {
		aliases: ['np'],
		params: [],
		descrip: 'Az aktuálisan játszott stream lekérése.',
		type: 'unlimited',
		filters: new Set([Filter.vcBotNeeded])
	},
	'volume': {
		aliases: ['vol'],
		params: [
			{
				name: 'vol',
				description: 'hangerő (1-15)',
				required: true,
				type: 'Number'
			}
		],
		descrip: 'A bot hangerejének állítása. A beállítás a bot kilépéséig érvényes, a kezdőérték 5, ahol a 10 jelenti a teljes hangerőt, a 10 fölötti értékek arányos erősítést.',
		type: 'grantable',
		filters: new Set([Filter.parameterNeeded, Filter.vcBotNeeded, Filter.sameVcNeeded, Filter.naturalErrorNoNeeded, Filter.dedicationNeeded])
	},
	'mute': {
		aliases: [],
		params: [],
		descrip: 'A bot némítása - a megelőző hangerő visszaállítható (lásd `unmute` parancs).',
		type: 'grantable',
		filters: new Set([Filter.vcBotNeeded, Filter.vcUserNeeded, Filter.sameVcNeeded, Filter.naturalErrorNoNeeded, Filter.dedicationNeeded])
	},
	'unmute': {
		aliases: [],
		params: [],
		descrip: 'A bot hangerejének visszaállítása a némítás előtti értékre.',
		type: 'grantable',
		filters: new Set([Filter.vcBotNeeded, Filter.vcUserNeeded, Filter.sameVcNeeded, Filter.naturalErrorNoNeeded, Filter.dedicationNeeded])
	}
} as const);

type CommandData = typeof commandData;
type TypeFromParam<T> = T extends 'Number' ? number :
			T extends 'String' ? string :
			T extends 'Role' ? 'Role' :
			unknown;
type CompileTimeArray<T, V> = {
	[K in keyof T]: V
};
type MappedArgs<T extends CompileTimeArray<C, ParameterData>, C> = { [K in keyof T]: TypeFromParam<T[K]['type']> };
type ActionArgs<Key extends keyof CommandData> = MappedArgs<CommandData[Key]['params'], CommandData[keyof CommandData]['params']> & MappedArgs<CommandData[keyof CommandData]['params'], CommandData[keyof CommandData]['params']>;
export type Actions = {
	[commandName in keyof CommandData]: (this: ThisBinding, ...args: ActionArgs<commandName>) => Resolvable<void>;
};
/*

/*setupCommand({
	name: 'soundcloud',
	aliases: ['sc'],
	params: ['cím'],
	descrip: 'Soundcloud stream sorba ütemezése keresőszó alapján. A választás a bot által elhelyezett reakciók szerint történik.',
	type: 'unlimited',
	filters: new Set([Filter.vcUserNeeded, Filter.eventualVcBotNeeded, Filter.sameOrNoBotVcNeeded, Filter.parameterNeeded])
});

setupMessageCommand({
	name: 'seek',
	aliases: [],
	params: ['időpont (másodperc)'],
	descrip: 'Az éppen játszott stream pozíciójának állítása.',
	type: 'grantable',
	filters: new Set([Filter.parameterNeeded, Filter.vcBotNeeded, Filter.sameVcNeeded, Filter.naturalErrorNoNeeded, Filter.dedicationNeeded]) //TODO: rádiónál lehessen?
});*/

export const debatedCommands = [...commands].filter(entry => entry[1].type == 'grantable').map(entry=>entry[0]);
await setupMessageCommands(commandData);
/*
const commands = .map(command => command.toJSON());*/
/*
try {
	await rest.put(Routes.applicationCommands(clientId), { body: commands });
	await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands })
	console.log('Successfully registered application commands.');
}
catch (e) {
	console.error(e);
}*/