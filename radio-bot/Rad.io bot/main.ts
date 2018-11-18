import * as Discord from 'discord.js';
import * as Common from './common-types';
const { helpCommands } = require('./help-embed');
const client = new Discord.Client();
const token = process.env.radioToken;
const apiKey = process.env.youtubeApiKey;
const sscanf = require('scanf').sscanf;
//const fs = require('fs');
const sql = require('sqlite');
import { defaultConfig, radios, embedC} from './vc-constants';
//const streamOptions = { seek: 0, volume: 1 };
import * as moment from 'moment';
import { isAloneUser, rejectReply, pass, isAloneBot, choiceFilter, adminNeeded, vcUserNeeded, sameVcBanned, sameVcNeeded, vcBotNeeded, noBotVcNeeded, sameOrNoBotVcNeeded, adminOrPermissionNeeded, creatorNeeded, vcPermissionNeeded, creatorIds } from './vc-decorators';
import {GuildPlayer} from './guild-player';
import {getEmoji} from './common-resources';
const isFallback=(ctx:Common.ThisBinding)=>ctx.guildPlayer.fallbackPlayed;
const nonFallbackNeeded=choiceFilter(isFallback,rejectReply('**fallback-et nem lehet skippelni (leave-eld a botot vagy ütemezz be valamilyen zenét).**'),pass);
const parameterNeeded = (action:Common.Action) => function (param:string) {
	if (!sscanf(param, '%S'))
		commands.help.call(this, this.cmdName);
	else
		action.call(this, param);
};
const aggregateDecorators = (decorators:Common.Decorator[]) => (action:Common.Action) => decorators.reduceRight((act, dec) => dec(act), action);
function decorateCommand(cmdName:string, decorators:Common.Decorator[]) { //TODO ez se string, mindenképpen át kell dolgozni a parancsokat
	commands[cmdName] = aggregateDecorators(decorators)(commands[cmdName]/*,cmdName*/);
}; 
const decorators = {
	setprefix: [adminNeeded, parameterNeeded],
	fallbackradio: [adminNeeded, parameterNeeded],
	fallback: [adminNeeded, parameterNeeded],
	grant: [adminNeeded, parameterNeeded],
	granteveryone: [adminNeeded, parameterNeeded],
	deny: [adminNeeded, parameterNeeded],
	denyeveryone: [adminNeeded, parameterNeeded],
	yt: [vcUserNeeded, vcPermissionNeeded, sameOrNoBotVcNeeded, parameterNeeded],
	custom: [vcUserNeeded, vcPermissionNeeded, sameOrNoBotVcNeeded, parameterNeeded],
	join: [noBotVcNeeded, vcUserNeeded, vcPermissionNeeded, sameVcBanned],
	skip: [choiceFilter(isAloneUser, pass, adminOrPermissionNeeded), vcBotNeeded, vcUserNeeded, sameVcNeeded, nonFallbackNeeded],
	shuffle: [choiceFilter(isAloneUser, pass, adminOrPermissionNeeded), vcBotNeeded, sameVcNeeded],
	leave: [vcBotNeeded, choiceFilter(isAloneBot, pass, aggregateDecorators([vcUserNeeded, choiceFilter(isAloneUser, pass, adminOrPermissionNeeded)]))],
	tune: [vcBotNeeded, vcUserNeeded, sameVcNeeded, parameterNeeded],
	guilds: [creatorNeeded],
	voicecount: [creatorNeeded],
	repeat: [vcBotNeeded, vcUserNeeded, sameVcNeeded],
	queue: [vcBotNeeded],
	nowplaying: [vcBotNeeded],
	volume: [vcBotNeeded, vcUserNeeded, sameVcNeeded],
	mute: [vcBotNeeded, vcUserNeeded, sameVcNeeded],
	unmute: [vcBotNeeded, vcUserNeeded, sameVcNeeded]
};
import { YouTube, Video } from 'better-youtube-api';
const youtube = new YouTube(apiKey);
const devChannel = () => client.channels.get('470574072565202944');
let config: Common.Config;
let guildPlayers:Map<Discord.Snowflake,GuildPlayer>=new Map();
sql.open("./radio.sqlite");

