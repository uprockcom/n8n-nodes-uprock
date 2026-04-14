import type { INodeProperties } from 'n8n-workflow';
import { mcpLocationOptions } from '../shared/options';

const showOnlyForWebResearch = {
	command: ['web_research'],
};

export const webResearchDescription: INodeProperties[] = [
	{
		displayName: 'Query',
		name: 'query',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: showOnlyForWebResearch,
		},
		description:
			'Search query terms. Include geographic words here only when they are the subject of the search.',
	},
	{
		displayName: 'Max Results',
		name: 'max_results',
		type: 'number',
		default: 12,
		displayOptions: {
			show: showOnlyForWebResearch,
		},
		typeOptions: {
			minValue: 1,
			maxValue: 50,
		},
		description: 'Maximum number of results to return',
	},
	{
		displayName: 'Number of Sources',
		name: 'num_sources',
		type: 'number',
		default: 5,
		displayOptions: {
			show: showOnlyForWebResearch,
		},
		typeOptions: {
			minValue: 1,
			maxValue: 20,
		},
		description: 'Maximum number of countries to query for geographic diversity',
	},
	{
		displayName: 'Suggested Countries',
		name: 'suggested_countries',
		type: 'multiOptions',
		default: [],
		displayOptions: {
			show: showOnlyForWebResearch,
		},
		options: mcpLocationOptions,
		description:
			"Where to search from. This controls the searcher's geographic perspective, not the subject of the query.",
	},
];
