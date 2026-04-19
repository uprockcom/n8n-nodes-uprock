import type { INodeProperties } from 'n8n-workflow';
import { mcpLocationOptions } from '../shared/options';

const showOnlyForFetch = {
	command: ['fetch'],
};

export const fetchDescription: INodeProperties[] = [
	{
		displayName: 'URL',
		name: 'url',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: showOnlyForFetch,
		},
		placeholder: 'https://example.com',
		description: 'Target URL to crawl, then fetch as both Markdown and HTML',
	},
	{
		displayName: 'Method',
		name: 'method',
		type: 'options',
		default: 'CRAWL_FULL_PAGE',
		displayOptions: {
			show: showOnlyForFetch,
		},
		options: [
			{
				name: 'Crawl Full Page',
				value: 'CRAWL_FULL_PAGE',
				description: 'Render the full page with JavaScript execution',
			},
			{
				name: 'GET',
				value: 'GET',
				description: 'Faster fetch for static pages or API endpoints that do not need JavaScript rendering',
			},
			{
				name: 'POST',
				value: 'POST',
				description: 'Send an HTTP POST request with a request body',
			},
			{
				name: 'PUT',
				value: 'PUT',
				description: 'Send an HTTP PUT request with a request body',
			},
		],
		description: 'HTTP method to use for the initial crawl',
	},
	{
		displayName: 'Body',
		name: 'body',
		type: 'string',
		typeOptions: {
			rows: 5,
		},
		default: '',
		displayOptions: {
			show: {
				...showOnlyForFetch,
				method: ['POST', 'PUT'],
			},
		},
		description: 'Request body for POST and PUT methods. Provide as plain text.',
	},
	{
		displayName: 'Country',
		name: 'country',
		type: 'options',
		default: '',
		displayOptions: {
			show: showOnlyForFetch,
		},
		options: [{ name: 'Automatic', value: '' }, ...mcpLocationOptions],
		description:
			"Where to execute the crawl from. This controls the device's location and regional view, not the page topic.",
	},
	{
		displayName: 'Device Type',
		name: 'deviceType',
		type: 'options',
		default: '',
		displayOptions: {
			show: showOnlyForFetch,
		},
		options: [
			{
				name: 'Automatic',
				value: '',
			},
			{
				name: 'Desktop',
				value: 'desktop',
			},
			{
				name: 'Mobile',
				value: 'mobile',
			},
		],
		description: 'Device type to use for the crawl',
	},
	{
		displayName: 'Timeout Seconds',
		name: 'timeoutSeconds',
		type: 'number',
		default: 60,
		displayOptions: {
			show: showOnlyForFetch,
		},
		typeOptions: {
			minValue: 1,
			maxValue: 300,
		},
		description: 'Timeout in seconds. Full-page crawls use at least 60 seconds.',
	},
	{
		displayName: 'Retries',
		name: 'retries',
		type: 'number',
		default: 2,
		displayOptions: {
			show: showOnlyForFetch,
		},
		typeOptions: {
			minValue: 0,
			maxValue: 3,
		},
		description: 'Number of speculative retries. First successful attempt wins.',
	},
];