function commonEmbed(cmd:string) { //TODO ez sem akármilyen string, hanem parancsnév
	let prefix = config.prefixes.get(this.guild.id) || defaultConfig.prefix;
	return new Discord.RichEmbed()
		.setColor(embedC)
		.setFooter(`${prefix}${cmd} - ${client.user.username}`, client.user.avatarURL)
		.setTimestamp();
};
function hourMinSec(minutes:number, seconds:number) { //a seconds bugosnak bizonyult
	let hours = Math.floor(minutes / 60);
	minutes %= 60;
	return [hours, minutes, seconds].map(amount => amount.toString().padStart(2, '0')).join(':');
};
function scrollRequest(message: Discord.Message, currentPage: number, allPages: number) {
	let res = new Promise(async (resolve, reject) => {
		let emojis:string[] = [];
		if (currentPage > 1)
			emojis.push('◀');
		if (currentPage < allPages)
			emojis.push('▶');
		const filter = (reaction: Discord.MessageReaction, user: Discord.User) => emojis.some(emoji => reaction.emoji.name === emoji) && user.id == this.author.id;
		const collector = message.createReactionCollector(filter, { maxEmojis: 1, time: 10000 });
		collector.on('collect', r => {
			resolve(r.emoji.name == '◀' ? currentPage - 1 : currentPage + 1);
			collector.stop();
		});
		collector.on('end', _ => {
			reject(' lejárt az idő.');
		});
		for (let emoji of emojis) {
			let reaction = await message.react(emoji);
			res
				.then(_ => reaction.remove(client.user), _ => reaction.remove(client.user));
		}
	});
	return res;
};

async function saveRow(rowObj:any, type:Common.TableName) { //a rowObj nem any, igazából ezt szét kéne dobni külön függvényekbe
	switch (type) {
		case 'prefix':
			await sql.run(`DELETE FROM ${type} WHERE guildID = ?`, rowObj.guildID);
			await sql.run(`INSERT INTO ${type} (guildID, prefix) VALUES (?, ?)`, [rowObj.guildID, rowObj.prefix]);
			break;
		case 'fallbackModes':
			await sql.run(`DELETE FROM ${type} WHERE guildID = ?`, rowObj.guildID);
			await sql.run(`INSERT INTO ${type} (guildID, type) VALUES (?, ?)`, [rowObj.guildID, rowObj.type]);
			break;
		case 'fallbackData':
			await sql.run(`DELETE FROM ${type} WHERE guildID = ?`, rowObj.guildID);
			await sql.run(`INSERT INTO ${type} (guildID, type, name, url) VALUES (?, ?, ?, ?)`, [rowObj.guildID, rowObj.type, rowObj.name, rowObj.url]);
			break;
		case 'role':
			await sql.run(`DELETE FROM ${type} WHERE (guildID = ?) AND (roleID = ?)`, [rowObj.guildID, rowObj.roleID]);
			await sql.run(`INSERT INTO ${type} (guildID, roleID, commands) VALUES (?, ?, ?)`, [rowObj.guildID, rowObj.roleID, rowObj.commands]);
			break;
	};
};
/*
async function refreshDB() {
	const json = JSON.parse(fs.readFileSync('vc-config.json'));

	await sql.run('CREATE TABLE IF NOT EXISTS prefix (guildID TEXT, prefix TEXT)').catch(console.error);
	await sql.run('CREATE TABLE IF NOT EXISTS fallbackModes (guildID TEXT, type TEXT)').catch(console.error);
	await sql.run('CREATE TABLE IF NOT EXISTS fallbackData (guildID TEXT, type TEXT, name TEXT, url TEXT)').catch(console.error);
	await sql.run('CREATE TABLE IF NOT EXISTS role (guildID TEXT, roleID TEXT, commands TEXT)').catch(console.error);

	for (let guildID in json.prefixes) {
		await sql.run('INSERT INTO prefix (guildID, prefix) VALUES (?, ?)', [guildID, json.prefixes[guildID]]);
	}

	for (let guildID in json.fallbackModes) {
		await sql.run('INSERT INTO fallbackModes (guildID, type) VALUES (?, ?)', [guildID, json.fallbackModes[guildID]]);
	}

	for (let guildID in json.fallbackChannels) {
		await sql.run('INSERT INTO fallbackData (guildID, type, name, url) VALUES (?, ?, ?, ?)', [guildID, json.fallbackChannels[guildID].type, json.fallbackChannels[guildID].name, json.fallbackChannels[guildID].url]);
	}

	for (let guildID in json.roles) {
		for (let roleID in json.roles[guildID])
			await sql.run('INSERT INTO role (guildID, roleID, commands) VALUES (?, ?, ?)', [guildID, roleID, json.roles[guildID][roleID].join('|')]);
	}
};
*/
async function loadCFG() {
	let prefixes: Map<Discord.Snowflake, string> = new Map();
	let fallbackModes: Map<Discord.Snowflake, string> = new Map();
	let fallbackData: Map<Discord.Snowflake,Common.MusicData> = new Map();
	let roles: Map<Discord.Snowflake,Map<Discord.Snowflake,string[]>> = new Map();
	let selectPromises:Promise<void>[]=[
		sql.all('SELECT * FROM prefix').then(prefixRows => prefixRows.forEach(prefixRow => prefixes.set(prefixRow.guildID,prefixRow.prefix))),
		sql.all('SELECT * FROM fallbackModes').then(fbmRows => fbmRows.forEach(fbmRow => fallbackModes.set(fbmRow.guildID,fbmRow.type))),
		sql.all('SELECT * FROM fallbackData').then(fbdRows => fbdRows.forEach(fbdRow => fallbackData.set(fbdRow.guildID,{ type: fbdRow.type, name: fbdRow.name, url: fbdRow.url }))),
		sql.all('SELECT * FROM role').then(roleRows => roleRows.forEach(roleRow => roles.set(roleRow.guildID,new Map([...attach(roles,roleRow.guildID,new Map()), [roleRow.roleID, roleRow.commands.split('|')] ]))))
	];
	await Promise.all(selectPromises).catch(console.error);

	config = {
		prefixes: prefixes,
		fallbackModes: fallbackModes,
		fallbackChannels: fallbackData,
		roles: roles
	};
	console.log(config);
};

