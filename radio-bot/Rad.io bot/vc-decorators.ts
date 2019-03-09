import * as Common from './internal';
import { config } from './internal';
import { aggregateDecorators } from './internal';
import { creators } from './internal';
import { sscanf } from 'scanf';
import { actions } from './internal'
const isAdmin:Common.Predicate=ctx=>ctx.member.permissions.has('ADMINISTRATOR');
const isVcUser:Common.Predicate=ctx=>!!ctx.member.voiceChannel;
const isDifferentVc:Common.Predicate=ctx=>(ctx.guild.voiceConnection && ctx.guild.voiceConnection.channel) != ctx.member.voiceChannel;
const isVcBot:Common.Predicate=ctx=>!!ctx.guild.voiceConnection;
const choiceFilter=(pred:Common.Predicate,dec1:Common.Decorator,dec2:Common.Decorator)=>(action:Common.Action)=>async function(param:string) {
let currentDecorator=await Promise.resolve(pred(this))?dec1:dec2;
currentDecorator(action).call(this,param);
};
const hasPermission: Common.Predicate = ctx => {
	let guildRoles = [...config.roles.get(ctx.guild.id)];
	return guildRoles.some(roleData=>ctx.member.roles.has(roleData[0]) && roleData[1].includes(ctx.cmdName));
}
const hasVcPermission: Common.Predicate = ctx => ctx.member.voiceChannel.joinable;
const isCreator: Common.Predicate = ctx => creators.map(elem => elem.id).includes(ctx.author.id);
const isAloneUser:Common.Predicate=ctx=>!ctx.guild.voiceConnection.channel.members.some(member => !member.user.bot && member!=ctx.member);
const isAloneBot:Common.Predicate=ctx=>!ctx.guild.voiceConnection.channel.members.some(member=>!member.user.bot);
const pass:Common.Decorator=action=>action;
const rejectReply=(replyMessage:string)=>(_:Common.Action)=>function(_:string) {
this.reply(replyMessage);
};
const nop:Common.Decorator=_=>_=>{};
const any=(...preds:Common.Predicate[])=>(ctx:Common.ThisBinding)=>Promise.all(preds.map(pred=>Promise.resolve(pred(ctx)))).then(predValues=>predValues.includes(true));
const not=(pred:Common.Predicate)=>(ctx:Common.ThisBinding)=>!pred(ctx);
const adminNeeded:Common.Decorator=choiceFilter(isAdmin,pass,rejectReply('ezt a parancsot csak adminisztrátorok használhatják.'));
const vcUserNeeded:Common.Decorator=choiceFilter(isVcUser,pass,rejectReply('nem vagy voice csatornán.'));
//const sameVcBanned:Common.Decorator=choiceFilter(any(not(isVcUser),isDifferentVc),pass,rejectReply('már közös csatornán vagyunk.'));
const sameVcNeeded:Common.Decorator=choiceFilter(not(isDifferentVc),pass,rejectReply('nem vagyunk közös voice csatornán.')); //átengedi azt, ha egyik sincs vojszban!
const vcBotNeeded:Common.Decorator=choiceFilter(isVcBot,pass,rejectReply('nem vagyok voice csatornán.'));
const noBotVcNeeded:Common.Decorator=choiceFilter(isVcBot,rejectReply('már voice csatornán vagyok'),pass);
const sameOrNoBotVcNeeded:Common.Decorator=choiceFilter(any(not(isVcBot),not(isDifferentVc)),pass,rejectReply('már másik voice csatornán vagyok.'));
const permissionNeeded:Common.Decorator=choiceFilter(hasPermission,pass,rejectReply('nincs jogod a parancs használatához.'));
const adminOrPermissionNeeded:Common.Decorator=choiceFilter(isAdmin,pass,permissionNeeded);
const creatorNeeded:Common.Decorator=choiceFilter(isCreator,pass,nop);
const vcPermissionNeeded:Common.Decorator=action=>function(param) {
  if(!hasVcPermission(this))
    this.channel.send(`**Nincs jogom csatlakozni a** \`${this.member.voiceChannel.name}\` **csatornához!**`).catch(console.error);
  else
    action.call(this,param);
};
const parameterNeeded = (action: Common.Action) => function (param: string) {
	if (!sscanf(param, '%S'))
		actions.get('help').call(this, this.cmdName);
	else
		action.call(this, param);
};
const dedicationNeeded: Common.Decorator = choiceFilter(isAloneUser, pass, adminOrPermissionNeeded);
const isFallback = (ctx: Common.ThisBinding) => ctx.guildPlayer.fallbackPlayed;
const nonFallbackNeeded: Common.Decorator = choiceFilter(isFallback, rejectReply('**fallback-et nem lehet skippelni (leave-eld a botot vagy ütemezz be valamilyen zenét).**'), pass);
const leaveCriteria: Common.Decorator = choiceFilter(isAloneBot, pass, aggregateDecorators([vcUserNeeded, sameVcNeeded, choiceFilter(isAloneUser, pass, adminOrPermissionNeeded)]));

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
	private constructor(readonly decorator: Common.Decorator, readonly description: string) {
		this.priority = ++Filter.counter;
	}
	private priority: number;
	static compare(a: Filter, b: Filter): number {
		return a.priority - b.priority;
	}
}