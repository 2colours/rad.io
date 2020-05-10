import { Snowflake } from "discord.js";
import { configPromise, Config, defaultConfig, attach } from "./internal";
import { FallbackType, MusicData } from "./common-types";
let config: Config;
configPromise.then(cfg => config = cfg);
export function getPrefix(id: Snowflake) {
	return config.prefixes.get(id) ?? defaultConfig.prefix;
}
export function getFallbackMode(id: Snowflake) {
	return config.fallbackModes.get(id) ?? defaultConfig.fallback;
}
export function getFallbackChannel(id: Snowflake) {
	return config.fallbackChannels.get(id);
}
export function setPrefix(id: Snowflake, newPrefix: string) {
	config.prefixes.set(id, newPrefix);
}
export function setFallbackMode(id: Snowflake, newMode: FallbackType) {
	config.fallbackModes.set(id, newMode);
}
export function setFallbackChannel(id: Snowflake, newChannel: MusicData) {
	config.fallbackChannels.set(id, newChannel);
}
export function getRoleSafe(id: Snowflake) {
	return attach(config.roles, id, new Map<string, string[]>());
}
export function getRoles(id: Snowflake) {
	return [...(config.roles.get(id) ?? new Map<string, string[]>())];
}