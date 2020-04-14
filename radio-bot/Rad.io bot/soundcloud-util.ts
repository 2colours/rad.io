import { SoundcloudResult } from "./internal";
import axios from 'axios';
const clientId = process.env.soundcloudClientId;
export async function soundcloudSearch(keywords: string, amount: number): Promise<SoundcloudResult[]> {
	const rawResponse = await axios.get(`https://api.soundcloud.com/tracks?client_id=${clientId}&q=${encodeURIComponent(keywords)}&limit=${amount}`);
	const response: any[] = JSON.parse(rawResponse.data);
	return response.map(elem => Object.assign({}, {
		url: elem.stream_url as string,
		title: elem.title as string,
		duration: Math.round(elem.duration / 1000)
	}));
}
export async function soundcloudResolveTrack(url: string): Promise<SoundcloudResult> {
	const rawResponse = await axios.get(`https://api.soundcloud.com/resolve?client_id=${clientId}&url=${url}`);
	const response: any = JSON.parse(rawResponse.data);
	return {
		title: response.title as string,
		duration: Math.round(response.duration / 1000),
		url: response.stream_url
	};
}