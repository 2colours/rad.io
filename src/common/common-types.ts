import { Snowflake, User, TextChannel, GuildMember, DMChannel, NewsChannel, ThreadChannel, PartialDMChannel, Role, GuildTextBasedChannel, ChatInputCommandInteraction, WebhookClientDataIdWithToken } from 'discord.js';
import { ApplicationCommandOptionType } from 'discord-api-types/v10';
import { Readable } from 'stream';
import { GuildPlayer, Filter, client, aggregateDecorators, Action } from '../index.js';
import { AudioResource } from '@discordjs/voice';
type MappableTypes = 'String' | 'Number' | 'Boolean' | 'Role';
export type SupportedCommandOptionTypes = ApplicationCommandOptionTypes & MappableTypes;
export type TypeFromParam<T extends SupportedCommandOptionTypes> =
	('Number' extends T ? number : never) |
	('String' extends T ? string : never) |
	('Role' extends T ? Role : never) |
	('Boolean' extends T ? boolean : never);
export interface Config {
	fallbackModes: Map<Snowflake, FallbackType>;
	fallbackChannels: Map<Snowflake, MusicData>;
	roles: Map<Snowflake, Map<Snowflake, string[]>>; //TODO az a string[] specifikusan parancsnév a debatedCommands-ból
}
type TextBasedChannels = DMChannel | TextChannel | NewsChannel | ThreadChannel | GuildTextBasedChannel;
export type Resolvable<T> = T | Promise<T>;
export type Predicate = (ctx: ThisBinding) => Resolvable<boolean>;
export type Decorator = (toDecorate: Action) => Action;
export type ScrollableEmbedTitleResolver = (currentPage: number, maxPage: number) => string;
export type PlayableCallbackVoid = () => void;
export type PlayableCallbackBoolean = () => boolean;
export type PlayableCallbackNumber = () => number;
export type StreamProvider = (url: string) => Resolvable<string | Readable>;
export type AudioResourceProvider = (url: string) => Resolvable<AudioResource>;
export interface GuildPlayerHolder {
	guildPlayer: GuildPlayer;
}
export interface UserHolder {
	user: User;
}
export interface TextChannelHolder {
	channel: TextBasedChannels | PartialDMChannel;
}
export interface ThisBinding extends ChatInputCommandInteraction, GuildPlayerHolder { }
export type FallbackType = 'leave' | 'radio' | 'silence';
export interface FallbackModesTableData {
	guildID: Snowflake;
	type: FallbackType;
}
export interface FallbackDataTableData {
	guildID: Snowflake;
	type: StreamType;
	name: string;
	data: string;
}
export interface RoleTableData {
	guildID: Snowflake;
	roleID: Snowflake;
	commands: string;
}
export type StreamType = 'yt' | 'custom' | 'radio' | 'sc';
export interface PlayableData {
	url: string;
	type: StreamType;
}
export interface MusicData extends PlayableData {
	name: string;
	lengthSeconds: number;
	requester: GuildMember
}
export interface PlayingData extends MusicData {
	playingSeconds: number;
}
export interface RadioConstantData {
	name: string;
	url: string;
	cult: string; //TODO biztos nem enum inkább?
}
export type ApplicationCommandOptionTypes = keyof typeof ApplicationCommandOptionType;
export interface ParameterData {
	name: string;
	description: string;
	required: boolean;
	type: SupportedCommandOptionTypes;
}
export interface CommandExtraData {
	type: CommandType;
	name: string; //Biztos? Még mindig a validálás kérdése
	filters: Set<Filter>;
	params: ParameterData[];
	descrip: string;
}
interface CommandRawData extends CommandExtraData {
	action: Action;
}
export class Command {
	readonly decoratedAction: Action;
	readonly name: string;
	readonly helpRelated: HelpInfo;
	readonly type: CommandType;
	constructor(baseData: CommandRawData) {
		this.type = baseData.type;
		this.name = baseData.name;
		let orderedFilters = Array.from(baseData.filters);
		orderedFilters.sort(Filter.compare);
		this.decoratedAction = aggregateDecorators(orderedFilters.map(elem => elem.decorator))(baseData.action);
		this.helpRelated = {
			requirements: orderedFilters.map(elem => elem.description),
			params: baseData.params,
			ownDescription: baseData.descrip
		};
	}
}
export type CommandType = 'unlimited' | 'adminOnly' | 'grantable' | 'creatorsOnly';
export interface HelpInfo {
	requirements: string[];
	params: ParameterData[];
	ownDescription: string;
}

export interface CreatorConstructorData {
	userId: Snowflake;
	fallbackName: string;
	link?: string;
}
export class Creator {
	readonly id: Snowflake;
	private alias: string;
	private link?: string;
	constructor({ userId, fallbackName, link }: CreatorConstructorData) {
		this.id = userId;
		this.alias = fallbackName;
		this.link = link;
	}
	resolveMarkdown() {
		const user = client.users.resolve(this.id);
		const text = user ? user.tag : this.alias;
		return this.link != undefined ? `[${text}](${this.link})` : text;
	}
}
export interface SearchResultView {
	title: string;
	uploaderName: string;
	duration: number; //másodpercben
}

export class StateError {
	constructor(readonly message: string) { }
}

export interface EnvConfig {
    pastebin: string;
    radioToken: string;
	emojis: {
		soundcloud: string;
		youtube: string;
	};
	creators: CreatorConstructorData[];
	dedicatedClientId: Snowflake;
	devServerInvite: string;
	partnerWebhook: WebhookClientDataIdWithToken;
	avatarURL: string;
	monitoring: {
		usersDisplay: Snowflake;
		guildsDisplay: Snowflake;
		joinLeaveLog: Snowflake;
	};
	botId: Snowflake;
	testServerId: Snowflake;
}

declare global {
    namespace NodeJS {
        interface Process {
            envTyped: EnvConfig
        }
    }
}