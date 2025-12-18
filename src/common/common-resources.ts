import { Snowflake, Client, GatewayIntentBits } from 'discord.js';
import { attach, FallbackType, Config, radios, defaultRadio, MusicData, dbPath } from '../index.js';
import { Umzug, SequelizeStorage } from 'umzug';
import sequelize from 'sequelize';
import { readFile, writeFile } from 'node:fs/promises';
const { Sequelize, QueryTypes, DataTypes } = sequelize; //Workaround (CommonJS -> ES modul)
export const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMessageReactions] });

export const database = new Sequelize({
	dialect: 'sqlite',
	storage: dbPath
});

async function loadCFG(): Promise<Config> {
	const fallbackModes: Map<Snowflake, FallbackType> = new Map();
	const fallbackData: Map<Snowflake, MusicData> = new Map();
	const roles: Map<Snowflake, Map<Snowflake, string[]>> = new Map();
	const selectPromises: Promise<void>[] = [
		database.query('SELECT * FROM fallbackModes', { type: QueryTypes.SELECT }).then(fbmRows => fbmRows.forEach((fbmRow: any) => fallbackModes.set(fbmRow.guildID, fbmRow.type))),
		database.query('SELECT * FROM fallbackData', { type: QueryTypes.SELECT }).then(fbdRows => fbdRows.forEach((fbdRow: any) => fallbackData.set(fbdRow.guildID, {
			type: fbdRow.type,
			name: fbdRow.name,
			lengthSeconds: undefined,
			requester: undefined,
			url: fbdRow.type == 'radio' ? radios.get(fbdRow.data)?.url : fbdRow.data //TODO ha nincs már ilyen rádió, ennél világosabb és koraibb visszajelzés is lehetne róla
		}))),
		database.query('SELECT * FROM role', { type: QueryTypes.SELECT }).then(roleRows => roleRows.forEach((roleRow: any) => roles.set(roleRow.guildID, new Map([...attach(roles, roleRow.guildID, new Map()), [roleRow.roleID, roleRow.commands != '' ? roleRow.commands.split('|') : []]]))))
	];
	await Promise.all(selectPromises);

	const config = {
		fallbackModes: fallbackModes,
		fallbackChannels: fallbackData,
		roles
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
						type: DataTypes.STRING,
						allowNull: false,
						primaryKey: true
					},
					prefix: {
						type: DataTypes.STRING,
						allowNull: false
					}
				});
				await context.createTable('fallbackModes', {
					guildID: {
						type: DataTypes.STRING,
						allowNull: false,
						primaryKey: true
					},
					type: {
						type: DataTypes.STRING,
						allowNull: false
					}
				});
				await context.createTable('fallbackData', {
					guildID: {
						type: DataTypes.STRING,
						allowNull: false,
						primaryKey: true
					},
					type: {
						type: DataTypes.STRING,
						allowNull: false
					},
					name: {
						type: DataTypes.STRING,
						allowNull: false
					},
					url: {
						type: DataTypes.STRING,
						allowNull: false
					}
				});
				await context.createTable('role', {
					guildID: {
						type: DataTypes.STRING,
						allowNull: false
					},
					roleID: {
						type: DataTypes.STRING,
						allowNull: false
					},
					commands: {
						type: DataTypes.STRING,
						allowNull: false
					}
				});
				await context.addConstraint('role', {
					fields: ['guildID', 'roleID'], 
					type: 'primary key'
				});
			},
			async down({ context }) {
				await context.dropAllTables();
			}
		},
		{
			name: '01-fallback-data-fix',
			async up({ context }) {
				const fbdRows = (await context.sequelize.query('SELECT * FROM `fallbackData`', { type: QueryTypes.SELECT }));
				await context.renameColumn('fallbackData', 'url', 'data');
				fbdRows.forEach((fbdRow: any) => {
					fbdRow.data = fbdRow.url;
					delete fbdRow.url;
					if (fbdRow.type != 'radio')
						return;
					const entryByName = [...radios].find(([_, data]) => data.name == fbdRow.name);
					const entryByUrl = [...radios].find(([_, data]) => data.url == fbdRow.data);
					if (!entryByName && !entryByUrl) {
						fbdRow.type = 'custom';
						fbdRow.name = fbdRow.data;
						return;
					}
					const foundId = entryByName ? entryByName[0] : entryByUrl![0]; // szégyen, hogy ezt a Typescript nem vezette le abból, hogy a kettő nem lehet egyszerre undefined
					fbdRow.data = foundId;				
				});
				await context.bulkDelete('fallbackData', {});
				if (fbdRows.length > 0)
					await context.bulkInsert('fallbackData', fbdRows);
			},
			async down({ context }) {
				const fbdRows = (await context.sequelize.query("SELECT * FROM `fallbackData`", { type: QueryTypes.SELECT }));
				await context.renameColumn('fallbackData', 'data', 'url');
				fbdRows.forEach((fbdRow: any) => {
					fbdRow.url = fbdRow.data;
					delete fbdRow.data;
					if (fbdRow.type != 'radio')
						return;
					const urlById = radios.get(fbdRow.url)?.url;
					if (urlById) {
						fbdRow.url = urlById;
						return;
					}
					fbdRow.name = radios.get(defaultRadio)!.name;
					fbdRow.url = radios.get(defaultRadio)!.url;
				});
				await context.bulkDelete('fallbackData', {});
				if (fbdRows.length > 0)
					await context.bulkInsert('fallbackData', fbdRows);
			}
		},
		{
			name: '02-prefix-removal',
			async up({ context }) {
				const prefixRows = await context.sequelize.query('SELECT DISTINCT * FROM `prefix`', { type: QueryTypes.SELECT }); //sajnos a lekérés adott duplikátumokat - 
				await Promise.all([
					writeFile('./data/02-prefix-removal-backup.json', JSON.stringify(prefixRows)),
					context.dropTable('prefix')
				]);
			},
			async down({ context }) {
				await context.createTable('prefix', {
					guildID: {
						type: DataTypes.STRING,
						allowNull: false,
						primaryKey: true
					},
					prefix: {
						type: DataTypes.STRING,
						allowNull: false
					}
				});
				try {
					const content = await readFile('./data/02-prefix-removal-backup.json');
					context.bulkInsert('prefix', JSON.parse(content.toString()));
				}
				catch (e) {
					console.error(e);
				}
			}
		}
	],
	context: database.getQueryInterface(),
	storage: new SequelizeStorage({ sequelize: database }),
	logger: console,
});

await umzug.up();
export const config = await loadCFG();
