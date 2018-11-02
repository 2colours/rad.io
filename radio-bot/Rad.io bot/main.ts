import * as Discord from 'discord.js';
import * as Common from './common-types';
const { helpCommands } = require('./help-embed');
const client = new Discord.Client();
const token = process.env.radioToken;
const apiKey = process.env.youtubeApiKey;
const yd: any = require('ytdl-core'); //Nem illik közvetlenül hívni
const ytdl = (url:string) => yd(url, { filter: 'audioonly', quality: 'highestaudio' });
const sscanf = require('scanf').sscanf;
//const fs = require('fs');
const sql = require('sqlite');
const constants = require('./vc-constants');
//const streamOptions = { seek: 0, volume: 1 };
const moment = require('moment');
const embedC = 0xfcf5d2;
const { defaultConfig, radios, youtubeEmoji } = constants;
const { isAloneUser, pass, isAloneBot, nonFallbackNeeded, choiceFilter, adminNeeded, vcUserNeeded, sameVcBanned, sameVcNeeded, vcBotNeeded, noBotVcNeeded, sameOrNoBotVcNeeded, adminOrPermissionNeeded, creatorNeeded, vcPermissionNeeded, creatorIds } = require('./vc-decorators');
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

sql.open("./radio.sqlite");

function commonEmbed(cmd:string) { //TODO ez sem akármilyen string, hanem parancsnév
	let prefix = config.prefixes.get(this.guild.id) || defaultConfig.prefix;
	return new Discord.RichEmbed()
		.setColor(embedC)
		.setFooter(`${prefix}${cmd} - ${client.user.username}`, client.user.avatarURL)
		.setTimestamp();
};
function hourMinSec(minutes:number, seconds:any) { //a seconds bugosnak bizonyult
	seconds = Number.isNaN(seconds) ? 0 : seconds;
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

const channels = Object.keys(radios);

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
const downloadMethods:Map<Common.StreamType,any> = new Map([
	[Common.StreamType.yt, ytdl],
	[Common.StreamType.custom,(url:string) => url],
	[Common.StreamType.radio,(url:string) => url]]);
function getEmoji(type:Common.StreamType):Common.EmojiLike {
	const emojis:Map<Common.StreamType,Common.EmojiLike> = new Map<Common.StreamType,Common.EmojiLike>([
		[Common.StreamType.yt, client.emojis.get(youtubeEmoji)],
		[Common.StreamType.radio, ':radio:'],
		[Common.StreamType.custom, ':radio:']
	]);
	return emojis.get(type);
}
function repeatCounter(nTimes: number) {
	return () => nTimes-- > 0;
}
class Playable {
	data?: any;
	skip: any;
	halt: any;
	constructor(musicData?: any) {
		this.data = musicData;
	}
	isDefinite() {
		return this.data && ['yt', 'custom'].includes(this.data.type);
	}
	askRepeat() {
		return false;
	}
	play(voiceConnection: Discord.VoiceConnection, vol: number) {
		return new Promise((resolve, reject) => {
			if (!this.data) {
				this.skip = () => resolve(true);
				this.halt = () => reject('leave');
				return;
			}
			const stream = downloadMethods.get(this.data.type)(this.data.url);
			let dispatcher = voiceConnection.playStream(stream, { seek: 0, volume: vol });
			dispatcher.on('end', () => resolve(false)); //nem volt forced, hanem magától
			dispatcher.on('error', () => {
				console.log('Futott az error handler.');
				resolve(true); //ha hiba történt, inkább ne próbálkozzunk a loopolással - "forced"
			});
			this.skip = () => {
				resolve(true);
				dispatcher.end();
			};
			this.halt = () => {
				reject('leave');
				dispatcher.end();
			};
		});
	}
}
class VoiceHandler {
	private timeoutId?:NodeJS.Timeout;
	constructor(private controlledPlayer: GuildPlayer) {
	}
	eventTriggered() {
		let voiceEmpty = !this.controlledPlayer.ownerChannel.members.some(member => !member.user.bot);
		if (voiceEmpty && !this.timeoutId)
			this.timeoutId = global.setTimeout(this.controlledPlayer.leave.bind(this.controlledPlayer), 60000 * 5);
		if (!voiceEmpty && this.timeoutId) {
			global.clearTimeout(this.timeoutId);
			delete this.timeoutId;
		}
	}
	destroy() {
		if (this.timeoutId)
			global.clearTimeout(this.timeoutId);
	}
}
class GuildPlayer {
	nowPlaying: Playable;
	ownerChannel: Discord.VoiceChannel;
	announcementChannel: Discord.TextChannel;
	private queue: Playable[];
	fallbackPlayed: boolean;
	private handler: VoiceHandler;
	private volume: number;
	private oldVolume?: number;
	constructor(voiceChannel: Discord.VoiceChannel, textChannel: Discord.TextChannel, musicToPlay?: Common.MusicData) {
		this.ownerChannel = voiceChannel;
		this.announcementChannel = textChannel;
		this.nowPlaying = new Playable(musicToPlay);
		this.fallbackPlayed = false;
		this.queue = [];
		this.handler = new VoiceHandler(this);
		this.playLoop();
		this.volume = 0.5;
	}
	async playLoop() {
		try {
			while (true) {
				do { //Itt kéne kiírás is
					if (this.nowPlaying.data)
						this.announcementChannel.send(`**Lejátszás alatt: ** ${getEmoji(this.nowPlaying.data.type)} \`${this.nowPlaying.data.name}\``);
					var forcedOver = await this.nowPlaying.play(this.ownerChannel.connection, this.volume);
					var shouldRepeat = this.nowPlaying.askRepeat();
				} while (!forcedOver && shouldRepeat);
				this.nowPlaying = null;
				if (this.queue.length != 0) {
					this.nowPlaying = this.queue.shift();
					this.fallbackPlayed = false;
				}
				else if (this.fallbackPlayed) {
					this.nowPlaying = new Playable();
				}
				else
					this.fallbackMode();
			}
		}
		catch (ex) {
			//ezt direkt várjuk is, de leginkább csak akkor, ha leave-elés miatt jön
		}
	}
	mute() {
		if (this.volume == 0)
			throw 'Már le van némítva a bot.';
		this.oldVolume = this.volume;
		this.setVolume(0);
	}
	unmute() {
		if (this.volume != 0)
			throw 'Nincs lenémítva a bot.';
		this.setVolume(this.oldVolume);
	}
	setVolume(vol: number) {
		if (!this.ownerChannel.connection.dispatcher)
			throw 'Semmi nincs lejátszás alatt.';
		this.ownerChannel.connection.dispatcher.setVolume(vol);
		this.volume = vol;
	}
	skip() {
		this.nowPlaying.skip();
	}
	repeat(maxTimes?: number) {
		if (!this.nowPlaying.isDefinite())
			throw 'Végtelen streameket nem lehet loopoltatni.';
		if (!maxTimes)
			this.nowPlaying.askRepeat = () => true;
		else
			this.nowPlaying.askRepeat = repeatCounter(maxTimes);
	}
	schedule(musicData:Common.MusicData) {
		this.queue.push(new Playable(musicData));
		if (!this.nowPlaying.isDefinite() && this.queue.length == 1)
			this.skip();
		else
			this.announcementChannel.send(`**Sorba került: ** ${getEmoji(musicData.type)} \`${musicData.name}\``);
	}
	shuffle() {
		if (this.queue.length >= 2)
			shuffle(this.queue);
		else
			throw 'Nincs mit megkeverni.';
	}
	fallbackMode() {
		this.announcementChannel.send('**Fallback mód.**');
		let currentFallback = config.fallbackModes.get(this.ownerChannel.guild.id) || defaultConfig.fallback;
		switch (currentFallback) {
			case 'radio':
				if (!config.fallbackChannels.get(this.ownerChannel.guild.id))
					this.announcementChannel.send('**Nincs beállítva rádióadó, silence fallback.**');
				this.nowPlaying = new Playable(config.fallbackChannels.get(this.ownerChannel.guild.id));
				this.fallbackPlayed = true;
				break;
			case 'leave':
				this.leave();
			case 'silence':
				this.nowPlaying = new Playable();
				this.fallbackPlayed = true;
				break;
		}
	}
	leave() {
		if (this.nowPlaying)
			this.nowPlaying.halt();
		this.ownerChannel.leave();
		this.handler.destroy();
		delete this.ownerChannel['guildPlayer'];
		delete this.ownerChannel;
		if (!this.nowPlaying)
			throw 'destroyed';
	}
	getQueueData():Common.MusicData[] {
		return this.queue.map(playable => playable.data);
	}
	getNowPlayingData() {
		return this.nowPlaying.data;
	}
};
function shuffle(array: any[]) {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i+1));
		[array[i], array[j]] = [array[j], array[i]];
	}
};
function attach<T>(baseDict:Map<Discord.Snowflake,T>, guildId:Discord.Snowflake, defaultValue:T) {
	baseDict=baseDict.get(guildId)? baseDict:baseDict.set(guildId, defaultValue);
	return baseDict.get(guildId);
};
async function forceSchedule(textChannel:Discord.TextChannel, voiceChannel:Discord.VoiceChannel, playableData:Common.MusicData) {
	if (!voiceChannel['guildPlayer']) {
		await voiceChannel.join();
		voiceChannel['guildPlayer'] = new GuildPlayer(voiceChannel, textChannel, playableData);
		return;
	}
	voiceChannel['guildPlayer'].schedule(playableData);
};
/*
function saveJSON(object, fileName:string) {
	fs.writeFileSync(fileName, JSON.stringify(object));
};
*/
let commands = {
	async join(param:string) {
		let voiceChannel = this.member.voiceChannel;
		let channelToPlay = sscanf(param, '%s') || '';
		let randChannel = randomElement(channels);
		if (channelToPlay && !radios[channelToPlay]) {
			channelToPlay = randChannel;
			this.channel.send("**Hibás csatorna nevet adtál meg, ezért egy random csatorna kerül lejátszásra!**");
		}
		try {
			await voiceChannel.join();
			this.channel.send('**Csatlakozva.**');
			voiceChannel.guildPlayer = new GuildPlayer(voiceChannel, this.channel);
			if (channelToPlay)
				voiceChannel.guildPlayer.schedule(Object.assign({ type: 'radio' }, radios[channelToPlay]));
		}
		catch (ex) {
			this.channel.send('**Hiba a csatlakozás során.**');
			console.error(ex);
		}
	},
	async yt(param: string):Promise<void> {
		let voiceChannel = this.member.voiceChannel;
		param = param.trim();
		if (param.search(/https?:\/\//) == 0) {
			let ytVideo = await youtube.getVideoByUrl(param);
			return void forceSchedule(this.channel, voiceChannel, {
				name: ytVideo.title,
				url: param,
				type: Common.StreamType.yt
			});
		}
		let ytString = sscanf(param, '%S') || '';
		try {
			let results = await youtube.searchVideos(ytString, 5);
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
			forceSchedule(this.channel, voiceChannel, {
				name: selectedResult.title,
				url: selectedResult.url,
				type: Common.StreamType.yt
			});
		}
		catch (e) {
			console.log(e);
			this.channel.send('**Hiba a keresés során.**');
		}
	},
	async custom(param: string) {
		let voiceChannel = this.member.voiceChannel;
		let url = sscanf(param, '%s') || '';
		forceSchedule(this.channel, voiceChannel, {
			name: 'Custom',
			url,
			type: Common.StreamType.custom
		});
	},
	leave(_: string) {
		let guildPlayer = this.guild.voiceConnection.channel.guildPlayer;
		this.channel.send('**Kilépés**');
		guildPlayer.leave();
	},
	repeat(param: string):void {
		let count = sscanf(param, '%d');
		if (count <= 0 && count != null)
			return void this.reply('pozitív számot kell megadni.');
		let clientChannel = this.guild.voiceConnection.channel;
		try {
			clientChannel.guildPlayer.repeat(count);
			this.channel.send('**Ismétlés felülírva.**');
		}
		catch (ex) {
			this.reply(`hiba - ${ex}`);
		}
	},
	radios(_: string) {
		function listRadios(lang: string) { //TODO ez is enum: kultkód/nyelvkód
			let res = [];
			for (let key in radios) {
				if (radios[key].cult == lang)
					res.push(`${radios[key].name}** ID:** *${key}*`);
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
		let clientChannel = this.guild.voiceConnection.channel;
		try {
			clientChannel.guildPlayer.shuffle();
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
			await saveRow({ guildID: this.guild.id, prefix: newPrefix }, Common.TableName.prefix);
			this.channel.send(`${newPrefix} **az új prefix.**`).catch(() => { });
		}
		catch (e) {
			console.error('Elmenteni nem sikerült a configot!');
			console.error(e);
			this.channel.send(`${newPrefix} **a prefix, de csak leállásig...**`).catch(console.error);
		}
	},
	async queue(_: string): Promise<void> {
		let queue:Common.MusicData[] = this.guild.voiceConnection.channel.guildPlayer.getQueueData();
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
			await saveRow({ guildID: this.guild.id, type: mode }, Common.TableName.fallbackModes);
		}
		catch (ex) {
			console.error(ex);
			this.channel.send('**Mentés sikertelen.**');
		}
	},
	async fallbackradio(param: string): Promise<void> {
		let given = sscanf(param, '%s') || '';
		if (given in radios) {
			var fr = Object.assign({ type: 'radio' }, radios[given]);
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
			await saveRow({ guildID: this.guild.id, type: fr.type, name: fr.name, url: fr.url }, Common.TableName.fallbackData);
		}
		catch (ex) {
			console.error(ex);
			this.channel.send('**Hiba: a beállítás csak leállásig lesz érvényes.**').catch(console.error);
		}
	},
	skip(_:string) {
		this.guild.voiceConnection.channel.guildPlayer.skip();
	},
	tune(param: string) {
		let voiceChannel = this.member.voiceChannel;
		let channel = sscanf(param, '%s') || '';
		let randChannel = randomElement(channels);
		if (!radios[channel]) {
			channel = randChannel;
			this.channel.send("**Hibás csatorna nevet adtál meg, ezért egy random csatorna kerül lejátszásra!**");
		}
		forceSchedule(this.channel, voiceChannel, Object.assign({ type: 'radio' }, radios[channel]));
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
		let nowPlayingData = this.guild.voiceConnection.channel.guildPlayer.getNowPlayingData();
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
			this.guild.voiceConnection.channel.guildPlayer.setVolume(vol / 10);
			this.react('☑').catch(console.error);
		}
		catch (ex) {
			this.reply(`hiba - ${ex}`);
		}
	},
	mute(_: string) {
		try {
			this.guild.voiceConnection.channel.guildPlayer.mute();
			this.react('☑').catch(console.error);
		}
		catch (ex) {
			this.reply(`hiba - ${ex}`);
		}
	},
	unmute(_: string) {
		try {
			this.guild.voiceConnection.channel.guildPlayer.unmute();
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
		await saveRow({ guildID: this.guild.id, roleID: role.id, commands: commandsArray.join('|') }, Common.TableName.role);
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
		let thisBinding:Common.PackedMessage = Object.assign(message, { cmdName: commandString });
		await Promise.resolve(command.call(thisBinding, param || ''));
	}
	catch (ex) {
		console.log(ex);
	}
});

client.on('voiceStateUpdate', (oldMember, newMember) => {
	if (oldMember.user == client.user && oldMember.voiceChannel && newMember.voiceChannel && oldMember.voiceChannel['guildPlayer']) { //ha a botot átrakják egy voice channelből egy másikba - át kell iratkoznia, az utolsó vizsgálat a discord API hülye, inkonzisztens állapotai miatt kell (mintha még voice-ban lenne az elcrashelt bot)
		let guildPlayer = oldMember.voiceChannel['guildPlayer'];
		guildPlayer.ownerChannel = newMember.voiceChannel;
		delete oldMember.voiceChannel['guildPlayer'];
		newMember.voiceChannel['guildPlayer'] = guildPlayer;
		guildPlayer.handler.eventTriggered();
	}
	if (oldMember.user.bot) //innen csak nem botokra figyelünk
		return;
	if (oldMember.voiceChannel && oldMember.voiceChannel['guildPlayer'])
		oldMember.voiceChannel['guildPlayer'].handler.eventTriggered();
	if (newMember.voiceChannel && newMember.voiceChannel['guildPlayer'])
		newMember.voiceChannel['guildPlayer'].handler.eventTriggered();
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
	let randomRadioName = radios[randomElement(channels)].name;
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
