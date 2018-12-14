import * as Common from './common-types';
import { Snowflake, Client } from 'discord.js';
import { attach } from './util';
const sql = require('sqlite');
export let config: Common.Config;
export let database: any;
export const client = new Client();
sql.open("./radio.sqlite")
	.then(async (db: any) => {
		await loadCFG(db);
		database = db;
	});

async function loadCFG(db:any) {
	let prefixes: Map<Snowflake, string> = new Map();
	let fallbackModes: Map<Snowflake, Common.FallbackType> = new Map();
	let fallbackData: Map<Snowflake, Common.MusicData> = new Map();
	let roles: Map<Snowflake, Map<Snowflake, string[]>> = new Map();
	let selectPromises: Promise<void>[] = [
		db.all('SELECT * FROM prefix').then(prefixRows => prefixRows.forEach(prefixRow => prefixes.set(prefixRow.guildID, prefixRow.prefix))),
		db.all('SELECT * FROM fallbackModes').then(fbmRows => fbmRows.forEach(fbmRow => fallbackModes.set(fbmRow.guildID, fbmRow.type))),
		db.all('SELECT * FROM fallbackData').then(fbdRows => fbdRows.forEach(fbdRow => fallbackData.set(fbdRow.guildID, { type: fbdRow.type, name: fbdRow.name, url: fbdRow.url }))),
		db.all('SELECT * FROM role').then(roleRows => roleRows.forEach(roleRow => roles.set(roleRow.guildID, new Map([...attach(roles, roleRow.guildID, new Map()), [roleRow.roleID, roleRow.commands.split('|')]]))))
	];
	await Promise.all(selectPromises);

	config = {
		prefixes: prefixes,
		fallbackModes: fallbackModes,
		fallbackChannels: fallbackData,
		roles: roles
	};
	console.log(config);
};