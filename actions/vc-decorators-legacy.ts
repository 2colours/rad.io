import { aggregateLegacyDecorators,LegacyPredicate, LegacyAction, LegacyDecorator, LegacyThisBinding, creators,legacyActions, getRoles, getFallbackMode, client } from '../internal.js';
import { getVoiceConnection } from '@discordjs/voice';
import { sscanf } from 'scanf';
import { VoiceBasedChannel } from 'discord.js';
export const legacyIsAdmin: LegacyPredicate = ctx => ctx.member.permissions.has('ADMINISTRATOR');
const isVcUser: LegacyPredicate = ctx => !!ctx.member.voice.channel;
const isDifferentVc: LegacyPredicate = ctx => client.channels.resolve(getVoiceConnection(ctx.guildId)?.joinConfig?.channelId) != ctx.member.voice.channel;
const isVcBot: LegacyPredicate = ctx => !!getVoiceConnection(ctx.guildId);
const choiceFilter = (pred: LegacyPredicate, dec1: LegacyDecorator, dec2: LegacyDecorator) => (action: LegacyAction) => async function (param: string) {
	const currentDecorator = await Promise.resolve(pred(this)) ? dec1 : dec2;
	currentDecorator(action).call(this,param);
};
const hasPermission: LegacyPredicate = ctx => {
	const guildRoles = getRoles(ctx.guild.id);
	return guildRoles.some(([roleName, relatedPerms]) => ctx.member.roles.cache.has(roleName) && relatedPerms.includes(ctx.commandName));
}
const hasVcPermission: LegacyPredicate = ctx => ctx.member.voice.channel.joinable;
const isCreator: LegacyPredicate = ctx => creators.map(elem => elem.id).includes(ctx.author.id);
const isAloneUser: LegacyPredicate = ctx => isVcBot(ctx) && !(client.channels.resolve(getVoiceConnection(ctx.guildId)?.joinConfig?.channelId) as VoiceBasedChannel).members.some(member => !member.user.bot && member != ctx.member);
const isAloneBot: LegacyPredicate = ctx => isVcBot(ctx) && !(client.channels.resolve(getVoiceConnection(ctx.guildId)?.joinConfig?.channelId) as VoiceBasedChannel).members.some(member => !member.user.bot);
const pass:LegacyDecorator=action=>action;
const rejectReply=(replyMessage:string)=>(_:LegacyAction)=>function(_:string) {
this.reply(`**${replyMessage}**`);
};
const nop:LegacyDecorator=_=>_=>{};
const any=(...preds:LegacyPredicate[])=>(ctx:LegacyThisBinding)=>Promise.all(preds.map(pred=>Promise.resolve(pred(ctx)))).then(predValues=>predValues.includes(true));
const not=(pred:LegacyPredicate)=>(ctx:LegacyThisBinding)=>!pred(ctx);
const adminNeeded:LegacyDecorator=choiceFilter(legacyIsAdmin,pass,rejectReply('Ezt a parancsot csak adminisztrátorok használhatják.'));
const vcUserNeeded:LegacyDecorator=choiceFilter(isVcUser,pass,rejectReply('Nem vagy voice csatornán.'));
const sameVcNeeded:LegacyDecorator=choiceFilter(not(isDifferentVc),pass,rejectReply('Nem vagyunk közös voice csatornán.')); //átengedi azt, ha egyik sincs vojszban!
const vcBotNeeded:LegacyDecorator=choiceFilter(isVcBot,pass,rejectReply('Nem vagyok voice csatornán.'));
const noBotVcNeeded:LegacyDecorator=choiceFilter(isVcBot,rejectReply('Már voice csatornán vagyok'),pass);
const sameOrNoBotVcNeeded:LegacyDecorator=choiceFilter(any(not(isVcBot),not(isDifferentVc)),pass,rejectReply('Már másik voice csatornán vagyok.'));
const permissionNeeded:LegacyDecorator=choiceFilter(hasPermission,pass,rejectReply('Nincs jogod a parancs használatához.'));
const adminOrPermissionNeeded:LegacyDecorator=choiceFilter(legacyIsAdmin,pass,permissionNeeded);
const creatorNeeded:LegacyDecorator=choiceFilter(isCreator,pass,nop);
const vcPermissionNeeded:LegacyDecorator=action=>function(param) {
	if (!hasVcPermission(this))
		this.channel.send(`**Nincs jogom csatlakozni a** \`${this.member.voice.channel.name}\` **csatornához!**`).catch(console.error);
  else
    action.call(this,param);
};
const eventualVcBotNeeded: LegacyDecorator = choiceFilter(isVcBot, pass, vcPermissionNeeded);
const parameterNeeded: LegacyDecorator = action => function (param) {
	if (!sscanf(param, '%S')) {
		const originalName = this.commandName;
		this.commandName = 'help';
		legacyActions['help'].call(this, originalName);
	}
	else
		action.call(this, param);
};
const dedicationNeeded: LegacyDecorator = choiceFilter(isAloneUser, pass, adminOrPermissionNeeded);
const isFallback: LegacyPredicate = ctx => ctx.guildPlayer.fallbackPlayed;
const isSilence: LegacyPredicate = ctx => !ctx.guildPlayer.nowPlaying();
const nonFallbackNeeded: LegacyDecorator = choiceFilter(isFallback, rejectReply('Ez a parancs nem használható fallback módban (leave-eld a botot vagy ütemezz be valamilyen zenét).'), pass);
const nonSilenceNeeded: LegacyDecorator = choiceFilter(isSilence, rejectReply('Ez a parancs nem használható, amikor semmi nem szól (leave-eld a botot vagy ütemezz be valamilyen zenét).'), pass);
const leaveCriteria: LegacyDecorator = choiceFilter(isAloneBot, pass, aggregateLegacyDecorators([dedicationNeeded, vcUserNeeded, sameVcNeeded]));
const isPlayingFallbackSet: LegacyPredicate = ctx => getFallbackMode(ctx.guild.id) == 'radio';
const playingFallbackNeeded: LegacyDecorator = choiceFilter(isPlayingFallbackSet, pass, rejectReply('Ez a parancs nem használható a jelenlegi fallback beállítással.'));
const naturalErrors: LegacyDecorator = action => async function (param) {
	try {
		await Promise.resolve(action.call(this, param));
	}
	catch (e) {
		if (typeof e == 'string')
			return void this.reply(`**hiba - ${e}**`);
		console.error(e);
	}
};

