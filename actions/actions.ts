import * as Discord from 'discord.js';
import { getVoiceConnections, joinVoiceChannel } from '@discordjs/voice';
import moment from 'moment';
import { commandNamesByTypes, randomElement, hourMinSec, attach, GuildPlayer, StreamType, FallbackType, MusicData,
	client, channels, commands, creators, getEmoji, radios as radiosList, translateAlias, forceSchedule,
	commonEmbed, useScrollableEmbed, sendGuild, saveRow, createPastebin, TextChannelHolder, isLink, SearchResultView, partnerHook, avatarURL, webhookC, radios, setPrefix, tickEmoji,
	discordEscape, maxPlaylistSize, getPrefix, setFallbackMode, setFallbackChannel, getRoleSafe, getRoles, ThisBinding, Actions, isAdmin, devServerInvite, ParameterData, debatedCommands } from '../internal.js';
const apiKey = process.env.youtubeApiKey;
import { YouTube } from 'popyt';
import axios from 'axios';
const youtube = new YouTube(apiKey);
import { sscanf } from 'scanf';
export const actions: Actions = {
	async setprefix(newPrefix) {
		newPrefix = newPrefix.toLowerCase();
		setPrefix(this.guild.id, newPrefix);
		try {
			await saveRow.prefix({ guildID: this.guild.id, prefix: newPrefix });
			this.reply(`${newPrefix} **az új prefix.**`);
		}
		catch (e) {
			console.error('Elmenteni nem sikerült a configot!');
			console.error(e);
			this.reply(`${newPrefix} **a prefix, de csak leállásig...**`);
		}
	},
	async join(stationId) {
		const channelToPlay = extractChannel(this, stationId);
		joinAndStartup.call(this, (gp: GuildPlayer) => {
			if (channelToPlay)
				gp.schedule(Object.assign({
					type: 'radio' as StreamType,
					lengthSeconds: undefined,
					requester: this.member as Discord.GuildMember
				}, radiosList.get(channelToPlay)));
		});
	},
	joinfallback() {
		joinAndStartup.call(this, (gp: GuildPlayer) => gp.skip());
	},

	async yt(ytQuery) {
		const voiceChannel = (this.member as Discord.GuildMember).voice.channel;
		ytQuery = ytQuery.trim();
		if (isLink(ytQuery)) {
			try {
				var toSchedule = await resolveYoutubeUrl(ytQuery, this.member as Discord.GuildMember);
			}
			catch (e) {
				return void this.reply({content: '**Érvénytelen youtube url.**', ephemeral: true});
			}
			if (toSchedule.length > 1)
				this.reply(`**${toSchedule.length} elem került a sorba.**`);
			return void forceSchedule(this.channel as Discord.TextChannel, voiceChannel, this, toSchedule);
		}
		const ytString = sscanf(ytQuery, '%S') ?? '';
		try {
			const { results } = await youtube.searchVideos(ytString, 5);
			if (!results || results.length == 0)
				return void this.reply({content: '**Nincs találat.**', ephemeral: true});
			await Promise.all(results.map(elem => elem.fetch()));
			const resultsView: SearchResultView[] = results.map(elem => ({
				title: elem.title,
				duration: elem.minutes * 60 + elem.seconds,
				uploaderName: elem.channel.name
			}));
			try {
				var index: number = await searchPick.call(this, resultsView);
			}
			catch (e) {
				if (e != 'timeout')
					console.error('Hiba a keresés közben: ', e);
				return;
			}
			const selectedResult = results[index];
			forceSchedule(this.channel as Discord.TextChannel, voiceChannel, this, [{
				name: selectedResult.title,
				url: selectedResult.url,
				type: 'yt',
				lengthSeconds: moment.duration(selectedResult._length).asSeconds(),
				requester: this.member as Discord.GuildMember
			}]);
		}
		catch (e) {
			console.error(e);
			this.reply({content: '**Hiba a keresés során.**', ephemeral: true});
		}
	},
	async custom(url) {
		const voiceChannel = (this.member as Discord.GuildMember).voice.channel;
		url = sscanf(url, '%s') ?? '';
		forceSchedule(this.channel as Discord.TextChannel, voiceChannel, this, [{
			name: 'Custom',
			url,
			type: 'custom',
			lengthSeconds: undefined,
			requester: this.member as Discord.GuildMember
		}]);
	},
	async leave() {
		const guildPlayer: GuildPlayer = this.guildPlayer;
		guildPlayer.leave();
		this.guildPlayer = undefined; //guildPlayer törlése így tehető meg
		await this.reply(tickEmoji);
	},
	async repeat(count) {
		if (count <= 0 && count != null)
			return void (await this.reply({ content: '**Pozitív számot kell megadni.**', ephemeral: true }));
		this.guildPlayer.repeat(count);
		this.reply(`**Ismétlés felülírva: ${count ?? 'végtelen'} alkalom.**`);
	},
	async radios() {
		function listRadios(lang: string) { //TODO ez is enum: kultkód/nyelvkód
			return [...radiosList.entries()]
				.filter(([_key, value]) => value.cult == lang)
				.map(([key, value]) => `${value.name}** ID:** *${key}*`)
				.sort()
				.join('\n');
		}
		const prefix = getPrefix(this.guild.id);
		let baseEmbed: Discord.EmbedBuilder = commonEmbed.call(this);
		baseEmbed = baseEmbed.addFields({name: '❯ Használat', value: `\`${prefix}join <ID>\`\n\`${prefix}tune <ID>\``});
		await this.reply({
			embeds: [Discord.EmbedBuilder.from(baseEmbed)
				.setTitle('❯ Magyar rádiók')
				.setDescription(listRadios('hun')),
				Discord.EmbedBuilder.from(baseEmbed)
				.setTitle('❯ Külföldi rádiók')
				.setDescription(listRadios('eng'))]
		});
	},
	async shuffle() {
		this.guildPlayer.shuffle();
		await this.reply(tickEmoji);
	},
	async clear() {
		this.guildPlayer.clear();
		await this.reply(tickEmoji);
	},
	async toplast() {
		this.guildPlayer.topLast();
		await this.reply(tickEmoji);
	},
	async remove(queuePosition) {
		this.guildPlayer.remove(queuePosition);
		await this.reply(tickEmoji);
	},
	async help(helpCommand) {
		const prefix = getPrefix(this.guild.id);
		if (!helpCommand) {
			const userCommands = commandNamesByTypes(commands, 'grantable', 'unlimited');
			userCommands.sort();
			const adminCommands = commandNamesByTypes(commands, 'adminOnly');
			adminCommands.sort();
			let embed: Discord.EmbedBuilder = commonEmbed.call(this);
			embed = embed
				.addFields(
				{name: '❯ Felhasználói parancsok', value: userCommands.map(cmd => `\`${cmd}\``).join(' ')},
				{name: '❯ Adminisztratív parancsok', value: adminCommands.map(cmd => `\`${cmd}\``).join(' ')},
				{name: '❯ Részletes leírás', value: `\`${prefix}help <command>\``},
				{name: '❯ Egyéb információk', value: `RAD.io meghívása saját szerverre: [Ide kattintva](https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=274881334336&scope=bot%20applications.commands)
Meghívó a RAD.io Development szerverre: [${devServerInvite.substring('https://'.length)}](${devServerInvite})
A bot fejlesztői (kattints a támogatáshoz): ${creators.map(creator => creator.resolveMarkdown()).join(', ')}`}
				);
			return void this.reply({ embeds: [embed] });
		}
		helpCommand = translateAlias(helpCommand);
		if (commands.has(helpCommand)) {
			const currentCommand = commands.get(helpCommand);
			const currentAliases = currentCommand.aliases;
			const currentRequirements = currentCommand.helpRelated.requirements;
			currentAliases.sort();
			let embed: Discord.EmbedBuilder = commonEmbed.call(this, ` ${helpCommand}`);
			embed = embed
				.addFields(
				{name: '❯ Részletes leírás', value: currentCommand.helpRelated.ownDescription},
				{name: '❯ Teljes parancs', value: `\`${prefix}${helpCommand}${['', ...currentCommand.helpRelated.params.map((param: ParameterData) => `<${param.name}>`)].join(' ')}\``},
				{name: '❯ Használat feltételei', value: currentRequirements.length == 0 ? '-' : currentRequirements.join(' ')},
				{name: '❯ Alias-ok', value: currentAliases.length == 0 ? 'Nincs alias a parancshoz.' : currentAliases.map(alias => `\`${prefix}${alias}\``).join(' ')}
				);
			return void this.reply({ embeds: [embed] });
		}
		await this.reply({ content: '**Nincs ilyen nevű parancs.**', ephemeral: true });
	},
	guilds() {
		const guildLines = client.guilds.cache.map(g => `${g.name} **=>** \`${g.id}\` (${g.memberCount})`);
		createPastebin(`${client.user.username} on ${client.guilds.cache.size} guilds with ${client.users.cache.size} users.`, guildLines.join('\n'))
			.then(link => this.reply({content: link, ephemeral: true}));
	},
	async connections() {
		const connectionLines = Array.from(getVoiceConnections().values(), vc => `${client.guilds.resolve(vc.joinConfig.guildId).name} (${vc.joinConfig.guildId}) - ${(client.channels.resolve(vc.joinConfig.channelId) as Discord.VoiceBasedChannel).name} (${(client.channels.resolve(vc.joinConfig.channelId) as Discord.VoiceBasedChannel).members.filter(member => !member.user.bot).size})`);
		const usersAffected = Array.from(getVoiceConnections().values(), vc => (client.channels.resolve(vc.joinConfig.channelId) as Discord.VoiceBasedChannel).members.filter(member => !member.user.bot).size).reduce((prev, curr) => prev + curr, 0);
		createPastebin(`${client.user.username} on ${getVoiceConnections().size} voice channels with ${usersAffected} users.`, connectionLines.join('\n'))
			.then(link => this.reply({content: link, ephemeral: true}));
	},
	async testradios() {
		const idAndAvailables = await Promise.all([...radios].map(async ([id, data]) => [id, await axios.get(data.url, { timeout: 5000, responseType: 'stream' }).then(response => response.status == 200, _ => false)]));
		const offRadios = idAndAvailables.filter(([_, available]) => !available).map(([id, _]) => id);
		createPastebin(`${offRadios.length} radios went offline`, offRadios.join('\n'))
			.then(link => this.reply(link));
	},
	async leaveguild(id) {
		const guildToLeave = await client.guilds.resolve(id).leave();
		this.reply({ content: `**Szerver elhagyva:** ${guildToLeave.name}`, ephemeral: true});
	},
	voicecount() {
		this.reply({content: `:information_source: ${getVoiceConnections().size} voice connection(s) right now.`, ephemeral: true});
	},
	async queue() {
		const queue: MusicData[] = this.guildPlayer.queue;
		if (queue.length == 0)
			return void this.reply('**A sor jelenleg üres.**');
		const embed: Discord.EmbedBuilder = commonEmbed.call(this);
		const queueLines = queue.map((elem,index) => `${getEmoji(elem.type)} **${index+1}.** \t [${elem.name}](${elem.url})\n\t(Hossz: ${hourMinSec(elem.lengthSeconds)}; Kérte: ${elem.requester})`);
		await useScrollableEmbed(this, embed, (currentPage, maxPage) => `❯ Lista (felül: legkorábbi) Oldal: ${currentPage}/${maxPage}, Összesen ${queue.length} elem`, queueLines);
	},
	async fallback(mode) {
		const aliases = new Map([['r', 'radio'], ['s', 'silence'], ['l', 'leave']]);
		mode = aliases.get(mode) ?? mode;
		if (!(new Set(aliases.values())).has(mode))
			return void (await this.reply({ content: '**Ilyen fallback mód nem létezik.**', ephemeral: true }));
		setFallbackMode(this.guild.id, <FallbackType>mode);
		this.reply(`**Új fallback: ${mode}. **`);
		try {
			await saveRow.fallbackModes({ guildID: this.guild.id, type: <FallbackType>mode });
		}
		catch (e) {
			console.error(e);
			this.reply('**Mentés sikertelen.**');
		}
	},
	async fallbackradio(given) {
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
			return void (await this.reply({ content: '**Érvénytelen rádióadó.**', ephemeral: true }));
		setFallbackChannel(this.guild.id, fr);
		this.reply(`**Fallback rádióadó sikeresen beállítva: ${getEmoji(fr.type)} \`${fr.name}\`**`);
		try {
			await saveRow.fallbackData({ guildID: this.guild.id, type: fr.type, name: fr.name, data: (fr.type=='radio')?given:fr.url });
		}
		catch (e) {
			console.error(e);
			this.reply('**Hiba: a beállítás csak leállásig lesz érvényes.**');
		}
	},
	async skip(amountToSkip) {
		if (amountToSkip<=0)
			amountToSkip=1;
		await this.guildPlayer.skip(amountToSkip);		
		await this.reply(tickEmoji);
	},
	async pause() {
		this.guildPlayer.pause();
		await this.reply(tickEmoji);
	},
	async resume() {
		this.guildPlayer.resume();
		await this.reply(tickEmoji);
	},
	tune(param) {
		const voiceChannel = (this.member as Discord.GuildMember).voice.channel;
		const channel = extractChannel(this, param);
		forceSchedule(this.channel as Discord.TextChannel, voiceChannel, this, [Object.assign({
			type: 'radio' as StreamType,
			lengthSeconds: undefined,
			requester: this.member as Discord.GuildMember
		}, radiosList.get(channel))]);
	},
	grant(commandSet, role) {
		permissionReused.call(this, commandSet, role, (commands: string[], roleCommands: string[]) =>
			commands.forEach(elem => {
				if (!roleCommands.includes(elem))
					roleCommands.push(elem);
			}));
	},
	granteveryone(commandSet) {
		actions['grant'].call(this, `${commandSet} @everyone`);
	},
	deny(commandSet, role) {
		permissionReused.call(this, commandSet, role, (commands: string[], roleCommands: string[]) =>
			commands.forEach(elem => {
				if (roleCommands.includes(elem))
					roleCommands.splice(roleCommands.indexOf(elem), 1);
			}));
	},
	denyeveryone(commandSet) {
		actions['deny'].call(this, `${commandSet} @everyone`);
	},
	nowplaying() {
		const nowPlayingData = this.guildPlayer.nowPlaying();
		if (!nowPlayingData)
			return void this.reply('**CSEND**');
		let embed: Discord.EmbedBuilder = commonEmbed.call(this);
		embed = embed
			.setTitle('❯ Épp játszott stream')
			.setDescription(`${getEmoji(nowPlayingData.type)} [${nowPlayingData.name}](${nowPlayingData.url})\n${hourMinSec(nowPlayingData.playingSeconds)}/${hourMinSec(nowPlayingData.lengthSeconds)}`);
		this.reply({ embeds: [embed] });
	},
	async perms() {
		const adminRight = await Promise.resolve(isAdmin(this));
		const adminCommands = commandNamesByTypes(commands, 'adminOnly', 'grantable');
		adminCommands.sort();
		const unlimitedCommands = commandNamesByTypes(commands, 'unlimited');
		const grantedPerms = getRoles(this.guild.id).filter(([roleID, _]) => (this.member as Discord.GuildMember).roles.cache.has(roleID)).filter(([_, commands]) => commands.length > 0);
		grantedPerms.sort(([roleA, _commandsA], [roleB, _commandsB]) => roleA.localeCompare(roleB));
		grantedPerms.forEach(([_, commands]) => commands.sort());
		const allPerms = adminRight ? [...adminCommands] : [];
		allPerms.splice(0, 0, ...[...unlimitedCommands, ...grantedPerms.map(([_, commandNames]) => commandNames).reduce((acc, commandNames) => acc.splice(0, 0, ...commandNames), [])]);
		allPerms.sort();
		let embed: Discord.EmbedBuilder = commonEmbed.call(this);
		const embedFields: Discord.APIEmbedField[] = [];
		embedFields.push({name: '❯ Összes jogosultság', value: allPerms.map(cmd => `\`${cmd}\``).join(' ')});
		if (adminRight)
			embedFields.push({name: '❯ Adminisztrátor jog', value: adminCommands.map(cmd => `\`${cmd}\``).join(' ')});
		embed = embed.addFields(...embedFields, ...grantedPerms.map(([roleID, commands]) => ({
			name: `❯ _${this.guild.roles.resolve(roleID).name}_ rang`,
			value: commands.map(cmd => `\`${cmd}\``).join(' ')
		})));
		this.reply({ embeds: [embed], ephemeral: true });
	},
	async volume(vol) {
		if (vol == undefined || vol <= 0 || vol > 15)
			return void (await this.reply({ content: '**Paraméterként szám elvárt. (1-15)**', ephemeral: true }));
		if (vol > 10)
			this.channel.send('**Figyelem: erősítést alkalmaztál, a hangban torzítás léphet fel.**');
		this.guildPlayer.setVolume(vol / 10);
		await this.reply(tickEmoji);
	},
	/*
	async seek(param) {
		const seconds = sscanf(param, '%d');
		if (seconds == undefined || seconds <= 0)
			return void (await this.editReply('**Paraméterként pozitív szám elvárt.**'));
		const maxSeconds = this.guildPlayer.nowPlaying()?.lengthSeconds;
		if (seconds > maxSeconds)
			return void (await this.editReply(`**a paraméter nem lehet nagyobb a szám hosszánál. (${maxSeconds})**`))
		//TODO: érvényes lehet-e a típus?
		await this.guildPlayer.seek(seconds);
		this.react(tickEmoji);
	},*/
	async mute() {
		this.guildPlayer.mute();
		await this.reply(tickEmoji);
	},
	async unmute() {
		this.guildPlayer.unmute();
		await this.reply(tickEmoji);
	},
	async announce(target, rawMessage) {
		const message: string = eval(rawMessage);
		const guildToAnnounce = target == 'all' ? Array.from(client.guilds.cache.values()) : target == 'conn' ? Array.from(getVoiceConnections().values(), conn => client.guilds.resolve(conn.joinConfig.channelId)) : [client.guilds.resolve(target)];
		guildToAnnounce.forEach(guild => sendGuild(guild, message));
		await this.reply(tickEmoji);
	},
	async partner(inv, rawContent, username, serverName) {
		const content: string = eval(rawContent);
		sendToPartnerHook(inv, content, username, serverName);
		await this.reply(tickEmoji);
	}
};
async function permissionReused(this: ThisBinding, permCommands: string, role: Discord.Role, filler: (affectedCommands: string[], configedCommands: string[]) => void): Promise<void> {
	const commandsArray = permCommands.toLowerCase() == 'all' ? debatedCommands : permCommands.split('|').map(translateAlias);
	const firstWrong = commandsArray.find(elem => !debatedCommands.includes(elem));
	if (firstWrong)
		return void (await this.reply({ content: `**\`${firstWrong}\` nem egy kérdéses jogosultságú parancs.**`, ephemeral: true }));
	const currentRoles = getRoleSafe(this.guild.id);
	const roleCommands = attach(currentRoles, role.id, new Array());
	filler(commandsArray, roleCommands);
	try {
		await saveRow.role({ guildID: this.guild.id, roleID: role.id, commands: roleCommands.join('|') });
		this.reply(`**Új jogosultságok mentve.**`);
	}
	catch (e) {
		console.error(e);
		this.reply('**Hiba: a beállítás csak leállásig lesz érvényes.**');
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
	const topResults = results.map((elem, index) => `__${index+1}.__ - ${discordEscape(elem.title)} \`(${hourMinSec(elem.duration)})\``);
	let embed: Discord.EmbedBuilder = commonEmbed.call(this);
	embed = embed
		.setTitle("❯ Találatok")
		.setDescription(topResults.join('\n'));
	const videoChooser = new Discord.SelectMenuBuilder()
		.setCustomId('select')
		.setPlaceholder('Válassz egy videót')
		.setMinValues(1)
		.setMaxValues(1)
		.addOptions(results.map((resultData, index) => ({
			label: discordEscape(resultData.title).slice(0, 100),
			value: index.toString(),
			description: `${hourMinSec(resultData.duration)} — ${resultData.uploaderName}`
	})));
	const row = new Discord.ActionRowBuilder<Discord.MessageActionRowComponentBuilder>().addComponents(videoChooser);
	const message = await this.channel.send({ embeds: [embed], components: [row] });
	const filter = (i: Discord.SelectMenuInteraction) => {
		i.deferUpdate();
		return i.user.id == this.user.id;
	};
	try {
		const selectInteraction = await message.awaitMessageComponent({filter, time: 30000 });
		videoChooser.setDisabled(true);
		message.edit({ components: [row] });
		return +(selectInteraction as Discord.SelectMenuInteraction).values[0];
	}
	catch (e) {
		const timeouted = e.message.endsWith('ending with reason: time');
		if (timeouted)
			embed.setTitle(`❯ Találatok - Lejárt a választási idő`);
		row.components[0].setDisabled(true);
		message.edit({embeds: [embed], components: [row] });
		throw timeouted ? 'timeout' : e;
	}
}

async function joinAndStartup(startup: (guildPlayer: GuildPlayer) => void) {
	const voiceChannel: Discord.VoiceChannel = this.member.voice.channel;
	try {
		await this.reply('**Csatlakozva.**');
		joinVoiceChannel({
			channelId: voiceChannel.id,
			guildId: voiceChannel.guildId,
			//@ts-ignore
			adapterCreator: voiceChannel.guild.voiceAdapterCreator
		});
		this.guildPlayer = new GuildPlayer(this.guild, this.channel, []);
		startup(this.guildPlayer);
	}
	catch (e) {
		console.error(e);
		this.reply('**Hiba a csatlakozás során.**');
	}
}

function sendToPartnerHook(link: string, content: string, username: string, serverName: string): void {
	const embed = new Discord.EmbedBuilder();
	embed.setColor(webhookC);
	embed.setFooter({ text: serverName });
	embed.setDescription(content);
	partnerHook.send({ content: link, embeds: [embed], username, avatarURL }).catch(console.error);
}
