import packageJson from '../../../package.json';

export const MCP_ACCEPT_HEADER = 'application/json, text/event-stream';

export const MCP_CONTENT_TYPE_HEADER = 'application/json';

export const MCP_PROTOCOL_VERSION = '2024-11-05';

export const MCP_CLIENT_INFO = {
	name: packageJson.name,
	version: packageJson.version,
} as const;
