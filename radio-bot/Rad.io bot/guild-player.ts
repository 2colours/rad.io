import * as Discord from 'discord.js';
import { Readable } from 'node:stream';
import yd from 'ytdl-core-discord'; //Nem illik közvetlenül hívni
import { getEmoji, MusicData, StreamType, StreamProvider, shuffle, PlayableCallbackVoid, PlayableCallbackBoolean, PlayableData, getFallbackMode, getFallbackChannel, PlayableCallbackNumber, PlayingData, starterSeconds } from './internal';
const ytdl = (url: string) => yd(url, { filter: 'audioonly', quality: 'highestaudio' });
const clientId = process.env.soundcloudClientId;
const downloadMethods = new Map<StreamType, StreamProvider>([
	['yt', ytdl],
	['custom', (url: string) => url],
	['radio', (url: string) => url],
	['sc', (url: string) => `${url}?client_id=${clientId}`]]);
class Playable {
	skip: PlayableCallbackVoid;
	halt: PlayableCallbackVoid;
	pause: PlayableCallbackBoolean;
	resume: PlayableCallbackBoolean;
	playingSeconds: PlayableCallbackNumber;
	private offsetSeconds: number = 0;
	private voiceConnection: Discord.VoiceConnection;
	private dispatcher: Discord.StreamDispatcher;
	private resolve: (forceSkip:boolean) => void;
	private reject: (reason:string) => void;
	constructor(readonly data: PlayableData) {
	}
	isDefinite() {
		const definiteTypes: StreamType[] = ['yt', 'custom', 'sc'];
		return !!this.data && definiteTypes.includes(this.data.type);
	}
	askRepeat() {
		return false;
	}
	private newDispatcherHere(stream: string | Readable, seekTime: number, volume: number) {
		this.dispatcher = this.voiceConnection.play(stream, { seek: seekTime, volume, type: 'opus' })
                    .on('finish', () => this.resolve(false)) //nem volt forced, hanem magától
                    .on('error', () => {
				console.log('Futott az error handler.');
				this.reject('error'); //hiba jelentése - kezelni kell
                    });
	}
	play(voiceConnection: Discord.VoiceConnection, vol: number): Promise<boolean> {
		return new Promise(async (resolve, reject) => {
			this.resolve = resolve;
			this.reject = reject;
			if (!this.data) {
				this.skip = () => this.resolve(true);
				this.halt = () => this.reject('leave');
				this.pause = () => false;
				this.resume = () => false;
				this.playingSeconds = () => undefined;
				return;
			}
			const stream = await Promise.resolve(downloadMethods.get(this.data.type)(this.data.url));
			const seekTime = starterSeconds(this.data);
			this.offsetSeconds = seekTime;
			this.voiceConnection = voiceConnection;
			this.newDispatcherHere(stream, seekTime, vol);
			this.skip = () => {
				this.resolve(true);
				this.dispatcher.end();
			};
			this.halt = () => {
				this.reject('leave');
				this.dispatcher.end();
			};
			this.pause = () => {
				return !this.dispatcher.paused && (this.dispatcher.pause(), true);
			};
			this.resume = () => {
				return this.dispatcher.paused && (this.dispatcher.resume(), true);
			};
			this.playingSeconds = () => {
				return this.offsetSeconds + Math.floor(this.dispatcher.streamTime / 1000);
			};
		});
	}
	async seek(seconds: number) {
		this.offsetSeconds = seconds;
		this.dispatcher.removeAllListeners();
		const vol = this.dispatcher.volume;
		const stream = await Promise.resolve(downloadMethods.get(this.data.type)(this.data.url));
		this.newDispatcherHere(stream, seconds, vol);
	}
}
class VoiceHandler {
	private timeoutId?: NodeJS.Timeout;
	constructor(private controlledPlayer: GuildPlayer) {
	}
	eventTriggered() {
		const voiceEmpty = !this.controlledPlayer.ownerGuild.voice.channel.members.some(member => !member.user.bot);
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
	private playingElement: MusicData;
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
		this.playingElement = null;
		if (musicToPlay.length > 0)
			this.bulkSchedule(musicToPlay);
		this.playLoop();
	}
	private async playLoop() {
		try {
			while (true) {
				this.currentPlay = new Playable(this.playingElement);
				do { //Itt kéne kiírás is
					if (this.playingElement)
						this.announcementChannel.send(`**Lejátszás alatt: ** ${getEmoji(this.playingElement.type)} \`${this.playingElement.name}\``).catch();
					var forcedOver = await this.currentPlay.play(this.ownerGuild.voice.connection, this.volume)
						.catch(e => {
							if (e == 'error') {
								this.announcementChannel.send('**Az aktuális stream hiba miatt megszakadt.**').catch();
								return true;
							}
							throw e;
						});
					var shouldRepeat = this.currentPlay.askRepeat();
				} while (!forcedOver && shouldRepeat);
				this.playingElement = null;
				this.currentPlay = null;
				if (this.queue.length != 0) {
					this.playingElement = this.queue.shift();
					this.fallbackPlayed = false;
				}
				else if (!this.fallbackPlayed)
					await this.fallbackMode();
			}
		}
		catch (e) {
			if (e != 'leave')
				console.error(e);
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
		if (!this.ownerGuild.voice.connection.dispatcher)
			throw 'Semmi nincs lejátszás alatt.';
		this.ownerGuild.voice.connection.dispatcher.setVolume(vol);
		this.volume = vol;
	}
	async seek(seconds: number) {
		await this.currentPlay.seek(seconds);
	}
	skip() {
		if (this.currentPlay)
			this.currentPlay.skip();
		else 
			this.playingElement = this.queue.shift();
	}
	repeat(maxTimes?: number) {
		if (!this.currentPlay.isDefinite())
			throw 'Végtelen streameket nem lehet loopoltatni.';
		if (!maxTimes)
			this.currentPlay.askRepeat = () => true;
		else
			this.currentPlay.askRepeat = repeatCounter(maxTimes);
	}
	autoSkip() {
		return this.fallbackPlayed || !this.currentPlay || !this.currentPlay.isDefinite() && this.queue.length == 0;
	}
	schedule(musicData: MusicData) {
		const autoSkip = this.autoSkip();
		this.queue.push(musicData);
		if (autoSkip)
			this.skip();
		else
			this.announcementChannel.send(`**Sorba került: ** ${getEmoji(musicData.type)} \`${musicData.name}\``);
	}
	bulkSchedule(musicDatas: MusicData[]) {
		const autoSkip = this.autoSkip();
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
		const fallbackMode = getFallbackMode(this.ownerGuild.id);
		switch (fallbackMode) {
			case 'radio':
				const fallbackMusic = getFallbackChannel(this.ownerGuild.id);
				if (!fallbackMusic)
					this.announcementChannel.send('**Nincs beállítva rádióadó, silence fallback.**');
				this.playingElement = fallbackMusic;
				this.fallbackPlayed = true;
				break;
			case 'leave':
				this.leave();
				break;
			case 'silence':
				this.fallbackPlayed = true;
				break;
		}
	}
	leave() {
		if (!this.ownerGuild?.voice?.connection)
			return;
		if (this.currentPlay)
			this.currentPlay.halt();
		this.ownerGuild.voice.connection.disconnect(); //KÉRDÉSES!
		this.handler.destroy();
		delete this.ownerGuild;
		if (!this.playingElement)
			throw 'destroyed';
	}
	pause() {
		if (!this.currentPlay.pause())
			throw 'Csak lejátszás alatt álló stream szüneteltethető.';
	}
	resume() {
		if (!this.currentPlay.resume())
			throw 'Ez a stream nem folytatható. (Nincs leállítva?)';
	}
	nowPlaying() {
		return this.playingElement && Object.defineProperty(this.playingElement, 'playingSeconds', {
			get: this.currentPlay.playingSeconds
		}) as PlayingData;
	}
}
function repeatCounter(nTimes: number) {
	return () => nTimes-- > 0;
}
