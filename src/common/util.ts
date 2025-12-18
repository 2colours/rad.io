import { Snowflake, Guild, TextChannel, MessageCreateOptions, Message, MessageComponentInteraction, CommandInteractionOption, Role, ApplicationCommandOptionType, EmbedBuilder, ComponentType, ButtonBuilder, ButtonStyle, ActionRowBuilder, MessageActionRowComponentBuilder, ChatInputCommandInteraction, GuildMember, VoiceBasedChannel } from 'discord.js';
import { getVoiceConnection, joinVoiceChannel as joinVoiceChannelLowLevel } from '@discordjs/voice';
import {
	CommandType, PlayableData, database, UserHolder, TextChannelHolder, client, embedC, MusicData,
	GuildPlayer, ScrollableEmbedTitleResolver, FallbackModesTableData, FallbackDataTableData, RoleTableData, Decorator, TypeFromParam, SupportedCommandOptionTypes, Command, ThisBinding,
	commandPrefix,
	radios
} from '../index.js';
import sequelize from 'sequelize';
const { QueryTypes } = sequelize; // Workaround (CommonJS -> ES modul)
import { PasteClient } from 'pastebin-api';
import got from 'got';
import assert from 'node:assert';
const pastebin = new PasteClient(process.envTyped.pastebin);
export function attach<T>(baseDict: Map<Snowflake, T>, guildId: Snowflake, defaultValue: T): T {
    const initialValue = baseDict.get(guildId);
    if (initialValue != undefined)
        return initialValue;
    baseDict.set(guildId, defaultValue);
    return defaultValue;
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
export function couldPing(url: string): Promise<boolean> {
	return new Promise((resolve, _) => {
		got.stream(url, { timeout: { response: 5000 } })
			.on('readable', () => resolve(true))
			.on('error', _ => resolve(false));
	});
}
export function hourMinSec(seconds?: number) {
	if (seconds == undefined)
		return 'N/A';
	const hours = Math.floor(seconds / 3600);
	seconds %= 3600;
	const minutes = Math.floor(seconds / 60);
	seconds %= 60;
	return [hours, minutes, seconds].map(amount => amount.toString().padStart(2, '0')).join(':');
};
export const aggregateDecorators: (decorators: Decorator[]) => Decorator = (decorators) => (action) => decorators.reduceRight((act, dec) => dec(act), action);
export async function sendGuild(guild: Guild, content: string, options?: MessageCreateOptions) {
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
export function resolveMusicData(type: 'radio' | 'custom', parameter: string): { name: string, type: 'radio' | 'custom', url: string } {
	switch (type) {
		case 'custom':
			return ({
				name: 'Custom',
				type,
				url: parameter
			});
		case 'radio':
			const radio = radios.get(parameter)!; //a hívó felelőssége valid rádióadóval hívni
			return ({
				name: radio.name,
				type,
				url: radio.url
			});
	}
}
export function joinVoiceChannel(voiceChannel: VoiceBasedChannel) {
	joinVoiceChannelLowLevel({
		channelId: voiceChannel.id,
		guildId: voiceChannel.guildId,
        daveEncryption: false, //TODO nyerünk egy kis időt, amíg teljesen kötelezővé nem teszi a Discord (2026 március?), mert a teljesítménye katasztrofális
		adapterCreator: voiceChannel.guild.voiceAdapterCreator
	});
}
export function createGuildPlayerForRequest(ctx: ThisBinding) {
	const voiceChannel = ctx.member.voice.channel!; //ezt a filtereknek kell ellenőrizniük
	joinVoiceChannel(voiceChannel);
	ctx.guildPlayer = new GuildPlayer(ctx.guild);
}
export function forceSchedule({ textChannel, actionContext, playableData, preshuffle = false }: { textChannel?: TextChannel, actionContext: ThisBinding, playableData: MusicData[], preshuffle?: boolean }) {
    const client = actionContext.guild.client;
	const voiceChannel = actionContext.member.voice.channel!; //ezt is a filtereknek kell ellenőrizniük
	textChannel ??= actionContext.channel as TextChannel;
	if (!voiceChannel.members.map(member => member.user).includes(client.user) || !getVoiceConnection(voiceChannel.guild.id)) {
		createGuildPlayerForRequest(actionContext);
	}
	actionContext.guildPlayer.removeAllListeners();
	actionContext.guildPlayer.on('announcement', replyFirstSendRest(actionContext, textChannel));
	if (playableData.length == 1)
		actionContext.guildPlayer.schedule(playableData[0]);
	else
		actionContext.guildPlayer.bulkSchedule(playableData, preshuffle);
}
export function replyFirstSendRest(interactionForReply: ChatInputCommandInteraction, channelForSend: TextChannel) {
	let repliedAlready = false;
	return (message: string): void => {
		switch (repliedAlready) {
			case false:
				repliedAlready = true;
				return void interactionForReply.editReply(message);
			case true:
				return void channelForSend.send(message).catch();
		}
	};
}
interface CommonEmbedThisBinding {
	guild: Guild;
	commandName: string;
};
export function commonEmbed(this: CommonEmbedThisBinding, argText: string = '') {
    const client = this.guild.client;
	return new EmbedBuilder()
		.setColor(embedC)
		.setFooter({ text: `${commandPrefix}${this.commandName}${argText} - ${client.user.username}`, iconURL: client.user.avatarURL() ?? undefined })
		.setTimestamp();
}
export async function useScrollableEmbed(ctx: UserHolder & TextChannelHolder, baseEmbed: EmbedBuilder, titleResolver: ScrollableEmbedTitleResolver, linesForDescription: string[], elementsPerPage: number = 10) {
	let currentPage = 1;
	const maxPage = Math.ceil(linesForDescription.length / elementsPerPage);
	const currentDescription = linesForDescription.slice((currentPage - 1) * elementsPerPage, currentPage * elementsPerPage).join('\n');
	const completeEmbed = baseEmbed
		.setTitle(titleResolver(currentPage, maxPage))
		.setDescription(currentDescription);
	const prevButton = new ButtonBuilder()
		.setCustomId('previous')
		.setLabel('Előző')
		.setStyle(ButtonStyle.Primary)
		.setEmoji('◀️');
	const nextButton = new ButtonBuilder()
		.setCustomId('next')
		.setLabel('Következő')
		.setStyle(ButtonStyle.Primary)
		.setEmoji('▶️');
	function setButtonsDisabled() {
		prevButton.setDisabled(currentPage <= 1);
		nextButton.setDisabled(currentPage >= maxPage)
	}
	setButtonsDisabled();
	const row = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(prevButton, nextButton);
	const message = await ctx.channel.send({ embeds: [completeEmbed], components: [row] }) as Message;
	const filter = (i: MessageComponentInteraction) => (i.deferUpdate(), ['previous', 'next'].includes(i.customId) && i.user.id == ctx.user.id);
	const collector = message.createMessageComponentCollector({ filter, idle: 60000, componentType: ComponentType.Button });
	for await (const [i, _] of collector) {
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
	const paste = await pastebin.createPaste({ code: content, name: title });
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

export function commandNamesByTypes(commandMap: Map<string, Command>, ...types: CommandType[]) {
	return [...commandMap].filter(([_, command]) => types.includes(command.type)).map(([name, _]) => name);
}
type SupportedCommandValueTypes = TypeFromParam<SupportedCommandOptionTypes>;
export function retrieveCommandOptionValue(option: CommandInteractionOption): SupportedCommandValueTypes {
    switch (option.type) {
        case ApplicationCommandOptionType.Boolean:
        case ApplicationCommandOptionType.String:
        case ApplicationCommandOptionType.Integer:
            assert(option.value != undefined);
            return option.value;
        case ApplicationCommandOptionType.Role:
            assert(option.role instanceof Role);
            return option.role;
        default:
            throw new Error(`Invalid command option type ${option.type}!`);
    }
}

export function tsObjectEntries<T, K extends string = string>(obj: { [s in K]: T } | ArrayLike<T>): [K, T][] {
	return Object.entries(obj) as [K, T][]
}
