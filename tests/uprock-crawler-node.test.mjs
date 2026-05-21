import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);

const { UpRockCrawler } = require('../dist/nodes/UpRockCrawler/UpRockCrawler.node.js');
const {
	EXPECTED_UPROCK_MCP_TOOLS,
	MCP_ACCEPT_HEADER,
	MCP_CLIENT_INFO,
	MCP_CONTENT_TYPE_HEADER,
	MCP_PROTOCOL_VERSION,
} = require('../dist/nodes/UpRockCrawler/shared/transport.js');
const { normalizeMcpToolResult } = require('../dist/nodes/UpRockCrawler/shared/output.js');

const credential = {
	apiKey: '00000000-0000-4000-8000-000000000000',
	mcpBaseUrl: 'https://mcp.test/',
};

function createInitializeResponse(sessionId = 'session-123') {
	return {
		body: {
			result: {
				protocolVersion: '2024-11-05',
				capabilities: {},
				serverInfo: { name: 'remote-executor' },
			},
		},
		headers: {
			'mcp-session-id': sessionId,
		},
		statusCode: 200,
	};
}

function createInitializedNotificationResponse() {
	return {
		body: {},
		headers: {},
		statusCode: 202,
	};
}

function createToolCallResponse(result) {
	return {
		body: {
			result,
		},
		headers: {},
		statusCode: 200,
	};
}

function createExecuteContext({
	parameterItems,
	responses,
	continueOnFail = false,
} = {}) {
	const requests = [];
	const items = (parameterItems ?? [{}]).map(() => ({ json: {} }));

	return {
		requests,
		context: {
			async getCredentials() {
				return credential;
			},
			getInputData() {
				return items;
			},
			getNodeParameter(name, itemIndex, defaultValue) {
				const parameters = parameterItems?.[itemIndex] ?? {};

				return Object.hasOwn(parameters, name) ? parameters[name] : defaultValue;
			},
			continueOnFail() {
				return continueOnFail;
			},
			getNode() {
				return {
					name: 'upRockCrawler',
				};
			},
			helpers: {
				async httpRequest(options) {
					requests.push(options);
					const response = responses?.shift();

					if (response instanceof Error) {
						throw response;
					}

					if (response === undefined) {
						throw new Error(`No mocked HTTP response available for ${options.body?.method ?? 'request'}`);
					}

					return response;
				},
			},
		},
	};
}

function createCredentialTestContext(responses) {
	const requests = [];

	return {
		requests,
		context: {
			helpers: {
				async request(options) {
					requests.push(options);
					const response = responses.shift();

					if (response instanceof Error) {
						throw response;
					}

					if (response === undefined) {
						throw new Error(`No mocked credential-test response available for ${options.body?.method ?? 'request'}`);
					}

					return response;
				},
			},
		},
	};
}

