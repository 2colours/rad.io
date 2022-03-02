import { Snowflake, Client, Intents } from 'discord.js';
import { attach, FallbackType, Config, radios, defaultRadio, MusicData } from '../internal.js';
import { Umzug, SequelizeStorage } from 'umzug';
import sequelize from 'sequelize';
const { Sequelize, QueryTypes, DataTypes } = sequelize; //Workaround (CommonJS -> ES modul)
export const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_VOICE_STATES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS] });

export const database = new Sequelize({
	dialect: 'sqlite',
	storage: './data/radio.sqlite'
});

async function loadCFG(): Promise<Config> {
	const prefixes: Map<Snowflake, string> = new Map();
	const fallbackModes: Map<Snowflake, FallbackType> = new Map();
	const fallbackData: Map<Snowflake, MusicData> = new Map();
	const roles: Map<Snowflake, Map<Snowflake, string[]>> = new Map();
	const selectPromises: Promise<void>[] = [
		database.query('SELECT * FROM prefix', { type: QueryTypes.SELECT }).then(prefixRows => prefixRows.forEach((prefixRow: any) => prefixes.set(prefixRow.guildID, prefixRow.prefix))),
		database.query('SELECT * FROM fallbackModes', { type: QueryTypes.SELECT }).then(fbmRows => fbmRows.forEach((fbmRow: any) => fallbackModes.set(fbmRow.guildID, fbmRow.type))),
		database.query('SELECT * FROM fallbackData', { type: QueryTypes.SELECT }).then(fbdRows => fbdRows.forEach((fbdRow: any) => fallbackData.set(fbdRow.guildID, {
			type: fbdRow.type,
			name: fbdRow.name,
			lengthSeconds: undefined,
			requester: undefined,
			url: fbdRow.type == 'radio' ? radios.get(fbdRow.data).url : fbdRow.data
		}))),
		database.query('SELECT * FROM role', { type: QueryTypes.SELECT }).then(roleRows => roleRows.forEach((roleRow: any) => roles.set(roleRow.guildID, new Map([...attach(roles, roleRow.guildID, new Map()), [roleRow.roleID, roleRow.commands != '' ? roleRow.commands.split('|') : []]]))))
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
				const fbdRows = (await context.sequelize.query("SELECT * FROM `fallbackData`", { type: QueryTypes.SELECT }));
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
					const foundId = entryByName ? entryByName[0] : entryByUrl[0];
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
					fbdRow.name = radios.get(defaultRadio).name;
					fbdRow.url = radios.get(defaultRadio).url;
				});
				await context.bulkDelete('fallbackData', {});
				if (fbdRows.length > 0)
					await context.bulkInsert('fallbackData', fbdRows);
			}
		}
	],
	context: database.getQueryInterface(),
	storage: new SequelizeStorage({ sequelize: database }),
	logger: console,
});

await umzug.up();
export const config = await loadCFG();
