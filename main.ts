import * as Discord from 'discord.js';
import { getVoiceConnection } from '@discordjs/voice';
const token = process.env.radioToken;

import { client, PackedMessage, ThisBinding, actions, GuildPlayer, translateAlias, commands, embedC, channels, radios, randomElement, debatedCommands, devServerInvite, sendGuild, dedicatedClientId, guildsChanId, usersChanId, devChanId, getPrefix } from './internal.js';
import moment from 'moment';
const help = actions['help'];

const devChannel = () => client.channels.resolve(devChanId);
const guildPlayers: Map<Discord.Snowflake, GuildPlayer> = new Map();

client.on('ready', async () => {
	/*client.guilds.cache.forEach(guild => {
		if (guild.voice?.channel)
			guild.voice.channel.leave();
	}); Discord.js v12 legacy*/
	console.log(`${client.user.tag}: client online, on ${client.guilds.cache.size} guilds, with ${client.users.cache.size} users.`);
	setPStatus();
	updateStatusChannels();
});


client.on('messageCreate', async (message) => {
	if (message.guild == null) return;
	const prefix = getPrefix(message.guild.id);
	if (message.mentions.users.has(client.user.id))
		return void help.call(Object.assign(message, {
			cmdName: 'help'
		}), '');
	const content = message.content;
	if (!content.toLowerCase().startsWith(prefix)) return;
	try {
		const prefixless = content.substring(prefix.length).trim();
		const firstSpace = prefixless.indexOf(' ');
		const commandTerminator = firstSpace != -1 ? firstSpace : prefixless.length;
		let commandString = prefixless.substring(0, commandTerminator);
		const param = prefixless.substring(commandTerminator).trim();
		commandString = commandString.toLowerCase();
		commandString = translateAlias(commandString);
		const { decoratedAction: commandFunction = Function.prototype } = commands.get(commandString) ?? {};
		const packedMessage: PackedMessage = Object.assign(message, { cmdName: commandString });
		const thisBinding: ThisBinding = Object.defineProperty(packedMessage, 'guildPlayer', {
			get: () => guildPlayers.get(packedMessage.guild.id),
			set: value => guildPlayers.set(packedMessage.guild.id, value)
		}) as ThisBinding;
		await Promise.resolve(commandFunction.call(thisBinding, param ?? ''));
	}
	catch (e) {
		console.error(e);
	}
});

client.on('voiceStateUpdate', (oldState, newState) => {
	const id = oldState.guild.id;
	const guildPlayer = guildPlayers.get(id);
	if (!guildPlayer)
		return;
	if (oldState.member?.user == client.user) {
		if (!newState.channel) {//ha a bot szabályosan kilép VAGY elküldik - régen ilyen nem volt :))
			console.log('kthxbye');
			guildPlayer.leave();
			guildPlayers.set(id, undefined);
		}
		else //ha a botot átrakják egy voice channelből egy másikba - át kell iratkoznia
			guildPlayer.handler.eventTriggered();
	}
	if (oldState.member?.user.bot) //innen csak nem botokra figyelünk
		return;
	if ([oldState.channel?.id, newState.channel?.id].includes(getVoiceConnection(guildPlayer.ownerGuild.id).joinConfig.channelId))
		guildPlayer.handler.eventTriggered();
});

client.on('guildCreate', guild => {
	logGuildJoin(guild);
	setPStatus();
	updateStatusChannels();
	sendWelcome(guild);
});

client.on('guildDelete', guild => {
	(devChannel() as Discord.TextChannel).send(`**${client.user.tag}** left \`${guild.name}\``);
	setPStatus();
	updateStatusChannels()
});

client.on("error", error => Promise.reject(error));

process.on('unhandledRejection', (reason, _) => {
	if (reason instanceof Discord.DiscordAPIError && reason.message == 'Missing Permissions')
		return;
	console.error(reason);
});

function logGuildJoin(guild: Discord.Guild) {
	const created = moment(guild.createdAt).format("MMM Do YY");
	const embed = new Discord.MessageEmbed()
		.setDescription(`ID: ${guild.id}
Members: ${guild.memberCount}
Owner: ${guild.members.resolve(guild.ownerId)?.user?.tag ?? 'unable to fetch'}
Created At: ${created}
Icon: [Link](${guild.iconURL() ? guild.iconURL() : client.user.displayAvatarURL()})`);
	(devChannel() as Discord.TextChannel).send({ content: `**${client.user.tag}** joined \`${guild.name}\``, embeds: [embed] });
}

async function sendWelcome(guild: Discord.Guild) {
	const embed = new Discord.MessageEmbed()
		.setAuthor(client.user.tag, client.user.displayAvatarURL())
		.setTitle('A RAD.io zenebot csatlakozott a szerverhez.')
		.addField('❯ Néhány szó a botról', 'A RAD.io egy magyar nyelvű és fejlesztésű zenebot.\nEgyedi funkciója az előre feltöltött élő rádióadók játszása, de megszokott funkciók (youtube-keresés játszási listával) többsége is elérhető.\nTovábbi információért használd a help parancsot vagy mention-öld a botot.')
		.addField('❯ Első lépések', `Az alapértelmezett prefix a **.**, ez a \`setprefix\` parancs használatával megváltoztatható.\nA ${debatedCommands.map(cmdName => '`' + cmdName + '`').join(', ')} parancsok alapértelmezésképpen csak az adminisztrátoroknak használhatóak - ez a működés a \`grant\` és \`deny\` parancsokkal felüldefiniálható.\nA bot működéséhez az írási jogosultság elengedhetetlen, a reakciók engedélyezése pedig erősen ajánlott.\n\nTovábbi kérdésekre a dev szerveren készségesen válaszolunk.`)
		.setColor(embedC)
		.setTimestamp();
	sendGuild(guild, devServerInvite, { embeds: [embed] });
}

function forceLogin(): Promise<any> {
	return client.login(token).catch(_ => {
		console.log('Login failed, retrying...');
		return forceLogin();
	});
}

function setPStatus() {
	const presenceEndings = [`G: ${client.guilds.cache.size}`, `Rádiók száma: ${channels.length} `, `@${client.user.username}`, `U: ${client.users.cache.size}`];
	const randomRadioName = radios.get(randomElement(channels)).name;
	const presence = `${randomRadioName} | ${randomElement(presenceEndings)}`;
	client.user.setPresence({ activities: [{ name: presence, type: 'LISTENING' }] });
};

function updateStatusChannels() {
	if (client.user.id != dedicatedClientId) return;
	const guildsChan = client.channels.resolve(guildsChanId) as Discord.VoiceChannel;
	const usersChan = client.channels.resolve(usersChanId) as Discord.VoiceChannel;
	guildsChan.setName(`RAD.io (${client.guilds.cache.size}) szerveren`);
	usersChan.setName(`RAD.io (${client.users.cache.size}) felhasználóval`);
};
forceLogin().then(_ => setInterval(setPStatus, 60000 * 5));
