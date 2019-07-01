import * as Discord from 'discord.js';
import { randomElement, hourMinSec, attach, Config, GuildPlayer, StreamType, FallbackType, MusicData, configPromise, defaultConfig, client, Action, channels, commands, creators, getEmoji, debatedCommands, radios as radiosList, translateAlias, forceSchedule, commonEmbed, useScrollableEmbed, sendGuild, saveRow, createPastebin, TextChannelHolder, isLink } from './internal';
const apiKey = process.env.youtubeApiKey;
import { YouTube, Video } from 'better-youtube-api';
const youtube = new YouTube(apiKey);
import { sscanf } from 'scanf';
import { SearchResultView } from './common-types';
let config: Config;
configPromise.then(cfg => config = cfg);
export const actions: Map<string, Action> = new Map();
actions.set('setprefix', async function (param) {
	if (!param)
		return void this.reply('ez nem lehet prefix!');
	const newPrefix = param.toLowerCase();
	config.prefixes.set(this.guild.id, newPrefix);
	try {
		await saveRow.prefix({ guildID: this.guild.id, prefix: newPrefix });
		this.channel.send(`${newPrefix} **az új prefix.**`);
	}
	catch (e) {
		console.error('Elmenteni nem sikerült a configot!');
		console.error(e);
		this.channel.send(`${newPrefix} **a prefix, de csak leállásig...**`);
	}
});
actions.set('join', async function (param) {
	const channelToPlay = extractChannel(this, param);
	joinAndStartup.call(this, (gp: GuildPlayer) => {
		if (channelToPlay)
			gp.schedule(Object.assign({ type: 'radio' as StreamType }, radiosList.get(channelToPlay)));
	});
});
actions.set('joinfallback', function (_) {
	joinAndStartup.call(this, (gp: GuildPlayer) => gp.skip());
});

