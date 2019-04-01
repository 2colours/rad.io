import { Snowflake, Guild, TextChannel, StringResolvable, RichEmbed, Attachment, MessageOptions } from 'discord.js';
import { Decorator } from './internal';
export function attach<T>(baseDict: Map<Snowflake, T>, guildId: Snowflake, defaultValue: T) {
	baseDict = baseDict.get(guildId) ? baseDict : baseDict.set(guildId, defaultValue);
	return baseDict.get(guildId);
};
export function randomElement<T>(array: T[]): T {
	return array[(Math.random() * array.length) | 0];
};
export function hourMinSec(minutes: number, seconds: number) { //a seconds bugosnak bizonyult - már javítva?
	let hours = Math.floor(minutes / 60);
	minutes %= 60;
	return [hours, minutes, seconds].map(amount => amount.toString().padStart(2, '0')).join(':');
};
export const aggregateDecorators: (decorators: Decorator[]) => Decorator = (decorators) => (action) => decorators.reduceRight((act, dec) => dec(act), action);
export async function sendGuild(guild: Guild, content: StringResolvable, options?: RichEmbed | MessageOptions | Attachment) {
	for (let channel of guild.channels.values()) {
		if (!(channel instanceof TextChannel))
			continue;
		try {
			await channel.send(content, options);
			break;
		}
		catch (ex) {
		}
	}
}