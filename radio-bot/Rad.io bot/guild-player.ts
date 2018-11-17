import * as Discord from 'discord.js';
import * as Common from './common-types';
import * as yd from 'ytdl-core'; //Nem illik közvetlenül hívni
import {getEmoji} from './common-resources';
import {defaultConfig} from './vc-constants';
const ytdl = (url:string) => yd(url, { filter: 'audioonly', quality: 'highestaudio' });
const downloadMethods = new Map<Common.StreamType,any>([
	['yt', ytdl],
	['custom',(url:string) => url],
	['radio',(url:string) => url]]);
class Playable {
	data?: any;
	skip: any;
	halt: any;
	constructor(musicData?: any) {
		this.data = musicData;
	}
	isDefinite() {
		return this.data && ['yt', 'custom'].includes(this.data.type);
	}
	askRepeat() {
		return false;
	}
	play(voiceConnection: Discord.VoiceConnection, vol: number) {
		return new Promise((resolve, reject) => {
			if (!this.data) {
				this.skip = () => resolve(true);
				this.halt = () => reject('leave');
				return;
			}
			const stream = downloadMethods.get(this.data.type)(this.data.url);
			let dispatcher = voiceConnection.playStream(stream, { seek: 0, volume: vol });
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
		let voiceEmpty = !this.controlledPlayer.ownerGuild.voiceConnection.channel.members.some(member => !member.user.bot);
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
	announcementChannel: Discord.TextChannel;
	private queue: Playable[];
	fallbackPlayed: boolean;
	public handler: VoiceHandler;
	private volume: number;
	private oldVolume?: number;
	constructor(private config:Common.Config,public ownerGuild: Discord.Guild, textChannel: Discord.TextChannel, musicToPlay?: Common.MusicData) {
		this.announcementChannel = textChannel;
		this.nowPlaying = new Playable(musicToPlay);
		this.fallbackPlayed = false;
		this.queue = [];
		this.handler = new VoiceHandler(this);
		this.playLoop();
		this.volume = 0.5;
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
					this.fallbackMode();
			}
		}
		catch (ex) {
			//ezt direkt várjuk is, de leginkább csak akkor, ha leave-elés miatt jön
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
		this.nowPlaying.skip();
	}
	repeat(maxTimes?: number) {
		if (!this.nowPlaying.isDefinite())
			throw 'Végtelen streameket nem lehet loopoltatni.';
		if (!maxTimes)
			this.nowPlaying.askRepeat = () => true;
		else
			this.nowPlaying.askRepeat = repeatCounter(maxTimes);
	}
	schedule(musicData:Common.MusicData) {
		this.queue.push(new Playable(musicData));
		if (!this.nowPlaying.isDefinite() && this.queue.length == 1)
			this.skip();
		else
			this.announcementChannel.send(`**Sorba került: ** ${getEmoji(musicData.type)} \`${musicData.name}\``);
	}
	shuffle() {
		if (this.queue.length >= 2)
			shuffle(this.queue);
		else
			throw 'Nincs mit megkeverni.';
	}
	fallbackMode() {
		this.announcementChannel.send('**Fallback mód.**');
		let currentFallback = this.config.fallbackModes.get(this.ownerGuild.id) || defaultConfig.fallback;
		switch (currentFallback) {
			case 'radio':
				if (!this.config.fallbackChannels.get(this.ownerGuild.id))
					this.announcementChannel.send('**Nincs beállítva rádióadó, silence fallback.**');
				this.nowPlaying = new Playable(this.config.fallbackChannels.get(this.ownerGuild.id));
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
	getQueueData():Common.MusicData[] {
		return this.queue.map(playable => playable.data);
	}
	getNowPlayingData() {
		return this.nowPlaying.data;
	}
}
function repeatCounter(nTimes: number) {
	return () => nTimes-- > 0;
}
function shuffle(array: any[]) {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i+1));
		[array[i], array[j]] = [array[j], array[i]];
	}
}