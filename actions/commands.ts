import { actions, Command, Filter, ParameterData, ThisBinding, Resolvable, SupportedCommandOptionTypes, TypeFromParam, commandsCachePath } from '../internal.js';
import { SlashCommandBuilder, Snowflake } from 'discord.js';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import { tsObjectEntries } from 'ts-type-object-entries';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import stringify from 'json-stringify-deterministic';

const token = process.env.radioToken;
const clientId = process.env.botId;
const guildId = process.env.testServerId;
const rest = new REST({ version: '10' }).setToken(token);
const hashAlgorithm = 'sha256';
const textualForm = 'base64'

export const commands: Map<string, Command> = new Map();

function addParam(commandBuilder: SlashCommandBuilder, param: ParameterData) {
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

type CommandDataEntries = [keyof CommandData, CommandData[keyof CommandData]][];
const setupCommands = (commandList: CommandDataEntries, defPermission: boolean) => commandList.map(([cmdName, cmdInfo]) => {
	commands.set(cmdName, new Command(Object.assign({
		action: actions[cmdName],
		name: cmdName
	}, cmdInfo)));
	const res = new SlashCommandBuilder()
		.setName(cmdName.toLowerCase())
		.setDefaultPermission(defPermission)
		.setDescription(cmdInfo.descrip.slice(0, 100));
	for (const param of cmdInfo.params) {
		addParam(res, param);
	}
	return res;
}).map(command => command.toJSON());

const commandsCache = await readFile(commandsCachePath, { encoding: 'utf-8' })
							.then(data => JSON.parse(data), _ => null)
						?? {};
async function installGlobalCommands(commands: unknown): Promise<boolean> { //érték: cache frissül vagy nem
	const commandsHashed = createHash(hashAlgorithm)
							.update(stringify(commands))
							.digest(textualForm);
	if (commandsCache['global'] == commandsHashed) {
		console.log('Cache hit for global commands.\nNo need to register commands.');
		return false;
	}
	await rest.put(Routes.applicationCommands(clientId), { body: commands });
	commandsCache['global'] = commandsHashed;
	return true;
}
async function installGuildedCommands(guildId: Snowflake, commands: unknown): Promise<boolean> { //érték: cache frissül vagy nem
	const commandsHashed = createHash(hashAlgorithm)
							.update(stringify(commands))
							.digest(textualForm);
	if (commandsCache['guilded']?.[guildId] == commandsHashed) {
		console.log(`Cache hit for commands for guild ${guildId}.\nNo need to register commands.`);
		return false;
	}
	await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
	commandsCache['guilded'] ??= {};
	commandsCache['guilded'][guildId] = commandsHashed;
	return true;
}

async function setupMessageCommands(allCommandData: CommandData) {
	const devCommands:CommandDataEntries = tsObjectEntries(allCommandData).filter(([_name, info]) => info.type == 'creatorsOnly');
	const devCommandsSerial = setupCommands(devCommands, false);
	const publicCommands:CommandDataEntries = tsObjectEntries(allCommandData).filter(([_name, info]) => info.type != 'creatorsOnly');
	const publicCommandsSerial = setupCommands(publicCommands, true);
	let cacheUpdate = false;
	cacheUpdate ||= await installGlobalCommands(publicCommandsSerial);
	cacheUpdate ||= await installGuildedCommands(guildId, devCommandsSerial);
	if (cacheUpdate)
		await writeFile(commandsCachePath, JSON.stringify(commandsCache));
}

const commandData = {
	'skip': {
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
		params: [],
		descrip: 'A várakozási sor tartalmának kiírása.',
		type: 'unlimited',
		filters: new Set([Filter.vcBotNeeded])
	},
	'join': {
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
		params: [],
		descrip: 'Bot csatlakoztatása egyből fallback állapotban.',
		type: 'unlimited',
		filters: new Set([Filter.noBotVcNeeded, Filter.vcUserNeeded, Filter.eventualVcBotNeeded, Filter.playingFallbackNeeded])
	},
	'yt': {
		params: [
            {
				name: 'ytQuery',
				description: 'URL / cím',
				required: true,
				type: 'String'
				
			}
		],
		descrip: 'Youtube stream sorba ütemezése URL vagy keresőszó alapján. Keresőszó esetén a választás a lenyíló menüvel történik.',
		type: 'unlimited',
		filters: new Set([Filter.vcUserNeeded, Filter.eventualVcBotNeeded, Filter.sameOrNoBotVcNeeded])
	},
    'soundcloud': {
        params: [
            {
                name: 'scQuery',
                description: 'soundcloud URL',
                required: true,
                type: 'String'
            }
        ],
        descrip: 'Soundcloud stream sorba ütemezése URL alapján.',
        type: 'unlimited',
        filters: new Set([Filter.vcUserNeeded, Filter.eventualVcBotNeeded, Filter.sameOrNoBotVcNeeded])
    },
	'custom': {
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
		filters: new Set([Filter.vcUserNeeded, Filter.eventualVcBotNeeded, Filter.sameOrNoBotVcNeeded])
	},
	'leave': {
		params: [],
		descrip: 'Bot lecsatlakoztatása.',
		type: 'grantable',
		filters: new Set([Filter.vcBotNeeded, Filter.leaveCriteria])
	},
	'repeat': {
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
		filters: new Set([Filter.dedicationNeeded, Filter.vcBotNeeded, Filter.vcUserNeeded, Filter.sameVcNeeded, Filter.stateErrorNoNeeded])
	},
	'radios': {
		params: [],
		descrip: 'Rádió lista megjelenítése.',
		type: 'unlimited',
		filters: new Set()
	},
	'shuffle': {
		params: [],
		descrip: 'Várakozási sor megkeverése.',
		type: 'grantable',
		filters: new Set([Filter.dedicationNeeded, Filter.vcBotNeeded, Filter.vcUserNeeded, Filter.sameVcNeeded, Filter.stateErrorNoNeeded])
	},
	'clear': {
		params: [],
		descrip: 'Várakozási sor törlése.',
		type: 'grantable',
		filters: new Set([Filter.dedicationNeeded, Filter.vcBotNeeded, Filter.vcUserNeeded, Filter.sameVcNeeded, Filter.stateErrorNoNeeded])
	},
	'toplast': {
		params: [],
		descrip: 'A sor utolsó elemének a sor elejére helyezése.',
		type: 'grantable',
		filters: new Set([Filter.dedicationNeeded, Filter.vcBotNeeded, Filter.vcUserNeeded, Filter.sameVcNeeded, Filter.stateErrorNoNeeded])
	},
	'remove': {
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
		filters: new Set([Filter.dedicationNeeded, Filter.vcBotNeeded, Filter.vcUserNeeded, Filter.sameVcNeeded, Filter.stateErrorNoNeeded])
	},
	'help': {
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
		params: [],
		descrip: 'A parancsot kiadó felhasználó jogosultságainak listázása.',
		type: 'unlimited',
		filters: new Set()
	},
	'guilds': {
		params: [],
		descrip: 'A bot által elért szerverek listázása.',
		type: 'creatorsOnly',
		filters: new Set([Filter.creatorNeeded])
	},
	'connections': {
		params: [],
		descrip: 'A bot által éppen használt voice csatornák listázása.',
		type: 'creatorsOnly',
		filters: new Set([Filter.creatorNeeded])
	},
	'testradios': {
		params: [],
		descrip: 'A bot által éppen használt voice csatornák listázása.',
		type: 'creatorsOnly',
		filters: new Set([Filter.creatorNeeded])
	},
	'announce': {
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
		filters: new Set([Filter.creatorNeeded])
	},
	'partner': {
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
		filters: new Set([Filter.creatorNeeded])
	},
	'leaveguild': {
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
		params: [],
		descrip: 'Az aktív voice csatlakozások összeszámolása.',
		type: 'creatorsOnly',
		filters: new Set([Filter.creatorNeeded])
	},
	'fallback': {	
		params: [
			{
				name: 'choice',
				description: 'leave/silence/radio',
				required: true,
				type: 'String'
			}
		],
		descrip: 'Fallback mód beállítása. A bot akkor kerül fallback módba, ha kiürül a játszási sor. A választható üzemmódok: kilépés (leave), csendes jelenlét (silence), az erre a célra beállított rádió stream lejátszása (radio, lásd még `fallbackradio` parancs).',
		type: 'grantable',
		filters: new Set([Filter.dedicationNeeded])
	},
	'fallbackradio': {
		params: [
			{
				name: 'idOrStreamUrl',
				description: 'ID / streamURL',
				required: true,
				type: 'String'
			}
		],
		descrip: 'Rádió fallback esetén játszandó adó beállítása stream URL vagy rádió id alapján. (Lásd még: `fallback` parancs.)',
		type: 'grantable',
		filters: new Set([Filter.dedicationNeeded])
	},
	'pause': {
		params: [],
		descrip: 'Az aktuálisan játszott stream szüneteltetése. (Figyelem: online stream eközben tovább haladhat.)',
		type: 'grantable',
		filters: new Set([Filter.dedicationNeeded, Filter.vcBotNeeded, Filter.vcUserNeeded, Filter.sameVcNeeded, Filter.stateErrorNoNeeded, Filter.nonSilenceNeded])
	},
	'resume': {
		params: [],
		descrip: 'Felfüggesztett stream folytatása. (Figyelem: online stream esetében ez ugrással járhat.)',
		type: 'grantable',
		filters: new Set([Filter.dedicationNeeded, Filter.vcBotNeeded, Filter.vcUserNeeded, Filter.sameVcNeeded, Filter.stateErrorNoNeeded, Filter.nonSilenceNeded])
	},
	'tune': {
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
		filters: new Set([Filter.vcBotNeeded, Filter.vcUserNeeded, Filter.sameVcNeeded])
	},
	'grant': {
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
		filters: new Set([Filter.adminNeeded])
	},
	'deny': {
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
		filters: new Set([Filter.adminNeeded])
	},
	'nowplaying': {
		params: [],
		descrip: 'Az aktuálisan játszott stream lekérése.',
		type: 'unlimited',
		filters: new Set([Filter.vcBotNeeded])
	},
	'volume': {
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
		filters: new Set([Filter.vcBotNeeded, Filter.sameVcNeeded, Filter.stateErrorNoNeeded, Filter.dedicationNeeded])
	},
	'mute': {
		params: [],
		descrip: 'A bot némítása - a megelőző hangerő visszaállítható (lásd `unmute` parancs).',
		type: 'grantable',
		filters: new Set([Filter.vcBotNeeded, Filter.vcUserNeeded, Filter.sameVcNeeded, Filter.stateErrorNoNeeded, Filter.dedicationNeeded])
	},
	'unmute': {
		params: [],
		descrip: 'A bot hangerejének visszaállítása a némítás előtti értékre.',
		type: 'grantable',
		filters: new Set([Filter.vcBotNeeded, Filter.vcUserNeeded, Filter.sameVcNeeded, Filter.stateErrorNoNeeded, Filter.dedicationNeeded])
	}
} as const;

type CommandData = typeof commandData;
type CompileTimeArray<T, V> = {
	[K in keyof T]: V
};
type MappedArgs<T extends CompileTimeArray<C, ParameterData>, C> = { [K in keyof T]: TypeFromParam<T[K]['type']> };
type ActionArgs<Key extends keyof CommandData> = MappedArgs<CommandData[Key]['params'], CommandData[keyof CommandData]['params']> & MappedArgs<CommandData[keyof CommandData]['params'], CommandData[keyof CommandData]['params']>;
export type Actions = {
	[commandName in keyof CommandData]: (this: ThisBinding, ...args: ActionArgs<commandName>) => Resolvable<void>;
};
export type Action = Actions[keyof Actions];
export type ActionParams = Parameters<Action>; //TODO: fix this
/*

setupMessageCommand({
	name: 'seek',
	params: ['időpont (másodperc)'],
	descrip: 'Az éppen játszott stream pozíciójának állítása.',
	type: 'grantable',
	filters: new Set([Filter.parameterNeeded, Filter.vcBotNeeded, Filter.sameVcNeeded, Filter.naturalErrorNoNeeded, Filter.dedicationNeeded]) //TODO: rádiónál lehessen?
});*/

await setupMessageCommands(commandData);
export const debatedCommands = [...commands].filter(entry => entry[1].type == 'grantable').map(entry=>entry[0]);

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