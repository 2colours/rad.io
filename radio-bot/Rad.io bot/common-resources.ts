import { Snowflake, Client } from 'discord.js';
import { attach, FallbackType, MusicData, Config } from './internal';
import * as sql from 'sqlite';
export const client = new Client();
export const dbPromise = sql.open("./radio.sqlite");
export const configPromise: Promise<Config> = dbPromise.then(db => loadCFG(db));

async function loadCFG(db: sql.Database): Promise<Config> {
	const prefixes: Map<Snowflake, string> = new Map();
	const fallbackModes: Map<Snowflake, FallbackType> = new Map();
	const fallbackData: Map<Snowflake, MusicData> = new Map();
	const roles: Map<Snowflake, Map<Snowflake, string[]>> = new Map();
	const selectPromises: Promise<void>[] = [
		db.all('SELECT * FROM prefix').then(prefixRows => prefixRows.forEach(prefixRow => prefixes.set(prefixRow.guildID, prefixRow.prefix))),
		db.all('SELECT * FROM fallbackModes').then(fbmRows => fbmRows.forEach(fbmRow => fallbackModes.set(fbmRow.guildID, fbmRow.type))),
		db.all('SELECT * FROM fallbackData').then(fbdRows => fbdRows.forEach(fbdRow => fallbackData.set(fbdRow.guildID, { type: fbdRow.type, name: fbdRow.name, url: fbdRow.url, length: undefined, requester: undefined }))),
		db.all('SELECT * FROM role').then(roleRows => roleRows.forEach(roleRow => roles.set(roleRow.guildID, new Map([...attach(roles, roleRow.guildID, new Map()), [roleRow.roleID, roleRow.commands != '' ? roleRow.commands.split('|') : []]]))))
	];
	await Promise.all(selectPromises);

	const config = {
		prefixes: prefixes,
		fallbackModes: fallbackModes,
		fallbackChannels: fallbackData,
		roles: roles
	};
	return config; 
};