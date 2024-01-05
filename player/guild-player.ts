import * as Discord from 'discord.js';
import { AudioPlayer, AudioPlayerPlayingState, AudioPlayerStatus, AudioResource, createAudioPlayer, createAudioResource, getVoiceConnection, VoiceConnectionReadyState } from '@discordjs/voice';
import { Readable } from 'stream';
import * as play from 'play-dl'; //Nem illik közvetlenül hívni
import { getEmoji, MusicData, StreamType, shuffle, getFallbackMode,
	getFallbackChannel, PlayingData, AudioResourceProvider, StateError } from '../internal.js';
import { Collection, GuildMember, VoiceChannel } from 'discord.js';
import got from 'got';
import EventEmitter from 'node:events';
const fetchHttpStream = async (url: string) => got.stream(url, { timeout: { response: 5000 } }) as Readable;
//const clientId = process.env.soundcloudClientId;
const resourceProducers = new Map<StreamType, AudioResourceProvider>([
	['yt', url => play.stream(url).then(stream => createAudioResource(stream.stream, {inputType: stream.type, inlineVolume:true})) ],
	['custom', url => fetchHttpStream(url).then(stream => createAudioResource(stream, {inlineVolume:true}))],
	['radio', url => fetchHttpStream(url).then(stream => createAudioResource(stream, {inlineVolume:true}))]/*,
	['sc', (url: string) => `${url}?client_id=${clientId}`]*/]);
