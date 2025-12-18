import { Predicate, Action, Decorator, ThisBinding, creators, getRoles, getFallbackMode, client, aggregateDecorators, ActionParams, StateError, botHasConnection } from '../index.js';
import { getVoiceConnection } from '@discordjs/voice';
import { MessageFlags, PermissionsBitField, VoiceBasedChannel } from 'discord.js';
export const isAdmin: Predicate = ctx => ctx.memberPermissions.has(PermissionsBitField.Flags.Administrator);
const isVcUser: Predicate = ctx => !!ctx.member.voice.channel;
// @ts-ignore //TODO https://github.com/2colours/rad.io/issues/615
const isDifferentVc: Predicate = ctx => getVoiceConnection(ctx.guildId).joinConfig.channelId != ctx.member.voice.channelId;
const isVcBot: Predicate = ctx => botHasConnection(ctx.guildId);
const choiceFilter = (pred: Predicate, dec1: Decorator, dec2: Decorator) => (action: Action) => async function (...args: ActionParams) {
	const currentDecorator = await pred(this) ? dec1 : dec2;
	await currentDecorator(action).call(this, ...args);
};
const hasPermission: Predicate = ctx => {
	const guildRoles = getRoles(ctx.guild.id);
	return guildRoles.some(([roleName, relatedPerms]) => ctx.member.roles.cache.has(roleName) && relatedPerms.includes(ctx.commandName));
}
// @ts-ignore //TODO ezt érdemes lenne felülvizsgálni, van-e értelme külön kezelni, amikor valószínűleg mindig a felhasználó csatornájába kéne ilyenkor belépni
const hasVcPermission: Predicate = ctx => ctx.member.voice.channel.joinable;
const isCreator: Predicate = ctx => creators.map(elem => elem.id).includes(ctx.user.id);
// @ts-ignore //TODO https://github.com/2colours/rad.io/issues/615
const isAloneUser: Predicate = ctx => isVcBot(ctx) && !(client.channels.resolve(getVoiceConnection(ctx.guildId).joinConfig.channelId) as VoiceBasedChannel).members.some(member => !member.user.bot && member != ctx.guild.members.resolve(ctx.user.id));
// @ts-ignore //TODO https://github.com/2colours/rad.io/issues/615
const isAloneBot: Predicate = ctx => isVcBot(ctx) && !(client.channels.resolve(getVoiceConnection(ctx.guildId).joinConfig.channelId) as VoiceBasedChannel).members.some(member => !member.user.bot);
const pass: Decorator = action => action;
const rejectReply = (replyMessage: string) => (_: Action) => async function (this: ThisBinding, ..._args: ActionParams) {
	await this.reply({ content: `**${replyMessage}**`, flags: MessageFlags.Ephemeral });
};
const nop: Decorator = () => () => { };
const any = (...preds: Predicate[]) => (ctx: ThisBinding) => Promise.all(preds.map(pred => pred(ctx))).then(predValues => predValues.includes(true));
const not = (pred: Predicate) => (ctx: ThisBinding) => !pred(ctx);
const adminNeeded: Decorator = choiceFilter(isAdmin, pass, rejectReply('Ezt a parancsot csak adminisztrátorok használhatják.'));
const vcUserNeeded: Decorator = choiceFilter(isVcUser, pass, rejectReply('Nem vagy voice csatornán.'));
const sameVcNeeded: Decorator = choiceFilter(not(isDifferentVc), pass, rejectReply('Nem vagyunk közös voice csatornán.')); //átengedi azt, ha egyik sincs vojszban!
const vcBotNeeded: Decorator = choiceFilter(isVcBot, pass, rejectReply('Nem vagyok voice csatornán.'));
const noBotVcNeeded: Decorator = choiceFilter(isVcBot, rejectReply('Már voice csatornán vagyok'), pass);
const sameOrNoBotVcNeeded: Decorator = choiceFilter(any(not(isVcBot), not(isDifferentVc)), pass, rejectReply('Már másik voice csatornán vagyok.'));
const permissionNeeded: Decorator = choiceFilter(hasPermission, pass, rejectReply('Nincs jogod a parancs használatához.'));
const adminOrPermissionNeeded: Decorator = choiceFilter(isAdmin, pass, permissionNeeded);
const creatorNeeded: Decorator = choiceFilter(isCreator, pass, nop);
const vcPermissionNeeded: Decorator = action => async function (this: ThisBinding, ...args: ActionParams) {
	if (!hasVcPermission(this))
        // @ts-ignore //TODO ezt érdemes lenne felülvizsgálni, van-e értelme külön kezelni, amikor valószínűleg mindig a felhasználó csatornájába kéne ilyenkor belépni
		await this.channel.send(`**Nincs jogom csatlakozni a** \`${this.member.voice.channel.name}\` **csatornához!**`).catch(console.error);
	else
		await action.call(this, ...args);
};
const eventualVcBotNeeded: Decorator = choiceFilter(isVcBot, pass, vcPermissionNeeded);
const dedicationNeeded: Decorator = choiceFilter(isAloneUser, pass, adminOrPermissionNeeded);
const isFallback: Predicate = ctx => ctx.guildPlayer.fallbackPlayed;
const isSilence: Predicate = ctx => !ctx.guildPlayer.nowPlaying();
const nonFallbackNeeded: Decorator = choiceFilter(isFallback, rejectReply('Ez a parancs nem használható fallback módban (leave-eld a botot vagy ütemezz be valamilyen zenét).'), pass);
const nonSilenceNeeded: Decorator = choiceFilter(isSilence, rejectReply('Ez a parancs nem használható, amikor semmi nem szól (leave-eld a botot vagy ütemezz be valamilyen zenét).'), pass);
const leaveCriteria: Decorator = choiceFilter(isAloneBot, pass, aggregateDecorators([dedicationNeeded, vcUserNeeded, sameVcNeeded]));
const isPlayingFallbackSet: Predicate = ctx => getFallbackMode(ctx.guild.id) == 'radio';
const playingFallbackNeeded: Decorator = choiceFilter(isPlayingFallbackSet, pass, rejectReply('Ez a parancs nem használható a jelenlegi fallback beállítással.'));
const stateErrors: Decorator = action => async function (this: ThisBinding, ...args: ActionParams): Promise<void> {
	try {
		await action.call(this, ...args);
	}
	catch (e) {
		if (e instanceof StateError)
			return void await this.reply({ content: `**hiba - ${e.message}**`, flags: MessageFlags.Ephemeral });
		throw e;
	}
};

