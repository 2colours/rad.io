const sql=require('sqlite');
import * as Common from './common-types';
sql.open("./radio.sqlite");
export const creatorIds=['297037173541175296','419447790675165195'];
export const isAdmin=(ctx:Common.PackedMessage)=>ctx.member.permissions.has('ADMINISTRATOR');
export const isVcUser=(ctx:Common.PackedMessage)=>!!ctx.member.voiceChannel;
export const isDifferentVc=(ctx:Common.PackedMessage)=>(ctx.guild.voiceConnection && ctx.guild.voiceConnection.channel) != ctx.member.voiceChannel;
export const isVcBot=(ctx:Common.PackedMessage)=>!!ctx.guild.voiceConnection;
export const choiceFilter=(pred:Common.Predicate,dec1:Common.Decorator,dec2:Common.Decorator)=>(action:Common.Action)=>async function(param:string) {
let currentDecorator=await Promise.resolve(pred(this))?dec1:dec2;
currentDecorator(action).call(this,param);
};
const hasPermission=async (ctx:Common.PackedMessage)=>{
  let guildRoles = await sql.all('SELECT * FROM prefix WHERE guildID = ?',ctx.guild.id).catch(console.log);
  return guildRoles.some((roleRow:any)=>ctx.member.roles.has(roleRow.roleID) && roleRow.commands.split('|').includes(ctx.cmdName));
}
const hasVcPermission=(ctx:Common.PackedMessage)=>ctx.member.voiceChannel.joinable;
const isFallback=(ctx:Common.PackedMessage)=>ctx.guild.voiceConnection.channel['guildPlayer'].fallbackPlayed;
const isCreator=(ctx:Common.PackedMessage)=>creatorIds.includes(ctx.author.id);
//const isAloneUser=(ctx:Common.PackedMessage)=>!ctx.guild.voiceConnection.channel.members.some(member => !member.user.bot && member!=ctx.member);
//const isAloneBot=(ctx:Common.PackedMessage)=>!ctx.guild.voiceConnection.channel.members.some(member=>!member.user.bot);
const pass=(action:Common.Action)=>action;
const rejectReply=(replyMessage:string)=>(_:Common.Action)=>function(_:string) {
this.reply(replyMessage).catch(console.error);
};
const nop=(_:Common.Action)=>function(_:string){};
const any=(...preds:Common.Predicate[])=>(ctx:Common.PackedMessage)=>Promise.all(preds.map(pred=>Promise.resolve(pred(ctx)))).then(predValues=>predValues.includes(true));
const not=(pred:Common.Predicate)=>(ctx:Common.PackedMessage)=>!pred(ctx);
export const adminNeeded=choiceFilter(isAdmin,pass,rejectReply('ezt a parancsot csak adminisztrátorok használhatják.'));
export const vcUserNeeded=choiceFilter(isVcUser,pass,rejectReply('nem vagy voice csatornán.'));
export const sameVcBanned=choiceFilter(any(not(isVcUser),isDifferentVc),pass,rejectReply('már közös csatornán vagyunk.'));
export const sameVcNeeded=choiceFilter(not(isDifferentVc),pass,rejectReply('nem vagyunk közös voice csatornán.')); //átengedi azt, ha egyik sincs vojszban!
export const vcBotNeeded=choiceFilter(isVcBot,pass,rejectReply('nem vagyok voice csatornán.'));
export const noBotVcNeeded=choiceFilter(isVcBot,rejectReply('már voice csatornán vagyok'),pass);
export const sameOrNoBotVcNeeded=choiceFilter(any(not(isVcBot),not(isDifferentVc)),pass,rejectReply('már másik voice csatornán vagyok.'));
export const permissionNeeded=choiceFilter(hasPermission,pass,rejectReply('nincs jogod a parancs használatához.'));
export const adminOrPermissionNeeded=choiceFilter(isAdmin,pass,permissionNeeded);
export const creatorNeeded=choiceFilter(isCreator,pass,nop);
export const vcPermissionNeeded=(action:Common.Action)=>function(param:string) {
  if(!hasVcPermission(this))
    this.channel.send(`**Nincs jogom csatlakozni a** \`${this.member.voiceChannel.name}\` **csatornához!**`).catch(console.error);
  else
    action.call(this,param);
};
export const nonFallbackNeeded=choiceFilter(isFallback,rejectReply('**fallback-et nem lehet skippelni (leave-eld a botot vagy ütemezz be valamilyen zenét).**'),pass);