function isDefinite(data:MusicData) {
	const definiteTypes: StreamType[] = ['yt', 'custom'/*, 'sc'*/];
	return data && definiteTypes.includes(data.type);
}
type ReadyHandler = (a: AudioResource) => void;
class Playable {
	private resource: AudioResource;
	private readyEmitter: EventEmitter = new EventEmitter();
	constructor(private streamType: StreamType, private url: string, private volume: number) {}
	async loadResource() {
		this.resource = await resourceProducers.get(this.streamType)(this.url);
		this.resource.volume.setVolume(this.volume);
		this.readyEmitter.emit('ready', this.resource);
	}
	onReady(handler: ReadyHandler) {
		this.readyEmitter.on('ready', handler);
	}
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
		const botChannel = client.channels.resolve(getVoiceConnection(this.controlledPlayer.ownerGuild.id).joinConfig.channelId) as VoiceChannel;
		const voiceEmpty = !(botChannel.members as Collection<string, GuildMember>)?.some(member => !member.user.bot);
		if (voiceEmpty && !this.timeoutId)
			this.timeoutId = global.setTimeout(() => {try{this.controlledPlayer.leave()} catch(e){console.log(e);}}, 60000 * 5);
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
export class GuildPlayer extends EventEmitter {
	private engine: AudioPlayer;
	private currentPlay: Playable;
	private _playingElement: MusicData;
	get playingElement(): MusicData {
		return this._playingElement;
	}
	private async setPlayingElement(value: MusicData) {
		this._playingElement = value;
		if (!value)
			return;
		this.announce(`**Lejátszás alatt: ** ${getEmoji(this.playingElement.type)} \`${this.playingElement.name}\``);
		this.currentPlay = new Playable(this.playingElement.type, this.playingElement.url, this.volume);
		this.currentPlay.onReady(resource => this.engine.play(resource));
		await this.currentPlay.loadResource();
	}
	private async resetPlayingElement() {
		this.announce(`**Ismétlődik: ** ${getEmoji(this.playingElement.type)} \`${this.playingElement.name}\``);
		await this.currentPlay.loadResource();
	}
	private announce(message: string) {
		this.emit('announcement', message);
	}
	queue: MusicData[];
	fallbackPlayed: boolean;
	public handler: VoiceHandler;
	private volume: number;
	private oldVolume?: number;
	private destroyed: boolean = false;
	constructor(public ownerGuild: Discord.Guild) {
		super();
		this.fallbackPlayed = false;
		this.queue = [];
		this.handler = new VoiceHandler(this);
		this.volume = 0.5;
		this.setPlayingElement(null);
		this.engine = createAudioPlayer()
			.on('error', _e => {
			//TODO
			})
			.on(AudioPlayerStatus.Idle, async () => {
				const shouldRepeat = this.currentPlay.askRepeat();
				if (!shouldRepeat)
					return await this.startNext();
				await this.resetPlayingElement();
			});
		const connection = getVoiceConnection(this.ownerGuild.id);
		connection.subscribe(this.engine);
	}
	mute() {
		if (this.volume == 0)
			throw new StateError('Már le van némítva a bot.');
		this.oldVolume = this.volume;
		this.setVolume(0);
	}
	unmute() {
		if (this.volume != 0)
			throw new StateError('Nincs lenémítva a bot.');
		this.setVolume(this.oldVolume);
	}
	setVolume(vol: number) {
		const connectionState = getVoiceConnection(this.ownerGuild.id).state as VoiceConnectionReadyState;
		const playerState = connectionState.subscription.player.state as AudioPlayerPlayingState;
		if (!playerState)
			throw new StateError('Semmi nincs lejátszás alatt.');
		playerState.resource.volume.setVolume(vol);
		this.volume = vol;
	}
	async seek(_seconds: number) {
		//TODO
	}
	async skip(amount: number = 1) {
		this.queue.splice(0,(amount<=this.queue.length)?amount-1:this.queue.length);
		await this.startNext();
	}
	private async startNext() {
		while (true) {
			try {
				await this.setPlayingElement(this.queue.shift() ?? null);
				break;
			}
			catch (e) {
				console.log(e);
				this.announce('**Az indítás során hiba lépett fel.**');
			}
		}
		if (!this.fallbackPlayed){
			if (!this.playingElement) {
				this.fallbackPlayed = true
				return await this.fallbackMode();
			}
		}
		else if (this.playingElement)
			this.fallbackPlayed = false;
	}
	repeat(maxTimes?: number) {
		if (!isDefinite(this.playingElement))
			throw new StateError('Végtelen streameket nem lehet loopoltatni.');
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
			this.startNext();
		else
			this.announce(`**Sorba került: ** ${getEmoji(musicData.type)} \`${musicData.name}\``);
	}
	bulkSchedule(musicDatas: MusicData[]) {
		const autoSkip = this.autoSkip();
		for (const musicData of musicDatas)
			this.queue.push(musicData);
		this.announce(`**${musicDatas.length} elem került a sorba.**`);
		if (autoSkip)
			this.startNext()
	}
	shuffle() {
		if (this.queue.length >= 2)
			shuffle(this.queue);
		else
			throw new StateError('Nincs mit megkeverni.');
	}
	clear() {
		if (this.queue.length == 0)
			throw new StateError('Már üres volt a sor.');
		this.queue = [];
	}
	topLast() {
		if (this.queue.length < 2)
			throw new StateError('Nincs mit a sor elejére rakni.');
		const elementToMove = this.queue.pop();
		this.queue.unshift(elementToMove);
	}
	remove(queuePosition: number) {
		if (this.queue.length == 0)
			throw new StateError('Már üres volt a sor.');
		if (queuePosition <= 0)
			throw new StateError('A pozíciónak pozitív számnak kell lennie.');
		if (this.queue.length < queuePosition)
			throw new StateError('Nincs ennyi elem a sorban.');
		this.queue.splice(queuePosition - 1, 1);
	}
	private async fallbackMode() {
		this.announce('**Fallback mód.**');
		const fallbackMode = getFallbackMode(this.ownerGuild.id);
		switch (fallbackMode) {
			case 'radio':
				const fallbackMusic = getFallbackChannel(this.ownerGuild.id);
				if (!fallbackMusic)
					this.announce('**Nincs beállítva rádióadó, silence fallback.**');
				await this.setPlayingElement(fallbackMusic);
				break;
			case 'leave':
				this.leave();
				break;
			case 'silence':
				break;
		}
	}
	leave() {
		if (this.destroyed)
			return;
		this.engine.removeAllListeners(AudioPlayerStatus.Idle);
		this.engine.stop();
		getVoiceConnection(this.ownerGuild.id).destroy(); //KÉRDÉSES!
		this.handler.destroy();
		delete this.ownerGuild;
		this.destroyed = true;
	}
	pause() {
		if (this.engine.state.status != AudioPlayerStatus.Playing)
			throw new StateError('Csak lejátszás alatt álló stream szüneteltethető.');
		this.engine.pause();
	}
	resume() {
		if (this.engine.state.status != AudioPlayerStatus.Paused || !this.engine.unpause())
			throw new StateError('Ez a stream nem folytatható. (Nincs leállítva?)');
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
