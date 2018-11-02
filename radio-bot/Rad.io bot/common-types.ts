import * as Discord from 'discord.js';
export interface Config {
	prefixes: Map<Discord.Snowflake, string>;
	fallbackModes: Map<Discord.Snowflake, string>; //TODO nem akármilyen string!
	fallbackChannels: Map<Discord.Snowflake, MusicData>; //TODO nem any, a Datát még definiálni kell!
	roles: Map<Discord.Snowflake, Map<Discord.Snowflake,string[]>>; //TODO az a string[] specifikusan parancsnév a debatedCommands-ból
}
type Resolvable<T> = T | Promise<T>;
export type Action = (param:string) => Resolvable<void>;
export type Decorator = (toDecorate:Action) => Action;
export type Predicate = (x:any) => Resolvable<boolean>;
export interface PackedMessage extends Discord.Message {
	cmdName:string;
}
export enum TableName {
	prefix='prefix',
	fallbackModes='fallbackModes',
	fallbackData='fallbackData',
	role='role'
}
export enum StreamType {
	yt='yt',
	custom='custom',
	radio='radio'
}
export interface MusicData {
	name:string;
	url: string;
	type:StreamType;
}
export type EmojiLike = Discord.Emoji | string;