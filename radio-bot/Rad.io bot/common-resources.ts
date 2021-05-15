import { Snowflake, Client } from 'discord.js';
import { attach, FallbackType, MusicData, Config } from './internal.js';
import { Umzug, SequelizeStorage } from 'umzug';
import Sequelize from 'sequelize';
export const client = new Client();

export const sequelize = new Sequelize({
	dialect: 'sqlite',
	storage: './data/radio.sqlite'
});

async function loadCFG(): Promise<Config> {
	//await db.run('CREATE TABLE IF NOT EXISTS prefix (guildID TEXT, prefix TEXT)').catch(console.error);
	//await db.run('CREATE TABLE IF NOT EXISTS fallbackModes (guildID TEXT, type TEXT)').catch(console.error);
	//await db.run('CREATE TABLE IF NOT EXISTS fallbackData (guildID TEXT, type TEXT, name TEXT, url TEXT)').catch(console.error);
	//await db.run('CREATE TABLE IF NOT EXISTS role (guildID TEXT, roleID TEXT, commands TEXT)').catch(console.error);
	const prefixes: Map<Snowflake, string> = new Map();
	const fallbackModes: Map<Snowflake, FallbackType> = new Map();
	const fallbackData: Map<Snowflake, MusicData> = new Map();
	const roles: Map<Snowflake, Map<Snowflake, string[]>> = new Map();
	const selectPromises: Promise<void>[] = [
		sequelize.query('SELECT * FROM prefix').then(([prefixRows, _]) => prefixRows.forEach((prefixRow: any) => prefixes.set(prefixRow.guildID, prefixRow.prefix))),
		sequelize.query('SELECT * FROM fallbackModes').then(([fbmRows, _]) => fbmRows.forEach((fbmRow: any) => fallbackModes.set(fbmRow.guildID, fbmRow.type))),
		sequelize.query('SELECT * FROM fallbackData').then(([fbdRows, _]) => fbdRows.forEach((fbdRow: any) => fallbackData.set(fbdRow.guildID, { type: fbdRow.type, name: fbdRow.name, url: fbdRow.url, lengthSeconds: undefined, requester: undefined }))),
		sequelize.query('SELECT * FROM role').then(([roleRows, _]) => roleRows.forEach((roleRow: any) => roles.set(roleRow.guildID, new Map([...attach(roles, roleRow.guildID, new Map()), [roleRow.roleID, roleRow.commands != '' ? roleRow.commands.split('|') : []]]))))
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

const umzug = new Umzug({
	migrations: [
		{
			name: '00-initial',
			async up({ context }) {
				await context.createTable('prefix', {
					guildID: {
						type: Sequelize.STRING,
						allowNull: false,
						primaryKey: true
					},
					prefix: {
						type: Sequelize.STRING,
						allowNull: false
					}
				});
				await context.createTable('fallbackModes', {
					guildID: {
						type: Sequelize.STRING,
						allowNull: false,
						primaryKey: true
					},
					type: {
						type: Sequelize.STRING,
						allowNull: false
					}
				});
				await context.createTable('fallbackData', {
					guildID: {
						type: Sequelize.STRING,
						allowNull: false,
						primaryKey: true
					},
					type: {
						type: Sequelize.STRING,
						allowNull: false
					},
					name: {
						type: Sequelize.STRING,
						allowNull: false
					},
					url: {
						type: Sequelize.STRING,
						allowNull: false
					}
				});
				await context.createTable('role', {
					guildID: {
						type: Sequelize.STRING,
						allowNull: false
					},
					roleID: {
						type: Sequelize.STRING,
						allowNull: false
					},
					commands: {
						type: Sequelize.STRING,
						allowNull: false
					}
				});
				await context.addConstraint('role', ['guildID', 'roleID'], {
					type: 'primary key',
				});
			},
			async down({ context }) {
				await context.dropAllTables();
			}
		},
		{
			name: '01-fallback-data-fix',
			async up({ context }) {
				//const users = await context.sequelize.query("SELECT * FROM `fallbackData`", { type: QueryTypes.SELECT });
			},
			async down() {

			}
		}
	],
	context: sequelize.getQueryInterface(),
	storage: new SequelizeStorage({ sequelize }),
	logger: console,
});

await umzug.up();
export const config = await loadCFG();
