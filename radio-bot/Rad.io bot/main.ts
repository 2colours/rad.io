import * as Discord from 'discord.js';
const token = process.env.radioToken;

import { configPromise, client, PackedMessage, ThisBinding, Config, actions, GuildPlayer, defaultConfig, translateAlias, commands, embedC, channels, radios, randomElement, debatedCommands, devServerInvite, sendGuild } from './internal';
import { sscanf } from 'scanf';
import * as moment from 'moment';
const help = actions.get('help');

const devChannel = () => client.channels.get('470574072565202944');
const guildPlayers: Map<Discord.Snowflake, GuildPlayer> = new Map();

client.on('ready', () => {
	console.log(`${client.user.tag}: client online, on ${client.guilds.size} guilds, with ${client.users.size} users.`);
	setPStatus();
	updateStatusChannels();
});

let config: Config;
configPromise.then(cfg => config = cfg);

client.on('message', async (message) => {
	if (message.guild == null) return;
	const prefix = config.prefixes.get(message.guild.id) || defaultConfig.prefix;
	if (message.mentions.users.has(client.user.id))
		return void help.call(message, '');
	const content = message.content;
	if (!content.toLowerCase().startsWith(prefix)) return;
	try {
		let { command: commandString, param } = <any>sscanf(content.substring(prefix.length), '%s %S', 'command', 'param');
		commandString = commandString.toLowerCase();
		commandString = translateAlias(commandString);
		const { decoratedAction: commandFunction = Function.prototype } = commands.get(commandString) || {};
		const packedMessage: PackedMessage = Object.assign(message, { cmdName: commandString });
		const thisBinding: ThisBinding = Object.defineProperty(packedMessage, 'guildPlayer', {
			get: () => guildPlayers.get(packedMessage.guild.id),
			set: value => guildPlayers.set(packedMessage.guild.id, value)
		});
		await Promise.resolve(commandFunction.call(thisBinding, param || ''));
	}
	catch (ex) {
		console.log(ex);
	}
});

client.on('voiceStateUpdate', (oldMember, newMember) => {
	const id = oldMember.guild.id;
	const guildPlayer = guildPlayers.get(id);
	if (!guildPlayer)
		return;
	if (oldMember.user == client.user && oldMember.voiceChannel && newMember.voiceChannel) //ha a botot átrakják egy voice channelből egy másikba - át kell iratkoznia
		guildPlayer.handler.eventTriggered();
	if (oldMember.user.bot) //innen csak nem botokra figyelünk
		return;
	if ([oldMember.voiceChannel, newMember.voiceChannel].includes(guildPlayer.ownerGuild.voiceConnection.channel))
		guildPlayer.handler.eventTriggered();
});

client.on('guildCreate', guild => {
	logGuildJoin(guild);
	setPStatus();
	updateStatusChannels();
	sendWelcome(guild);
});

client.on('guildDelete', guild => {
	((devChannel()) as Discord.TextChannel).send(`**${client.user.tag}** left \`${guild.name}\``);
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
	const embed = new Discord.RichEmbed()
		.setDescription(`ID: ${guild.id}
Members: ${guild.memberCount}
Owner: ${guild.owner ? guild.owner.user.tag : 'unable to fetch'}
Created At: ${created}
Icon: [Link](${guild.iconURL ? guild.iconURL : client.user.displayAvatarURL})`);
	((devChannel()) as Discord.TextChannel).send(`**${client.user.tag}** joined \`${guild.name}\``, { embed: embed });
}

async function sendWelcome(guild: Discord.Guild) {
	const embed = new Discord.RichEmbed()
		.setAuthor(client.user.tag, client.user.displayAvatarURL)
		.setTitle('A RAD.io zenebot csatlakozott a szerverhez.')
		.addField('❯ Néhány szó a botról', 'A RAD.io egy magyar nyelvű és fejlesztésű zenebot.\nEgyedi funkciója az előre feltöltött élő rádióadók játszása, de megszokott funkciók (youtube-keresés játszási listával) többsége is elérhető.\nTovábbi információért használd a help parancsot vagy mention-öld a botot.')
		.addField('❯ Első lépések', `Az alapértelmezett prefix a **.**, ez a \`setprefix\` parancs használatával megváltoztatható.\nA ${debatedCommands.map(cmdName => '`' + cmdName + '`').join(', ')} parancsok alapértelmezésképpen csak az adminisztrátoroknak használhatóak - ez a működés a \`grant\` és \`deny\` parancsokkal felüldefiniálható.\nA bot működéséhez az írási jogosultság elengedhetetlen, a reakciók engedélyezése pedig erősen ajánlott.\n\nTovábbi kérdésekre a dev szerveren készségesen válaszolunk.`)
		.setColor(embedC)
		.setTimestamp();
	sendGuild(guild, devServerInvite,{ embed });
}

function setPStatus() {
	const presenceEndings = [`G: ${client.guilds.size}`, `Rádiók száma: ${channels.length} `, `@${client.user.username}`, `U: ${client.users.size}`];
	const randomRadioName = radios.get(randomElement(channels)).name;
	const presence = `${randomRadioName} | ${randomElement(presenceEndings)}`;
	client.user.setPresence({ game: { name: presence, type: 'LISTENING' } });
};

function updateStatusChannels() {
	if (client.user.id != '430326522146979861') return;
	const guildsChan: Discord.VoiceChannel = client.channels.get('470522240551616523') as Discord.VoiceChannel;
	const usersChan: Discord.VoiceChannel = client.channels.get('470522309132943360') as Discord.VoiceChannel;
	guildsChan.setName(`RAD.io (${client.guilds.size}) szerveren`);
	usersChan.setName(`RAD.io (${client.users.size}) felhasználóval`);
};
setInterval(setPStatus, 60000 * 5);
configPromise.then(_ => client.login(token));