async function joinAndStartup(startup: (guildPlayer: GuildPlayer) => void) {
	const voiceChannel: Discord.VoiceChannel = this.member.voiceChannel;
	try {
		await voiceChannel.join();
		this.channel.send('**Csatlakozva.**');
		this.guildPlayer = new GuildPlayer(this.guild, this.channel, []);
		startup(this.guildPlayer);
	}
	catch (ex) {
		this.channel.send('**Hiba a csatlakozás során.**');
		console.error(ex);
	}
}
actions.set('yt', async function (param) {
	const voiceChannel: Discord.VoiceChannel = this.member.voiceChannel;
	param = param.trim();
	if (isLink(param)) {
		try {
			var toSchedule = await resolveYoutubeUrl(param);
		}
		catch (ex) {
			return void this.channel.send('**Érvénytelen youtube url.**');
		}
		if (toSchedule.length > 1)
			this.channel.send(`**${toSchedule.length} elem került a sorba.**`);
		return void forceSchedule(this.channel, voiceChannel, this, toSchedule);
	};
	const ytString = sscanf(param, '%S') || '';
	try {
		const results = await youtube.searchVideos(ytString, 5);
		if (!results || results.length == 0)
			return void this.channel.send('nincs találat.');
		await Promise.all(results.map((elem: Video) => elem.fetch()));
		const resultsView: SearchResultView[] = results.map(elem => Object.assign({}, {
			title: elem.title, duration: elem.minutes * 60 + elem.seconds
		}));
		try {
			var index: number = await searchPick.call(this, resultsView);
		}
		catch (ex) {
			return;
		}
		const selectedResult = results[index];
		forceSchedule(this.channel, voiceChannel, this, [{
			name: selectedResult.title,
			url: selectedResult.url,
			type: 'yt'
		}]);
	}
	catch (e) {
		console.error(e);
		this.channel.send('**Hiba a keresés során.**');
	}
});
actions.set('custom', async function (param) {
	const voiceChannel: Discord.VoiceChannel = this.member.voiceChannel;
	const url = sscanf(param, '%s') || '';
	forceSchedule(this.channel, voiceChannel, this, [{
		name: 'Custom',
		url,
		type: 'custom'
	}]);
});
actions.set('leave', function (_) {
	const guildPlayer: GuildPlayer = this.guildPlayer;
	this.channel.send('**Kilépés**');
	guildPlayer.leave();
	this.guildPlayer = undefined; //guildPlayer törlése így tehető meg
});
actions.set('repeat', function (param) {
	const count = sscanf(param, '%d');
	if (count <= 0 && count != null)
		return void this.reply('pozitív számot kell megadni.');
	this.guildPlayer.repeat(count);
	this.channel.send('**Ismétlés felülírva.**');
});
actions.set('radios', async function (_) {
	function listRadios(lang: string) { //TODO ez is enum: kultkód/nyelvkód
		const res = [];
		for (const [key, value] of radiosList) {
			if (value.cult == lang)
				res.push(`${value.name}** ID:** *${key}*`);
		}
		return res.join('\n');
	}
	const prefix = config.prefixes.get(this.guild.id) || defaultConfig.prefix;
	const baseEmbed: Discord.RichEmbed = commonEmbed.call(this).addField('❯ Használat', `\`${prefix}join <ID>\`\n\`${prefix}tune <ID>\``);
	await this.channel.send({
		embed: baseEmbed
			.setTitle('❯ Magyar rádiók')
			.setDescription(listRadios('hun'))
	});
	this.channel.send({
		embed: baseEmbed
			.setTitle('❯ Külföldi rádiók')
			.setDescription(listRadios('eng'))
	});
});
actions.set('shuffle', function (_) {
	this.guildPlayer.shuffle();
	this.react('☑');
});
actions.set('clear', function (_) {
	this.guildPlayer.clear();
	this.react('☑');
});
actions.set('toplast', function (_) {
	this.guildPlayer.topLast();
	this.react('☑');
});
actions.set('help', function (param) {
	const prefix = config.prefixes.get(this.guild.id) || defaultConfig.prefix;
	let helpCommand = sscanf(param, '%s');
	const userCommands = [...commands].filter(entry => ['grantable', 'unlimited'].includes(entry[1].type)).map(entry => entry[0]);
	userCommands.sort();
	const adminCommands = [...commands].filter(entry => ['adminOnly'].includes(entry[1].type)).map(entry => entry[0]);
	adminCommands.sort();
	if (!helpCommand) {
		const embed = commonEmbed.call(this)
			.addField('❯ Felhasználói parancsok', userCommands.map(cmd => `\`${cmd}\``).join(' '))
			.addField('❯ Adminisztratív parancsok', adminCommands.map(cmd => `\`${cmd}\``).join(' '))
			.addField('❯ Részletes leírás', `\`${prefix}help <command>\``)
			.addField('❯ Egyéb információk', `RAD.io meghívása saját szerverre: [Ide kattintva](https://discordapp.com/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot)
Meghívó a RAD.io Development szerverre: [discord.gg/C83h4Sk](https://discord.gg/C83h4Sk)
A bot fejlesztői: ${creators.map(creator => creator.resolve()).join(', ')}`);
		return void this.channel.send({ embed });
	}
	helpCommand = translateAlias(helpCommand);
	if (commands.has(helpCommand)) {
		const currentCommand = commands.get(helpCommand);
		const currentAliases = currentCommand.aliases;
		currentAliases.sort();
		const embed = commonEmbed.call(this, ` ${helpCommand}`)
			.addField('❯ Részletes leírás', currentCommand.helpRelated.ownDescription)
			.addField('❯ Teljes parancs', `\`${prefix}${helpCommand} ${currentCommand.helpRelated.params.map((attribute: string) => `<${attribute}>`).join(' ')} \``)
			.addField('❯ Használat feltételei', (currentCommand.helpRelated.requirements || ['-']).join(' '))
			.addField('❯ Alias-ok', currentAliases.length == 0 ? 'Nincs alias a parancshoz.' : currentAliases.map(alias => `\`${prefix}${alias}\``).join(' '));
		return void this.channel.send({ embed });
	}
	this.reply('nincs ilyen nevű parancs.');
});
actions.set('guilds', async function (_) {
	const guildLines = client.guilds.map(g => `${g.name} **=>** \`${g.id}\` (${g.memberCount})`);
	createPastebin(`${client.user.username} on ${client.guilds.size} guilds with ${client.users.size} users.`, guildLines.join('\n'))
		.then(link => this.channel.send(link));
});
actions.set('connections', async function (_) {
	const connectionLines = client.voiceConnections.map(vc => `${vc.channel.guild.name} (${vc.channel.guild.id}) - ${vc.channel.name} (${vc.channel.members.filter(member => !member.user.bot).size})`);
	const usersAffected = client.voiceConnections.map(vc => vc.channel.members.filter(member => !member.user.bot).size).reduce((prev, curr) => prev + curr, 0);
	createPastebin(`${client.user.username} on ${client.voiceConnections.size} voice channels with ${usersAffected} users.`, connectionLines.join('\n'))
		.then(link => this.channel.send(link));
});
actions.set('leaveguild', async function (param) {
	const id = sscanf(param, '%s');
	const guildToLeave = await client.guilds.get(id).leave();
	this.channel.send(`**Szerver elhagyva:** ${guildToLeave.name}`);
});
actions.set('voicecount', function (_) {
	this.channel.send(`:information_source: ${client.voiceConnections.array().length} voice connection(s) right now.`);
});
actions.set('queue', async function (_) {
	const queue: MusicData[] = this.guildPlayer.getQueueData();
	if (queue.length == 0)
		return void this.channel.send('**A sor jelenleg üres.**');
	const embed = commonEmbed.call(this);
	const queueLines = queue.map(elem => `${getEmoji(elem.type)} ${elem.name}`);
	await useScrollableEmbed(this, embed, (currentPage, maxPage) => `❯ Lista (felül: legkorábbi) Oldal: ${currentPage}/${maxPage}`, queueLines);
});
actions.set('fallback', async function (param) {
	const aliases = new Map([['r', 'radio'], ['s', 'silence'], ['l', 'leave']]);
	let mode = sscanf(param, '%s') || '';
	mode = aliases.get(mode) || mode;
	if (!<FallbackType>mode)
		return void this.reply('**ilyen fallback mód nem létezik.**');
	config.fallbackModes.set(this.guild.id, <FallbackType>mode);
	this.channel.send(`**Új fallback: ${mode}. **`);
	try {
		await saveRow.fallbackModes({ guildID: this.guild.id, type: <FallbackType>mode });
	}
	catch (ex) {
		console.error(ex);
		this.channel.send('**Mentés sikertelen.**');
	}
});
actions.set('fallbackradio', async function (param) {
	const given: string = sscanf(param, '%s') || '';
	if (radiosList.has(given)) {
		var fr: MusicData = Object.assign({ type: 'radio' as StreamType }, radiosList.get(given));
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
	this.channel.send(`**Fallback rádióadó sikeresen beállítva: ${getEmoji(fr.type)} \`${fr.name}\`**`);
	try {
		await saveRow.fallbackData({ guildID: this.guild.id, type: fr.type, name: fr.name, url: fr.url });
	}
	catch (ex) {
		console.error(ex);
		this.channel.send('**Hiba: a beállítás csak leállásig lesz érvényes.**');
	}
});
actions.set('skip', function (_) {
	this.guildPlayer.skip();
});
actions.set('pause', function (_) {
	this.guildPlayer.pause();
});
actions.set('resume', function (_) {
	this.guildPlayer.resume();
});
actions.set('tune', function (param) {
	const voiceChannel: Discord.VoiceChannel = this.member.voiceChannel;
	const channel = extractChannel(this, param);
	forceSchedule(this.channel, voiceChannel, this, [Object.assign({ type: 'radio' as StreamType }, radiosList.get(channel))]);
});
actions.set('grant', function (param) {
	permissionReused.call(this, param, (commands: string[], roleCommands: string[]) =>
		commands.forEach(elem => {
			if (!roleCommands.includes(elem))
				roleCommands.push(elem);
		}));
});
actions.set('granteveryone', function (param) {
	actions.get('grant').call(this, `${param} @everyone`);
});
actions.set('deny', function (param) {
	permissionReused.call(this, param, (commands: string[], roleCommands: string[]) =>
		commands.forEach(elem => {
			if (roleCommands.includes(elem))
				roleCommands.splice(roleCommands.indexOf(elem), 1);
		}));
});
actions.set('denyeveryone', function (param: string) {
	actions.get('deny').call(this, `${param} @everyone`);
});
actions.set('nowplaying', function (_) {
	const nowPlayingData: MusicData = this.guildPlayer.getNowPlayingData();
	if (!nowPlayingData)
		return void this.channel.send('**CSEND**');
	const embed = commonEmbed.call(this)
		.setTitle('❯ Épp játszott stream')
		.setDescription(`${getEmoji(nowPlayingData.type)} ${nowPlayingData.name}`);
	this.channel.send({ embed });
});
actions.set('volume', function (param) {
	const vol = sscanf(param, '%d');
	if (vol == undefined || vol <= 0 || vol > 15)
		return void this.reply('paraméterként szám elvárt. (1-15)');
	if (vol > 10)
		this.channel.send('**Figyelem: erősítést alkalmaztál, a hangban torzítás léphet fel.**');
	this.guildPlayer.setVolume(vol / 10);
	this.react('☑');
});
actions.set('mute', function (_) {
	this.guildPlayer.mute();
	this.react('☑');
});
actions.set('unmute', function (_) {
	this.guildPlayer.unmute();
	this.react('☑');
});
actions.set('announce', function (param) {
	const [guildInfo, message = ''] = <string[]>sscanf(param, '%s %S');
	const guildToAnnounce = guildInfo == 'all' ? client.guilds.array() : guildInfo == 'conn' ? client.voiceConnections.map(conn => conn.channel.guild) : [client.guilds.get(guildInfo)];
	guildToAnnounce.forEach(guild => sendGuild(guild, message));
	this.react('☑');
});
async function permissionReused(param: string, filler: (affectedCommands: string[], configedCommands: string[]) => void): Promise<void> {
	try {
		var [permCommands = '', roleName = ''] = <string[]>sscanf(param, '%s %S');
	}
	catch (ex) {
		//Nem nyertünk ki értelmeset
		return void this.reply('**nem megfelelő formátum.**');
	}
	if (!permCommands)
		return void this.reply('**az első paraméter üres.**');
	const commandsArray = permCommands.toLowerCase() == 'all' ? debatedCommands : permCommands.split('|');
	const firstWrong = commandsArray.find(elem => !debatedCommands.includes(elem));
	if (firstWrong)
		return void this.reply(`**\`${firstWrong}\` nem egy kérdéses jogosultságú parancs.**`);
	const role: Discord.Role = this.guild.roles.find((elem: Discord.Role) => elem.name == roleName);
	if (!role)
		return void this.channel.send('**nem létezik a megadott role.**');
	const currentRoles = attach(config.roles, this.guild.id, new Map());
	const roleCommands = attach(currentRoles, role.id, new Array());
	filler(commandsArray, roleCommands);
	try {
		await saveRow.role({ guildID: this.guild.id, roleID: role.id, commands: roleCommands.join('|') });
		this.channel.send(`**Új jogosultságok mentve.**`);
	}
	catch (ex) {
		console.error(ex);
		this.channel.send('**Hiba: a beállítás csak leállásig lesz érvényes.**');
	}
}

function extractChannel(textChannelHolder: TextChannelHolder, param: string) {
	let channelToPlay = sscanf(param, '%s') || '';
	if (channelToPlay && !radiosList.has(channelToPlay)) {
		channelToPlay = randomElement(channels);
		textChannelHolder.channel.send("**Hibás csatorna nevet adtál meg, ezért egy random csatorna kerül lejátszásra!**");
	}
	return channelToPlay;
}

async function resolveYoutubeUrl(url: string): Promise<MusicData[]> {
	try {
		const ytPlaylist = await youtube.getPlaylistByUrl(url);
		const videos = await ytPlaylist.fetchVideos();
		return videos.map(elem => Object.assign({}, {
			name: elem.title,
			url: elem.url,
			type: 'yt'
		}) as MusicData);
	}
	catch (ex) {
		if (ex != 'Not a valid playlist url')
			throw ex;
		const ytVideo = await youtube.getVideoByUrl(url);
		return [{
			name: ytVideo.title,
			url,
			type: 'yt'
		}];
	}
}

async function searchPick(results: SearchResultView[]): Promise<number> {
	try {
		var message, embed;
		if (results.length == 1)
			return 0;
		else if (!this.guild.member(client.user).permissions.has('ADD_REACTIONS')) {
			this.channel.send('** Az opciók közüli választáshoz a botnak **`ADD_REACTIONS`** jogosultságra van szüksége.\nAutomatikusan az első opció kiválasztva. **');
			return 0;
		}
		else {
			const emojis = ['1⃣', '2⃣', '3⃣', '4⃣', '5⃣'].slice(0, results.length);
			const selectionPromise: Promise<number> = new Promise(async (resolve, reject) => {
				let counter = 1;
				embed = commonEmbed.call(this)
					.setTitle("❯ Találatok")
					.setDescription(results.map(elem => `__${counter++}.__ - ${elem.title} \`(${hourMinSec(elem.duration)})\``).join('\n'));
				message = await this.channel.send(embed);
				const filter = (reaction: Discord.MessageReaction, user: Discord.User) => emojis.some(emoji => reaction.emoji.name === emoji) && user.id == this.author.id;
				const collector = message.createReactionCollector(filter, { maxEmojis: 1, time: 30000 });
				collector.on('collect', (r: Discord.MessageReaction) => {
					const index = emojis.indexOf(r.emoji.name);
					resolve(index);
					collector.stop();
				});
				collector.on('end', (_: any) => reject('Lejárt a választási idő.'));
				for (const emoji of emojis) {
					const reaction = await message.react(emoji);
					selectionPromise.then(_ => reaction.remove(client.user), _ => reaction.remove(client.user));
				}

			});
			const which = await selectionPromise;
			return which;
		}
	}
	catch (err) {
		if (typeof err != 'string')
			console.log(err);
		else {
			embed.setTitle(`❯ Találatok - ${err}`);
			message.edit(embed);
		}
		throw err;
	}
}