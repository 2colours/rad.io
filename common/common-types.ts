import { Snowflake, Message, User, TextChannel, GuildMember, DMChannel, NewsChannel, ThreadChannel, PartialDMChannel } from 'discord.js';
import { ApplicationCommandOptionType } from 'discord-api-types/v9';
import { Readable } from 'stream';
import { GuildPlayer, LegacyFilter, aggregateDecorators, client } from '../internal.js';
export interface Config {
	prefixes: Map<Snowflake, string>;
	fallbackModes: Map<Snowflake, FallbackType>;
	fallbackChannels: Map<Snowflake, MusicData>;
	roles: Map<Snowflake, Map<Snowflake,string[]>>; //TODO az a string[] specifikusan parancsnév a debatedCommands-ból
}
type TextBasedChannels = DMChannel | TextChannel | NewsChannel | ThreadChannel;
type Resolvable<T> = T | Promise<T>;
export type LegacyAction = (this:LegacyThisBinding,param:string) => Resolvable<void>;
export type LegacyDecorator = (toDecorate:LegacyAction) => LegacyAction;
export type LegacyPredicate = (x: LegacyThisBinding) => Resolvable<boolean>;
export type ScrollableEmbedTitleResolver = (currentPage: number, maxPage: number) => string;
export type PlayableCallbackVoid = () => void;
export type PlayableCallbackBoolean = () => boolean;
export type PlayableCallbackNumber = () => number;
export type StreamProvider = (url:string) => Resolvable<string | Readable>;
export interface Actions {
	[name: string]: LegacyAction;
}
export interface LegacyPackedMessage extends Message {
	cmdName: string;
}
export interface GuildPlayerHolder {
	guildPlayer: GuildPlayer;
}
export interface AuthorHolder {
	author: User;
}
export interface TextChannelHolder {
	channel: TextBasedChannels | PartialDMChannel;
}
export interface LegacyThisBinding extends LegacyPackedMessage, GuildPlayerHolder { }
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
export interface LegacyCommandExtraData {
	type: CommandType;
	name: string; //Biztos? Még mindig a validálás kérdése
	aliases: string[];
	filters: Set<LegacyFilter>;
	params: string[];
	descrip: string;
}
export interface ParameterData {
	name: string;
	description: string;
	required: boolean;
	type: ApplicationCommandOptionType;
}
export interface CommandExtraData {
	type: CommandType;
	name: string; //Biztos? Még mindig a validálás kérdése
	aliases: string[];
	filters: Set<LegacyFilter>;
	params: ParameterData[];
	descrip: string;
}
interface LegacyCommandRawData extends LegacyCommandExtraData {
	action: LegacyAction;
}
export type CommandType = 'unlimited' | 'adminOnly' | 'grantable' | 'creatorsOnly';
export class LegacyCommand {
	readonly decoratedAction: LegacyAction;
	readonly aliases: string[];
	readonly name: string;
	readonly helpRelated: HelpInfo;
	readonly type: CommandType;
	constructor(baseData: LegacyCommandRawData) {
		this.type = baseData.type;
		this.name = baseData.name;
		this.aliases = baseData.aliases;
		let orderedFilters = [...baseData.filters];
		orderedFilters.sort(LegacyFilter.compare);
		this.decoratedAction = aggregateDecorators(orderedFilters.map(elem => elem.decorator))(baseData.action);
		this.helpRelated = {
			requirements: orderedFilters.map(elem => elem.description),
			params: baseData.params,
			ownDescription: baseData.descrip
		};
	}
}
interface HelpInfo {
	requirements: string[];
	params: string[];
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
	duration: number; //másodpercben
}

export interface SoundcloudResult extends SearchResultView {
	url: string;
}