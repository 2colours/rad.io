const sql=require('sqlite');
sql.open("./radio.sqlite");
const sscanf = require('scanf').sscanf;
const creatorIds=['297037173541175296','419447790675165195'];
const isAdmin=ctx=>ctx.member.permissions.has('ADMINISTRATOR');
const isVcUser=ctx=>ctx.member.voiceChannel;
const isDifferentVc=ctx=>(ctx.guild.voiceConnection && ctx.guild.voiceConnection.channel) != ctx.member.voiceChannel;
const isVcBot=ctx=>ctx.guild.voiceConnection;
const choiceFilter=(pred,dec1,dec2)=>action=>async function(param) {
let currentDecorator=await Promise.resolve(pred(this))?dec1:dec2;
currentDecorator(action).call(this,param);
};
const hasPermission=async ctx=>{
  let guildRoles = await sql.all('SELECT * FROM prefix WHERE guildID = ?',ctx.guild.id).catch(err=>[]);
  return guildRoles.some(roleRow=>ctx.member.roles.has(roleRow.roleID) && roleRow.commands.split('|').includes(ctx.cmdName));
}
const hasVcPermission=ctx=>ctx.member.voiceChannel.joinable;
const isFallback=ctx=>ctx.guild.voiceConnection.channel.guildPlayer.fallbackPlayed;
const isCreator=ctx=>creatorIds.includes(ctx.author.id);
const isAloneUser=ctx=>!ctx.guild.voiceConnection.channel.members.some(member => !member.user.bot && member!=ctx.member);
const isAloneBot=ctx=>!ctx.guild.voiceConnection.channel.members.some(member=>!member.user.bot);
const pass=action=>action;
const rejectReply=replyMessage=>action=>function(param) {
this.reply(replyMessage).catch(console.error);
};
const nop=action=>function(param){};
const any=(...preds)=>ctx=>preds.some(pred=>pred(ctx));
const not=pred=>ctx=>!pred(ctx);
const adminNeeded=choiceFilter(isAdmin,pass,rejectReply('ezt a parancsot csak adminisztrátorok használhatják.'));
const vcUserNeeded=choiceFilter(isVcUser,pass,rejectReply('nem vagy voice csatornán.'));
const sameVcBanned=choiceFilter(any(not(isVcUser),isDifferentVc),pass,rejectReply('már közös csatornán vagyunk.'));
const sameVcNeeded=choiceFilter(not(isDifferentVc),pass,rejectReply('nem vagyunk közös voice csatornán.')); //átengedi azt, ha egyik sincs vojszban!
const vcBotNeeded=choiceFilter(isVcBot,pass,rejectReply('nem vagyok voice csatornán.'));
const noBotVcNeeded=choiceFilter(isVcBot,rejectReply('már voice csatornán vagyok'),pass);
const sameOrNoBotVcNeeded=choiceFilter(any(not(isVcBot),not(isDifferentVc)),pass,rejectReply('már másik voice csatornán vagyok.'));
const permissionNeeded=choiceFilter(hasPermission,pass,rejectReply('nincs jogod a parancs használatához.'));
const adminOrPermissionNeeded=choiceFilter(isAdmin,pass,permissionNeeded);
const creatorNeeded=choiceFilter(isCreator,pass,nop);
const vcPermissionNeeded=action=>function(param) {
  if(!hasVcPermission(this))
    this.channel.send(`**Nincs jogom csatlakozni a** \`${this.member.voiceChannel.name}\` **csatornához!**`).catch(console.error);
  else
    action.call(this,param);
};
const nonFallbackNeeded=choiceFilter(isFallback,rejectReply('**fallback-et nem lehet skippelni (leave-eld a botot vagy ütemezz be valamilyen zenét).**'),pass);
module.exports={isAloneUser,pass,isAloneBot,nonFallbackNeeded,choiceFilter,adminNeeded,vcUserNeeded,sameVcBanned,sameVcNeeded,vcBotNeeded,noBotVcNeeded,sameOrNoBotVcNeeded,permissionNeeded,adminOrPermissionNeeded,creatorNeeded,vcPermissionNeeded,creatorIds};