import type { ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow';
import {
	MCP_ACCEPT_HEADER,
	MCP_CLIENT_INFO,
	MCP_CONTENT_TYPE_HEADER,
	MCP_PROTOCOL_VERSION,
	UPROCK_CLIENT_HEADER_NAME,
	UPROCK_CLIENT_HEADER_VALUE,
} from '../nodes/UpRockCrawler/shared/mcp';

const upRockCredentialTestUrlExpression =
	'={{(($credentials.mcpBaseUrl || "https://mcp.uprock.ai").trim().replace(/\\/+$/, "")) + "/" + encodeURIComponent(($credentials.apiKey || "").trim()) + "/mcp"}}';

export class UpRockCrawlerApi implements ICredentialType {
	name = 'upRockCrawlerApi';

	displayName = 'UpRock Crawler API';

	documentationUrl = 'https://github.com/uprockcom/n8n-nodes-uprock?tab=readme-ov-file#credentials';

	icon = {
		light: 'file:../icons/uprock.svg',
		dark: 'file:../icons/uprock.dark.svg',
	} as const;

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
			description:
				'Base URL for the UpRock MCP service. Change only for local or staging endpoints.',
		},
	];

	test: ICredentialTestRequest = {
		request: {
			method: 'POST',
			url: upRockCredentialTestUrlExpression,
			headers: {
				Accept: MCP_ACCEPT_HEADER,
				'Content-Type': MCP_CONTENT_TYPE_HEADER,
				[UPROCK_CLIENT_HEADER_NAME]: UPROCK_CLIENT_HEADER_VALUE,
			},
			body: {
				jsonrpc: '2.0',
				id: 1,
				method: 'initialize',
				params: {
					protocolVersion: MCP_PROTOCOL_VERSION,
					capabilities: {},
					clientInfo: MCP_CLIENT_INFO,
				},
			},
			json: true,
		},
	};
}
