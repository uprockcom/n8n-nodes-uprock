import {
	ApplicationError,
	NodeConnectionTypes,
	NodeApiError,
	NodeOperationError,
	type ICredentialDataDecryptedObject,
	type ICredentialsDecrypted,
	type ICredentialTestFunctions,
	type IDataObject,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeCredentialTestResult,
	type INodeType,
	type INodeTypeDescription,
	type JsonObject,
} from 'n8n-workflow';
import { commandDescription } from './commands';
import {
	isUpRockCommand,
	type UpRockCommand,
} from './commands/types';
import { cleanMcpArguments } from './shared/input';
import { isSweepEnabled } from './shared/features';
import { normalizeMcpToolResult, type McpToolResult } from './shared/output';
import {
	buildUpRockMcpUrl,
	buildMcpInitializeRequest,
	buildMcpInitializedNotificationRequest,
	buildMcpRequestHeaders,
	buildMcpToolCallRequest,
	EXPECTED_UPROCK_MCP_TOOLS,
	MCP_CLIENT_INFO,
	MCP_PROTOCOL_VERSION,
	callUpRockMcpTool,
	callUpRockMcpToolInSession,
	initializeUpRockMcpSession,
	parseMcpJsonRpcResponse,
	type UpRockCrawlerCredentials,
	type UpRockMcpSession,
} from './shared/transport';

type CredentialTestHttpResponse = {
	body?: {
		result?: IDataObject;
		error?: {
			message?: string;
		};
	};
	headers?: IDataObject;
};

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

type ErrorWithMcpDebug = Error & {
	mcpDebug?: IDataObject;
};

type CommandArgumentBuilder = (
	executeFunctions: IExecuteFunctions,
	itemIndex: number,
) => IDataObject;

function assertResourceUri(uri: unknown): string {
	if (typeof uri !== 'string' || !/^(crawl|sweep):\/\/.+/.test(uri)) {
		throw new ApplicationError('Resource URI must start with crawl:// or sweep://');
	}

	return uri;
}

const commandArgumentBuilders: Record<UpRockCommand, CommandArgumentBuilder> = {
	fetch: (executeFunctions, itemIndex) =>
		cleanMcpArguments({
			url: executeFunctions.getNodeParameter('url', itemIndex),
			method: executeFunctions.getNodeParameter('method', itemIndex, 'CRAWL_FULL_PAGE'),
			body: executeFunctions.getNodeParameter('body', itemIndex, ''),
			country: executeFunctions.getNodeParameter('country', itemIndex, ''),
			device_type: executeFunctions.getNodeParameter('deviceType', itemIndex, ''),
			timeout_sec: executeFunctions.getNodeParameter('timeoutSeconds', itemIndex, 60),
			retries: executeFunctions.getNodeParameter('retries', itemIndex, 2),
		}),
	crawl_fetch: (executeFunctions, itemIndex) =>
		cleanMcpArguments({
			url: executeFunctions.getNodeParameter('url', itemIndex),
			method: executeFunctions.getNodeParameter('method', itemIndex, 'CRAWL_FULL_PAGE'),
			body: executeFunctions.getNodeParameter('body', itemIndex, ''),
			country: executeFunctions.getNodeParameter('country', itemIndex, ''),
			device_type: executeFunctions.getNodeParameter('deviceType', itemIndex, ''),
			timeout_sec: executeFunctions.getNodeParameter('timeoutSeconds', itemIndex, 60),
			retries: executeFunctions.getNodeParameter('retries', itemIndex, 2),
		}),
	resource_fetch: (executeFunctions, itemIndex) =>
		cleanMcpArguments({
			uri: assertResourceUri(executeFunctions.getNodeParameter('uri', itemIndex)),
		}),
	sweep: (executeFunctions, itemIndex) =>
		cleanMcpArguments({
			url: executeFunctions.getNodeParameter('url', itemIndex),
			device: executeFunctions.getNodeParameter('device', itemIndex, 'mobile'),
			regions: executeFunctions.getNodeParameter('regions', itemIndex, ['NA', 'EU', 'APAC']),
			timeout: executeFunctions.getNodeParameter('timeout', itemIndex, 60),
			tries: executeFunctions.getNodeParameter('tries', itemIndex, 5),
		}),
	web_research: (executeFunctions, itemIndex) =>
		cleanMcpArguments({
			query: executeFunctions.getNodeParameter('query', itemIndex),
			max_results: executeFunctions.getNodeParameter('max_results', itemIndex, 12),
			num_sources: executeFunctions.getNodeParameter('num_sources', itemIndex, 5),
			suggested_countries: executeFunctions.getNodeParameter('suggested_countries', itemIndex, []),
		}),
};

