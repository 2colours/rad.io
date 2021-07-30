import { FallbackType, StreamType, Creator, RadioConstantData } from './internal.js';
import { WebhookClient, EmojiIdentifierResolvable } from 'discord.js';
export const defaultConfig = {
	prefix: '.',
	fallback: 'radio' as FallbackType
};
const radios = {
	'kossuth': {
		name: 'Kossuth Rádió',
		url: 'http://icast.connectmedia.hu/4736/mr1.mp3',
		cult: 'hun'
	},
	'radio1': {
		name: 'Rádió 1',
		url: 'http://stream9.radio1.hu/mid.mp3',
		cult: 'hun'
	},
	'petofi': {
		name: 'Petőfi Rádió MR2',
		url: 'http://icast.connectmedia.hu/4738/mr2.mp3',
		cult: 'hun'
	},
	'slagerfm': {
		name: 'Sláger FM',
		url: 'http://92.61.114.159:7812/slagerfm128.mp3',
		cult: 'hun'
	},
	'csango': {
		name: 'Csángó Rádió',
		url: 'http://roservers.ro:8018/stream',
		cult: 'hun'
	},
	'bocskai': {
		cult: 'hun',
		url: 'http://streaming.jcu.edu:8000/wjcu-aac-hi',
		name: 'Bocskai Rádió (Cleveland)'
	},
	'erdely': {
		cult: 'hun',
		url: 'https://efm.radioca.st/stream',
		name: 'Erdély FM'
	},
	'prima': {
		cult: 'hun',
		url: 'https://securestreams5.autopo.st:1992/player',
		name: 'Prima Rádió (Székelyudvarhely)'
	},
	'funfm': {
		cult: 'hun',
		url: 'http://online.funfm.ro:8000/funfm.mp3',
		name: 'Fun FM Rádió (Csíkszereda)'
	},
	'plusfm': {
		cult: 'hun',
		url: 'http://hosting2.42netmedia.com:8961/stream',
		name: 'Plus FM (Nagyvárad)'
	},
	'gaga': {
		cult: 'hun',
		url: 'http://rc.radiogaga.ro:8000/live',
		name: 'Rádió Gaga (Marosvásárhely)'
	},
	'kolozsvar': {
		cult: 'hun',
		url: 'http://89.238.227.6:8386/;stream/1',
		name: 'Kolozsvári Rádió'
	},
	'siculus': {
		cult: 'hun',
		url: 'http://46.214.17.202:8000/radioac3?1614038437339',
		name: 'Siculus Rádió (Kézdivásárhely)'
	},
	'szabadkai': {
		cult: 'hun',
		url: 'http://79.172.194.189:4110/live.mp3',
		name: 'Szabadkai Magyar Rádió (SZMR)'
	},
	'bartok': {
		name: 'Bartók Rádió',
		url: 'http://icast.connectmedia.hu/4741/mr3.mp3',
		cult: 'hun'
	},
	'laza': {
		name: 'Laza Rádió',
		url: 'http://stream.lazaradio.com/live.mp3',
		cult: 'hun'
	},
	'laza2': {
		name: 'Laza Rádió (mulatós verzió)',
		url: 'http://stream.lazaradio.com/mulatos.mp3',
		cult: 'hun'
	},
	'retrobp': {
		name: 'Retro Rádió Budapest',
		url: 'http://stream.retroradio.hu/mid.mp3',
		cult: 'hun'
	},
	'danko': {
		name: 'Dankó Rádió',
		url: 'http://icast.connectmedia.hu/4748/mr7.mp3',
		cult: 'hun'
	},
	'radioface': {
		name: 'Rádió Face',
		url: 'http://ca5.rcast.net:8034/stream',
		cult: 'hun'
	},
	'risefm': {
		name: 'Rise FM',
		url: 'http://risefm1.stereoplayer.hu:8080/risefm_hq',
		cult: 'hun'
	},
	'radio1pecs': {
		name: 'Rádió 1 Pécs',
		url: 'http://stream.radio1pecs.hu:8200/pecs.mp3',
		cult: 'hun'
	},
	'pecsfm': {
		name: 'Pécs FM',
		url: 'http://pecs.fm:8000/1017.mp3',
		cult: 'hun'
	},
	'klasszik': {
		name: 'Klasszik Rádió',
		url: 'http://s04.diazol.hu:9600/live.mp3',
		cult: 'hun'
	},
	'sunshine': {
		name: 'Sunshine Rádió',
		url: 'http://195.56.193.129:8100/;stream.nsv#.mp3',
		cult: 'hun'
	},
	'katolikus': {
		name: 'Katolikus Rádió',
		url: 'http://katolikusradio.hu:9000/live_low.mp3',
		cult: 'hun'
	},
	'maria': {
		name: 'Mária Rádió',
		url: 'https://stream.mariaradio.hu:8000/mr',
		cult: 'hun'
	},
	'bestfm': {
		name: 'BEST FM',
		url: 'http://stream.webthings.hu:8000/fm95-x-128.mp3',
		cult: 'hun'
	},
	'maxiradio': {
		name: 'MaxiRádió',
		url: 'http://46.107.212.101:9240/live',
		cult: 'hun'
	},
	'radio88': {
		name: 'Rádió88',
		url: 'http://stream.radio88.hu:8000/;stream.nsv#.mp3',
		cult: 'hun'
	},
	'mercy': {
		name: 'Mercy Mulatós Rádió',
		url: 'http://stream.mercyradio.eu/mercyradio.mp3',
		cult: 'hun'
	},
	'folkradio': {
		name: 'Folkrádió',
		url: 'https://stream.folkradio.hu/folkradio.mp3',
		cult: 'hun'
	},
	'tilos': {
		name: 'Tilos Rádió',
		url: 'http://stream.tilos.hu/tilos',
		cult: 'hun'
	},
	'jazzy': {
		name: 'Jazzy Rádió',
		url: 'https://s04.diazol.hu:9502/live.mp3',
		cult: 'hun'
	},
	'rock': {
		name: 'Rocker Rádió',
		url: 'https://stream.diazol.hu:35202/live',
		cult: 'hun'
	},
	'mez': {
		name: 'Méz Rádió Veszprém',
		url: 'http://stream.mezradio.hu:7812/mezfm128.mp3',
		cult: 'hun'
	},
	'aktiv': {
		name: 'Aktív Rádió Szolnok',
		url: 'http://aktivradio.hu:8000/aktiv.mp3',
		cult: 'hun'
	},
	'klub': {
		name: 'Klubrádió',
		url: 'http://hu-stream02.klubradio.hu:8080/bpstream',
		cult: 'hun'
	},
	'radiom': {
		name: 'Rádió M',
		url: 'http://hosting2.42netmedia.com:10060/;stream.mp3',
		cult: 'hun'
	},
	'halas': {
		name: 'Halas Rádió Kiskunhalas',
		url: 'https://eapps-cs.herokuapp.com/92.61.114.191:8110/stream',
		cult: 'hun'
	},
	'buddhafm': {
		name: 'Buddha FM',
		url: 'http://libretime.buddhafm.hu:4000/buddhafm',
		cult: 'hun'
	},
	'city': {
		name: 'City Rádió',
		url: 'http://live.city-radio.ro:8800/;stream',
		cult: 'hun'
	},
	'triofm': {
		name: 'Trio FM',
		url: 'http://92.119.123.141:9090/stream',
		cult: 'hun'
	},
	'radioop': {
		name: 'Radio OP',
		url: 'https://server4.streamserver24.com:26250/stream',
		cult: 'hun'
	},
	'sepsi': {
		name: 'Sepsi Rádió',
		url: 'https://stream.sepsiradio.ro:8001/SepsiRadio',
		cult: 'hun'
	},
	'therapmixx': {
		name: 'The Rap MIXX (Classic HipHop)',
		url: 'http://ais-sa2.cdnstream1.com/1988_128.mp3',
		cult: 'eng'
	},
	'wefunk': {
		name: 'WEFUNK Radio (Classic HipHop)',
		url: 'https://s-00.wefunkradio.com:8443/wefunk64.mp3',
		cult: 'eng'
	},
	'181fm': {
		name: '181.FM Old School HipHop/RnB (OG HipHop)',
		url: 'http://listen.181fm.com/181-oldschool_64k.aac?noPreRoll=true',
		cult: 'eng'
	},
	'virginro': {
		name: 'Virgin Radio Romania (Pop)',
		url: 'http://astreaming.virginradio.ro:8000/virgin_aacp_64k',
		cult: 'eng'
	},
	'boxuk': {
		name: 'Box UK Radio (80\'s music)',
		url: 'https://boxstream.danceradiouk.com/stream',
		cult: 'eng'
	},
	'virginom': {
		name: 'VIRGIN RADIO OMAN (Pop)',
		url: 'http://uk5.internet-radio.com:8115/;stream',
		cult: 'eng'
	},
	'atomradio': {
		name: 'Atom Radio (Pop oldies)',
		url: 'http://uk6.internet-radio.com:8520/;stream',
		cult: 'eng'
	},
	'yammatfm': {
		name: 'Yammat FM (Pop Rock)',
		url: 'https://streaming.radio.co/s5ad4b474a/listen',
		cult: 'eng'
	},
	'rockfm': {
		name: 'Rock FM (Rock)',
		url: 'http://relay.181.fm:8008',
		cult: 'eng'
	},
	'rockro': {
		name: 'Rock FM Romania',
		url: 'https://live.rockfm.ro:8443/rockfm.aacp',
		cult: 'eng'
	},
	'rainbow': {
		name: 'Rainbow Sound UK (Oldies)',
		url: 'https://stream.radio.co/s82994a596/listen',
		cult: 'eng'
	},
	'kissfm': {
		name: 'Kiss FM Romania',
		url: 'https://live.kissfm.ro:8443/kissfm.aacp',
		cult: 'eng'
	},
	'hitradio': {
		name: 'Hitradio center',
		url: 'http://stream3.radiocenter.si:8000/center',
		cult: 'eng'
	},
	'abc50s': {
		name: 'ABC 50s (50s)',
		url: 'https://igor.torontocast.com:1875/stream',
		cult: 'eng'
	},
	'iluminafm': {
		name: 'Ilumina fm (Christian)',
		url: 'https://ss.redradios.net:8026/stream',
		cult: 'eng'
	},
	'sunshinelive': {
		name: 'Sunshine Live 90er',
		url: 'https://sunshinelive.hoerradar.de/sunshinelive-90er-mp3-hq',
		cult: 'eng'
	},
	'magicflorida': {
		name: 'Magic 70s Florida (70s pop)',
		url: 'http://airspectrum.cdnstream1.com:8012/1605_192',
		cult: 'eng'
	},
	'radio886': {
		name: 'Radio 88.6 Wien',
		url: 'https://radio886.fluidstream.eu/886_live.mp3',
		cult: 'eng'
	},
	'antrock': {
		name: 'Rádio Anténa Rock',
		url: 'http://stream.antenarock.sk/antena-hi.mp3',
		cult: 'eng'
	},
	'actualitati': {
		name: 'Radio România Actualități',
		url: 'http://89.238.227.6:8008/',
		cult: 'eng'
	},
	'digifm': {
		name: 'Digi FM',
		url: 'https://edge76.rcs-rds.ro/digifm/digifm.mp3',
		cult: 'eng'
	},
	'popular': {
		name: 'Radio Popular',
		url: 'http://live5.radiopopular.ro:8888/;stream/1',
		cult: 'eng'
	},
	'hitserbia': {
		name: 'Hit Music FM',
		url: 'http://streaming11.tdiradio.com:8000/hit',
		cult: 'eng'
	},
	'asfm': {
		name: 'AS FM',
		url: 'https://mastermedia.shoutca.st/proxy/radioasfm64?mp=/stream',
		cult: 'eng'
	},
	'r101': {
		name: 'R101 radio',
		url: 'https://icecast.unitedradio.it/r101_mp3',
		cult: 'eng'
	},
	'radiof1': {
		name: 'Rádio frekvence jedna',
		url: 'http://ice.actve.net/fm-frekvence1-128',
		cult: 'eng'
	},
	'fajn': {
		name: 'Fajn radio',
		url: 'https://20423.live.streamtheworld.com/FAJN_RADIO_128.mp3',
		cult: 'eng'
	},
	'hot108': {
		name: 'Hot 108 JAMZ (Hiphop)',
		url: 'http://sc.hot108.com:4000/',
		cult: 'eng'
	},
	'fimbul': {
		name: 'Fimbul Radio',
		url: 'http://s4.radio.co/sdda8682fb/listen',
		cult: 'eng'
	},
	"nano": {
		name: 'Radio Nano',
		url: 'http://s2.yesstreaming.net:7157/stream',
		cult: 'eng'
	}
};
const r: Map<string, RadioConstantData> = new Map(Object.entries(radios));
export { r as radios };
export const defaultRadio = 'kossuth';
export const channels = [...r.keys()];
export const embedC = 0xfcf5d2;
export const webhookC = 0x36393f;
const youtubeEmoji = '<:youtube:506897247145951233>';
const soundcloudEmoji = '<:sc:595619676827025408>';
export function getEmoji(type: StreamType): EmojiIdentifierResolvable {
	const emojis: Map<StreamType, EmojiIdentifierResolvable> = new Map<StreamType, EmojiIdentifierResolvable>([
		['yt', youtubeEmoji],
		['radio', ':radio:'],
		['custom', ':radio:'],
		['sc', soundcloudEmoji]
	]);
	return emojis.get(type);
}
export const tickEmoji = '☑';
export const maxPlaylistSize = 100;
export const creators = [new Creator('297037173541175296', 'Nemokosch#9980', 'https://www.buymeacoffee.com/2colours'), new Creator('419447790675165195', 'garton#8800')];
export const dedicatedClientId = '430326522146979861';
export const guildsChanId = '470522240551616523';
export const usersChanId = '470522309132943360';
export const devChanId = '470574072565202944';
export const devServerInvite = 'https://discord.gg/C83h4Sk';
export const partnerHook = new WebhookClient('663426173552033802', process.env.partnerWebhookToken);
export const avatarURL = 'https://i.imgur.com/FXgwVII.png';
