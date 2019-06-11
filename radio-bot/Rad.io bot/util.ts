import { Snowflake, Guild, TextChannel, StringResolvable, RichEmbed, Attachment, MessageOptions, Message, MessageReaction, User, VoiceChannel } from 'discord.js';
import { Decorator, AuthorHolder, TextChannelHolder, client, defaultConfig, embedC, EmojiLike, GuildPlayerHolder, MusicData, GuildPlayer, Config, configPromise, ScrollableEmbedTitleResolver, dbPromise, PrefixTableData, FallbackModesTableData, FallbackDataTableData, RoleTableData } from './internal';
import { Database } from 'sqlite';
const PastebinAPI = require('pastebin-js');
const pastebin: any = new PastebinAPI(process.env.pastebin);
let config: Config;
configPromise.then(cfg => config = cfg);
let database: Database;
dbPromise.then(db => database = db);
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
export function hourMinSec(minutes: number, seconds: number) { //a seconds bugosnak bizonyult - már javítva?
	const hours = Math.floor(minutes / 60);
	minutes %= 60;
	return [hours, minutes, seconds].map(amount => amount.toString().padStart(2, '0')).join(':');
};
export const aggregateDecorators: (decorators: Decorator[]) => Decorator = (decorators) => (action) => decorators.reduceRight((act, dec) => dec(act), action);
export async function sendGuild(guild: Guild, content: StringResolvable, options?: RichEmbed | MessageOptions | Attachment) {
	for (const channel of guild.channels.values()) {
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
export async function forceSchedule(textChannel: TextChannel, voiceChannel: VoiceChannel, holder: GuildPlayerHolder, playableData: MusicData[]) {
	if (!voiceChannel.connection) {
		await voiceChannel.join();
		holder.guildPlayer = new GuildPlayer(voiceChannel.guild, textChannel, playableData);
		return;
	}
	if (playableData.length == 1)
		holder.guildPlayer.schedule(playableData[0]);
	else
		holder.guildPlayer.bulkSchedule(playableData);
};
export function commonEmbed(cmd: string) { //TODO ez sem akármilyen string, hanem parancsnév
	const prefix = config.prefixes.get(this.guild.id) || defaultConfig.prefix;
	return new RichEmbed()
		.setColor(embedC)
		.setFooter(`${prefix}${cmd} - ${client.user.username}`, client.user.avatarURL)
		.setTimestamp();
};
function scrollRequest(context: AuthorHolder, message: Message, currentPage: number, allPages: number) {
	const res = new Promise<number>(async (resolve, reject) => {
		const emojis: EmojiLike[] = [];
		if (currentPage > 1)
			emojis.push('◀');
		if (currentPage < allPages)
			emojis.push('▶');
		const filter = (reaction: MessageReaction, user: User) => emojis.some(emoji => reaction.emoji.name === emoji) && user.id == context.author.id;
		const collector = message.createReactionCollector(filter, { maxEmojis: 1, time: 10000 });
		collector.on('collect', r => {
			resolve(r.emoji.name == '◀' ? currentPage - 1 : currentPage + 1);
			collector.stop();
		});
		collector.on('end', _ => {
			reject(' lejárt az idő.');
		});
		for (const emoji of emojis) {
			const reaction = await message.react(emoji);
			res
				.then(_ => reaction.remove(client.user), _ => reaction.remove(client.user));
		}
	});
	return res;
};
export async function useScrollableEmbed(ctx: AuthorHolder & TextChannelHolder, baseEmbed: RichEmbed, titleResolver: ScrollableEmbedTitleResolver, linesForDescription: string[], elementsPerPage: number = 10) {
	let currentPage = 1;
	const maxPage = Math.ceil(linesForDescription.length / elementsPerPage);
	const currentDescription = linesForDescription.slice((currentPage - 1) * elementsPerPage, currentPage * elementsPerPage).join('\n');
	let completeEmbed = baseEmbed
		.setTitle(titleResolver(currentPage, maxPage))
		.setDescription(currentDescription);
	const message = await ctx.channel.send({ embed: completeEmbed }) as Message;
	while (true) {
		try {
			currentPage = await scrollRequest(ctx, message, currentPage, maxPage);
		}
		catch (ex) {
			break;
		}
		const currentDescription = linesForDescription.slice((currentPage - 1) * elementsPerPage, currentPage * elementsPerPage).join('\n');
		completeEmbed = baseEmbed
			.setTitle(`Lista (felül: legkorábbi) Oldal: ${currentPage}/${maxPage}`)
			.setDescription(currentDescription);
		await message.edit({ embed: completeEmbed });
	}
}
export const saveRow = {
	async prefix(rowObj: PrefixTableData) {
		await database.run(`DELETE FROM prefix WHERE guildID = ?`, rowObj.guildID);
		await database.run(`INSERT INTO prefix (guildID, prefix) VALUES (?, ?)`, [rowObj.guildID, rowObj.prefix]);
	},
	async fallbackModes(rowObj: FallbackModesTableData) {
		await database.run(`DELETE FROM fallbackModes WHERE guildID = ?`, rowObj.guildID);
		await database.run(`INSERT INTO fallbackModes (guildID, type) VALUES (?, ?)`, [rowObj.guildID, rowObj.type]);
	},
	async fallbackData(rowObj: FallbackDataTableData) {
		await database.run(`DELETE FROM fallbackData WHERE guildID = ?`, rowObj.guildID);
		await database.run(`INSERT INTO fallbackData (guildID, type, name, url) VALUES (?, ?, ?, ?)`, [rowObj.guildID, rowObj.type, rowObj.name, rowObj.url]);
	},
	async role(rowObj: RoleTableData) {
		await database.run(`DELETE FROM role WHERE (guildID = ?) AND (roleID = ?)`, [rowObj.guildID, rowObj.roleID]);
		await database.run(`INSERT INTO role (guildID, roleID, commands) VALUES (?, ?, ?)`, [rowObj.guildID, rowObj.roleID, rowObj.commands]);
	}
};
export async function createPastebin(title: string, content: string): Promise<string> {
	let paste: string = await pastebin.createPaste({ text: content, title });
	return paste;
}
export function isLink(text: string) {
	return text.search(/https?:\/\//) == 0;
}