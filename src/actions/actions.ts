import * as Discord from 'discord.js';
import { getVoiceConnections } from '@discordjs/voice';
import { commandNamesByTypes, randomElement, hourMinSec, attach, GuildPlayer, StreamType, FallbackType, MusicData,
	client, channels, commands, creators, getEmoji, radios as radiosList, forceSchedule,
	commonEmbed, useScrollableEmbed, sendGuild, saveRow, createPastebin, TextChannelHolder, partnerHook, avatarURL, webhookC, radios, tickEmoji,
	setFallbackMode, setFallbackChannel, getRoleSafe, getRoles, ThisBinding, Actions, isAdmin, devServerInvite, ParameterData, debatedCommands, couldPing, replyFirstSendRest, 
    commandPrefix,
    createGuildPlayerForRequest,
    resolveMusicData} from '../index.js';
import * as play from 'play-dl';
import { sscanf } from 'scanf';

export const actions: Actions = {
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
	async custom(url) {
		url = sscanf(url, '%s') ?? '';
		await this.deferReply();
		forceSchedule({
            actionContext: this,
            playableData: [{
                ...resolveMusicData('custom', url),
                requester: this.member as Discord.GuildMember
            }]
        });
	},
	async leave() {
		const guildPlayer: GuildPlayer = this.guildPlayer;
		guildPlayer.leave();
		this.guildPlayer = undefined; //guildPlayer törlése így tehető meg
		await this.reply(tickEmoji);
	},
	async repeat(count) {
		if (count <= 0 && count != null)
			return void await this.reply({ content: '**Pozitív számot kell megadni.**', ephemeral: true });
		this.guildPlayer.repeat(count);
		await this.reply(`**Ismétlés felülírva: ${count ?? 'végtelen'} alkalom.**`);
	},
	async radios() {
		function listRadios(lang: string) { //TODO ez is enum: kultkód/nyelvkód
			return [...radiosList.entries()]
				.filter(([_key, value]) => value.cult == lang)
				.map(([key, value]) => `${value.name}** ID:** *${key}*`)
				.sort()
				.join('\n');
		}
		let baseEmbed: Discord.EmbedBuilder = commonEmbed.call(this);
		baseEmbed = baseEmbed.addFields({name: '❯ Használat', value: `\`${commandPrefix}join <ID>\`\n\`${commandPrefix}tune <ID>\``});
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
		if (!helpCommand) {
			const userCommands = commandNamesByTypes(commands, 'grantable', 'unlimited');
			userCommands.sort();
			const adminCommands = commandNamesByTypes(commands, 'adminOnly');
			adminCommands.sort();
			let embed: Discord.EmbedBuilder = commonEmbed.call(this);
			embed = embed
				.addFields(
				{name: '❯ Felhasználói parancsok', value: userCommands.map(cmd => `\`${commandPrefix}${cmd}\``).join(' ')},
				{name: '❯ Adminisztratív parancsok', value: adminCommands.map(cmd => `\`${commandPrefix}${cmd}\``).join(' ')},
				{name: '❯ Részletes leírás', value: `\`${commandPrefix}help <command>\``},
				{name: '❯ Egyéb információk', value: `RAD.io meghívása saját szerverre: [Ide kattintva](https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=274881334336&scope=bot%20applications.commands)
Meghívó a RAD.io Development szerverre: [${devServerInvite.substring('https://'.length)}](${devServerInvite})
A bot fejlesztői (kattints a támogatáshoz): ${creators.map(creator => creator.resolveMarkdown()).join(', ')}`}
				);
			return void await this.reply({ embeds: [embed] });
		}
		if (commands.has(helpCommand)) {
			const currentCommand = commands.get(helpCommand);
			const currentRequirements = currentCommand.helpRelated.requirements;
			let embed: Discord.EmbedBuilder = commonEmbed.call(this, ` ${helpCommand}`);
			embed = embed
				.addFields(
				{name: '❯ Részletes leírás', value: currentCommand.helpRelated.ownDescription},
				{name: '❯ Teljes parancs', value: `\`${commandPrefix}${helpCommand}${['', ...currentCommand.helpRelated.params.map((param: ParameterData) => `<${param.name}>`)].join(' ')}\``},
				{name: '❯ Használat feltételei', value: currentRequirements.length == 0 ? '-' : currentRequirements.join(' ')}
				);
			return void await this.reply({ embeds: [embed] });
		}
		await this.reply({ content: '**Nincs ilyen nevű parancs.**', ephemeral: true });
	},
	async guilds() {
		const guildLines = client.guilds.cache.map(g => `${g.name} **=>** \`${g.id}\` (${g.memberCount})`);
		await createPastebin(`${client.user.username} on ${client.guilds.cache.size} guilds with ${client.users.cache.size} users.`, guildLines.join('\n'))
			.then(link => this.reply({content: link, ephemeral: true}));
	},
	async connections() {
		const connectionLines = Array.from(getVoiceConnections().values(), vc => `${client.guilds.resolve(vc.joinConfig.guildId).name} (${vc.joinConfig.guildId}) - ${(client.channels.resolve(vc.joinConfig.channelId) as Discord.VoiceBasedChannel).name} (${(client.channels.resolve(vc.joinConfig.channelId) as Discord.VoiceBasedChannel).members.filter(member => !member.user.bot).size})`);
		const usersAffected = Array.from(getVoiceConnections().values(), vc => (client.channels.resolve(vc.joinConfig.channelId) as Discord.VoiceBasedChannel).members.filter(member => !member.user.bot).size).reduce((prev, curr) => prev + curr, 0);
		await createPastebin(`${client.user.username} on ${getVoiceConnections().size} voice channels with ${usersAffected} users.`, connectionLines.join('\n'))
			.then(link => this.reply({ content: link, ephemeral: true }));
	},
	async testradios() {
		await this.deferReply({ ephemeral: true });
		const idAndAvailables = await Promise.all([...radios].map(async ([id, data]) => [id, await couldPing(data.url)]));
		const offRadios = idAndAvailables.filter(([_, available]) => !available).map(([id, _]) => id);
		await createPastebin(`${offRadios.length} radios went offline`, offRadios.join('\n'))
			.then(link => this.editReply({ content: link }));
	},
	async leaveguild(id) {
		const guildToLeave = await client.guilds.resolve(id).leave();
		await this.reply({ content: `**Szerver elhagyva:** ${guildToLeave.name}`, ephemeral: true});
	},
	async voicecount() {
		await this.reply({content: `:information_source: ${getVoiceConnections().size} voice connection(s) right now.`, ephemeral: true});
	},
	async queue() {
		const queue: MusicData[] = this.guildPlayer.queue;
		if (queue.length == 0)
			return void await this.reply('**A sor jelenleg üres.**');
		await this.reply(`**${queue.length} elem a sorban:**`);
		const embed: Discord.EmbedBuilder = commonEmbed.call(this);
        const optionalRequester = (elem: MusicData) => elem.requester ? `; Kérte: ${elem.requester}` : '';
		const queueLines = queue.map((elem,index) => `${getEmoji(elem.type)} **${index+1}.** \t [${elem.name}](${elem.url})\n\t(Hossz: ${hourMinSec(elem.lengthSeconds)}${optionalRequester(elem)})`);
		await useScrollableEmbed(this, embed, (currentPage, maxPage) => `❯ Lista (felül: legkorábbi) Oldal: ${currentPage}/${maxPage}, Összesen ${queue.length} elem`, queueLines);
	},
	async fallback(mode) {
		const aliases = new Map([['r', 'radio'], ['s', 'silence'], ['l', 'leave']]);
		mode = aliases.get(mode) ?? mode;
		if (!(new Set(aliases.values())).has(mode))
			return void await this.reply({ content: '**Ilyen fallback mód nem létezik.**', ephemeral: true });
		setFallbackMode(this.guild.id, <FallbackType>mode);
		await this.reply(`**Új fallback: ${mode}. **`);
		try {
			await saveRow.fallbackModes({ guildID: this.guild.id, type: <FallbackType>mode });
		}
		catch (e) {
			console.error(e);
			await this.editReply('**Mentés sikertelen.**');
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
				url: given
			};
		else
			return void await this.reply({ content: '**Érvénytelen rádióadó.**', ephemeral: true });
		setFallbackChannel(this.guild.id, fr);
		await this.reply(`**Fallback rádióadó sikeresen beállítva: ${getEmoji(fr.type)} \`${fr.name}\`**`);
		try {
			await saveRow.fallbackData({ guildID: this.guild.id, type: fr.type, name: fr.name, data: (fr.type=='radio')?given:fr.url });
		}
		catch (e) {
			console.error(e);
			await this.editReply('**Hiba: a beállítás csak leállásig lesz érvényes.**');
		}
	},
	async skip(amountToSkip) {
		if (amountToSkip<=0)
			amountToSkip=1;
		await this.deferReply();
		this.guildPlayer.removeAllListeners();
		this.guildPlayer.on('announcement', replyFirstSendRest(this, this.channel as Discord.TextChannel));
		this.guildPlayer.skip(amountToSkip);
	},
	async pause() {
		this.guildPlayer.pause();
		await this.reply(tickEmoji);
	},
	async resume() {
		this.guildPlayer.resume();
		await this.reply(tickEmoji);
	},
	async tune(param) {
		const channel = extractChannel(this, param);
		await this.deferReply();
		forceSchedule({
            actionContext: this,
            playableData: [
                {
                    ...resolveMusicData('radio', channel),
                    requester: this.member as Discord.GuildMember
                }]
        });
	},
	grant(commandSet, role) {
		permissionReused.call(this, commandSet, role, (commands: string[], roleCommands: string[]) =>
			commands.forEach(elem => {
				if (!roleCommands.includes(elem))
					roleCommands.push(elem);
			}));
	},
	deny(commandSet, role) {
		permissionReused.call(this, commandSet, role, (commands: string[], roleCommands: string[]) =>
			commands.forEach(elem => {
				if (roleCommands.includes(elem))
					roleCommands.splice(roleCommands.indexOf(elem), 1);
			}));
	},
	async nowplaying() {
		const nowPlayingData = this.guildPlayer.nowPlaying();
		if (!nowPlayingData)
			return void await this.reply('**CSEND**');
		let embed: Discord.EmbedBuilder = commonEmbed.call(this);
		embed = embed
			.setTitle('❯ Épp játszott stream')
			.setDescription(`${getEmoji(nowPlayingData.type)} [${nowPlayingData.name}](${nowPlayingData.url})\n${hourMinSec(nowPlayingData.playingSeconds)}/${hourMinSec(nowPlayingData.lengthSeconds)}`);
		await this.reply({ embeds: [embed] });
	},
	async perms() {
		const adminRight = await isAdmin(this);
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
		await this.reply({ embeds: [embed] });
	},
	async volume(vol) {
		if (vol == undefined || vol <= 0 || vol > 15)
			return void await this.reply({ content: '**Paraméterként szám elvárt. (1-15)**', ephemeral: true });
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
	const commandsArray = permCommands.toLowerCase() == 'all' ? debatedCommands : permCommands.split('|');
	const firstWrong = commandsArray.find(elem => !debatedCommands.includes(elem));
	if (firstWrong)
		return void await this.reply({ content: `**\`${firstWrong}\` nem egy kérdéses jogosultságú parancs.**`, ephemeral: true });
	const currentRoles = getRoleSafe(this.guild.id);
	const roleCommands = attach(currentRoles, role.id, new Array());
	filler(commandsArray, roleCommands);
	try {
		await saveRow.role({ guildID: this.guild.id, roleID: role.id, commands: roleCommands.join('|') });
		await this.reply(`**Új jogosultságok mentve.**`).catch();
	}
	catch (e) {
		console.error(e);
		await this.editReply('**Hiba: a beállítás csak leállásig lesz érvényes.**');
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

async function joinAndStartup(this: ThisBinding, startup: (guildPlayer: GuildPlayer) => void) {
	try {
		await this.reply('**Csatlakozva.**').catch();
        createGuildPlayerForRequest(this);
		this.guildPlayer.on('announcement', (message: string) => this.channel.send(message).catch());
		startup(this.guildPlayer);
	}
	catch (e) {
		console.error(e);
		await this.editReply('**Hiba a csatlakozás során.**');
	}
}

function sendToPartnerHook(link: string, content: string, username: string, serverName: string): void {
	const embed = new Discord.EmbedBuilder();
	embed.setColor(webhookC);
	embed.setFooter({ text: serverName });
	embed.setDescription(content);
	partnerHook.send({ content: link, embeds: [embed], username, avatarURL }).catch(console.error);
}

await play.setToken({
    soundcloud: {
        client_id: await play.getFreeClientID()
    }
});