import type { INodeProperties } from 'n8n-workflow';

const showOnlyForResourceFetch = {
	command: ['resource_fetch'],
};

export const resourceFetchDescription: INodeProperties[] = [
	{
		displayName: 'Resource URI',
		name: 'uri',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: showOnlyForResourceFetch,
		},
		placeholder: 'crawl://job-id/markdown',
		description: 'A crawl:// or sweep:// resource URI returned by a previous UpRock command',
	},
];
