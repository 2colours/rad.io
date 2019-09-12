import * as Discord from 'discord.js';
import * as yd from 'ytdl-core'; //Nem illik közvetlenül hívni
import { defaultConfig, getEmoji, Config, configPromise, MusicData, StreamType, shuffle, PlayableCallbackVoid, PlayableCallbackBoolean, PlayableData } from './internal';
const ytdl = (url: string) => yd(url, { filter: 'audioonly', quality: 'highestaudio' });
const clientId = process.env.soundcloudClientId;
let config: Config;
configPromise.then(cfg => config = cfg);
const downloadMethods = new Map<StreamType, any>([
	['yt', ytdl],
	['custom', (url: string) => url],
	['radio', (url: string) => url],
	['sc', (url: string) => `${url}?client_id=${clientId}`]]);
class Playable {
	skip: PlayableCallbackVoid;
	halt: PlayableCallbackVoid;
	pause: PlayableCallbackBoolean;
	resume: PlayableCallbackBoolean;
	started: boolean;
	constructor(readonly data: PlayableData) {
		this.started = false;
	}
	isDefinite() {
		const definiteTypes: StreamType[] = ['yt', 'custom', 'sc'];
		return !!this.data && definiteTypes.includes(this.data.type);
	}
	askRepeat() {
		return false;
	}
	play(voiceConnection: Discord.VoiceConnection, vol: number) {
		return new Promise((resolve, reject) => {
			this.started = true;
			if (!this.data) {
				this.skip = () => resolve(true);
				this.halt = () => reject('leave');
				this.pause = () => false;
				this.resume = () => false;
				return;
			}
			const stream = downloadMethods.get(this.data.type)(this.data.url);
			const dispatcher = voiceConnection.playStream(stream, { seek: 0 });
			dispatcher.setVolume(vol);
			dispatcher.on('end', () => resolve(false)); //nem volt forced, hanem magától
			dispatcher.on('error', () => {
				console.log('Futott az error handler.');
				resolve(true); //ha hiba történt, inkább ne próbálkozzunk a loopolással - "forced"
			});
			this.skip = () => {
				resolve(true);
				dispatcher.end();
			};
			this.halt = () => {
				reject('leave');
				dispatcher.end();
			};
			this.pause = () => {
				return !dispatcher.paused && (dispatcher.pause(), true);
			};
			this.resume = () => {
				return dispatcher.paused && (dispatcher.resume(), true);
			};
		});
	}
}
class VoiceHandler {
	private timeoutId?: NodeJS.Timeout;
	constructor(private controlledPlayer: GuildPlayer) {
	}
	eventTriggered() {
		const voiceEmpty = !this.controlledPlayer.ownerGuild.voiceConnection.channel.members.some(member => !member.user.bot);
		if (voiceEmpty && !this.timeoutId)
			this.timeoutId = global.setTimeout(() => this.controlledPlayer.leave(), 60000 * 5);
		if (!voiceEmpty && this.timeoutId) {
			global.clearTimeout(this.timeoutId);
			delete this.timeoutId;
		}
	}
	destroy() {
		if (this.timeoutId)
			global.clearTimeout(this.timeoutId);
	}
}
export class GuildPlayer {
	private currentPlay: Playable;
	nowPlayingData: MusicData;
	private announcementChannel: Discord.TextChannel;
	queue: MusicData[];
	fallbackPlayed: boolean;
	public handler: VoiceHandler;
	private volume: number;
	private oldVolume?: number;
	constructor(public ownerGuild: Discord.Guild, textChannel: Discord.TextChannel, musicToPlay: MusicData[]) {
		this.announcementChannel = textChannel;
		this.fallbackPlayed = false;
		this.queue = [];
		this.handler = new VoiceHandler(this);
		this.volume = 0.5;
		this.nowPlayingData = null;
		if (musicToPlay.length > 0)
			this.bulkSchedule(musicToPlay);
		this.playLoop();
	}
	private async playLoop() {
		try {
			while (true) {
				this.currentPlay = new Playable(this.nowPlayingData);
				do { //Itt kéne kiírás is
					if (this.nowPlayingData)
						this.announcementChannel.send(`**Lejátszás alatt: ** ${getEmoji(this.nowPlayingData.type)} \`${this.nowPlayingData.name}\``);
					var forcedOver = await this.currentPlay.play(this.ownerGuild.voiceConnection, this.volume);
					var shouldRepeat = this.currentPlay.askRepeat();
				} while (!forcedOver && shouldRepeat);
				if (this.queue.length != 0) {
					this.nowPlayingData = this.queue.shift();
					this.fallbackPlayed = false;
				}
				else if (this.fallbackPlayed) {
					this.nowPlayingData = null;
				}
				else
					await this.fallbackMode();
			}
		}
		catch (ex) {
			if (ex != 'leave')
				console.error(ex);
		}
	}
	mute() {
		if (this.volume == 0)
			throw 'Már le van némítva a bot.';
		this.oldVolume = this.volume;
		this.setVolume(0);
	}
	unmute() {
		if (this.volume != 0)
			throw 'Nincs lenémítva a bot.';
		this.setVolume(this.oldVolume);
	}
	setVolume(vol: number) {
		if (!this.ownerGuild.voiceConnection.dispatcher)
			throw 'Semmi nincs lejátszás alatt.';
		this.ownerGuild.voiceConnection.dispatcher.setVolume(vol);
		this.volume = vol;
	}
	skip() {
		if (this.currentPlay && this.currentPlay.started)
			this.currentPlay.skip();
		else 
			this.nowPlayingData = this.queue.shift();
	}
	repeat(maxTimes?: number) {
		if (!this.currentPlay.isDefinite())
			throw 'Végtelen streameket nem lehet loopoltatni.';
		if (!maxTimes)
			this.currentPlay.askRepeat = () => true;
		else
			this.currentPlay.askRepeat = repeatCounter(maxTimes);
	}
	schedule(musicData: MusicData) {
		this.queue.push(musicData);
		if (!this.currentPlay.isDefinite() && this.queue.length == 1) //azért a length==1, mert különben nem arra lépnénk át, amit pont most raktunk be - kicsit furcsa
			this.skip();
		else
			this.announcementChannel.send(`**Sorba került: ** ${getEmoji(musicData.type)} \`${musicData.name}\``);
	}
	bulkSchedule(musicDatas: MusicData[]) {
		const autoSkip = !this.currentPlay || !this.currentPlay.isDefinite() && this.queue.length == 0;
		for (const musicData of musicDatas)
			this.queue.push(musicData);
		if (autoSkip)
			this.skip();
	}
	shuffle() {
		if (this.queue.length >= 2)
			shuffle(this.queue);
		else
			throw 'Nincs mit megkeverni.';
	}
	clear() {
		if (this.queue.length == 0)
			throw 'Már üres volt a sor.';
		this.queue = [];
	}
	topLast() {
		if (this.queue.length < 2)
			throw 'Nincs mit a sor elejére rakni.';
		const elementToMove = this.queue.pop();
		this.queue.unshift(elementToMove);
	}
	remove(queuePosition: number) {
		if (this.queue.length == 0)
			throw 'Már üres volt a sor.';
		if (queuePosition <= 0)
			throw 'A pozíciónak pozitív számnak kell lennie.';
		if (this.queue.length < queuePosition)
			throw 'Nincs ennyi elem a sorban.';
		this.queue.splice(queuePosition - 1, 1);
	}
	private async fallbackMode() {
		this.announcementChannel.send('**Fallback mód.**');
		const fallbackMode = config.fallbackModes.get(this.ownerGuild.id) || defaultConfig.fallback;
		switch (fallbackMode) {
			case 'radio':
				const fallbackMusic = config.fallbackChannels.get(this.ownerGuild.id);
				if (!fallbackMusic)
					this.announcementChannel.send('**Nincs beállítva rádióadó, silence fallback.**');
				this.nowPlayingData = fallbackMusic;
				this.fallbackPlayed = true;
				break;
			case 'leave':
				this.leave();
			case 'silence':
				this.nowPlayingData = null;
				this.fallbackPlayed = true;
				break;
		}
	}
	leave() {
		if (this.currentPlay)
			this.currentPlay.halt();
		this.ownerGuild.voiceConnection.disconnect(); //KÉRDÉSES!
		this.handler.destroy();
		delete this.ownerGuild;
		if (!this.nowPlayingData)
			throw 'destroyed';
	}
	pause() {
		if (!this.currentPlay.started || !this.currentPlay.pause())
			throw 'Csak lejátszás alatt álló stream szüneteltethető.';
		this.announcementChannel.send('**Lejátszás felfüggesztve.**');
	}
	resume() {
		if (!this.currentPlay.started || !this.currentPlay.resume())
			throw 'Ez a stream nem folytatható. (Nincs leállítva?)';
		this.announcementChannel.send('**Lejátszás folytatása...**');
	}
}
function repeatCounter(nTimes: number) {
	return () => nTimes-- > 0;
}
