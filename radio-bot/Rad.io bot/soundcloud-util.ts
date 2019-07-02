import { SoundcloudResult } from "./internal";
import * as request from 'request-promise-native';
const clientId = process.env.soundcloudClientId;
export async function soundcloudSearch(keywords: string, amount: number): Promise<SoundcloudResult[]> {
	const response: any[] = await request(`https://api.soundcloud.com/tracks?client_id=${clientId}&q=${encodeURIComponent(keywords)}&limit=${amount}`);
	return response.map(elem => Object.assign({}, {
		url: elem.stream_url as string,
		title: elem.title as string,
		duration: elem.duration/1000
	}));
}