export class Filter {
	private static counter = 0;
	static readonly creatorNeeded = new Filter(creatorNeeded, 'A parancs csak a bot fejlesztői számára hozzáférhető.');
	static readonly adminNeeded = new Filter(adminNeeded, 'Adminisztrátori jogosultság szükséges.');
	static readonly playingFallbackNeeded = new Filter(playingFallbackNeeded, 'A botnak zenét játszó fallback beállításon kell lennie.');
	static readonly noBotVcNeeded = new Filter(noBotVcNeeded, 'A bot nem lehet voice csatornában.');
	static readonly dedicationNeeded = new Filter(dedicationNeeded, 'A parancs használatához jogosultságra van szükség (lásd `grant` és `deny` parancsok), kivéve, ha a bot a parancsot kiadó felhasználóval kettesben van.');
	static readonly sameVcNeeded = new Filter(sameVcNeeded, 'A botnak és a felhasználónak közös voice csatornán kell lennie.');
	static readonly sameOrNoBotVcNeeded = new Filter(sameOrNoBotVcNeeded, 'A bot nem lehet a felhasználótól eltérő voice csatornán.');
	static readonly vcUserNeeded = new Filter(vcUserNeeded, 'A felhasználónak voice csatornán kell lennie.');
	static readonly vcBotNeeded = new Filter(vcBotNeeded, 'A botnak voice csatornában kell lennie.');
	static readonly eventualVcBotNeeded = new Filter(eventualVcBotNeeded, '');
	static readonly leaveCriteria = new Filter(leaveCriteria, '');
	static readonly nonFallbackNeeded = new Filter(nonFallbackNeeded, '');
	static readonly nonSilenceNeded = new Filter(nonSilenceNeeded, '');
	static readonly stateErrorNoNeeded = new Filter(stateErrors, '');
	private constructor(readonly decorator: Decorator, readonly description: string) {
		this.priority = ++Filter.counter;
	}
	private priority: number;
	static compare(a: Filter, b: Filter): number {
		return a.priority - b.priority;
	}
}