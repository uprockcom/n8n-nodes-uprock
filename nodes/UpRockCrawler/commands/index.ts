import type { INodeProperties } from 'n8n-workflow';
import { crawlFetchDescription } from './crawlFetch';
import { fetchDescription } from './fetch';
import { resourceFetchDescription } from './resourceFetch';
import { sweepDescription } from './sweep';
import { UPROCK_NODE_COMMANDS, type UpRockCommand } from './types';
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
	fetch: {
		name: 'Crawl URL and Fetch Content',
		value: 'fetch',
		action: 'Crawl a URL and return Markdown and HTML content',
		description: 'Crawl a URL, then fetch the returned Markdown and HTML resources',
	},
	crawl_fetch: {
		name: 'Crawl URL',
		value: 'crawl_fetch',
		action: 'Crawl a URL via the UpRock network',
		description: 'Fetch a URL via the UpRock crawl network',
	},
	resource_fetch: {
		name: 'Fetch Resource URI',
		value: 'resource_fetch',
		action: 'Fetch content for a crawl:// or sweep:// resource URI',
		description: 'Fetch full content for a crawl:// or sweep:// resource URI',
	},
	sweep: {
		name: 'Sweep URL Across Regions',
		value: 'sweep',
		action: 'Test a URL across geographic regions',
		description: 'Test website reliability and performance across regions',
	},
	web_research: {
		name: 'Research Web Query',
		value: 'web_research',
		action: 'Research a web query across countries',
		description: 'Search the web across search engines and geographic perspectives',
	},
};

const commandDescriptions: Record<UpRockCommand, INodeProperties[]> = {
	fetch: fetchDescription,
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
		options: UPROCK_NODE_COMMANDS.map((command) => commandOptions[command]),
		default: 'fetch',
		description: 'UpRock command to run',
	},
	...UPROCK_NODE_COMMANDS.flatMap((command) => commandDescriptions[command]),
];
