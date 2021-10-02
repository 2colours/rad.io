import * as Discord from 'discord.js';
import moment from 'moment';
import { commandNamesByTypes, isAdmin, randomElement, hourMinSec, attach, GuildPlayer, StreamType, FallbackType, MusicData, client, channels, commands, creators, getEmoji, debatedCommands, radios as radiosList, translateAlias, forceSchedule, commonEmbed, useScrollableEmbed, sendGuild, saveRow, createPastebin, TextChannelHolder, isLink, soundcloudSearch, SearchResultView, partnerHook, avatarURL, webhookC, radios, soundcloudResolveTrack, setPrefix, tickEmoji, discordEscape, maxPlaylistSize } from './internal.js';
const apiKey = process.env.youtubeApiKey;
import { YouTube } from 'popyt';
import axios from 'axios';
const youtube = new YouTube(apiKey);
import { sscanf } from 'scanf';
import { getPrefix, setFallbackMode, setFallbackChannel, getRoleSafe, getRoles } from './config-manager.js';
import { ThisBinding, Actions } from './common-types.js';
export const actions: Actions = {
	async setprefix(param) {
		if (!param)
			return void this.reply('ez nem lehet prefix!');
		const newPrefix = param.toLowerCase();
		setPrefix(this.guild.id, newPrefix);
		try {
			await saveRow.prefix({ guildID: this.guild.id, prefix: newPrefix });
			this.channel.send(`${newPrefix} **az új prefix.**`);
		}
		catch (e) {
			console.error('Elmenteni nem sikerült a configot!');
			console.error(e);
			this.channel.send(`${newPrefix} **a prefix, de csak leállásig...**`);
		}
	},
	async join(param) {
		const channelToPlay = extractChannel(this, param);
		joinAndStartup.call(this, (gp: GuildPlayer) => {
			if (channelToPlay)
				gp.schedule(Object.assign({
					type: 'radio' as StreamType,
					lengthSeconds: undefined,
					requester: this.member
				}, radiosList.get(channelToPlay)));
		});
	},
	joinfallback(_) {
		joinAndStartup.call(this, (gp: GuildPlayer) => gp.skip());
	},

	async yt(param) {
		const voiceChannel: Discord.VoiceChannel = this.member.voice.channel;
		param = param.trim();
		if (isLink(param)) {
			try {
				var toSchedule = await resolveYoutubeUrl(param, this.member);
			}
			catch (e) {
				return void this.channel.send('**Érvénytelen youtube url.**');
			}
			if (toSchedule.length > 1)
				this.channel.send(`**${toSchedule.length} elem került a sorba.**`);
			return void forceSchedule(this.channel as Discord.TextChannel, voiceChannel, this, toSchedule);
		}
		const ytString = sscanf(param, '%S') ?? '';
		try {
			const { results } = await youtube.searchVideos(ytString, 5);
			if (!results || results.length == 0)
				return void this.channel.send('**Nincs találat.**');
			await Promise.all(results.map(elem => elem.fetch()));
			const resultsView: SearchResultView[] = results.map(elem => Object.assign({}, {
				title: elem.title, duration: elem.minutes * 60 + elem.seconds
			}));
			try {
				var index: number = await searchPick.call(this, resultsView);
			}
			catch (e) {
				return;
			}
			const selectedResult = results[index];
			forceSchedule(this.channel as Discord.TextChannel, voiceChannel, this, [{
				name: selectedResult.title,
				url: selectedResult.url,
				type: 'yt',
				lengthSeconds: moment.duration(selectedResult._length).asSeconds(),
				requester: this.member
			}]);
		}
		catch (e) {
			console.error(e);
			this.channel.send('**Hiba a keresés során.**');
		}
	},
	async soundcloud(param) {
		const voiceChannel: Discord.VoiceChannel = this.member.voice.channel;
		const scString = sscanf(param, '%S') ?? '';
		if (isLink(scString)) {
			try {
				const track = await soundcloudResolveTrack(scString);
				forceSchedule(this.channel as Discord.TextChannel, voiceChannel, this, [{
					name: track.title,
					url: track.url,
					type: 'sc',
					lengthSeconds: track.duration,
					requester: this.member
				}]);
			}
			catch (e) {
				console.error(e);
				this.channel.send('**Hiba a keresés során.**');
			}
		}
		else {
			try {
				const results = await soundcloudSearch(scString, 5);
				if (!results || results.length == 0)
					return void this.channel.send('nincs találat.');
				try {
					var index: number = await searchPick.call(this, results);
				}
				catch (e) {
					return;
				}
				const selectedResult = results[index];
				forceSchedule(this.channel as Discord.TextChannel, voiceChannel, this, [{
					name: selectedResult.title,
					url: selectedResult.url,
					type: 'sc',
					lengthSeconds: selectedResult.duration,
					requester: this.member
				}]);
			}
			catch (e) {
				console.error(e);
				this.channel.send('**Hiba a keresés során.**');
			}
		}
	},
	async custom(param) {
		const voiceChannel: Discord.VoiceChannel = this.member.voice.channel;
		const url = sscanf(param, '%s') ?? '';
		forceSchedule(this.channel as Discord.TextChannel, voiceChannel, this, [{
			name: 'Custom',
			url,
			type: 'custom',
			lengthSeconds: undefined,
			requester: this.member
		}]);
	},
	leave(_) {
		const guildPlayer: GuildPlayer = this.guildPlayer;
		guildPlayer.leave();
		this.guildPlayer = undefined; //guildPlayer törlése így tehető meg
		this.react(tickEmoji);
	},
	repeat(param) {
		const count = sscanf(param, '%d');
		if (count <= 0 && count != null)
			return void this.reply('pozitív számot kell megadni.');
		this.guildPlayer.repeat(count);
		this.channel.send('**Ismétlés felülírva.**');
	},
	async radios(_) {
		function listRadios(lang: string) { //TODO ez is enum: kultkód/nyelvkód
			return [...radiosList.entries()]
				.filter(([_key, value]) => value.cult == lang)
				.map(([key, value]) => `${value.name}** ID:** *${key}*`)
				.sort()
				.join('\n');
		}
		const prefix = getPrefix(this.guild.id);
		const baseEmbed: Discord.MessageEmbed = commonEmbed.call(this).addField('❯ Használat', `\`${prefix}join <ID>\`\n\`${prefix}tune <ID>\``);
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
	},
	shuffle(_) {
		this.guildPlayer.shuffle();
		this.react(tickEmoji);
	},
	clear(_) {
		this.guildPlayer.clear();
		this.react(tickEmoji);
	},
	toplast(_) {
		this.guildPlayer.topLast();
		this.react(tickEmoji);
	},
	remove(param) {
		const queuePosition = sscanf(param, '%d');
		if (queuePosition == undefined)
			return void this.reply('**paraméterként szám elvárt.**');
		this.guildPlayer.remove(queuePosition);
		this.react(tickEmoji);
	},
	help(param) {
		const prefix = getPrefix(this.guild.id);
		let helpCommand = sscanf(param, '%s');
		if (!helpCommand) {
			const userCommands = commandNamesByTypes(commands, 'grantable', 'unlimited');
			userCommands.sort();
			const adminCommands = commandNamesByTypes(commands, 'adminOnly');
			adminCommands.sort();
			const embed = commonEmbed.call(this)
				.addField('❯ Felhasználói parancsok', userCommands.map(cmd => `\`${cmd}\``).join(' '))
				.addField('❯ Adminisztratív parancsok', adminCommands.map(cmd => `\`${cmd}\``).join(' '))
				.addField('❯ Részletes leírás', `\`${prefix}help <command>\``)
				.addField('❯ Egyéb információk', `RAD.io meghívása saját szerverre: [Ide kattintva](https://discordapp.com/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot)
Meghívó a RAD.io Development szerverre: [discord.gg/C83h4Sk](https://discord.gg/C83h4Sk)
A bot fejlesztői (kattints a támogatáshoz): ${creators.map(creator => creator.resolveMarkdown()).join(', ')}`);
			return void this.channel.send({ embed });
		}
		helpCommand = translateAlias(helpCommand);
		if (commands.has(helpCommand)) {
			const currentCommand = commands.get(helpCommand);
			const currentAliases = currentCommand.aliases;
			const currentRequirements = currentCommand.helpRelated.requirements;
			currentAliases.sort();
			const embed = commonEmbed.call(this, ` ${helpCommand}`)
				.addField('❯ Részletes leírás', currentCommand.helpRelated.ownDescription)
				.addField('❯ Teljes parancs', `\`${prefix}${helpCommand}${['', ...currentCommand.helpRelated.params.map((attribute: string) => `<${attribute}>`)].join(' ')}\``)
				.addField('❯ Használat feltételei', currentRequirements.length == 0 ? '-' : currentRequirements.join(' '))
				.addField('❯ Alias-ok', currentAliases.length == 0 ? 'Nincs alias a parancshoz.' : currentAliases.map(alias => `\`${prefix}${alias}\``).join(' '));
			return void this.channel.send({ embed });
		}
		this.reply('nincs ilyen nevű parancs.');
	},
	async guilds(_) {
		const guildLines = client.guilds.cache.map(g => `${g.name} **=>** \`${g.id}\` (${g.memberCount})`);
		createPastebin(`${client.user.username} on ${client.guilds.cache.size} guilds with ${client.users.cache.size} users.`, guildLines.join('\n'))
			.then(link => this.channel.send(link));
	},
	async connections(_) {
		const connectionLines = client.voice.connections.map(vc => `${vc.channel.guild.name} (${vc.channel.guild.id}) - ${vc.channel.name} (${vc.channel.members.filter(member => !member.user.bot).size})`);
		const usersAffected = client.voice.connections.map(vc => vc.channel.members.filter(member => !member.user.bot).size).reduce((prev, curr) => prev + curr, 0);
		createPastebin(`${client.user.username} on ${client.voice.connections.size} voice channels with ${usersAffected} users.`, connectionLines.join('\n'))
			.then(link => this.channel.send(link));
	},
	async testradios(_) {
		const idAndAvailables = await Promise.all([...radios].map(async ([id, data]) => [id, await axios.get(data.url, { timeout: 5000, responseType: 'stream' }).then(response => response.status == 200, _ => false)]));
		const offRadios = idAndAvailables.filter(([_, available]) => !available).map(([id, _]) => id);
		createPastebin(`${offRadios.length} radios went offline`, offRadios.join('\n'))
			.then(link => this.channel.send(link));
	},
	async leaveguild(param) {
		const id = sscanf(param, '%s');
		const guildToLeave = await client.guilds.resolve(id).leave();
		this.channel.send(`**Szerver elhagyva:** ${guildToLeave.name}`);
	},
	voicecount(_) {
		this.channel.send(`:information_source: ${client.voice.connections.size} voice connection(s) right now.`);
	},
async queue(_) {
		const queue: MusicData[] = this.guildPlayer.queue;
		if (queue.length == 0)
			return void this.channel.send('**A sor jelenleg üres.**');
		const embed = commonEmbed.call(this);
		const queueLines = queue.map(elem => `${getEmoji(elem.type)} [${elem.name}](${elem.url})\n\t(Hossz: ${hourMinSec(elem.lengthSeconds)}; Kérte: ${elem.requester})`);
		await useScrollableEmbed(this, embed, (currentPage, maxPage) => `❯ Lista (felül: legkorábbi) Oldal: ${currentPage}/${maxPage}`, queueLines);
	},
	async fallback(param) {
		const aliases = new Map([['r', 'radio'], ['s', 'silence'], ['l', 'leave']]);
		let mode = sscanf(param, '%s') ?? '';
		mode = aliases.get(mode) ?? mode;
		if (!(new Set(aliases.values())).has(mode))
			return void this.reply('**ilyen fallback mód nem létezik.**');
		setFallbackMode(this.guild.id, <FallbackType>mode);
		this.channel.send(`**Új fallback: ${mode}. **`);
		try {
			await saveRow.fallbackModes({ guildID: this.guild.id, type: <FallbackType>mode });
		}
		catch (e) {
			console.error(e);
			this.channel.send('**Mentés sikertelen.**');
		}
	},
	async fallbackradio(param) {
		const given: string = sscanf(param, '%s') ?? '';
		if (radiosList.has(given)) {
			var fr: MusicData = Object.assign({
				type: 'radio' as StreamType,
				lengthSeconds: undefined,
				requester: undefined
			}, radiosList.get(given));
		}
		else if (given.search(/https?:\/\//) == 0)
			fr = {
				type: 'custom',
				name: given,
				url: given,
				lengthSeconds: undefined,
				requester: undefined
			};
		else
			return void this.reply('érvénytelen rádióadó.');
		setFallbackChannel(this.guild.id, fr);
		this.channel.send(`**Fallback rádióadó sikeresen beállítva: ${getEmoji(fr.type)} \`${fr.name}\`**`);
		try {
			await saveRow.fallbackData({ guildID: this.guild.id, type: fr.type, name: fr.name, data: (fr.type=='radio')?given:fr.url });
		}
		catch (e) {
			console.error(e);
			this.channel.send('**Hiba: a beállítás csak leállásig lesz érvényes.**');
		}
	},
	skip(_) {
		this.guildPlayer.skip();
	},
	pause(_) {
		this.guildPlayer.pause();
		this.react(tickEmoji);
	},
	resume(_) {
		this.guildPlayer.resume();
		this.react(tickEmoji);
	},
	tune(param) {
		const voiceChannel: Discord.VoiceChannel = this.member.voice.channel;
		const channel = extractChannel(this, param);
		forceSchedule(this.channel as Discord.TextChannel, voiceChannel, this, [Object.assign({
			type: 'radio' as StreamType,
			lengthSeconds: undefined,
			requester: this.member
		}, radiosList.get(channel))]);
	},
	grant(param) {
		permissionReused.call(this, param, (commands: string[], roleCommands: string[]) =>
			commands.forEach(elem => {
				if (!roleCommands.includes(elem))
					roleCommands.push(elem);
			}));
	},
	granteveryone(param) {
		actions['grant'].call(this, `${param} @everyone`);
	},
	deny(param) {
		permissionReused.call(this, param, (commands: string[], roleCommands: string[]) =>
			commands.forEach(elem => {
				if (roleCommands.includes(elem))
					roleCommands.splice(roleCommands.indexOf(elem), 1);
			}));
	},
	denyeveryone(param) {
		actions['deny'].call(this, `${param} @everyone`);
	},
	nowplaying(_) {
		const nowPlayingData = this.guildPlayer.nowPlaying();
		if (!nowPlayingData)
			return void this.channel.send('**CSEND**');
		const embed = commonEmbed.call(this)
			.setTitle('❯ Épp játszott stream')
			.setDescription(`${getEmoji(nowPlayingData.type)} [${nowPlayingData.name}](${nowPlayingData.url})\n${hourMinSec(nowPlayingData.playingSeconds)}/${hourMinSec(nowPlayingData.lengthSeconds)}`);
		this.channel.send({ embed });
	},
	async perms(_) {
		const adminRight = await Promise.resolve(isAdmin(this));
		const adminCommands = commandNamesByTypes(commands, 'adminOnly', 'grantable');
		adminCommands.sort();
		const unlimitedCommands = commandNamesByTypes(commands, 'unlimited');
		const grantedPerms = getRoles(this.guild.id).filter(([roleID, _]) => this.member.roles.cache.has(roleID)).filter(([_, commands]) => commands.length > 0);
		grantedPerms.sort(([roleA, _commandsA], [roleB, _commandsB]) => roleA.localeCompare(roleB));
		grantedPerms.forEach(([_, commands]) => commands.sort());
		const allPerms = adminRight ? [...adminCommands] : [];
		allPerms.splice(0, 0, ...[...unlimitedCommands, ...grantedPerms.map(([_, commandNames]) => commandNames).reduce((acc, commandNames) => acc.splice(0, 0, ...commandNames), [])]);
		allPerms.sort();
		let embed: Discord.MessageEmbed = commonEmbed.call(this);
		embed = embed.addField('❯ Összes jogosultság', allPerms.map(cmd => `\`${cmd}\``).join(' '));
		if (adminRight)
			embed = embed.addField('❯ Adminisztrátor jog', adminCommands.map(cmd => `\`${cmd}\``).join(' '));
		embed = embed.addFields(grantedPerms.map(([roleID, commands]) => Object.assign({}, {
			name: `❯ _${this.guild.roles.resolve(roleID).name}_ rang`,
			value: commands.map(cmd => `\`${cmd}\``).join(' ')
		})));
		this.channel.send({ embed });
	},
	volume(param) {
		const vol = sscanf(param, '%d');
		if (vol == undefined || vol <= 0 || vol > 15)
			return void this.reply('**paraméterként szám elvárt. (1-15)**');
		if (vol > 10)
			this.channel.send('**Figyelem: erősítést alkalmaztál, a hangban torzítás léphet fel.**');
		this.guildPlayer.setVolume(vol / 10);
		this.react(tickEmoji);
	},
	async seek(param) {
		const seconds = sscanf(param, '%d');
		if (seconds == undefined || seconds <= 0)
			return void this.reply('**paraméterként pozitív szám elvárt.**');
		const maxSeconds = this.guildPlayer.nowPlaying()?.lengthSeconds;
		if (seconds > maxSeconds)
			return void this.reply(`**a paraméter nem lehet nagyobb a szám hosszánál. (${maxSeconds})**`)
		//TODO: érvényes lehet-e a típus?
		await this.guildPlayer.seek(seconds);
		this.react(tickEmoji);
	},
	mute(_) {
		this.guildPlayer.mute();
		this.react(tickEmoji);
	},
	unmute(_) {
		this.guildPlayer.unmute();
		this.react(tickEmoji);
	},
	announce(param) {
		const [guildInfo, rawMessage = ''] = <string[]>sscanf(param, '%s %S');
		const message: string = eval(rawMessage);
		const guildToAnnounce = guildInfo == 'all' ? client.guilds.cache.array() : guildInfo == 'conn' ? client.voice.connections.map(conn => conn.channel.guild) : [client.guilds.resolve(guildInfo)];
		guildToAnnounce.forEach(guild => sendGuild(guild, message));
		this.react(tickEmoji);
	},
	partner(param) {
		const [link = '', rawContent = '""', username = '', serverName = ''] = param.split('\n');
		const content: string = eval(rawContent);
		sendToPartnerHook(link, content, username, serverName);
		this.react(tickEmoji);
	}
};
async function permissionReused(this: ThisBinding, param: string, filler: (affectedCommands: string[], configedCommands: string[]) => void): Promise<void> {
	try {
		var [permCommands = '', roleName = ''] = <string[]>sscanf(param, '%s %S');
	}
	catch (e) {
		//Nem nyertünk ki értelmeset
		return void this.reply('**nem megfelelő formátum.**');
	}
	if (!permCommands)
		return void this.reply('**az első paraméter üres.**');
	const commandsArray = permCommands.toLowerCase() == 'all' ? debatedCommands : permCommands.split('|').map(translateAlias);
	const firstWrong = commandsArray.find(elem => !debatedCommands.includes(elem));
	if (firstWrong)
		return void this.reply(`**\`${firstWrong}\` nem egy kérdéses jogosultságú parancs.**`);
	const role: Discord.Role = this.guild.roles.cache.find((elem: Discord.Role) => elem.name == roleName);
	if (!role)
		return void this.channel.send('**Nem létezik a megadott role.**');
	const currentRoles = getRoleSafe(this.guild.id);
	const roleCommands = attach(currentRoles, role.id, new Array());
	filler(commandsArray, roleCommands);
	try {
		await saveRow.role({ guildID: this.guild.id, roleID: role.id, commands: roleCommands.join('|') });
		this.channel.send(`**Új jogosultságok mentve.**`);
	}
	catch (e) {
		console.error(e);
		this.channel.send('**Hiba: a beállítás csak leállásig lesz érvényes.**');
	}
}

function extractChannel(textChannelHolder: TextChannelHolder, param: string) {
	let channelToPlay = sscanf(param, '%s') ?? '';
	if (channelToPlay && !radiosList.has(channelToPlay)) {
		channelToPlay = randomElement(channels);
		textChannelHolder.channel.send("**Hibás csatornanevet adtál meg, ezért egy random csatorna kerül lejátszásra!**");
	}
	return channelToPlay;
}

async function resolveYoutubeUrl(url: string, requester: Discord.GuildMember): Promise<MusicData[]> {
	try {
		const ytPlaylist = await youtube.getPlaylist(url);
		const videos = await ytPlaylist.fetchVideos(maxPlaylistSize);
		const fetchedVideos = (await Promise.all(videos.map(elem => elem.fetch().catch(_ => null)))).filter(x => x);
		return fetchedVideos.map(elem => Object.assign({}, {
			name: elem.title,
			url: elem.url,
			type: 'yt',
			lengthSeconds: moment.duration(elem._length).asSeconds(),
			requester
		}) as MusicData);
	}
	catch (e) {
		//Not a playlist
		const ytVideo = await youtube.getVideo(url);
		return [{
			name: ytVideo.title,
			url,
			type: 'yt',
			lengthSeconds: moment.duration(ytVideo._length).asSeconds(),
			requester
		}];
	}
}

async function searchPick(this: ThisBinding, results: SearchResultView[]): Promise<number> {
	if (results.length == 1)
		return 0;
	else if (!this.guild.member(client.user).permissions.has('ADD_REACTIONS')) {
		this.channel.send('**Az opciók közüli választáshoz a botnak **`ADD_REACTIONS`** jogosultságra van szüksége.\nAutomatikusan az első opció kiválasztva.**');
		return 0;
	}
	else {
		const emojis = ['1⃣', '2⃣', '3⃣', '4⃣', '5⃣'].slice(0, results.length);
		let counter = 1;
		const embed = commonEmbed.call(this)
			.setTitle("❯ Találatok")
			.setDescription(results.map(elem => `__${counter++}.__ - ${discordEscape(elem.title)} \`(${hourMinSec(elem.duration)})\``).join('\n'));
		const message: Discord.Message = await this.channel.send(embed);
		const filter = (reaction: Discord.MessageReaction, user: Discord.User) => emojis.some(emoji => reaction.emoji.name === emoji) && user.id == this.author.id;
		const selectionPromise: Promise<number> = new Promise(async (resolve, reject) => {
			const collector = message.createReactionCollector(filter, { maxEmojis: 1, time: 30000 });
			collector.on('collect', (r: Discord.MessageReaction) => {
				const index = emojis.indexOf(r.emoji.name);
				resolve(index);
				collector.stop();
			});
			collector.on('end', (_: any) => reject('Lejárt a választási idő.'));
			for (const emoji of emojis) {
				const reaction = await message.react(emoji);
				selectionPromise.then(_ => reaction.users.remove(client.user), _ => reaction.users.remove(client.user));
			}

		});
		try {
			const which = await selectionPromise;
			return which;
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
}

async function joinAndStartup(startup: (guildPlayer: GuildPlayer) => void) {
	const voiceChannel: Discord.VoiceChannel = this.member.voice.channel;
	try {
		await this.channel.send('**Csatlakozva.**');
		await voiceChannel.join();
		this.guildPlayer = new GuildPlayer(this.guild, this.channel, []);
		startup(this.guildPlayer);
	}
	catch (e) {
		console.error(e);
		this.channel.send('**Hiba a csatlakozás során.**');
	}
}

function sendToPartnerHook(link: string, content: string, username: string, serverName: string): void {
	const embed = new Discord.MessageEmbed();
	embed.setColor(webhookC);
	embed.setFooter(serverName);
	embed.setDescription(content);
	partnerHook.send(link, { embeds: [embed], username, avatarURL }).catch(console.error);
}