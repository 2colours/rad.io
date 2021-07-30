import { Snowflake, Client } from 'discord.js';
import { attach, FallbackType, Config, radios, defaultRadio, MusicData } from './internal.js';
import { Umzug, SequelizeStorage } from 'umzug';
import Sequelize from 'sequelize';
export const client = new Client();

export const sequelize = new Sequelize({
	dialect: 'sqlite',
	storage: './data/radio.sqlite'
});

async function loadCFG(): Promise<Config> {
	const prefixes: Map<Snowflake, string> = new Map();
	const fallbackModes: Map<Snowflake, FallbackType> = new Map();
	const fallbackData: Map<Snowflake, MusicData> = new Map();
	const roles: Map<Snowflake, Map<Snowflake, string[]>> = new Map();
	const selectPromises: Promise<void>[] = [
		sequelize.query('SELECT * FROM prefix', { type: sequelize.QueryTypes.SELECT }).then(prefixRows => prefixRows.forEach((prefixRow: any) => prefixes.set(prefixRow.guildID, prefixRow.prefix))),
		sequelize.query('SELECT * FROM fallbackModes', { type: sequelize.QueryTypes.SELECT }).then(fbmRows => fbmRows.forEach((fbmRow: any) => fallbackModes.set(fbmRow.guildID, fbmRow.type))),
		sequelize.query('SELECT * FROM fallbackData', { type: sequelize.QueryTypes.SELECT }).then(fbdRows => fbdRows.forEach((fbdRow: any) => fallbackData.set(fbdRow.guildID, {
			type: fbdRow.type,
			name: fbdRow.name,
			lengthSeconds: undefined,
			requester: undefined,
			url: fbdRow.type == 'radio' ? radios.get(fbdRow.data).url : fbdRow.data
		}))),
		sequelize.query('SELECT * FROM role', { type: sequelize.QueryTypes.SELECT }).then(roleRows => roleRows.forEach((roleRow: any) => roles.set(roleRow.guildID, new Map([...attach(roles, roleRow.guildID, new Map()), [roleRow.roleID, roleRow.commands != '' ? roleRow.commands.split('|') : []]]))))
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
				const fbdRows = (await context.sequelize.query("SELECT * FROM `fallbackData`", { type: context.sequelize.QueryTypes.SELECT }));
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
				await context.bulkInsert('fallbackData', fbdRows);
			},
			async down({ context }) {
				const fbdRows = (await context.sequelize.query("SELECT * FROM `fallbackData`", { type: context.sequelize.QueryTypes.SELECT }));
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
				await context.bulkInsert('fallbackData', fbdRows);
			}
		}
	],
	context: sequelize.getQueryInterface(),
	storage: new SequelizeStorage({ sequelize }),
	logger: console,
});

await umzug.up();
export const config = await loadCFG();
