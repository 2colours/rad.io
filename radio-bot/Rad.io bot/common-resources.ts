import * as Common from './common-types';
const youtubeEmoji = '<:youtube:506897247145951233>';
export function getEmoji(type:Common.StreamType):Common.EmojiLike {
	const emojis:Map<Common.StreamType,Common.EmojiLike> = new Map<Common.StreamType,Common.EmojiLike>([
		['yt', youtubeEmoji],
		['radio', ':radio:'],
		['custom', ':radio:']
	]);
	return emojis.get(type);
}