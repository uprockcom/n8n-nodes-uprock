import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class UpRockCrawlerApi implements ICredentialType {
	name = 'upRockCrawlerApi';

	displayName = 'UpRock Crawler API';

	documentationUrl = 'https://github.com/uprockcom/n8n-nodes-uprock?tab=readme-ov-file#credentials';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key UUID',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'The UpRock MCP API key UUID. The node builds the MCP URL internally.',
		},
		{
			displayName: 'MCP Base URL (Advanced)',
			name: 'mcpBaseUrl',
			type: 'string',
			default: 'https://mcp.uprock.ai',
			placeholder: 'https://mcp.uprock.ai',
			hint: 'Only change this for local or staging MCP endpoints.',
			description: 'Base URL for the UpRock MCP service. Change only for local or staging endpoints.',
		},
	];
}
