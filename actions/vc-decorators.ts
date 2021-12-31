import { aggregateDecorators, Predicate, Action, Decorator, ThisBinding, creators, actions, getRoles, getFallbackMode } from '../internal.js';
import { sscanf } from 'scanf';
export const isAdmin: Predicate = ctx => ctx.member.permissions.has('ADMINISTRATOR');
const isVcUser: Predicate = ctx => !!ctx.member.voice.channel;
const isDifferentVc: Predicate = ctx => ctx.guild.voice?.channel != ctx.member.voice.channel;
const isVcBot: Predicate = ctx => !!ctx.guild.voice?.connection;
const choiceFilter = (pred: Predicate, dec1: Decorator, dec2: Decorator) => (action: Action) => async function (param: string) {
	const currentDecorator = await Promise.resolve(pred(this)) ? dec1 : dec2;
currentDecorator(action).call(this,param);
};
const hasPermission: Predicate = ctx => {
	const guildRoles = getRoles(ctx.guild.id);
	return guildRoles.some(([roleName, relatedPerms]) => ctx.member.roles.cache.has(roleName) && relatedPerms.includes(ctx.cmdName));
}
const hasVcPermission: Predicate = ctx => ctx.member.voice.channel.joinable;
const isCreator: Predicate = ctx => creators.map(elem => elem.id).includes(ctx.author.id);
const isAloneUser: Predicate = ctx => isVcBot(ctx) && !ctx.guild.voice.channel.members.some(member => !member.user.bot && member != ctx.member);
const isAloneBot: Predicate = ctx => isVcBot(ctx) && !ctx.guild.voice.channel.members.some(member => !member.user.bot);
const pass:Decorator=action=>action;
const rejectReply=(replyMessage:string)=>(_:Action)=>function(_:string) {
this.reply(`**${replyMessage}**`);
};
const nop:Decorator=_=>_=>{};
const any=(...preds:Predicate[])=>(ctx:ThisBinding)=>Promise.all(preds.map(pred=>Promise.resolve(pred(ctx)))).then(predValues=>predValues.includes(true));
const not=(pred:Predicate)=>(ctx:ThisBinding)=>!pred(ctx);
const adminNeeded:Decorator=choiceFilter(isAdmin,pass,rejectReply('ezt a parancsot csak adminisztrátorok használhatják.'));
const vcUserNeeded:Decorator=choiceFilter(isVcUser,pass,rejectReply('nem vagy voice csatornán.'));
const sameVcNeeded:Decorator=choiceFilter(not(isDifferentVc),pass,rejectReply('nem vagyunk közös voice csatornán.')); //átengedi azt, ha egyik sincs vojszban!
const vcBotNeeded:Decorator=choiceFilter(isVcBot,pass,rejectReply('nem vagyok voice csatornán.'));
const noBotVcNeeded:Decorator=choiceFilter(isVcBot,rejectReply('már voice csatornán vagyok'),pass);
const sameOrNoBotVcNeeded:Decorator=choiceFilter(any(not(isVcBot),not(isDifferentVc)),pass,rejectReply('már másik voice csatornán vagyok.'));
const permissionNeeded:Decorator=choiceFilter(hasPermission,pass,rejectReply('nincs jogod a parancs használatához.'));
const adminOrPermissionNeeded:Decorator=choiceFilter(isAdmin,pass,permissionNeeded);
const creatorNeeded:Decorator=choiceFilter(isCreator,pass,nop);
const vcPermissionNeeded:Decorator=action=>function(param) {
	if (!hasVcPermission(this))
		this.channel.send(`**Nincs jogom csatlakozni a** \`${this.member.voice.channel.name}\` **csatornához!**`).catch(console.error);
  else
    action.call(this,param);
};
const eventualVcBotNeeded: Decorator = choiceFilter(isVcBot, pass, vcPermissionNeeded);
const parameterNeeded: Decorator = action => function (param) {
	if (!sscanf(param, '%S')) {
		const originalName = this.cmdName;
		this.cmdName = 'help';
		actions['help'].call(this, originalName);
	}
	else
		action.call(this, param);
};
const dedicationNeeded: Decorator = choiceFilter(isAloneUser, pass, adminOrPermissionNeeded);
const isFallback: Predicate = ctx => ctx.guildPlayer.fallbackPlayed;
const isSilence: Predicate = ctx => !ctx.guildPlayer.nowPlaying();
const nonFallbackNeeded: Decorator = choiceFilter(isFallback, rejectReply('ez a parancs nem használható fallback módban (leave-eld a botot vagy ütemezz be valamilyen zenét).'), pass);
const nonSilenceNeeded: Decorator = choiceFilter(isSilence, rejectReply('ez a parancs nem használható, amikor semmi nem szól (leave-eld a botot vagy ütemezz be valamilyen zenét).'), pass);
const leaveCriteria: Decorator = choiceFilter(isAloneBot, pass, aggregateDecorators([dedicationNeeded, vcUserNeeded, sameVcNeeded]));
const isPlayingFallbackSet: Predicate = ctx => getFallbackMode(ctx.guild.id) == 'radio';
const playingFallbackNeeded: Decorator = choiceFilter(isPlayingFallbackSet, pass, rejectReply('ez a parancs nem használható a jelenlegi fallback beállítással.'));
const naturalErrors: Decorator = action => async function (param) {
	try {
		await Promise.resolve(action.call(this, param));
	}
	catch (ex) {
		if (typeof ex == 'string')
			return void this.reply(`**hiba - ${ex}**`);
		console.error(ex);
	}
};

export class Filter {
	private static counter = 0;
	static readonly creatorNeeded = new Filter(creatorNeeded,'A parancs csak a bot fejlesztői számára hozzáférhető.');
	static readonly adminNeeded = new Filter(adminNeeded, 'Adminisztrátori jogosultság szükséges.');
	static readonly playingFallbackNeeded = new Filter(playingFallbackNeeded, 'A botnak zenét játszó fallback beállításon kell lennie.');
	static readonly noBotVcNeeded = new Filter(noBotVcNeeded, 'A bot nem lehet voice csatornában.');
	static readonly dedicationNeeded = new Filter(dedicationNeeded, 'A parancs használatához jogosultságra van szükség (lásd `grant` és `deny` parancsok), kivéve, ha a bot a parancsot kiadó felhasználóval kettesben van.');
	static readonly sameVcNeeded = new Filter(sameVcNeeded,'A botnak és a felhasználónak közös voice csatornán kell lennie.');
	static readonly sameOrNoBotVcNeeded = new Filter(sameOrNoBotVcNeeded, 'A bot nem lehet a felhasználótól eltérő voice csatornán.');
	static readonly vcUserNeeded = new Filter(vcUserNeeded, 'A felhasználónak voice csatornán kell lennie.');
	static readonly vcBotNeeded = new Filter(vcBotNeeded, 'A botnak voice csatornában kell lennie.');
	static readonly eventualVcBotNeeded = new Filter(eventualVcBotNeeded, '');
	static readonly leaveCriteria = new Filter(leaveCriteria, '');
	static readonly nonFallbackNeeded = new Filter(nonFallbackNeeded, '');
	static readonly nonSilenceNeded = new Filter(nonSilenceNeeded, '');
	static readonly parameterNeeded = new Filter(parameterNeeded, '');
	static readonly naturalErrorNoNeeded = new Filter(naturalErrors, '');
	private constructor(readonly decorator: Decorator, readonly description: string) {
		this.priority = ++Filter.counter;
	}
	private priority: number;
	static compare(a: Filter, b: Filter): number {
		return a.priority - b.priority;
	}
}
