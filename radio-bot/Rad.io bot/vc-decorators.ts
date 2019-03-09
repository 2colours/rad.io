import { aggregateDecorators, Config, configPromise, Predicate, Action, Decorator, ThisBinding, creators, actions } from './internal';
import { sscanf } from 'scanf';
const isAdmin:Predicate=ctx=>ctx.member.permissions.has('ADMINISTRATOR');
const isVcUser:Predicate=ctx=>!!ctx.member.voiceChannel;
const isDifferentVc:Predicate=ctx=>(ctx.guild.voiceConnection && ctx.guild.voiceConnection.channel) != ctx.member.voiceChannel;
const isVcBot:Predicate=ctx=>!!ctx.guild.voiceConnection;
const choiceFilter=(pred:Predicate,dec1:Decorator,dec2:Decorator)=>(action:Action)=>async function(param:string) {
let currentDecorator=await Promise.resolve(pred(this))?dec1:dec2;
currentDecorator(action).call(this,param);
};
let config: Config;
configPromise.then(cfg => config = cfg);
const hasPermission: Predicate = ctx => {
	let guildRoles = [...config.roles.get(ctx.guild.id)];
	return guildRoles.some(roleData=>ctx.member.roles.has(roleData[0]) && roleData[1].includes(ctx.cmdName));
}
const hasVcPermission: Predicate = ctx => ctx.member.voiceChannel.joinable;
const isCreator: Predicate = ctx => creators.map(elem => elem.id).includes(ctx.author.id);
const isAloneUser:Predicate=ctx=>!ctx.guild.voiceConnection.channel.members.some(member => !member.user.bot && member!=ctx.member);
const isAloneBot:Predicate=ctx=>!ctx.guild.voiceConnection.channel.members.some(member=>!member.user.bot);
const pass:Decorator=action=>action;
const rejectReply=(replyMessage:string)=>(_:Action)=>function(_:string) {
this.reply(replyMessage);
};
const nop:Decorator=_=>_=>{};
const any=(...preds:Predicate[])=>(ctx:ThisBinding)=>Promise.all(preds.map(pred=>Promise.resolve(pred(ctx)))).then(predValues=>predValues.includes(true));
const not=(pred:Predicate)=>(ctx:ThisBinding)=>!pred(ctx);
const adminNeeded:Decorator=choiceFilter(isAdmin,pass,rejectReply('ezt a parancsot csak adminisztrátorok használhatják.'));
const vcUserNeeded:Decorator=choiceFilter(isVcUser,pass,rejectReply('nem vagy voice csatornán.'));
//const sameVcBanned:Decorator=choiceFilter(any(not(isVcUser),isDifferentVc),pass,rejectReply('már közös csatornán vagyunk.'));
const sameVcNeeded:Decorator=choiceFilter(not(isDifferentVc),pass,rejectReply('nem vagyunk közös voice csatornán.')); //átengedi azt, ha egyik sincs vojszban!
const vcBotNeeded:Decorator=choiceFilter(isVcBot,pass,rejectReply('nem vagyok voice csatornán.'));
const noBotVcNeeded:Decorator=choiceFilter(isVcBot,rejectReply('már voice csatornán vagyok'),pass);
const sameOrNoBotVcNeeded:Decorator=choiceFilter(any(not(isVcBot),not(isDifferentVc)),pass,rejectReply('már másik voice csatornán vagyok.'));
const permissionNeeded:Decorator=choiceFilter(hasPermission,pass,rejectReply('nincs jogod a parancs használatához.'));
const adminOrPermissionNeeded:Decorator=choiceFilter(isAdmin,pass,permissionNeeded);
const creatorNeeded:Decorator=choiceFilter(isCreator,pass,nop);
const vcPermissionNeeded:Decorator=action=>function(param) {
  if(!hasVcPermission(this))
    this.channel.send(`**Nincs jogom csatlakozni a** \`${this.member.voiceChannel.name}\` **csatornához!**`).catch(console.error);
  else
    action.call(this,param);
};
const parameterNeeded = (action: Action) => function (param: string) {
	if (!sscanf(param, '%S'))
		actions.get('help').call(this, this.cmdName);
	else
		action.call(this, param);
};
const dedicationNeeded: Decorator = choiceFilter(isAloneUser, pass, adminOrPermissionNeeded);
const isFallback = (ctx: ThisBinding) => ctx.guildPlayer.fallbackPlayed;
const nonFallbackNeeded: Decorator = choiceFilter(isFallback, rejectReply('**fallback-et nem lehet skippelni (leave-eld a botot vagy ütemezz be valamilyen zenét).**'), pass);
const leaveCriteria: Decorator = choiceFilter(isAloneBot, pass, aggregateDecorators([vcUserNeeded, sameVcNeeded, choiceFilter(isAloneUser, pass, adminOrPermissionNeeded)]));

export class Filter {
	private static counter = 0;
	static readonly creatorNeeded = new Filter(creatorNeeded,'A parancs csak a bot fejlesztői számára hozzáférhető.');
	static readonly adminNeeded = new Filter(adminNeeded, 'Adminisztrátori jogosultság szükséges.');
	static readonly vcPermissionNeeded = new Filter(vcPermissionNeeded, '');
	static readonly noBotVcNeeded = new Filter(noBotVcNeeded, 'A bot nem lehet voice csatornában.');
	static readonly dedicationNeeded = new Filter(dedicationNeeded, 'A parancs használatához jogosultságra van szükség (lásd `grant` és `deny` parancsok), kivéve, ha a bot a parancsot kiadó felhasználóval kettesben van.');
	static readonly sameVcNeeded = new Filter(sameVcNeeded,'A botnak és a felhasználónak közös voice csatornán kell lennie.');
	static readonly sameOrNoBotVcNeeded = new Filter(sameOrNoBotVcNeeded, 'A bot nem lehet a felhasználótól eltérő voice csatornán.');
	static readonly vcUserNeeded = new Filter(vcUserNeeded, 'A felhasználónak voice csatornán kell lennie.');
	static readonly vcBotNeeded = new Filter(vcBotNeeded,'A botnak voice csatornában kell lennie.');
	static readonly leaveCriteria = new Filter(leaveCriteria, '');
	static readonly nonFallbackNeeded = new Filter(nonFallbackNeeded, '');
	static readonly parameterNeeded = new Filter(parameterNeeded, '');
	private constructor(readonly decorator: Decorator, readonly description: string) {
		this.priority = ++Filter.counter;
	}
	private priority: number;
	static compare(a: Filter, b: Filter): number {
		return a.priority - b.priority;
	}
}