import packageJson from '../../../package.json';
import { commandDescription } from '../commands';
import { UPROCK_NODE_COMMANDS } from '../commands/types';
import { normalizeMcpToolResult, type McpToolResult } from './output';
import { buildMcpToolCallRequest, buildUpRockMcpUrl } from './transport';

const sampleApiKey = '00000000-0000-4000-8000-000000000000';

export const upRockStaticVerification = {
	commandValues: UPROCK_NODE_COMMANDS,
	commandDescriptionCount: commandDescription.length,
	credentialRegistered: packageJson.n8n.credentials.includes(
		'dist/credentials/UpRockCrawlerApi.credentials.js',
	),
	nodeRegistered: packageJson.n8n.nodes.includes('dist/nodes/UpRockCrawler/UpRockCrawler.node.js'),
	sampleMcpUrl: buildUpRockMcpUrl({
		apiKey: sampleApiKey,
		mcpBaseUrl: 'https://mcp.uprock.ai/',
	}),
	sampleToolCallRequest: buildMcpToolCallRequest('web_research', {
		query: 'example',
	}),
	sampleNormalizedOutput: normalizeMcpToolResult('web_research', {
		content: [
			{
				type: 'text',
				text: JSON.stringify({
					query: 'example',
					count: 1,
					results: [
						{
							url: 'https://example.com',
							title: 'Example',
							description: 'Example result',
						},
					],
				}),
			},
		],
	} as McpToolResult),
};
