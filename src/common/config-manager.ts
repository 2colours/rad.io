import { Snowflake } from "discord.js";
import { config, defaultConfig, attach, FallbackType, MusicData} from '../internal.js';
export function getFallbackMode(id: Snowflake) {
	return config.fallbackModes.get(id) ?? defaultConfig.fallback;
}
export function getFallbackChannel(id: Snowflake) {
	return config.fallbackChannels.get(id);
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