const channels:string[] = [...radios.keys()];

client.on('ready', () => {
	console.log(`${client.user.tag}: client online, on ${client.guilds.size} guilds, with ${client.users.size} users.`);
	loadCFG();
	setPStatus();
	updateStatusChannels();
	//refreshDB();
});
const aliases = {
	'c': 'custom',
	'sh': 'shuffle',
	'q': 'queue',
	'sp': 'setprefix',
	'f': 'fallback',
	'fr': 'fallbackradio',
	'vc': 'voicecount',
	's': 'skip',
	'np': 'nowplaying',
	'vol': 'volume',
	'h': 'help',
	'l': 'leave',
	'g': 'grant',
	'ge': 'granteveryone',
	'd': 'deny',
	'de': 'denyeveryone'
};
const debatedCommands = ['shuffle', 'skip', 'leave'];
function attach<T>(baseDict:Map<Discord.Snowflake,T>, guildId:Discord.Snowflake, defaultValue:T) {
	baseDict=baseDict.get(guildId)? baseDict:baseDict.set(guildId, defaultValue);
	return baseDict.get(guildId);
};
async function forceSchedule(textChannel:Discord.TextChannel, voiceChannel:Discord.VoiceChannel, holder:Common.GuildPlayerHolder, playableData:Common.MusicData) {
	if (!voiceChannel.connection) {
		await voiceChannel.join();
		holder.guildPlayer = new GuildPlayer(config,voiceChannel.guild, textChannel, playableData);
		return;
	}
	holder.guildPlayer.schedule(playableData);
};
/*
function saveJSON(object, fileName:string) {
	fs.writeFileSync(fileName, JSON.stringify(object));
};
*/
let commands = {
	async join(param:string) {
		let voiceChannel:Discord.VoiceChannel = this.member.voiceChannel;
		let channelToPlay = sscanf(param, '%s') || '';
		let randChannel = randomElement(channels);
		if (channelToPlay && !radios.has(channelToPlay)) {
			channelToPlay = randChannel;
			this.channel.send("**Hibás csatorna nevet adtál meg, ezért egy random csatorna kerül lejátszásra!**");
		}
		try {
			await voiceChannel.join();
			this.channel.send('**Csatlakozva.**');
			this.guildPlayer = new GuildPlayer(config,this.guild, this.channel);
			if (channelToPlay)
				this.guildPlayer.schedule(Object.assign({ type: 'radio' }, radios.get(channelToPlay)));
		}
		catch (ex) {
			this.channel.send('**Hiba a csatlakozás során.**');
			console.error(ex);
		}
	},
	async yt(param: string):Promise<void> {
		let voiceChannel:Discord.VoiceChannel = this.member.voiceChannel;
		param = param.trim();
		if (param.search(/https?:\/\//) == 0) {
			let ytVideo = await youtube.getVideoByUrl(param);
			return void forceSchedule(this.channel, voiceChannel, this, {
				name: ytVideo.title,
				url: param,
				type: 'yt'
			});
		}
		let ytString = sscanf(param, '%S') || '';
		try {
			let results = await youtube.searchVideos(encodeURI(ytString), 5);
			if (!results || results.length == 0)
				return void this.reply('nincs találat.');
			await Promise.all(results.map((elem:Video) => elem.fetch()));
			try {
				var message, embed;
				var selectedResult;
				if (results.length == 1)
					selectedResult = results[0];
				else if (!this.guild.member(client.user).permissions.has('ADD_REACTIONS')) {
					this.channel.send('** Az opciók közüli választáshoz a botnak **`ADD_REACTIONS`** jogosultságra van szüksége.\nAutomatikusan az első opció kiválasztva. **').catch(console.log);
					selectedResult = results[0];
				}
				else {
					const emojis = ['1⃣', '2⃣', '3⃣', '4⃣', '5⃣'].slice(0, results.length);
					let selectionPromise: Promise<number> = new Promise(async (resolve, reject) => {
						let counter = 1;
						embed = commonEmbed.call(this, 'yt')
							.setTitle("❯ Találatok")
							.setDescription(results.map((elem:Video) => `__${counter++}.__ - ${elem.title} \`(${hourMinSec(elem.minutes, elem.seconds)})\``).join('\n'));
						message = await this.channel.send(embed);
						const filter = (reaction: Discord.MessageReaction, user: Discord.User) => emojis.some(emoji => reaction.emoji.name === emoji) && user.id == this.author.id;
						const collector = message.createReactionCollector(filter, { maxEmojis: 1, time: 30000 });
						collector.on('collect', (r: Discord.MessageReaction) => {
							let index = emojis.indexOf(r.emoji.name);
							resolve(index);
							collector.stop();
						});
						collector.on('end', (_:any) => reject('Lejárt a választási idő.'));
						for (let emoji of emojis) {
							let reaction = await message.react(emoji);
							selectionPromise.then(_ => reaction.remove(client.user), _ => reaction.remove(client.user));
						}

					});
					let which = await selectionPromise;
					selectedResult = results[which];
				}
			}
			catch (err) {
				if (typeof err != 'string')
					return void console.log(err);
				embed.setTitle(`❯ Találatok - ${err}`);
				message.edit(embed);
				return;
			}
			forceSchedule(this.channel, voiceChannel, this, {
				name: selectedResult.title,
				url: selectedResult.url,
				type: 'yt'
			});
		}
		catch (e) {
			console.log(e);
			this.channel.send('**Hiba a keresés során.**');
		}
	},
	async custom(param: string) {
		let voiceChannel:Discord.VoiceChannel = this.member.voiceChannel;
		let url = sscanf(param, '%s') || '';
		forceSchedule(this.channel, voiceChannel, this, {
			name: 'Custom',
			url,
			type: 'custom'
		});
	},
	leave(_: string) {
		let guildPlayer:GuildPlayer = this.guildPlayer;
		this.channel.send('**Kilépés**');
		guildPlayer.leave();
		this.guildPlayer=undefined; //guildPlayer törlése így tehető meg
	},
	repeat(param: string):void {
		let count = sscanf(param, '%d');
		if (count <= 0 && count != null)
			return void this.reply('pozitív számot kell megadni.');
		try {
			this.guildPlayer.repeat(count);
			this.channel.send('**Ismétlés felülírva.**');
		}
		catch (ex) {
			this.reply(`hiba - ${ex}`);
		}
	},
	radios(_: string) {
		function listRadios(lang: string) { //TODO ez is enum: kultkód/nyelvkód
			let res = [];
			for (let [key,value] of radios) {
				if (value.cult == lang)
					res.push(`${value.name}** ID:** *${key}*`);
			}
			return res.join('\n');
		}
		let prefix = config.prefixes.get(this.guild.id) || defaultConfig.prefix;
		const embed = commonEmbed.call(this, 'radios')
			.addField('❯ Magyar rádiók', listRadios('hun'), true)
			.addField('❯ Külföldi rádiók', listRadios('eng'), true)
			.addField('❯ Használat', `\`${prefix}join <ID>\`\n\`${prefix}tune <ID>\``);
		this.channel.send({ embed }).catch(console.error);
	},
	async shuffle(_:string) {
		try {
			this.guildPlayer.shuffle();
			this.channel.send('**Sor megkeverve.**');
		}
		catch (ex) {
			this.reply(`hiba - ${ex}`);
		}
	},
	help(param: string):void {
		let prefix = config.prefixes.get(this.guild.id) || defaultConfig.prefix;
		let helpCommand = sscanf(param, '%s');
		if (!helpCommand) {
			const embed = commonEmbed.call(this, 'help')
				.addField('❯ Felhasználói parancsok', Object.keys(helpCommands.userCommands).map(cmd => `\`${cmd}\``).join(' '))
				.addField('❯ Adminisztratív parancsok', Object.keys(helpCommands.adminCommands).map(cmd => `\`${cmd}\``).join(' '))
				.addField('❯ Részletes leírás', `\`${prefix}help <command>\``)
				.addField('❯ Egyéb információk', `RAD.io meghívása saját szerverre: [Ide kattintva](https://discordapp.com/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot)
Meghívó a RAD.io Development szerverre: [discord.gg/C83h4Sk](https://discord.gg/C83h4Sk)
A bot fejlesztői: ${client.users.get(creatorIds[0]) ? client.users.get(creatorIds[0]).tag : 'Nemokosch#9980'}, ${client.users.get(creatorIds[1]) ? client.users.get(creatorIds[1]).tag : 'garton#8800'}`);
			return void this.channel.send({ embed }).catch(console.error);
		}
		helpCommand = aliases[helpCommand] || helpCommand;
		let allCommands = Object.assign({}, helpCommands.userCommands, helpCommands.adminCommands);
		if (helpCommand in allCommands) {
			let currentAliases = Object.entries(aliases).filter(entry => entry[1] == helpCommand).map(entry => entry[0]);
			currentAliases.sort();
			const embed = commonEmbed.call(this, `help ${helpCommand}`)
				.addField('❯ Részletes leírás', allCommands[helpCommand].description)
				.addField('❯ Teljes parancs', `\`${prefix}${helpCommand} ${allCommands[helpCommand].attributes ? allCommands[helpCommand].attributes.map((attribute:string) => `<${attribute}>`).join(' ') : ''}\``)
				.addField('❯ Használat feltételei', allCommands[helpCommand].requirements || '-')
				.addField('❯ Alias-ok', currentAliases.length == 0 ? 'Nincs alias a parancshoz.' : currentAliases.map(alias => `\`${prefix}${alias}\``).join(' '));
			return void this.channel.send({ embed }).catch(console.error);
		}
		this.reply('nincs ilyen nevű parancs.').catch(console.error);
	},
	async guilds(_: string) {
		let guildLines = client.guilds.map(g => g.name + " **=>** `" + g.id + "`" + ` (${g.memberCount})`);
		const embed = commonEmbed.call(this, 'guilds')
			.setTitle(`❯ ${client.user.username} on ${client.guilds.size} guilds with ${client.users.size} users.`);
		let currentPage = 1;
		let maxPage = Math.ceil(guildLines.length / 10);
		let currentDescription = guildLines.slice((currentPage - 1) * 10, currentPage * 10).join('\n');
		let completeEmbed = embed.setDescription(currentDescription);
		let message = await this.channel.send({ embed: completeEmbed });
		while (true) {
			try {
				currentPage = await scrollRequest.call(this, message, currentPage, maxPage);
				message.clearReactions().catch(console.log);
			}
			catch (ex) {

				message.clearReactions().catch(console.log);
				break;
			}
			let currentDescription = guildLines.slice((currentPage - 1) * 10, currentPage * 10).join('\n');
			completeEmbed = embed.setDescription(currentDescription);
			await message.edit({ embed: completeEmbed });
		}
	},
	voicecount(_: string) {
		this.channel.send(`${client.voiceConnections.array().length} voice connection(s) right now.`);
	},
	async setprefix(param: string): Promise<void> {
		if (!param)
			return void this.reply('ez nem lehet prefix!');
		let newPrefix = param.toLowerCase();
		config.prefixes.set(this.guild.id, newPrefix);
		try {
			await saveRow({ guildID: this.guild.id, prefix: newPrefix }, 'prefix');
			this.channel.send(`${newPrefix} **az új prefix.**`).catch(() => { });
		}
		catch (e) {
			console.error('Elmenteni nem sikerült a configot!');
			console.error(e);
			this.channel.send(`${newPrefix} **a prefix, de csak leállásig...**`).catch(console.error);
		}
	},
	async queue(_: string): Promise<void> {
		let queue:Common.MusicData[] = this.guildPlayer.getQueueData();
		if (queue.length == 0)
			return void this.channel.send('**A sor jelenleg üres.**');
		const queueLines = queue.map(elem => `${getEmoji(elem.type)} ${elem.name}`);
		let currentPage = 1;
		let maxPage = Math.ceil(queueLines.length / 10);
		const embed = commonEmbed.call(this, 'queue');
		let currentDescription = queueLines.slice((currentPage - 1) * 10, currentPage * 10).join('\n');
		let completeEmbed = embed
			.setTitle(`❯ Lista (felül: legkorábbi) Oldal: ${currentPage}/${maxPage}`)
			.setDescription(currentDescription);
		let message = await this.channel.send({ embed: completeEmbed });
		while (true) {
			try {
				currentPage = await scrollRequest.call(this, message, currentPage, maxPage);
			}
			catch (ex) {
				break;
			}
			let currentDescription = queueLines.slice((currentPage - 1) * 10, currentPage * 10).join('\n');
			completeEmbed = embed
				.setTitle(`Lista (felül: legkorábbi) Oldal: ${currentPage}/${maxPage}`)
				.setDescription(currentDescription);
			await message.edit({ embed: completeEmbed });
		}
	},
	async fallback(param: string): Promise<void>{
		const aliases = {
			'r': 'radio',
			's': 'silence',
			'l': 'leave'
		};
		let mode = sscanf(param, '%s') || '';
		mode = aliases[mode] || mode;
		if (!['radio', 'silence', 'leave'].includes(mode))
			return void this.reply("ilyen fallback mód nem létezik.");
		config.fallbackModes.set(this.guild.id, mode);
		this.channel.send(`**Új fallback: ${mode}. **`);
		try {
			await saveRow({ guildID: this.guild.id, type: mode }, 'fallbackModes');
		}
		catch (ex) {
			console.error(ex);
			this.channel.send('**Mentés sikertelen.**');
		}
	},
	async fallbackradio(param: string): Promise<void> {
		let given:string = sscanf(param, '%s') || '';
		if (radios.has(given)) {
			var fr: Common.MusicData = Object.assign({ type: 'radio' as Common.StreamType }, radios.get(given));
		}
		else if (given.search(/https?:\/\//) == 0)
			fr = {
				type: 'custom',
				name: given,
				url: given
			};
		else
			return void this.reply('érvénytelen rádióadó.');
		config.fallbackChannels.set(this.guild.id, fr);
		this.channel.send(`**Fallback rádióadó sikeresen beállítva: ${getEmoji(fr.type)} \`${fr.name}\`**`).catch(console.error);
		try {
			await saveRow({ guildID: this.guild.id, type: fr.type, name: fr.name, url: fr.url }, 'fallbackData');
		}
		catch (ex) {
			console.error(ex);
			this.channel.send('**Hiba: a beállítás csak leállásig lesz érvényes.**').catch(console.error);
		}
	},
	skip(_:string) {
		this.guildPlayer.skip();
	},
	tune(param: string) {
		let voiceChannel:Discord.VoiceChannel = this.member.voiceChannel;
		let channel = sscanf(param, '%s') || '';
		let randChannel = randomElement(channels);
		if (!radios.has(channel)) {
			channel = randChannel;
			this.channel.send("**Hibás csatorna nevet adtál meg, ezért egy random csatorna kerül lejátszásra!**");
		}
		forceSchedule(this.channel, voiceChannel, this, Object.assign({ type: 'radio' as Common.StreamType }, radios.get(channel)));
	},
	grant(param: string) {
		permissionReused.call(this, param, (commands:string[], roleCommands:string[]) =>
			commands.forEach(elem => {
				if (!roleCommands.includes(elem))
					roleCommands.push(elem);
			}));

	},
	granteveryone(param: string) {
		commands.grant.call(this,param+' @everyone');
	},
	deny(param: string) {
		permissionReused.call(this, param, (commands:string[], roleCommands:string[]) =>
			commands.forEach(elem => {
				if (roleCommands.includes(elem))
					roleCommands.splice(roleCommands.indexOf(elem), 1);
			}));
	},
	denyeveryone(param: string) {
		commands.deny.call(this,param+' @everyone');
	},
	nowplaying(_: string): Promise<void> {
		let nowPlayingData = this.guildPlayer.getNowPlayingData();
		if (!nowPlayingData)
			return void this.channel.send('**CSEND**');
		const embed = commonEmbed.call(this, 'nowplaying')
			.setTitle('❯ Épp játszott stream')
			.setDescription(`${getEmoji(nowPlayingData.type)} ${nowPlayingData.name}`);
		this.channel.send({ embed });
	},
	volume(param: string): void {
		let vol = sscanf(param, '%d');
		if (vol == undefined || vol <= 0 || vol > 15)
			return void this.reply('paraméterként szám elvárt. (1-15)').catch(console.error);
		if (vol > 10)
			this.channel.send('**Figyelem: erősítést alkalmaztál, a hangban torzítás léphet fel.**').catch(console.error);
		try {
			this.guildPlayer.setVolume(vol / 10);
			this.react('☑').catch(console.error);
		}
		catch (ex) {
			this.reply(`hiba - ${ex}`);
		}
	},
	mute(_: string) {
		try {
			this.guildPlayer.mute();
			this.react('☑').catch(console.error);
		}
		catch (ex) {
			this.reply(`hiba - ${ex}`);
		}
	},
	unmute(_: string) {
		try {
			this.guildPlayer.unmute();
			this.react('☑').catch(console.error);
		}
		catch (ex) {
			this.reply(`hiba - ${ex}`);
		}
	}
};

Object.keys(decorators).forEach(cmdName => decorateCommand(cmdName, decorators[cmdName]));

async function permissionReused(param: string, filler:(affectedCommands:string[],configedCommands:string[])=>void): Promise<void> {
	try {
		var [commands = '', roleName = ''] = sscanf(param, '%s %S');
	}
	catch (ex) {
		//Nem nyertünk ki értelmeset
		return void this.reply('nem megfelelő formátum.');
	}
	if (!commands)
		return void this.reply('az első paraméter üres.');
	let commandsArray:string[] = commands.toLowerCase()=='all' ? debatedCommands : commands.split('|');
	let firstWrong = commandsArray.find(elem => !debatedCommands.includes(elem));
	if (firstWrong)
		return void this.reply(`\`${firstWrong}\` nem egy kérdéses jogosultságú parancs.`);
	let role = this.guild.roles.find((elem:Discord.Role) => elem.name == roleName);
	if (!role)
		return void this.reply('nem létezik a megadott role.');
	let currentRoles = attach(config.roles, this.guild.id, new Map());
	let roleCommands = attach(currentRoles, role.id, new Array());
	filler(commandsArray, roleCommands);
	try {
		await saveRow({ guildID: this.guild.id, roleID: role.id, commands: commandsArray.join('|') }, 'role');
		this.channel.send(`**Új jogosultságok mentve.**`);
	}
	catch (ex) {
		console.error(ex);
		this.channel.send('**Hiba: a beállítás csak leállásig lesz érvényes.**').catch(console.error);
	}
}

client.on('message', async (message) => {

	if (message.guild == null) return;
	let prefix = config.prefixes.get(message.guild.id) || defaultConfig.prefix;
	if (message.mentions.users.has(client.user.id))
		return void commands.help.call(message, '');
	let content = message.content;
	if (!content.toLowerCase().startsWith(prefix)) return;
	try {
		let { command: commandString, param } = sscanf(content.substring(prefix.length), '%s %S', 'command', 'param');
		commandString = commandString.toLowerCase();
		commandString = aliases[commandString] || commandString;
		let command = commands[commandString] || Function.prototype;
		let packedMessage:Common.PackedMessage = Object.assign(message, { cmdName: commandString });
		let thisBinding:Common.ThisBinding = Object.defineProperty(packedMessage,'guildPlayer',{
			get: ()=>guildPlayers.get(packedMessage.guild.id),
			set: value=>guildPlayers.set(packedMessage.guild.id,value)
		});
		await Promise.resolve(command.call(thisBinding, param || ''));
	}
	catch (ex) {
		console.log(ex);
	}
});

client.on('voiceStateUpdate', (oldMember, newMember) => {
	let id=oldMember.guild.id;
	let guildPlayer = guildPlayers.get(id);
	if (oldMember.user == client.user && oldMember.voiceChannel && newMember.voiceChannel && guildPlayer) //ha a botot átrakják egy voice channelből egy másikba - át kell iratkoznia, az utolsó vizsgálat a discord API hülye, inkonzisztens állapotai miatt kell (mintha még voice-ban lenne az elcrashelt bot)
		guildPlayer.handler.eventTriggered();
	if (oldMember.user.bot) //innen csak nem botokra figyelünk
		return;
	if ([oldMember.voiceChannel,newMember.voiceChannel].includes(guildPlayer.ownerGuild.voiceConnection.channel))
		guildPlayer.handler.eventTriggered();
});

client.on('guildCreate', guild => {
	logGuildJoin(guild);
	setPStatus();
	updateStatusChannels();
	sendWelcome(guild);
});

client.on('guildDelete', guild => {
	((devChannel()) as Discord.TextChannel).send(`**${client.user.tag}** left \`${guild.name}\``).catch(console.error);
	setPStatus();
	updateStatusChannels()
});

client.on("error", error => {
	console.log(`ERRRORRR: \n${JSON.stringify(error.message)}`);
});

process.on('unhandledRejection', function(reason, p){
    console.log("Possibly Unhandled Rejection at: Promise ", p, " reason: ", reason);
    // application specific logging here
});

function logGuildJoin(guild: Discord.Guild) {
	const created = moment(guild.createdAt).format("MMM Do YY");
	const embed = new Discord.RichEmbed()
		.setDescription(`ID: ${guild.id}
Members: ${guild.memberCount}
Owner: ${guild.owner ? guild.owner.user.tag : 'unable to fetch'}
Created At: ${created}
Icon: [Link](${guild.iconURL ? guild.iconURL : client.user.displayAvatarURL})`);
	((devChannel()) as Discord.TextChannel).send(`**${client.user.tag}** joined \`${guild.name}\``, { embed: embed }).catch(console.error);
}

async function sendWelcome(guild: Discord.Guild) {
	for (let channel of guild.channels.values()) {
		if (!(channel instanceof Discord.TextChannel))
			continue;
		let textChannel = channel as Discord.TextChannel;
		try {
			let embed=new Discord.RichEmbed()
				.setAuthor(client.user.tag, client.user.displayAvatarURL)
				.setTitle('A RAD.io zenebot csatlakozott a szerverhez.')
				.addField('❯ Néhány szó a botról','A RAD.io egy magyar nyelvű és fejlesztésű zenebot.\nEgyedi funkciója az előre feltöltött élő rádióadók játszása, de megszokott funkciók (youtube-keresés játszási listával) többsége is elérhető.\nTovábbi információért használd a help parancsot vagy mention-öld a botot.')
				.addField('❯ Első lépések',`Az alapértelmezett prefix a **.**, ez a \`setprefix\` parancs használatával megváltoztatható.\nA ${debatedCommands.map(cmdName=>'`'+cmdName+'`').join(', ')} parancsok alapértelmezésképpen csak az adminisztrátoroknak használhatóak - ez a működés a \`grant\` és \`deny\` parancsokkal felüldefiniálható.\nA bot működéséhez az írási jogosultság elengedhetetlen, a reakciók engedélyezése pedig erősen ajánlott.\n\nTovábbi kérdésekre a dev szerveren készségesen válaszolunk.`)
				.setColor(embedC)
				.setTimestamp();
			await textChannel.send('https://discord.gg/C83h4Sk',{embed});
			break;
		}
		catch (ex) {
		}
	}
}

function randomElement<T>(array:T[]):T {
	return array[(Math.random() * array.length) | 0];
};

function setPStatus() {
	let presenceEndings = [`G: ${client.guilds.size}`, `Rádiók száma: ${channels.length} `, `@${client.user.username}`, `U: ${client.users.size}`];
	let randomRadioName = radios.get(randomElement(channels)).name;
	let presence = `${randomRadioName} | ${randomElement(presenceEndings)}`;
	client.user.setPresence({ game: { name: presence, type: 'LISTENING' } });
};
/*
function unescapeHtml(safe) {
	return safe
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, "\"")
		.replace(/&#0*39;/g, "'");
};
*/
function updateStatusChannels() {
	if (client.user.id != '430326522146979861') return;
	let guildsChan: Discord.VoiceChannel = client.channels.get('470522240551616523') as Discord.VoiceChannel;
	let usersChan: Discord.VoiceChannel = client.channels.get('470522309132943360') as Discord.VoiceChannel;
	guildsChan.setName(`RAD.io (${client.guilds.size}) szerveren`);
	usersChan.setName(`RAD.io (${client.users.size}) felhasználóval`);
};
setInterval(setPStatus, 60000 * 5);
client.login(token);
