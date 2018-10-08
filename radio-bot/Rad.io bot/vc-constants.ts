const defaultConfig = {
	'prefix': '.',
	'fallback': 'radio'
};
const radios = {
'kossuth': {
	name: 'Kossuth R�di�',
	url: 'http://icast.connectmedia.hu/4736/mr1.mp3',
	cult: 'hun'
},
'radio1': {
	name: 'R�di� 1',
	url: 'http://stream2.radio1.hu/mid.mp3#.mp3',
	cult: 'hun'
},
'musicfm': {
	name: 'Music FM',
	url: 'http://79.172.241.238:8000/musicfm.mp3',
	cult: 'hun'
},
'petofi': {
	name: 'Pet�fi R�di� MR2',
	url: 'http://icast.connectmedia.hu/4738/mr2.mp3',
	cult: 'hun'
},
'slagerfm': {
	name: 'Sl�ger FM',
	url: 'http://92.61.114.159:7812/slagerfm128.mp3',
	cult: 'hun'
},
'classfm': {
	name: 'Class FM',
	url: 'http://icast.connectmedia.hu/4790/live.mp3',
	cult: 'hun'
},
'discoshit': {
	name: 'Disco*s hit',
	url: 'http://212.108.220.144:1039/#.mp3',
	cult: 'hun'
},
'bartok': {
	name: 'Bart�k R�di�',
	url: 'http://icast.connectmedia.hu/4741/mr3.mp3',
	cult: 'hun'
},
'laza': {
	name: 'Laza R�di�',
	url: 'http://stream.lazaradio.com/live.mp3',
	cult: 'hun'
},
'retrobp': {
	name: 'Retro R�di� Budapest',
	url: 'http://stream.retroradio.hu/mid.mp3',
	cult: 'hun'
},
'sanders': {
	name: 'Sanders R�di�',
	url: 'http://51.255.152.247:8000/live?format=mp3',
	cult: 'hun'
},
'danko': {
	name: 'Dank� R�di�',
	url: 'http://icast.connectmedia.hu/4748/mr7.mp3',
	cult: 'hun'
},
'radioface': {
	name: 'R�di� Face',
	url: 'http://91.227.139.87:8000/;stream.nsv#.mp3',
	cult: 'hun'
},
'risefm': {
	name: 'Rise FM',
	url: 'http://live.risefm.hu:8080/radio.m3u',
	cult: 'hun'
},
'radio1pecs': {
	name: 'R�di� 1 P�cs',
	url: 'http://stream.radio1pecs.hu:8200/pecs.mp3',
	cult: 'hun'
},
'klasszik': {
	name: 'Klasszik R�di�',
	url: 'http://online.klasszikradio.hu/stream/3/#.mp3',
	cult: 'hun'
},
'sunshine': {
	name: 'Sunshine R�di�',
	url: 'http://195.56.193.129:8100/;stream.nsv#.mp3',
	cult: 'hun'
},
'katolikus': {
	name: 'Katolikus R�di�',
	url: 'http://katolikusradio.hu:9000/live_low.mp3',
	cult: 'hun'
},
'bestfm': {
	name: 'BEST FM',
	url: 'http://stream.webthings.hu:8000/fm95-x-128.mp3',
	cult: 'hun'
},
'gold': {
	name: 'Gold R�di�',
	url: 'http://37.221.209.146:6200/live.mp3',
	cult: 'hun'
},
'maxiradio': {
	name: 'MaxiR�di�',
	url: 'http://37.221.209.189:9560',
	cult: 'hun'
},
'radio88': {
	name: 'R�di�88',
	url: 'http://stream.radio88.hu:8000/;stream.nsv#.mp3',
	cult: 'hun'
},
'partyradio': {
	name: 'All In PartyR�di�',
	url: 'http://adas3.allinparty.hu:8430/hq#.mp3',
	cult: 'hun'
},
'mercy': {
	name: 'Mercy Mulat�s R�di�',
	url: 'http://stream.mercyradio.eu/mulatos.mp3',
	cult: 'hun'
},
'tilos': {
	name: 'Tilos R�di�',
	url: 'http://stream.tilos.hu/tilos',
	cult: 'hun'
},
'rock': {
	name: 'R�di� Rock',
	url: 'http://cloudfront44.lexanetwork.com/cdn/cloudstream4151.mp3',
	cult: 'hun'
},
'aktiv': {
	name: 'Akt�v R�di� Szolnok',
	url: 'http://aktivradio.hu:8000/aktiv.mp3',
	cult: 'hun'
},
'amadeus': {
  name: 'Amadeus R�di�',
  url: 'http://87.229.73.156:8004/stream192',
  cult: 'hun'
},
'halas': {
	name: 'Halas R�di� Kiskunhalas',
	url: 'http://92.61.114.195:8110/stream',
	cult: 'hun'
},
'buddhafm': {
  name: 'Buddha FM',
  url: 'http://server.tkbf.hu:4000/buddhafm',
  cult: 'hun'
},
'therapmixx': {
	name: 'The Rap MIXX (Classic HipHop)',
	url: 'http://ais-sa2.cdnstream1.com/1988_128.mp3',
	cult: 'eng'
},
'wefunk': {
	name: 'WEFUNK Radio (Classic HipHop)',
	url: 'http://s-00.wefunkradio.com:81/wefunk64.mp3/',
	cult: 'eng'
},
'181fm': {
	name: '181.FM Old School HipHop/RnB (OG HipHop)',
	url: 'http://listen.181fm.com/181-oldschool_64k.aac?noPreRoll=true',
	cult: 'eng'
},
'romanianrap': {
	name: 'Romanian Rap Station (Rap)',
	url: 'http://89.39.189.2:8400/;stream/1',
	cult: 'eng'
},
'boxuk': {
	name: 'Box UK Radio (80\'s music)',
	url: 'http://uk7.internet-radio.com:8226/;stream',
	cult: 'eng'
},
'1fm': {
	name: '1FM - 60s/70s/80s/90s/00s! (Easy)',
	url: 'http://uk2.internet-radio.com:8358/;stream',
	cult: 'eng'
},
'realdance': {
	name: 'Real Dance Radio (Easy)',
	url: 'http://uk6.internet-radio.com:8192/;stream',
	cult: 'eng'
},
'virginradio': {
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
	url: 'http://192.240.102.133:12430/;stream/1',
	cult: 'eng'
},
'rockfm': {
	name: 'Rock FM (Rock)',
	url: 'http://relay.181.fm:8008',
	cult: 'eng'
},
'rainbow': {
	name: 'Rainbow Sound UK (Oldies)',
	url: 'http://uk5.internet-radio.com:8163/;stream',
	cult: 'eng'
},
'jewishhits': {
	name: 'Jewishhits.com',
	url: 'http://198.178.123.8:7246/;stream/1',
	cult: 'eng'
},
'kissfm': {
	name: 'KISS FM 9.61 (Pop)',
	url: 'http://192.240.102.131:9864/;stream/1',
	cult: 'eng'
},
'abc50s': {
	name: 'ABC 50s (50s)',
	url: 'http://144.217.253.136:8582/;stream/1',
	cult: 'eng'
},
'iluminafm': {
	name: 'Ilumina fm (Christian)',
	url: 'http://174.142.111.104:9996/;stream/1',
	cult: 'eng'
},
'sunshinelive': {
	name: 'Sunshine Live (Latin dance)',
	url: 'http://37.59.37.139:13494/;stream/1',
	cult: 'eng'
},
'hititalia': {
	name: 'Hit Radio Network Italia (Pop)',
	url: 'http://149.202.196.92:8246/;stream/1',
	cult: 'eng'
},
'magicflorida': {
	name: 'Magic 70s Florida (70s pop)',
	url: 'http://airspectrum.cdnstream1.com:8012/1605_192',
	cult: 'eng'
},
'radio886': {
  name: 'Radio 88.6 Wien',
  url: 'http://xapp2450489345c1000321-f-l.i.farm.core.cdn.streamfarm.net/radio_886/128k.mp3',
  cult: 'eng'
},
'antrock': {
  name: 'R�dio Ant�na Rock',
  url: 'http://stream.antenarock.sk/antena-hi.mp3',
  cult: 'eng'
}
};

const youtubeEmoji = '447036877745160204';
module.exports = {
defaultConfig,radios,youtubeEmoji
};