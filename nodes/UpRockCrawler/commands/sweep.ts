import type { INodeProperties } from 'n8n-workflow';
import { mcpRegionOptions } from '../shared/options';

const showOnlyForSweep = {
	command: ['sweep'],
};

export const sweepDescription: INodeProperties[] = [
	{
		displayName: 'URL',
		name: 'url',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: showOnlyForSweep,
		},
		placeholder: 'https://example.com',
		description:
			'Target URL to test across geographic regions. The response can include screenshot resource links that can be fetched with resource_fetch.',
	},
	{
		displayName: 'Device',
		name: 'device',
		type: 'options',
		default: 'mobile',
		displayOptions: {
			show: showOnlyForSweep,
		},
		options: [
			{
				name: 'Mobile',
				value: 'mobile',
			},
			{
				name: 'Desktop',
				value: 'desktop',
			},
		],
		description: 'Device type to use for the sweep',
	},
	{
		displayName: 'Regions',
		name: 'regions',
		type: 'multiOptions',
		default: ['NA', 'EU', 'APAC'],
		displayOptions: {
			show: showOnlyForSweep,
		},
		options: mcpRegionOptions,
		description:
			'Geographic regions to test from. All selected region checks run concurrently.',
	},
	{
		displayName: 'Timeout Seconds',
		name: 'timeout',
		type: 'number',
		default: 60,
		displayOptions: {
			show: showOnlyForSweep,
		},
		typeOptions: {
			minValue: 1,
		},
		description: 'Global timeout in seconds for the sweep',
	},
	{
		displayName: 'Tries',
		name: 'tries',
		type: 'number',
		default: 5,
		displayOptions: {
			show: showOnlyForSweep,
		},
		typeOptions: {
			minValue: 1,
		},
		description: 'Number of checks per region. Checks across regions and tries run concurrently.',
	},
	{
		displayName: 'Include MCP Request Debug',
		name: 'includeDebugRequest',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: showOnlyForSweep,
		},
		description:
			'Whether to include the exact MCP request headers and bodies used for this sweep. Useful for comparing the node request with a manual curl.',
	},
];
