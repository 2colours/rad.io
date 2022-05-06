import { Snowflake, User, TextChannel, GuildMember, DMChannel, NewsChannel, ThreadChannel, PartialDMChannel, CommandInteraction, Role } from 'discord.js';
import { ApplicationCommandOptionType } from 'discord-api-types/v9';
import { Readable } from 'stream';
import { GuildPlayer, Filter, client, aggregateDecorators, Action } from '../internal.js';
export type SupportedCommandOptionTypes = ApplicationCommandOptionTypes & 'String' | 'Number' | 'Boolean' | 'Role';
export type TypeFromParam<T> =
			('Number' extends T ? number : never) |
			('String' extends T ? string : never) |
			('Role' extends T ? Role : never) |
			('Boolean' extends T ? boolean : never);
export interface Config {
	prefixes: Map<Snowflake, string>;
	fallbackModes: Map<Snowflake, FallbackType>;
	fallbackChannels: Map<Snowflake, MusicData>;
	roles: Map<Snowflake, Map<Snowflake,string[]>>; //TODO az a string[] specifikusan parancsnév a debatedCommands-ból
}
type TextBasedChannels = DMChannel | TextChannel | NewsChannel | ThreadChannel;
export type Resolvable<T> = T | Promise<T>;
export type Predicate = (ctx: ThisBinding) => Resolvable<boolean>;
export type Decorator = (toDecorate:Action) => Action;
export type ScrollableEmbedTitleResolver = (currentPage: number, maxPage: number) => string;
export type PlayableCallbackVoid = () => void;
export type PlayableCallbackBoolean = () => boolean;
export type PlayableCallbackNumber = () => number;
export type StreamProvider = (url:string) => Resolvable<string | Readable>;
export interface GuildPlayerHolder {
	guildPlayer: GuildPlayer;
}
export interface UserHolder {
	user: User;
}
export interface TextChannelHolder {
	channel: TextBasedChannels | PartialDMChannel;
}
export interface ThisBinding extends CommandInteraction, GuildPlayerHolder { }
export type FallbackType = 'leave' | 'radio' | 'silence';
export interface PrefixTableData {
	guildID: Snowflake;
	prefix: string;
}
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
	name:string;
	url:string;
	cult:string; //TODO biztos nem enum inkább?
}
export type ApplicationCommandOptionTypes = keyof typeof ApplicationCommandOptionType;
export interface ParameterData {
	name: string;
	description: string;
	required: boolean;
	type: ApplicationCommandOptionTypes;
}
export interface CommandExtraData {
	type: CommandType;
	name: string; //Biztos? Még mindig a validálás kérdése
	aliases: string[];
	filters: Set<Filter>;
	params: ParameterData[];
	descrip: string;
}
interface CommandRawData extends CommandExtraData {
	action: Action;
}
export class Command {
	readonly decoratedAction: Action;
	readonly aliases: string[];
	readonly name: string;
	readonly helpRelated: HelpInfo;
	readonly type: CommandType;
	constructor(baseData: DeepReadonly<CommandRawData>) {
		this.type = baseData.type;
		this.name = baseData.name;
		this.aliases = baseData.aliases as string[];
		let orderedFilters = Array.from(baseData.filters as Set<Filter>);
		orderedFilters.sort(Filter.compare);
		this.decoratedAction = aggregateDecorators(orderedFilters.map(elem => elem.decorator))(baseData.action as Action);
		this.helpRelated = {
			requirements: orderedFilters.map(elem => elem.description),
			params: baseData.params as ParameterData[],
			ownDescription: baseData.descrip
		};
	}
}
export type DeepReadonly<T> = { readonly [K in keyof T]: DeepReadonly<T[K]> }
export type CommandType = 'unlimited' | 'adminOnly' | 'grantable' | 'creatorsOnly';
export interface HelpInfo {
	requirements: string[];
	params: ParameterData[];
	ownDescription: string;
}
export class Creator {
	constructor(readonly id: Snowflake, private alias: string, private link?: string) {
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

export interface SoundcloudResult extends SearchResultView {
	url: string;
}