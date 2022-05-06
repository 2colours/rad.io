import { Message } from 'discord.js';
import { LegacyFilter, aggregateLegacyDecorators, Resolvable, GuildPlayerHolder, CommandType } from '../internal.js';
export type LegacyAction = (this:LegacyThisBinding,param:string) => Resolvable<void>;
export type LegacyDecorator = (toDecorate:LegacyAction) => LegacyAction;
export type LegacyPredicate = (x: LegacyThisBinding) => Resolvable<boolean>;
export interface LegacyActions {
	[name: string]: LegacyAction;
}
export interface LegacyPackedMessage extends Message {
	commandName: string;
}
export interface LegacyThisBinding extends LegacyPackedMessage, GuildPlayerHolder { }
export interface LegacyCommandExtraData {
	type: CommandType;
	name: string; //Biztos? Még mindig a validálás kérdése
	aliases: string[];
	filters: Set<LegacyFilter>;
	params: string[];
	descrip: string;
}
export interface LegacyHelpInfo {
	requirements: string[];
	params: string[];
	ownDescription: string;
}
interface LegacyCommandRawData extends LegacyCommandExtraData {
	action: LegacyAction;
}
export class LegacyCommand {
	readonly decoratedAction: LegacyAction;
	readonly aliases: string[];
	readonly name: string;
	readonly helpRelated: LegacyHelpInfo;
	readonly type: CommandType;
	constructor(baseData: LegacyCommandRawData) {
		this.type = baseData.type;
		this.name = baseData.name;
		this.aliases = baseData.aliases;
		let orderedFilters = [...baseData.filters];
		orderedFilters.sort(LegacyFilter.compare);
		this.decoratedAction = aggregateLegacyDecorators(orderedFilters.map(elem => elem.decorator))(baseData.action);
		this.helpRelated = {
			requirements: orderedFilters.map(elem => elem.description),
			params: baseData.params,
			ownDescription: baseData.descrip
		};
	}
}