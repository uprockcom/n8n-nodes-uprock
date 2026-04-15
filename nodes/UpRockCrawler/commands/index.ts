import type { INodeProperties } from 'n8n-workflow';
import { crawlFetchDescription } from './crawlFetch';
import { resourceFetchDescription } from './resourceFetch';
import { sweepDescription } from './sweep';
import { UPROCK_MCP_COMMANDS, type UpRockCommand } from './types';
import { webResearchDescription } from './webResearch';

const commandOptions: Record<
	UpRockCommand,
	{
		name: string;
		value: UpRockCommand;
		action: string;
		description: string;
	}
> = {
	crawl_fetch: {
		name: 'Crawl Fetch',
		value: 'crawl_fetch',
		action: 'Fetch a URL via UpRock',
		description: 'Fetch a URL via the UpRock crawl network',
	},
	resource_fetch: {
		name: 'Resource Fetch',
		value: 'resource_fetch',
		action: 'Fetch an UpRock resource',
		description: 'Fetch full content for a crawl:// or sweep:// resource URI',
	},
	sweep: {
		name: 'Sweep',
		value: 'sweep',
		action: 'Run an UpRock sweep',
		description: 'Test website reliability and performance across regions',
	},
	web_research: {
		name: 'Web Research',
		value: 'web_research',
		action: 'Search the web via UpRock',
		description: 'Search the web across search engines and geographic perspectives',
	},
};

const commandDescriptions: Record<UpRockCommand, INodeProperties[]> = {
	crawl_fetch: crawlFetchDescription,
	resource_fetch: resourceFetchDescription,
	sweep: sweepDescription,
	web_research: webResearchDescription,
};

export const commandDescription: INodeProperties[] = [
	{
		displayName: 'Command',
		name: 'command',
		type: 'options',
		noDataExpression: true,
		options: UPROCK_MCP_COMMANDS.map((command) => commandOptions[command]),
		default: 'crawl_fetch',
		description: 'UpRock MCP command to run',
	},
	...UPROCK_MCP_COMMANDS.flatMap((command) => commandDescriptions[command]),
];
