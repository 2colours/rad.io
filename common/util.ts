﻿import { Snowflake, Guild, TextChannel, MessageEmbed, MessageOptions, Message, BaseGuildVoiceChannel, MessageComponentInteraction, MessageActionRow, MessageButton } from 'discord.js';
import { getVoiceConnection, joinVoiceChannel } from '@discordjs/voice';
import { LegacyCommand, CommandType, PlayableData, LegacyThisBinding, database, LegacyDecorator, AuthorHolder, TextChannelHolder, client, embedC, GuildPlayerHolder, MusicData,
	GuildPlayer, ScrollableEmbedTitleResolver, PrefixTableData, FallbackModesTableData, FallbackDataTableData, RoleTableData, getPrefix } from '../internal.js';
import sequelize from 'sequelize';
const { QueryTypes } = sequelize; // Workaround (CommonJS -> ES modul)
import PasteClient from 'pastebin-api';
const pastebin = new PasteClient(process.env.pastebin);
export function attach<T>(baseDict: Map<Snowflake, T>, guildId: Snowflake, defaultValue: T) {
	baseDict = baseDict.get(guildId) ? baseDict : baseDict.set(guildId, defaultValue);
	return baseDict.get(guildId);
};
export function randomElement<T>(array: T[]): T {
	return array[(Math.random() * array.length) | 0];
};
export function shuffle(array: any[]) {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
}
export function hourMinSec(seconds: number) {
	if (seconds == undefined)
		return 'N/A';
	const hours = Math.floor(seconds / 3600);
	seconds %= 3600;
	const minutes = Math.floor(seconds / 60);
	seconds %= 60;
	return [hours, minutes, seconds].map(amount => amount.toString().padStart(2, '0')).join(':');
};
export const aggregateDecorators: (decorators: LegacyDecorator[]) => LegacyDecorator = (decorators) => (action) => decorators.reduceRight((act, dec) => dec(act), action);
export async function sendGuild(guild: Guild, content: string, options?: MessageOptions) {
	for (const channel of guild.channels.cache.values()) {
		if (!(channel instanceof TextChannel))
			continue;
		try {
			await channel.send({ content, options });
			break;
		}
		catch (e) {
		}
	}
}
export async function forceSchedule(textChannel: TextChannel, voiceChannel: BaseGuildVoiceChannel, holder: GuildPlayerHolder, playableData: MusicData[]) {
	if (!voiceChannel.members.map(member => member.user).includes(client.user) || !getVoiceConnection(voiceChannel.guild.id)) {
		joinVoiceChannel({
			channelId: voiceChannel.id,
			guildId: voiceChannel.guildId,
			//@ts-ignore
			adapterCreator: voiceChannel.guild.voiceAdapterCreator
		});
		holder.guildPlayer = new GuildPlayer(voiceChannel.guild, textChannel, playableData);
		return;
	}
	if (playableData.length == 1)
		holder.guildPlayer.schedule(playableData[0]);
	else
		holder.guildPlayer.bulkSchedule(playableData);
};
export function commonEmbed(this: LegacyThisBinding, additional: string = '') { //TODO ez sem akármilyen string, hanem parancsnév
	const prefix = getPrefix(this.guild.id);
	return new MessageEmbed()
		.setColor(embedC)
		.setFooter({ text: `${prefix}${this.cmdName}${additional} - ${client.user.username}`, iconURL: client.user.avatarURL() })
		.setTimestamp();
}
export async function useScrollableEmbed(ctx: AuthorHolder & TextChannelHolder, baseEmbed: MessageEmbed, titleResolver: ScrollableEmbedTitleResolver, linesForDescription: string[], elementsPerPage: number = 10) {
	let currentPage = 1;
	const maxPage = Math.ceil(linesForDescription.length / elementsPerPage);
	const currentDescription = linesForDescription.slice((currentPage - 1) * elementsPerPage, currentPage * elementsPerPage).join('\n');
	const completeEmbed = baseEmbed
		.setTitle(titleResolver(currentPage, maxPage))
		.setDescription(currentDescription);
	const prevButton = new MessageButton()
		.setCustomId('previous')
		.setLabel('Előző')
		.setStyle('PRIMARY')
		.setEmoji('◀️');
	const nextButton = new MessageButton()
		.setCustomId('next')
		.setLabel('Következő')
		.setStyle('PRIMARY')
		.setEmoji('▶️');
	function setButtonsDisabled() {
		prevButton.setDisabled(currentPage <= 1);
		nextButton.setDisabled(currentPage >= maxPage)
	}
	setButtonsDisabled();
	const row = new MessageActionRow().addComponents(prevButton, nextButton);
	const message = await ctx.channel.send({ embeds: [completeEmbed], components: [row] }) as Message;
	const filter =  (i: MessageComponentInteraction) => (i.deferUpdate(), ['previous', 'next'].includes(i.customId) && i.user.id == ctx.author.id);
	const collector = message.createMessageComponentCollector({filter, time: 60000 });
	for await (const i of collector) {
		currentPage = i.customId == 'previous' ? currentPage - 1 : currentPage + 1;
		const currentDescription = linesForDescription.slice((currentPage - 1) * elementsPerPage, currentPage * elementsPerPage).join('\n');
		setButtonsDisabled();
		completeEmbed
			.setTitle(titleResolver(currentPage, maxPage))
			.setDescription(currentDescription);
		await message.edit({ embeds: [completeEmbed], components: [row] });
	}
	completeEmbed.setTitle(`**Lejárt az idő** - ${titleResolver(currentPage, maxPage)}`);
	[prevButton, nextButton].forEach(b => b.setDisabled(true));
	await message.edit({ embeds: [completeEmbed], components: [row] });	
}
export const saveRow = {
	async prefix(rowObj: PrefixTableData) {
		await database.query(`DELETE FROM prefix WHERE guildID = $1`, {
			type: QueryTypes.DELETE,
			bind: [rowObj.guildID]
		});
		await database.query(`INSERT INTO prefix (guildID, prefix) VALUES ($1, $2)`, {
			type: QueryTypes.INSERT,
			bind: [rowObj.guildID, rowObj.prefix]
		});
	},
	async fallbackModes(rowObj: FallbackModesTableData) {
		await database.query(`DELETE FROM fallbackModes WHERE guildID = $1`, {
			type: QueryTypes.DELETE,
			bind: [rowObj.guildID]
		});
		await database.query(`INSERT INTO fallbackModes (guildID, type) VALUES ($1, $2)`, {
			type: QueryTypes.INSERT,
			bind: [rowObj.guildID, rowObj.type]
		});
	},
	async fallbackData(rowObj: FallbackDataTableData) {
		await database.query(`DELETE FROM fallbackData WHERE guildID = $1`, {
			type: QueryTypes.DELETE,
			bind: [rowObj.guildID]
		});
		await database.query(`INSERT INTO fallbackData (guildID, type, name, data) VALUES ($1, $2, $3, $4)`, {
			type: QueryTypes.INSERT,
			bind: [rowObj.guildID, rowObj.type, rowObj.name, rowObj.data]
		});
	},
	async role(rowObj: RoleTableData) {
		await database.query(`DELETE FROM role WHERE (guildID = $1) AND (roleID = $2)`, {
			type: QueryTypes.DELETE,
			bind: [rowObj.guildID, rowObj.roleID]
		});
		await database.query(`INSERT INTO role (guildID, roleID, commands) VALUES ($1, $2, $3)`, {
			type: QueryTypes.INSERT,
			bind: [rowObj.guildID, rowObj.roleID, rowObj.commands]
		});
	}
};
export async function createPastebin(title: string, content: string): Promise<string> {
	let paste: string = await pastebin.createPaste({ code: content, name: title });
	return paste;
}
export function isLink(text: string) {
	return text.search(/https?:\/\//) == 0;
}

export function discordEscape(text: string) {
	return text.replace(/\|/g, '\\|');
}
export function starterSeconds(data: PlayableData): number {
	return parseInt(new URL(data.url).searchParams.get('t')) || 0
}

export function commandNamesByTypes(commandMap: Map<string, LegacyCommand>, ...types: CommandType[]) {
	return [...commandMap].filter(([_, command]) => types.includes(command.type)).map(([name, _]) => name);
}