export class LegacyFilter {
	private static counter = 0;
	static readonly creatorNeeded = new LegacyFilter(creatorNeeded,'A parancs csak a bot fejlesztői számára hozzáférhető.');
	static readonly adminNeeded = new LegacyFilter(adminNeeded, 'Adminisztrátori jogosultság szükséges.');
	static readonly playingFallbackNeeded = new LegacyFilter(playingFallbackNeeded, 'A botnak zenét játszó fallback beállításon kell lennie.');
	static readonly noBotVcNeeded = new LegacyFilter(noBotVcNeeded, 'A bot nem lehet voice csatornában.');
	static readonly dedicationNeeded = new LegacyFilter(dedicationNeeded, 'A parancs használatához jogosultságra van szükség (lásd `grant` és `deny` parancsok), kivéve, ha a bot a parancsot kiadó felhasználóval kettesben van.');
	static readonly sameVcNeeded = new LegacyFilter(sameVcNeeded,'A botnak és a felhasználónak közös voice csatornán kell lennie.');
	static readonly sameOrNoBotVcNeeded = new LegacyFilter(sameOrNoBotVcNeeded, 'A bot nem lehet a felhasználótól eltérő voice csatornán.');
	static readonly vcUserNeeded = new LegacyFilter(vcUserNeeded, 'A felhasználónak voice csatornán kell lennie.');
	static readonly vcBotNeeded = new LegacyFilter(vcBotNeeded, 'A botnak voice csatornában kell lennie.');
	static readonly eventualVcBotNeeded = new LegacyFilter(eventualVcBotNeeded, '');
	static readonly leaveCriteria = new LegacyFilter(leaveCriteria, '');
	static readonly nonFallbackNeeded = new LegacyFilter(nonFallbackNeeded, '');
	static readonly nonSilenceNeded = new LegacyFilter(nonSilenceNeeded, '');
	static readonly parameterNeeded = new LegacyFilter(parameterNeeded, '');
	static readonly naturalErrorNoNeeded = new LegacyFilter(naturalErrors, '');
	private constructor(readonly decorator: LegacyDecorator, readonly description: string) {
		this.priority = ++LegacyFilter.counter;
	}
	private priority: number;
	static compare(a: LegacyFilter, b: LegacyFilter): number {
		return a.priority - b.priority;
	}
}
