import 'dotenv/config';
import * as Discord from 'discord.js';
import { getVoiceConnection } from '@discordjs/voice';
const token = process.env.radioToken;

import { client, GuildPlayer, embedC, channels, radios, randomElement, devServerInvite, sendGuild, dedicatedClientId, guildsChanId, usersChanId, devChanId, commands, ThisBinding, retrieveCommandOptionValue } from './internal.js';
import moment from 'moment';

const devChannel = () => client.channels.resolve(devChanId) as Discord.TextChannel;
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


client.on('interactionCreate', async interaction => {
	if (!interaction.isChatInputCommand() || !interaction.inGuild() || !commands.has(interaction.commandName))
		return;
	const { decoratedAction: commandFunction } = commands.get(interaction.commandName);
	const thisBinding: ThisBinding = Object.defineProperty(interaction, 'guildPlayer',{
			get() { return guildPlayers.get(this.guild.id); },
			set(value) { return guildPlayers.set(this.guild.id, value); }
		}) as ThisBinding;
	const args = interaction.options.data.map(retrieveCommandOptionValue);
	await commandFunction.call(thisBinding, ...args);
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
	(devChannel() as Discord.TextBasedChannel).send(`**${client.user.tag}** left \`${guild.name}\``);
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
	const embed = new Discord.EmbedBuilder()
		.setDescription(`ID: ${guild.id}
Members: ${guild.memberCount}
Owner: ${guild.members.resolve(guild.ownerId)?.user?.tag ?? 'unable to fetch'}
Created At: ${created}
Icon: [Link](${guild.iconURL() ? guild.iconURL() : client.user.displayAvatarURL()})`);
	devChannel().send({ content: `**${client.user.tag}** joined \`${guild.name}\``, embeds: [embed] });
}

async function sendWelcome(guild: Discord.Guild) {
	const embed = new Discord.EmbedBuilder()
		.setAuthor({ name: client.user.tag, iconURL: client.user.displayAvatarURL() })
		.setTitle('A RAD.io zenebot csatlakozott a szerverhez.')
		.addFields(
			{ name: '❯ Néhány szó a botról', value: 'A RAD.io egy magyar nyelvű és fejlesztésű zenebot.\nEgyedi funkciója az előre feltöltött élő rádióadók játszása, de megszokott funkciók (youtube-keresés játszási listával) többsége is elérhető.\nTovábbi információért használd a help parancsot.'},
			{name: '❯ Első lépések', value: `A bot slash commandokkal használható. Működéséhez az írási jogosultság elengedhetetlen.\n\nTovábbi kérdésekre a dev szerveren készségesen válaszolunk.`})
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
	client.user.setPresence({ activities: [{ name: presence, type: Discord.ActivityType.Listening }] });
}

function updateStatusChannels() {
	if (client.user.id != dedicatedClientId) return;
	const guildsChan = client.channels.resolve(guildsChanId) as Discord.VoiceChannel;
	const usersChan = client.channels.resolve(usersChanId) as Discord.VoiceChannel;
	guildsChan.setName(`RAD.io (${client.guilds.cache.size}) szerveren`);
	usersChan.setName(`RAD.io (${client.users.cache.size}) felhasználóval`);
}


await forceLogin();
setInterval(setPStatus, 60000 * 5);
