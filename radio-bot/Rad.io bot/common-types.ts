import { Emoji, Snowflake, Message, User, TextChannel } from 'discord.js';
import { GuildPlayer, Filter, aggregateDecorators, client } from './internal';
export interface Config {
	prefixes: Map<Snowflake, string>;
	fallbackModes: Map<Snowflake, FallbackType>; //TODO nem akármilyen string!
	fallbackChannels: Map<Snowflake, MusicData>; //TODO nem any, a Datát még definiálni kell!
	roles: Map<Snowflake, Map<Snowflake,string[]>>; //TODO az a string[] specifikusan parancsnév a debatedCommands-ból
}
type Resolvable<T> = T | Promise<T>;
export type Action = (param:string) => Resolvable<void>;
export type Decorator = (toDecorate:Action) => Action;
export type Predicate = (x: ThisBinding) => Resolvable<boolean>;
export type ScrollableEmbedTitleResolver = (currentPage: number, maxPage: number) => string;
export interface PackedMessage extends Message {
	cmdName:string;
}
export interface GuildPlayerHolder {
	guildPlayer: GuildPlayer;
}
export interface AuthorHolder {
	author: User;
}
export interface TextChannelHolder {
	channel: TextChannel;
}
export interface ThisBinding extends PackedMessage, GuildPlayerHolder {}
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
	url: string;
}
export interface RoleTableData {
	guildID: Snowflake;
	roleID: Snowflake;
	commands: string;
}
export type StreamType = 'yt' | 'custom' | 'radio';
export interface MusicData {
	name:string;
	url: string;
	type:StreamType;
}
export interface RadioData {
	name:string;
	url:string;
	cult:string; //TODO biztos nem enum inkább?
}
export type EmojiLike = Emoji | string;
export interface CommandExtraData {
	type: CommandType;
	name: string; //Biztos? Még mindig a validálás kérdése
	aliases: string[];
	filters: Set<Filter>;
	params: string[];
	descrip: string;
}
interface CommandRawData extends CommandExtraData {
	action: Action;
}
type CommandType = 'unlimited' | 'adminOnly' | 'grantable' | 'creatorsOnly';
export class Command {
	readonly decoratedAction: Action;
	readonly aliases: string[];
	readonly name: string;
	readonly helpRelated: HelpInfo;
	readonly type: CommandType;
	constructor(baseData: CommandRawData) {
		this.type = baseData.type;
		this.name = baseData.name;
		this.aliases = baseData.aliases;
		let orderedFilters = [...baseData.filters];
		orderedFilters.sort(Filter.compare);
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
	constructor(readonly id: Snowflake, private alias: string) {
	}
	resolve():string {
		const user = client.users.get(this.id);
		return user ? user.tag : this.alias;
	}
}