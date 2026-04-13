export const UPROCK_MCP_COMMANDS = [
	'crawl_fetch',
	'resource_fetch',
	'sweep',
	'web_research',
] as const;

export type UpRockCommand = (typeof UPROCK_MCP_COMMANDS)[number];

export function isUpRockCommand(value: string): value is UpRockCommand {
	return (UPROCK_MCP_COMMANDS as readonly string[]).includes(value);
}