test('execute runs web_research and returns normalized output', async () => {
	const node = new UpRockCrawler();
	const { context, requests } = createExecuteContext({
		parameterItems: [
			{
				command: 'web_research',
				query: 'example query',
				max_results: 3,
				num_sources: 2,
				suggested_countries: ['US', 'TR'],
			},
		],
		responses: [
			createInitializeResponse(),
			createInitializedNotificationResponse(),
			createToolCallResponse({
				content: [
					{
						type: 'text',
						text: JSON.stringify({
							query: 'example query',
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
			}),
		],
	});

	const output = (await node.execute.call(context))[0][0];

	assert.equal(requests[2].body.method, 'tools/call');
	assert.equal(requests[2].body.params.name, 'web_research');
	assert.deepEqual(requests[2].body.params.arguments, {
		query: 'example query',
		max_results: 3,
		num_sources: 2,
		suggested_countries: ['US', 'TR'],
	});
	assert.equal(output.pairedItem.item, 0);
	assert.equal(output.json.command, 'web_research');
	assert.equal(output.json.query, 'example query');
	assert.equal(output.json.count, 1);
	assert.deepEqual(output.json.results, [
		{
			url: 'https://example.com',
			title: 'Example',
			description: 'Example description',
		},
	]);
});

test('execute runs sweep with the same MCP bootstrap flow and arguments as the manual curl', async () => {
	const node = new UpRockCrawler();
	const { context, requests } = createExecuteContext({
		parameterItems: [
			{
				command: 'sweep',
				url: 'https://example.com',
				device: 'mobile',
				regions: ['NA', 'EU', 'APAC'],
				timeout: 60,
				tries: 5,
			},
		],
		responses: [
			createInitializeResponse(),
			createInitializedNotificationResponse(),
			createToolCallResponse({
				content: [
					{
						type: 'text',
						text: JSON.stringify({
							report_url: 'https://example.com/report',
							jobs: [],
						}),
					},
				],
			}),
		],
	});

	await node.execute.call(context);

	assert.equal(requests[0].body.method, 'initialize');
	assert.equal(requests[0].body.params.protocolVersion, MCP_PROTOCOL_VERSION);
	assert.deepEqual(requests[0].body.params.clientInfo, MCP_CLIENT_INFO);
	assert.equal(requests[1].body.method, 'notifications/initialized');
	assert.equal(requests[1].headers['Mcp-Session-Id'], 'session-123');
	assert.equal(requests[2].body.method, 'tools/call');
	assert.equal(requests[2].headers['Mcp-Session-Id'], 'session-123');
	assert.equal(requests[2].body.params.name, 'sweep');
	assert.deepEqual(requests[2].body.params.arguments, {
		url: 'https://example.com',
		device: 'mobile',
		regions: ['NA', 'EU', 'APAC'],
		timeout: 60,
		tries: 5,
	});
});

test('execute can include exact MCP request debug details for sweep', async () => {
	const node = new UpRockCrawler();
	const { context } = createExecuteContext({
		parameterItems: [
			{
				command: 'sweep',
				url: 'https://example.com',
				device: 'desktop',
				regions: ['EU'],
				timeout: 45,
				tries: 2,
				includeDebugRequest: true,
			},
		],
		responses: [
			createInitializeResponse(),
			createInitializedNotificationResponse(),
			createToolCallResponse({
				content: [
					{
						type: 'text',
						text: JSON.stringify({
							report_url: 'https://example.com/report',
							jobs: [],
						}),
					},
				],
			}),
		],
	});

	const output = (await node.execute.call(context))[0][0];

	assert.deepEqual(output.json.mcpDebug, {
		sessionId: 'session-123',
		initialize: {
			headers: {
				Accept: MCP_ACCEPT_HEADER,
				'Content-Type': MCP_CONTENT_TYPE_HEADER,
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
		},
		initialized: {
			headers: {
				Accept: MCP_ACCEPT_HEADER,
				'Content-Type': MCP_CONTENT_TYPE_HEADER,
				'Mcp-Session-Id': 'session-123',
			},
			body: {
				jsonrpc: '2.0',
				method: 'notifications/initialized',
			},
		},
		toolCall: {
			headers: {
				Accept: MCP_ACCEPT_HEADER,
				'Content-Type': MCP_CONTENT_TYPE_HEADER,
				'Mcp-Session-Id': 'session-123',
			},
			body: {
				jsonrpc: '2.0',
				id: 2,
				method: 'tools/call',
				params: {
					name: 'sweep',
					arguments: {
						url: 'https://example.com',
						device: 'desktop',
						regions: ['EU'],
						timeout: 45,
						tries: 2,
					},
				},
			},
		},
	});
});

test('execute runs fetch and hydrates markdown and html resources', async () => {
	const node = new UpRockCrawler();
	const { context, requests } = createExecuteContext({
		parameterItems: [
			{
				command: 'fetch',
				url: 'https://example.com',
				method: 'CRAWL_FULL_PAGE',
				deviceType: 'desktop',
				timeoutSeconds: 45,
				retries: 1,
			},
		],
		responses: [
			createInitializeResponse(),
			createInitializedNotificationResponse(),
			createToolCallResponse({
				content: [
					{
						type: 'text',
						text: JSON.stringify({
							status: 'completed',
							job_id: 'job-1',
							meta: {
								source: 'test',
							},
							summary: 'Fetch complete',
							content: {
								markdown: {
									resource: 'crawl://job-1/markdown',
								},
								html: {
									resource: 'crawl://job-1/html',
								},
							},
							screenshots: {
								viewport: {
									resource: 'crawl://job-1/screenshot',
								},
							},
						}),
					},
				],
			}),
			createToolCallResponse({
				content: [
					{
						type: 'text',
						text: JSON.stringify({
							uri: 'crawl://job-1/markdown',
							mimeType: 'text/markdown',
							text: '# Example',
							sizeBytes: 9,
						}),
					},
				],
			}),
			createToolCallResponse({
				content: [
					{
						type: 'text',
						text: JSON.stringify({
							uri: 'crawl://job-1/html',
							content_type: 'text/html',
							content: '<html>ok</html>',
							size_bytes: 15,
						}),
					},
				],
			}),
		],
	});

	const output = (await node.execute.call(context))[0][0];

	assert.equal(requests[2].body.params.name, 'crawl_fetch');
	assert.equal(requests[3].body.params.name, 'resource_fetch');
	assert.equal(requests[3].body.params.arguments.uri, 'crawl://job-1/markdown');
	assert.equal(requests[4].body.params.name, 'resource_fetch');
	assert.equal(requests[4].body.params.arguments.uri, 'crawl://job-1/html');
	assert.equal(output.json.command, 'fetch');
	assert.equal(output.json.status, 'completed');
	assert.equal(output.json.job_id, 'job-1');
	assert.equal(output.json.markdown.text, '# Example');
	assert.equal(output.json.markdown.contentType, 'text/markdown');
	assert.equal(output.json.html.text, '<html>ok</html>');
	assert.equal(output.json.html.contentType, 'text/html');
	assert.deepEqual(output.json.resourceUris, {
		html: 'crawl://job-1/html',
		markdown: 'crawl://job-1/markdown',
		viewportScreenshot: 'crawl://job-1/screenshot',
	});
});

test('execute continues after an MCP error when continueOnFail is enabled', async () => {
	const node = new UpRockCrawler();
	const { context } = createExecuteContext({
		continueOnFail: true,
		parameterItems: [
			{
				command: 'web_research',
				query: 'broken query',
			},
			{
				command: 'web_research',
				query: 'working query',
			},
		],
		responses: [
			createInitializeResponse('session-1'),
			createInitializedNotificationResponse(),
			{
				body: {
					error: {
						message: 'Upstream failed',
					},
				},
				headers: {},
				statusCode: 200,
			},
			createInitializeResponse('session-2'),
			createInitializedNotificationResponse(),
			createToolCallResponse({
				content: [
					{
						type: 'text',
						text: JSON.stringify({
							query: 'working query',
							count: 1,
							results: [],
						}),
					},
				],
			}),
		],
	});

	const [items] = await node.execute.call(context);

	assert.equal(items.length, 2);
	assert.equal(items[0].json.command, 'web_research');
	assert.match(items[0].json.error, /Upstream failed/);
	assert.equal(items[0].pairedItem.item, 0);
	assert.equal(items[1].json.query, 'working query');
	assert.equal(items[1].pairedItem.item, 1);
});

test('execute rejects invalid resource URIs before making HTTP calls', async () => {
	const node = new UpRockCrawler();
	const { context, requests } = createExecuteContext({
		parameterItems: [
			{
				command: 'resource_fetch',
				uri: 'https://example.com/not-a-resource',
			},
		],
		responses: [],
	});

	await assert.rejects(
		() => node.execute.call(context),
		(error) => {
			assert.match(error.message, /Resource URI must start with crawl:\/\/ or sweep:\/\//);
			return true;
		},
	);
	assert.equal(requests.length, 0);
});

test('normalizes sweep output with failed jobs and screenshot resources', () => {
	const output = normalizeMcpToolResult('sweep', {
		content: [
			{
				type: 'text',
				text: JSON.stringify({
					report_url: 'https://example.com/report',
					metrics: {
						score: 92,
					},
					jobs: [
						{
							region: 'NA',
							status: 'ok',
							ttfb: 123,
							screenshot: {
								resource: 'sweep://job-1/screenshot',
							},
						},
						{
							country: 'EU',
							state: 'failed',
							error_message: 'Timeout',
							webVitals: {
								CLS: 0.02,
							},
							artifacts: {
								viewport: {
									resource: 'https://cdn.example.com/screenshot/job-2.png',
								},
							},
						},
					],
				}),
			},
		],
	});

	assert.equal(output.report_url, 'https://example.com/report');
	assert.equal(output.totalJobs, 2);
	assert.equal(output.failedJobs, 1);
	assert.deepEqual(output.failedJobErrors, ['Timeout']);
	assert.deepEqual(output.metrics, {
		score: 92,
	});
	assert.deepEqual(output.screenshotResourceUris, [
		'sweep://job-1/screenshot',
		'https://cdn.example.com/screenshot/job-2.png',
	]);
	assert.equal(output.jobs[0].region, 'NA');
	assert.equal(output.jobs[0].metrics.ttfb, 123);
	assert.equal(output.jobs[1].region, 'EU');
	assert.equal(output.jobs[1].error, 'Timeout');
	assert.equal(output.jobs[1].metrics.CLS, 0.02);
});

test('credential test succeeds when all expected MCP tools are available', async () => {
	const node = new UpRockCrawler();
	const { context, requests } = createCredentialTestContext([
		createInitializeResponse(),
		createInitializedNotificationResponse(),
		{
			body: {
				result: {
					tools: EXPECTED_UPROCK_MCP_TOOLS.map((name) => ({ name })),
				},
			},
			headers: {},
			statusCode: 200,
		},
	]);

	const result = await node.methods.credentialTest.upRockCrawlerCredentialTest.call(context, {
		data: credential,
	});

	assert.deepEqual(result, {
		status: 'OK',
		message: 'Connection successful',
	});
	assert.equal(requests[1].headers['Mcp-Session-Id'], 'session-123');
	assert.equal(requests[2].body.method, 'tools/list');
});

test('credential test reports missing MCP tools', async () => {
	const node = new UpRockCrawler();
	const { context } = createCredentialTestContext([
		createInitializeResponse(),
		createInitializedNotificationResponse(),
		{
			body: {
				result: {
					tools: EXPECTED_UPROCK_MCP_TOOLS.slice(1).map((name) => ({ name })),
				},
			},
			headers: {},
			statusCode: 200,
		},
	]);

	const result = await node.methods.credentialTest.upRockCrawlerCredentialTest.call(context, {
		data: credential,
	});

	assert.equal(result.status, 'Error');
	assert.match(result.message, /missing expected tools/i);
	assert.match(result.message, /crawl_fetch/);
});
