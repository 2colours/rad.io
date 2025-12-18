import '@2colours/toml-env/config';
import * as Discord from 'discord.js';
import { getVoiceConnection } from '@discordjs/voice';
const token = process.envTyped.radioToken;

import { client, GuildPlayer, embedC, channels, radios, randomElement, devServerInvite, sendGuild, dedicatedClientId, guildsChanId, usersChanId, devChanId, commands, ThisBinding, retrieveCommandOptionValue, joinVoiceChannel, resolveMusicData } from './index.js';
import moment from 'moment';
import assert from 'node:assert';

const devChannel = (readyClient: Discord.Client<true>) => readyClient.channels.resolve(devChanId) as Discord.TextChannel;
const guildPlayers: Map<Discord.Snowflake, GuildPlayer> = new Map();

client.on('clientReady', readyClient => {
	console.log(`${readyClient.user.tag}: client online, on ${readyClient.guilds.cache.size} guilds, with ${readyClient.users.cache.size} users.`);
	setPStatus();
	updateStatusChannels();
    playbackOnStartup(readyClient);
});


client.on('interactionCreate', async interaction => {
	if (!interaction.isChatInputCommand() || !interaction.inCachedGuild())
		return;
    const command = commands.get(interaction.commandName);
    if (!command)
        return;
	const { decoratedAction: commandFunction } = command;
    assert(interaction.channel);
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
			guildPlayer.leave();
			guildPlayers.delete(id); //TODO ellenőrizni, hogy jól működik-e
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
	devChannel(guild.client).send(`**${guild.client.user.tag}** left \`${guild.name}\``);
	setPStatus();
	updateStatusChannels()
});

client.on("error", error => Promise.reject(error));

process.on('unhandledRejection', (reason, _) => {
	if (reason instanceof Discord.DiscordAPIError && reason.message == 'Missing Permissions')
		return;
	console.error(reason);
});

async function logGuildJoin(guild: Discord.Guild) {
	const created = moment(guild.createdAt).format("MMM Do YY");
    const guildOwner = await guild.fetchOwner();
	const embed = new Discord.EmbedBuilder()
		.setDescription(`ID: ${guild.id}
Members: ${guild.memberCount}
Owner: ${guildOwner.user.tag}
Created At: ${created}
Icon: [Link](${guild.iconURL() ? guild.iconURL() : guild.client.user.displayAvatarURL()})`);
	devChannel(guild.client).send({ content: `**${guild.client.user.tag}** joined \`${guild.name}\``, embeds: [embed] });
}

async function sendWelcome(guild: Discord.Guild) {
	const embed = new Discord.EmbedBuilder()
		.setAuthor({ name: guild.client.user.tag, iconURL: guild.client.user.displayAvatarURL() })
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
    if (!client.isReady())
        return void console.warn('A bot nem állt készen a setPStatus futtatása közben.');
	const presenceEndings = [`G: ${client.guilds.cache.size}`, `Rádiók száma: ${channels.length} `, `@${client.user.username}`, `U: ${client.users.cache.size}`];
	const randomRadioName = radios.get(randomElement(channels))!.name;
	const presence = `${randomRadioName} | ${randomElement(presenceEndings)}`;
	client.user.setPresence({ activities: [{ name: presence, type: Discord.ActivityType.Listening }] });
}

function updateStatusChannels() {
    if (!client.isReady())
        return void console.warn('A bot nem állt készen az updateStatusChannels futtatása közben.');
	if (client.user.id != dedicatedClientId) return;
	const guildsChan = client.channels.resolve(guildsChanId) as Discord.VoiceChannel;
	const usersChan = client.channels.resolve(usersChanId) as Discord.VoiceChannel;
	guildsChan.setName(`RAD.io (${client.guilds.cache.size}) szerveren`);
	usersChan.setName(`RAD.io (${client.users.cache.size}) felhasználóval`);
}

function playbackOnStartup(readyClient: Discord.Client<true>) {
    process.envTyped.startupPlaybacks?.forEach(playbackEntry => {
        const guild = readyClient.guilds.resolve(playbackEntry.guildId);
        if (!guild)
            return void console.error(`A(z) ${playbackEntry.guildId} id-jű szervert nem érte el a bot.`);
        const voiceChannel = guild.channels.resolve(playbackEntry.channelId) as Discord.VoiceChannel;
        joinVoiceChannel(voiceChannel);
        const guildPlayer = new GuildPlayer(guild);
        guildPlayers.set(playbackEntry.guildId, guildPlayer);
        guildPlayer.schedule(resolveMusicData(playbackEntry.type, playbackEntry.parameter));
        guildPlayer.on('announcement', (message: string) => voiceChannel.send(message).catch());
    });
}


await forceLogin();
setInterval(setPStatus, 60000 * 5);