function assertCommandEnabled(command: UpRockCommand): void {
	if (command === 'sweep' && !isSweepEnabled()) {
		throw new ApplicationError('The sweep command is temporarily disabled in this build.');
	}
}

function buildCommandArguments(
	executeFunctions: IExecuteFunctions,
	command: string,
	itemIndex: number,
): IDataObject {
	if (!isUpRockCommand(command)) {
		throw new ApplicationError(`Unsupported UpRock command: ${command}`);
	}

	assertCommandEnabled(command);

	return commandArgumentBuilders[command](executeFunctions, itemIndex);
}

function isDataObject(value: unknown): value is IDataObject {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasHttpStatus(value: IDataObject | undefined): boolean {
	const status = value?.status ?? value?.statusCode ?? value?.httpCode;

	return typeof status === 'number' || typeof status === 'string';
}

function isHttpError(error: unknown): error is JsonObject {
	if (!isDataObject(error)) {
		return false;
	}

	const response = isDataObject(error.response) ? error.response : undefined;
	const options = isDataObject(error.options)
		? error.options
		: isDataObject(error.config)
			? error.config
			: undefined;

	return (
		hasHttpStatus(error) ||
		hasHttpStatus(response) ||
		response?.body !== undefined ||
		response?.data !== undefined ||
		response?.headers !== undefined ||
		typeof options?.url === 'string' ||
		typeof error.url === 'string'
	);
}

function toNodeApiErrorResponse(error: JsonObject): JsonObject {
	if (!(error instanceof Error)) {
		return error;
	}

	const errorDetails = error as Error & Record<string, unknown>;
	const payload: Record<string, unknown> = {
		name: error.name,
		message: error.message,
	};

	for (const key of ['status', 'statusCode', 'httpCode', 'code', 'response', 'error'] as const) {
		if (errorDetails[key] !== undefined) {
			payload[key] = errorDetails[key];
		}
	}

	const requestOptions = isDataObject(errorDetails.options)
		? errorDetails.options
		: isDataObject(errorDetails.config)
			? errorDetails.config
			: undefined;

	if (requestOptions) {
		payload.options = {
			url: requestOptions.url,
			method: requestOptions.method,
			headers: requestOptions.headers,
		};
	}

	return payload as JsonObject;
}

function getMcpDebug(error: unknown): IDataObject | undefined {
	if (!(error instanceof Error)) {
		return undefined;
	}

	const mcpDebug = (error as ErrorWithMcpDebug).mcpDebug;

	return isDataObject(mcpDebug) ? mcpDebug : undefined;
}

function attachMcpDebug(error: unknown, mcpDebug: IDataObject): Error {
	const baseError = error instanceof Error ? error : new Error(getErrorMessage(error));
	(baseError as ErrorWithMcpDebug).mcpDebug = mcpDebug;
	return baseError;
}

function formatErrorWithMcpDebug(message: string, mcpDebug?: IDataObject): string {
	if (!mcpDebug) {
		return message;
	}

	return `${message}\nMCP debug: ${JSON.stringify(mcpDebug)}`;
}

function getStringValue(value: unknown): string | undefined {
	return typeof value === 'string' ? value : undefined;
}

function getResourceText(output: IDataObject | undefined): string | undefined {
	return (
		getStringValue(output?.text) ??
		(isDataObject(output?.result) ? getStringValue(output.result.text) : undefined)
	);
}

function getResourceContentType(output: IDataObject | undefined): string | undefined {
	return (
		getStringValue(output?.contentType) ??
		getStringValue(output?.mimeType) ??
		(isDataObject(output?.result)
			? (getStringValue(output.result.contentType) ?? getStringValue(output.result.mimeType))
			: undefined)
	);
}

function getResourceSizeBytes(output: IDataObject | undefined): number | undefined {
	const sizeBytes =
		output?.sizeBytes ?? (isDataObject(output?.result) ? output.result.sizeBytes : undefined);
	return typeof sizeBytes === 'number' ? sizeBytes : undefined;
}

async function executeSweepCommandWithDebug(
	executeFunctions: IExecuteFunctions,
	args: IDataObject,
	itemIndex: number,
): Promise<IDataObject> {
	const initialize = {
		headers: buildMcpRequestHeaders(),
		body: buildMcpInitializeRequest(),
	};
	let session: UpRockMcpSession;

	try {
		session = await initializeUpRockMcpSession.call(executeFunctions, itemIndex);
	} catch (error) {
		const transportDebug = getMcpDebug(error);
		throw attachMcpDebug(error, {
			initialize,
			...(transportDebug ?? {}),
		});
	}

	const toolCallRequest = buildMcpToolCallRequest('sweep', args);
	const initialized = {
		headers: buildMcpRequestHeaders(session.sessionId),
		body: buildMcpInitializedNotificationRequest(),
	};
	const toolCall = {
		headers: buildMcpRequestHeaders(session.sessionId),
		body: toolCallRequest,
	};
	let sweepResult: IDataObject;

	try {
		sweepResult = await callUpRockMcpToolInSession.call(executeFunctions, session, 'sweep', args);
	} catch (error) {
		const transportDebug = getMcpDebug(error);
		throw attachMcpDebug(error, {
			sessionId: session.sessionId,
			initialize,
			initialized,
			toolCall,
			...(transportDebug ?? {}),
		});
	}

	const output = normalizeMcpToolResult('sweep', sweepResult as McpToolResult);

	output.mcpDebug = {
		sessionId: session.sessionId,
		initialize,
		initialized,
		toolCall,
	};

	return output;
}

async function executeFetchCommand(
	executeFunctions: IExecuteFunctions,
	args: IDataObject,
	itemIndex: number,
): Promise<IDataObject> {
	const session = await initializeUpRockMcpSession.call(executeFunctions, itemIndex);
	const crawlResult = await callUpRockMcpToolInSession.call(
		executeFunctions,
		session,
		'crawl_fetch',
		args,
	);
	const crawl = normalizeMcpToolResult('crawl_fetch', crawlResult as McpToolResult);
	const markdownUri = getStringValue(
		isDataObject(crawl.resourceUris) ? crawl.resourceUris.markdown : undefined,
	);
	const htmlUri = getStringValue(
		isDataObject(crawl.resourceUris) ? crawl.resourceUris.html : undefined,
	);
	let markdown: IDataObject | undefined;
	let html: IDataObject | undefined;

	if (markdownUri) {
		const markdownResult = await callUpRockMcpToolInSession.call(
			executeFunctions,
			session,
			'resource_fetch',
			{ uri: markdownUri },
		);
		markdown = normalizeMcpToolResult('resource_fetch', markdownResult as McpToolResult);
	}

	if (htmlUri) {
		const htmlResult = await callUpRockMcpToolInSession.call(
			executeFunctions,
			session,
			'resource_fetch',
			{ uri: htmlUri },
		);
		html = normalizeMcpToolResult('resource_fetch', htmlResult as McpToolResult);
	}

	return {
		command: 'fetch',
		url: args.url,
		status: crawl.status,
		job_id: crawl.job_id,
		meta: crawl.meta,
		summary: crawl.summary,
		resourceUris: crawl.resourceUris,
		crawl,
		markdown: markdown
			? {
					uri: markdownUri,
					text: getResourceText(markdown),
					contentType: getResourceContentType(markdown),
					sizeBytes: getResourceSizeBytes(markdown),
					result: markdown.result,
				}
			: undefined,
		html: html
			? {
					uri: htmlUri,
					text: getResourceText(html),
					contentType: getResourceContentType(html),
					sizeBytes: getResourceSizeBytes(html),
					result: html.result,
				}
			: undefined,
	};
}

function getHeader(headers: IDataObject | undefined, name: string): string | undefined {
	const header = headers?.[name] ?? headers?.[name.toLowerCase()] ?? headers?.[name.toUpperCase()];

	if (Array.isArray(header)) {
		return typeof header[0] === 'string' ? header[0] : undefined;
	}

	return typeof header === 'string' ? header : undefined;
}

async function requestMcpJsonRpc(
	testFunctions: ICredentialTestFunctions,
	url: string,
	body: IDataObject,
	sessionId?: string,
): Promise<CredentialTestHttpResponse> {
	const response = (await testFunctions.helpers.request({
		method: 'POST',
		uri: url,
		headers: buildMcpRequestHeaders(sessionId),
		body,
		json: true,
		resolveWithFullResponse: true,
	})) as CredentialTestHttpResponse & { body?: CredentialTestHttpResponse['body'] | string };

	return {
		...response,
		body: parseMcpJsonRpcResponse(response.body),
	};
}

async function upRockCrawlerCredentialTest(
	this: ICredentialTestFunctions,
	credential: ICredentialsDecrypted<ICredentialDataDecryptedObject>,
): Promise<INodeCredentialTestResult> {
	try {
		const url = buildUpRockMcpUrl((credential.data ?? {}) as UpRockCrawlerCredentials);
		const initializeResponse = await requestMcpJsonRpc(this, url, {
			jsonrpc: '2.0',
			id: 1,
			method: 'initialize',
			params: {
				protocolVersion: MCP_PROTOCOL_VERSION,
				capabilities: {},
				clientInfo: MCP_CLIENT_INFO,
			},
		});

		if (initializeResponse.body?.error) {
			throw new ApplicationError(initializeResponse.body.error.message ?? 'Initialize failed');
		}

		const sessionId = getHeader(initializeResponse.headers, 'mcp-session-id');

		if (!sessionId) {
			throw new ApplicationError('Initialize did not return a session ID.');
		}

		await requestMcpJsonRpc(
			this,
			url,
			{
				jsonrpc: '2.0',
				method: 'notifications/initialized',
			},
			sessionId,
		);

		const toolsResponse = await requestMcpJsonRpc(
			this,
			url,
			{
				jsonrpc: '2.0',
				id: 2,
				method: 'tools/list',
				params: {},
			},
			sessionId,
		);

		if (toolsResponse.body?.error) {
			throw new ApplicationError(toolsResponse.body.error.message ?? 'tools/list failed');
		}

		const tools = Array.isArray(toolsResponse.body?.result?.tools)
			? toolsResponse.body.result.tools
			: [];
		const toolNames = tools
			.map((tool) =>
				typeof tool === 'object' && tool !== null ? (tool as IDataObject).name : undefined,
			)
			.filter((name): name is string => typeof name === 'string');
		const missingTools = EXPECTED_UPROCK_MCP_TOOLS.filter(
			(toolName) => !toolNames.includes(toolName),
		);

		if (missingTools.length > 0) {
			throw new ApplicationError(
				`MCP server is missing expected tools: ${missingTools.join(', ')}`,
			);
		}

		return {
			status: 'OK',
			message: 'Connection successful',
		};
	} catch (error) {
		return {
			status: 'Error',
			message: getErrorMessage(error),
		};
	}
}

export class UpRockCrawler implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Scraper - UpRock Crawler',
		name: 'upRockCrawler',
		icon: { light: 'file:../../icons/uprock.svg', dark: 'file:../../icons/uprock.dark.svg' },
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["command"]}}',
		description:
			isSweepEnabled()
				? 'Crawl URLs, fetch rendered content, run regional sweeps, and research the web through UpRock'
				: 'Crawl URLs, fetch rendered content, and research the web through UpRock',
		defaults: {
			name: 'Scraper - UpRock Crawler',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'upRockCrawlerApi',
				required: true,
				testedBy: 'upRockCrawlerCredentialTest',
			},
		],
		properties: [...commandDescription],
	};

	methods = {
		credentialTest: {
			upRockCrawlerCredentialTest,
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			const command = this.getNodeParameter('command', itemIndex) as string;
			const includeDebugRequest =
				command === 'sweep'
					? (this.getNodeParameter('includeDebugRequest', itemIndex, false) as boolean)
					: false;

			try {
				const args = buildCommandArguments(this, command, itemIndex);
				let outputJson: IDataObject;

				if (command === 'fetch') {
					outputJson = await executeFetchCommand(this, args, itemIndex);
				} else if (command === 'sweep' && includeDebugRequest) {
					outputJson = await executeSweepCommandWithDebug(this, args, itemIndex);
				} else {
					const result = await callUpRockMcpTool.call(this, command, args, itemIndex);
					outputJson = normalizeMcpToolResult(command, result as McpToolResult);
				}

				returnData.push({
					json: outputJson,
					pairedItem: {
						item: itemIndex,
					},
				});
			} catch (error) {
				const mcpDebug = includeDebugRequest ? getMcpDebug(error) : undefined;
				const errorMessage = formatErrorWithMcpDebug(getErrorMessage(error), mcpDebug);

				if (!this.continueOnFail()) {
					if (isHttpError(error)) {
						throw new NodeApiError(this.getNode(), toNodeApiErrorResponse(error), { itemIndex });
					}

					throw new NodeOperationError(
						this.getNode(),
						error instanceof Error ? errorMessage : getErrorMessage(error),
						{ itemIndex },
					);
				}

				returnData.push({
					json: {
						command,
						error: errorMessage,
						...(mcpDebug ? { mcpDebug } : {}),
					},
					pairedItem: {
						item: itemIndex,
					},
				});
			}
		}

		return [returnData];
	}
}
