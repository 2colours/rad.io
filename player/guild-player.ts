import * as Discord from 'discord.js';
import { AudioPlayer, AudioPlayerPlayingState, AudioPlayerStatus, AudioResource, createAudioPlayer, createAudioResource, getVoiceConnection, VoiceConnectionReadyState } from '@discordjs/voice';
import * as play from 'play-dl'; //Nem illik közvetlenül hívni
import { getEmoji, MusicData, StreamType, StreamProvider, shuffle, getFallbackMode,
	getFallbackChannel, PlayingData } from '../internal.js';
import { Collection, GuildMember, VoiceChannel } from 'discord.js';
const ytdl = async (url: string) => (await play.stream(url)).stream;
const clientId = process.env.soundcloudClientId;
const downloadMethods = new Map<StreamType, StreamProvider>([
	['yt', ytdl],
	['custom', (url: string) => url],
	['radio', (url: string) => url],
	['sc', (url: string) => `${url}?client_id=${clientId}`]]);
function isDefinite(data:MusicData) {
	const definiteTypes: StreamType[] = ['yt', 'custom', 'sc'];
	return data && definiteTypes.includes(data.type);
}
class Playable {
	constructor(readonly resource: AudioResource) {}
	askRepeat() {
		return false;
	}
	playingSeconds() {
		return Math.round(this.resource.playbackDuration / 1000);
	}
}
class VoiceHandler {
	private timeoutId?: NodeJS.Timeout;
	constructor(private controlledPlayer: GuildPlayer) {
	}
	eventTriggered() {
		const client = this.controlledPlayer.ownerGuild.client;
		const botChannel = this.controlledPlayer.ownerGuild.channels.cache.find(channel => (channel as VoiceChannel)?.members.map(member => member.user).includes(client.user));
		const voiceEmpty = ! (botChannel.members as Collection<string, GuildMember>)?.some(member => !member.user.bot);
		if (voiceEmpty && !this.timeoutId)
			this.timeoutId = global.setTimeout(() => {try{this.controlledPlayer.leave()} catch(ex){console.log(ex);}}, 60000 * 5);
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
	private engine: AudioPlayer;
	private currentPlay: Playable;
	private _playingElement: MusicData;
	get playingElement(): MusicData {
		return this._playingElement;
	}
	set playingElement(value: MusicData) {
		this._playingElement = value;
		if (!value)
			return;
		this.announcementChannel.send(`**Lejátszás alatt: ** ${getEmoji(this.playingElement.type)} \`${this.playingElement.name}\``).catch();
		Promise.resolve(downloadMethods.get(this.playingElement.type)(this.playingElement.url))
			.then(stream => {
				this.currentPlay = new Playable(createAudioResource(stream, {inlineVolume:true}));
				this.engine.play(this.currentPlay.resource);
			});
		
	}
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
		this.engine = createAudioPlayer()
			.on('error', _e => {
			//TODO
			})
			.on(AudioPlayerStatus.Idle, async () => {
				const shouldRepeat = this.currentPlay.askRepeat();
				if (!shouldRepeat)
					return await this.startNext();
				this.playingElement = this.playingElement;
			});
		getVoiceConnection(this.ownerGuild.id).subscribe(this.engine);
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
		const connectionState = getVoiceConnection(this.ownerGuild.id).state as VoiceConnectionReadyState;
		const playerState = connectionState.subscription.player.state as AudioPlayerPlayingState;
		if (!playerState)
			throw 'Semmi nincs lejátszás alatt.';
		playerState.resource.volume.setVolume(vol);
		this.volume = vol;
	}
	async seek(_seconds: number) {
		//TODO
	}
	skip(amount: number = 1) {
		this.queue.splice(0,(amount<=this.queue.length)?amount-1:this.queue.length);
		this.startNext();
	}
	private async startNext() {
		this.playingElement = this.queue.shift() ?? null;
		if (!this.playingElement) 
			return await this.fallbackMode();
	}
	repeat(maxTimes?: number) {
		if (!isDefinite(this.playingElement))
			throw 'Végtelen streameket nem lehet loopoltatni.';
		if (!maxTimes)
			this.currentPlay.askRepeat = () => true;
		else
			this.currentPlay.askRepeat = repeatCounter(maxTimes);
	}
	autoSkip() {
		return this.fallbackPlayed || !this.currentPlay || !isDefinite(this.playingElement) && this.queue.length == 0;
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
		this.engine.removeAllListeners();
		this.engine.stop();
		if (!getVoiceConnection(this.ownerGuild.id))
			return;
		getVoiceConnection(this.ownerGuild.id).destroy(); //KÉRDÉSES!
		this.handler.destroy();
		delete this.ownerGuild;
	}
	pause() {
		if (this.engine.state.status != AudioPlayerStatus.Playing)
			throw 'Csak lejátszás alatt álló stream szüneteltethető.';
		this.engine.pause();
	}
	resume() {
		if (this.engine.state.status != AudioPlayerStatus.Paused || !this.engine.unpause())
			throw 'Ez a stream nem folytatható. (Nincs leállítva?)';
	}
	nowPlaying(): PlayingData {
		const playingSecondsMixin = Object.defineProperty({}, 'playingSeconds', {
			get: () => this.currentPlay.playingSeconds()
		});
		return this.playingElement && Object.assign(playingSecondsMixin, this.playingElement) as PlayingData;
	}
}
function repeatCounter(nTimes: number) {
	return () => nTimes-- > 0;
}
