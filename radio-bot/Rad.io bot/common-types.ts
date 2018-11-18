import { Emoji, Snowflake, Message } from 'discord.js';
import {GuildPlayer} from './guild-player';
export interface Config {
	prefixes: Map<Snowflake, string>;
	fallbackModes: Map<Snowflake, FallbackType>; //TODO nem akármilyen string!
	fallbackChannels: Map<Snowflake, MusicData>; //TODO nem any, a Datát még definiálni kell!
	roles: Map<Snowflake, Map<Snowflake,string[]>>; //TODO az a string[] specifikusan parancsnév a debatedCommands-ból
}
type Resolvable<T> = T | Promise<T>;
export type Action = (param:string) => Resolvable<void>;
export type Decorator = (toDecorate:Action) => Action;
export type Predicate = (x:ThisBinding) => Resolvable<boolean>;
export interface PackedMessage extends Message {
	cmdName:string;
}
export interface GuildPlayerHolder {
	guildPlayer: GuildPlayer;
}
export interface ThisBinding extends PackedMessage, GuildPlayerHolder {}
export type FallbackType = 'leave' | 'radio' | 'silence';
export type TableName = 'prefix' | 'fallbackModes' | 'fallbackData' | 'role';
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