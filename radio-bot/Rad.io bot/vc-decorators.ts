const sql=require('sqlite');
import * as Common from './common-types';
sql.open("./radio.sqlite");
export const creatorIds=['297037173541175296','419447790675165195'];
export const isAdmin:Common.Predicate=ctx=>ctx.member.permissions.has('ADMINISTRATOR');
export const isVcUser:Common.Predicate=ctx=>!!ctx.member.voiceChannel;
export const isDifferentVc:Common.Predicate=ctx=>(ctx.guild.voiceConnection && ctx.guild.voiceConnection.channel) != ctx.member.voiceChannel;
export const isVcBot:Common.Predicate=ctx=>!!ctx.guild.voiceConnection;
export const choiceFilter=(pred:Common.Predicate,dec1:Common.Decorator,dec2:Common.Decorator)=>(action:Common.Action)=>async function(param:string) {
let currentDecorator=await Promise.resolve(pred(this))?dec1:dec2;
currentDecorator(action).call(this,param);
};
export const hasPermission:Common.Predicate=async ctx=>{
  let guildRoles = await sql.all('SELECT * FROM role WHERE guildID = ?',ctx.guild.id);
  return guildRoles.some((roleRow:any)=>ctx.member.roles.has(roleRow.roleID) && roleRow.commands.split('|').includes(ctx.cmdName));
}
export const hasVcPermission:Common.Predicate=ctx=>ctx.member.voiceChannel.joinable;
export const isCreator:Common.Predicate=ctx=>creatorIds.includes(ctx.author.id);
export const isAloneUser:Common.Predicate=ctx=>!ctx.guild.voiceConnection.channel.members.some(member => !member.user.bot && member!=ctx.member);
export const isAloneBot:Common.Predicate=ctx=>!ctx.guild.voiceConnection.channel.members.some(member=>!member.user.bot);
export const pass:Common.Decorator=action=>action;
export const rejectReply=(replyMessage:string)=>(_:Common.Action)=>function(_:string) {
this.reply(replyMessage);
};
export const nop:Common.Decorator=_=>_=>{};
export const any=(...preds:Common.Predicate[])=>(ctx:Common.ThisBinding)=>Promise.all(preds.map(pred=>Promise.resolve(pred(ctx)))).then(predValues=>predValues.includes(true));
export const not=(pred:Common.Predicate)=>(ctx:Common.ThisBinding)=>!pred(ctx);
export const adminNeeded:Common.Decorator=choiceFilter(isAdmin,pass,rejectReply('ezt a parancsot csak adminisztrátorok használhatják.'));
export const vcUserNeeded:Common.Decorator=choiceFilter(isVcUser,pass,rejectReply('nem vagy voice csatornán.'));
export const sameVcBanned:Common.Decorator=choiceFilter(any(not(isVcUser),isDifferentVc),pass,rejectReply('már közös csatornán vagyunk.'));
export const sameVcNeeded:Common.Decorator=choiceFilter(not(isDifferentVc),pass,rejectReply('nem vagyunk közös voice csatornán.')); //átengedi azt, ha egyik sincs vojszban!
export const vcBotNeeded:Common.Decorator=choiceFilter(isVcBot,pass,rejectReply('nem vagyok voice csatornán.'));
export const noBotVcNeeded:Common.Decorator=choiceFilter(isVcBot,rejectReply('már voice csatornán vagyok'),pass);
export const sameOrNoBotVcNeeded:Common.Decorator=choiceFilter(any(not(isVcBot),not(isDifferentVc)),pass,rejectReply('már másik voice csatornán vagyok.'));
export const permissionNeeded:Common.Decorator=choiceFilter(hasPermission,pass,rejectReply('nincs jogod a parancs használatához.'));
export const adminOrPermissionNeeded:Common.Decorator=choiceFilter(isAdmin,pass,permissionNeeded);
export const creatorNeeded:Common.Decorator=choiceFilter(isCreator,pass,nop);
export const vcPermissionNeeded:Common.Decorator=action=>function(param) {
  if(!hasVcPermission(this))
    this.channel.send(`**Nincs jogom csatlakozni a** \`${this.member.voiceChannel.name}\` **csatornához!**`).catch(console.error);
  else
    action.call(this,param);
};