import * as Discord from 'discord.js';
export interface Config {
	prefixes: Map<Discord.Snowflake, string>;
	fallbackModes: Map<Discord.Snowflake, string>; //TODO nem akármilyen string!
	fallbackChannels: Map<Discord.Snowflake, any>; //TODO nem any, a Datát még definiálni kell!
	roles: Map<Discord.Snowflake, any>; //TODO ez sem any, hanem valamilyen Map → a role ID is Snowflake?
}