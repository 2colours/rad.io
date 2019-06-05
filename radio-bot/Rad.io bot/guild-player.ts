import * as Discord from 'discord.js';
import * as yd from 'ytdl-core'; //Nem illik közvetlenül hívni
import { defaultConfig, getEmoji, Config, configPromise, MusicData, StreamType, shuffle } from './internal';
const ytdl = (url: string) => yd(url, { filter: 'audioonly', quality: 'highestaudio' });
let config: Config;
configPromise.then(cfg => config = cfg);
const downloadMethods = new Map<StreamType,any>([
	['yt', ytdl],
	['custom',(url:string) => url],
	['radio',(url:string) => url]]);
class Playable {
	readonly data?: any;
	skip: any;
	halt: any;
	started: boolean;
	constructor(musicData?: MusicData) {
		this.data = musicData;
		this.started = false;
	}
	isDefinite() {
		return this.data && ['yt', 'custom'].includes(this.data.type);
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
		});
	}
}
class VoiceHandler {
	private timeoutId?:NodeJS.Timeout;
	constructor(private controlledPlayer: GuildPlayer) {
	}
	eventTriggered() {
		const voiceEmpty = !this.controlledPlayer.ownerGuild.voiceConnection.channel.members.some(member => !member.user.bot);
		if (voiceEmpty && !this.timeoutId)
			this.timeoutId = global.setTimeout(this.controlledPlayer.leave.bind(this.controlledPlayer), 60000 * 5);
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
	nowPlaying: Playable;
	private announcementChannel: Discord.TextChannel;
	private queue: Playable[];
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
		this.nowPlaying = new Playable();
		if (musicToPlay.length > 0)
			this.bulkSchedule(musicToPlay);
		this.playLoop();
	}
	async playLoop() {
		try {
			while (true) {
				do { //Itt kéne kiírás is
					if (this.nowPlaying.data)
						this.announcementChannel.send(`**Lejátszás alatt: ** ${getEmoji(this.nowPlaying.data.type)} \`${this.nowPlaying.data.name}\``);
					var forcedOver = await this.nowPlaying.play(this.ownerGuild.voiceConnection, this.volume);
					var shouldRepeat = this.nowPlaying.askRepeat();
				} while (!forcedOver && shouldRepeat);
				this.nowPlaying = null;
				if (this.queue.length != 0) {
					this.nowPlaying = this.queue.shift();
					this.fallbackPlayed = false;
				}
				else if (this.fallbackPlayed) {
					this.nowPlaying = new Playable();
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
		if (this.nowPlaying.started)
			this.nowPlaying.skip();
		else {
			this.nowPlaying = this.queue.shift() || new Playable();
		}
	}
	repeat(maxTimes?: number) {
		if (!this.nowPlaying.isDefinite())
			throw 'Végtelen streameket nem lehet loopoltatni.';
		if (!maxTimes)
			this.nowPlaying.askRepeat = () => true;
		else
			this.nowPlaying.askRepeat = repeatCounter(maxTimes);
	}
	schedule(musicData:MusicData) {
		this.queue.push(new Playable(musicData));
		if (!this.nowPlaying.isDefinite() && this.queue.length == 1) //azért a length==1, mert különben nem arra lépnénk át, amit pont most raktunk be - kicsit furcsa
			this.skip();
		else
			this.announcementChannel.send(`**Sorba került: ** ${getEmoji(musicData.type)} \`${musicData.name}\``);
	}
	bulkSchedule(musicDatas: MusicData[]) {
		const autoSkip = !this.nowPlaying.isDefinite() && this.queue.length == 0;
		for (const musicData of musicDatas) 
			this.queue.push(new Playable(musicData));
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
	async fallbackMode() {
		this.announcementChannel.send('**Fallback mód.**');
		const fallbackMode = config.fallbackModes.get(this.ownerGuild.id) || defaultConfig.fallback;
		switch (fallbackMode) {
			case 'radio':
				const fallbackMusic = config.fallbackChannels.get(this.ownerGuild.id)
				if (!fallbackMusic)
					this.announcementChannel.send('**Nincs beállítva rádióadó, silence fallback.**');
				this.nowPlaying = new Playable(fallbackMusic);
				this.fallbackPlayed = true;
				break;
			case 'leave':
				this.leave();
			case 'silence':
				this.nowPlaying = new Playable();
				this.fallbackPlayed = true;
				break;
		}
	}
	leave() {
		if (this.nowPlaying)
			this.nowPlaying.halt();
		this.ownerGuild.voiceConnection.disconnect(); //KÉRDÉSES!
		this.handler.destroy();
		delete this.ownerGuild;
		if (!this.nowPlaying)
			throw 'destroyed';
	}
	getQueueData():MusicData[] {
		return this.queue.map(playable => playable.data);
	}
	getNowPlayingData() {
		return this.nowPlaying.data;
	}
}
function repeatCounter(nTimes: number) {
	return () => nTimes-- > 0;
}
