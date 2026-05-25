import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);

const {
	buildMcpToolCallRequest,
	callUpRockMcpTool,
	MCP_CLIENT_INFO,
	MCP_PROTOCOL_VERSION,
	parseMcpJsonRpcResponse,
	UPROCK_CLIENT_HEADER_NAME,
	UPROCK_CLIENT_HEADER_VALUE,
} = require('../dist/nodes/UpRockCrawler/shared/transport.js');
const { cleanMcpArguments } = require('../dist/nodes/UpRockCrawler/shared/input.js');
const { normalizeMcpToolResult } = require('../dist/nodes/UpRockCrawler/shared/output.js');

const credential = {
	apiKey: '00000000-0000-4000-8000-000000000000',
	mcpBaseUrl: 'https://mcp.test/',
};

function createMockContext(responses) {
	const requests = [];

	return {
		requests,
		context: {
			async getCredentials() {
				return credential;
			},
			helpers: {
				async httpRequest(options) {
					requests.push(options);
					const response = responses.shift();

					if (response instanceof Error) {
						throw response;
					}

					return response;
				},
			},
		},
	};
}

test('initializes MCP session and reuses session ID for initialized notification and tools/call', async () => {
	const { context, requests } = createMockContext([
		{
			body: {
				result: {
					protocolVersion: '2024-11-05',
					capabilities: {},
					serverInfo: { name: 'remote-executor' },
				},
			},
			headers: {
				'mcp-session-id': 'session-123',
			},
			statusCode: 200,
		},
		{
			body: {},
			headers: {},
			statusCode: 202,
		},
		{
			body: {
				result: {
					content: [
						{
							type: 'text',
							text: '{"ok":true}',
						},
					],
				},
			},
			headers: {},
			statusCode: 200,
		},
	]);

	const result = await callUpRockMcpTool.call(context, 'web_research', { query: 'example' });

	assert.equal(requests[0].body.method, 'initialize');
	assert.equal(requests[0].body.params.protocolVersion, MCP_PROTOCOL_VERSION);
	assert.deepEqual(requests[0].body.params.clientInfo, MCP_CLIENT_INFO);
	assert.equal(requests[0].headers[UPROCK_CLIENT_HEADER_NAME], UPROCK_CLIENT_HEADER_VALUE);
	assert.equal(requests[1].body.method, 'notifications/initialized');
	assert.equal(requests[1].headers[UPROCK_CLIENT_HEADER_NAME], UPROCK_CLIENT_HEADER_VALUE);
	assert.equal(requests[1].headers['Mcp-Session-Id'], 'session-123');
	assert.equal(requests[2].body.method, 'tools/call');
	assert.equal(requests[2].headers[UPROCK_CLIENT_HEADER_NAME], UPROCK_CLIENT_HEADER_VALUE);
	assert.equal(requests[2].headers['Mcp-Session-Id'], 'session-123');
	assert.deepEqual(result.content, [{ type: 'text', text: '{"ok":true}' }]);
});

test('builds tools/call request body', () => {
	assert.deepEqual(buildMcpToolCallRequest('web_research', { query: 'example' }), {
		jsonrpc: '2.0',
		id: 2,
		method: 'tools/call',
		params: {
			name: 'web_research',
			arguments: {
				query: 'example',
			},
		},
	});
});

test('omits empty optional MCP arguments', () => {
	assert.deepEqual(
		cleanMcpArguments({
			url: 'https://example.com',
			body: '',
			country: undefined,
			regions: [],
			options: {},
			retries: 0,
		}),
		{
			url: 'https://example.com',
			retries: 0,
		},
	);
});

test('normalizes JSON text content', () => {
	const output = normalizeMcpToolResult('web_research', {
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
							description: 'Example description',
						},
					],
				}),
			},
		],
	});

	assert.equal(output.query, 'example');
	assert.equal(output.count, 1);
	assert.deepEqual(output.results, [
		{
			url: 'https://example.com',
			title: 'Example',
			description: 'Example description',
		},
	]);
});

test('parses JSON-RPC responses from server-sent events', () => {
	assert.deepEqual(parseMcpJsonRpcResponse('event: message\\ndata: {\"jsonrpc\":\"2.0\",\"id\":1,\"result\":{\"ok\":true}}\\n\\n'), {
		jsonrpc: '2.0',
		id: 1,
		result: {
			ok: true,
		},
	});
});

test('surfaces JSON-RPC errors without leaking credential URL', async () => {
	const { context } = createMockContext([
		{
			body: {
				error: {
					message: 'Unauthorized',
				},
			},
			headers: {},
			statusCode: 200,
		},
	]);

	await assert.rejects(
		() => callUpRockMcpTool.call(context, 'web_research', { query: 'example' }),
		(error) => {
			assert.match(error.message, /Unauthorized/);
			assert.doesNotMatch(error.message, /00000000-0000-4000-8000-000000000000/);
			return true;
		},
	);
});
