export const UPROCK_MCP_TOOL_COMMANDS = [
	'crawl_fetch',
	'resource_fetch',
	'sweep',
	'web_research',
] as const;

export const UPROCK_NODE_COMMANDS = ['fetch', ...UPROCK_MCP_TOOL_COMMANDS] as const;

export type UpRockMcpToolCommand = (typeof UPROCK_MCP_TOOL_COMMANDS)[number];

export type UpRockCommand = (typeof UPROCK_NODE_COMMANDS)[number];

export function isUpRockCommand(value: string): value is UpRockCommand {
	return (UPROCK_NODE_COMMANDS as readonly string[]).includes(value);
}
