import type {
	IDataObject,
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
} from 'n8n-workflow';

export const UPROCK_CRAWLER_CREDENTIAL_TYPE = 'upRockCrawlerApi';

export const DEFAULT_MCP_BASE_URL = 'https://mcp.uprock.ai';

export const MCP_ENDPOINT_PATH = 'mcp';

export const MCP_PROTOCOL_VERSION = '2024-11-05';

export const MCP_CLIENT_INFO = {
	name: 'n8n-nodes-uprock',
	version: '0.1.0',
};

export const EXPECTED_UPROCK_MCP_TOOLS = [
	'crawl_fetch',
	'resource_fetch',
	'sweep',
	'web_research',
] as const;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type UpRockMcpFunctions =
	| IHookFunctions
	| IExecuteFunctions
	| IExecuteSingleFunctions
	| ILoadOptionsFunctions;

type JsonRpcError = {
	code?: number;
	message?: string;
	data?: IDataObject | IDataObject[] | string | number | boolean | null;
};

type JsonRpcResponse<T extends IDataObject = IDataObject> = {
	jsonrpc?: '2.0';
	id?: number | string;
	result?: T;
	error?: JsonRpcError;
};

type McpHttpResponse<T extends IDataObject = IDataObject> = {
	body?: JsonRpcResponse<T>;
	headers?: IDataObject;
	statusCode?: number;
};

type RawMcpHttpResponse = {
	body?: JsonRpcResponse | string;
	headers?: IDataObject;
	statusCode?: number;
};

export type UpRockCrawlerCredentials = {
	apiKey?: string;
	mcpBaseUrl?: string;
};

export type UpRockMcpSession = {
	url: string;
	sessionId: string;
	protocolVersion?: string;
	capabilities?: IDataObject;
	serverInfo?: IDataObject;
};

export function assertValidUpRockApiKey(apiKey?: string): string {
	const trimmedApiKey = apiKey?.trim();

	if (!trimmedApiKey) {
		throw new Error('UpRock API key UUID is required.');
	}

	if (!UUID_PATTERN.test(trimmedApiKey)) {
		throw new Error('UpRock API key must be a valid UUID.');
	}

	return trimmedApiKey;
}

export function buildUpRockMcpUrl(credentials: UpRockCrawlerCredentials): string {
	const apiKey = assertValidUpRockApiKey(credentials.apiKey);

	const baseUrl = (credentials.mcpBaseUrl?.trim() || DEFAULT_MCP_BASE_URL).replace(/\/+$/, '');

	return `${baseUrl}/${encodeURIComponent(apiKey)}/${MCP_ENDPOINT_PATH}`;
}

export async function getUpRockMcpUrl(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	itemIndex = 0,
): Promise<string> {
	const credentials = await this.getCredentials<UpRockCrawlerCredentials>(
		UPROCK_CRAWLER_CREDENTIAL_TYPE,
		itemIndex,
	);

	return buildUpRockMcpUrl(credentials);
}

function getHeader(headers: IDataObject | undefined, name: string): string | undefined {
	const header = headers?.[name] ?? headers?.[name.toLowerCase()] ?? headers?.[name.toUpperCase()];

	if (Array.isArray(header)) {
		return typeof header[0] === 'string' ? header[0] : undefined;
	}

	return typeof header === 'string' ? header : undefined;
}

function assertJsonRpcResult<T extends IDataObject>(
	method: string,
	response?: JsonRpcResponse<T>,
): T {
	if (response?.error) {
		throw new Error(`UpRock MCP ${method} failed: ${response.error.message ?? 'Unknown error'}`);
	}

	if (!response?.result) {
		throw new Error(`UpRock MCP ${method} did not return a result.`);
	}

	return response.result;
}

function parseServerSentEventJson(text: string): unknown {
	const events = text.split(/\r?\n\r?\n/);
	let lastParsedEvent: unknown;

	for (const event of events) {
		const data = event
			.split(/\r?\n/)
			.filter((line) => line.startsWith('data:'))
			.map((line) => line.slice('data:'.length).trim())
			.filter((line) => line.length > 0 && line !== '[DONE]')
			.join('\n');

		if (!data) {
			continue;
		}

		const parsed = JSON.parse(data);
		lastParsedEvent = parsed;

		if (
			typeof parsed === 'object' &&
			parsed !== null &&
			('result' in parsed || 'error' in parsed)
		) {
			return parsed;
		}
	}

	if (lastParsedEvent === undefined) {
		return JSON.parse(text);
	}

	return lastParsedEvent;
}

export function parseMcpJsonRpcResponse<T extends IDataObject>(
	body: JsonRpcResponse<T> | string | undefined,
): JsonRpcResponse<T> | undefined {
	if (typeof body === 'string') {
		if (body.trim().length === 0) {
			return undefined;
		}

		return parseServerSentEventJson(body) as JsonRpcResponse<T>;
	}

	return body;
}

async function postJsonRpc<T extends IDataObject>(
	this: UpRockMcpFunctions,
	url: string,
	body: IDataObject,
	sessionId?: string,
): Promise<McpHttpResponse<T>> {
	const headers: IDataObject = {
		Accept: 'application/json, text/event-stream',
		'Content-Type': 'application/json',
	};

	if (sessionId) {
		headers['Mcp-Session-Id'] = sessionId;
	}

	const options: IHttpRequestOptions = {
		method: 'POST',
		url,
		headers,
		body,
		json: true,
		returnFullResponse: true,
	};

	const response = (await this.helpers.httpRequest(options)) as RawMcpHttpResponse;

	return {
		body: parseMcpJsonRpcResponse<T>(response.body as JsonRpcResponse<T> | string | undefined),
		headers: response.headers,
		statusCode: response.statusCode,
	};
}

export async function initializeUpRockMcpSession(
	this: UpRockMcpFunctions,
	itemIndex = 0,
): Promise<UpRockMcpSession> {
	const url = await getUpRockMcpUrl.call(this, itemIndex);
	const response = await postJsonRpc.call(this, url, {
		jsonrpc: '2.0',
		id: 1,
		method: 'initialize',
		params: {
			protocolVersion: MCP_PROTOCOL_VERSION,
			capabilities: {},
			clientInfo: MCP_CLIENT_INFO,
		},
	});

	const result = assertJsonRpcResult('initialize', response.body);
	const sessionId = getHeader(response.headers, 'mcp-session-id');

	if (!sessionId) {
		throw new Error('UpRock MCP initialize did not return a session ID.');
	}

	await postJsonRpc.call(
		this,
		url,
		{
			jsonrpc: '2.0',
			method: 'notifications/initialized',
		},
		sessionId,
	);

	return {
		url,
		sessionId,
		protocolVersion:
			typeof result.protocolVersion === 'string' ? result.protocolVersion : undefined,
		capabilities:
			typeof result.capabilities === 'object' && result.capabilities !== null
				? (result.capabilities as IDataObject)
				: undefined,
		serverInfo:
			typeof result.serverInfo === 'object' && result.serverInfo !== null
				? (result.serverInfo as IDataObject)
				: undefined,
	};
}

export function buildMcpToolCallRequest(name: string, args: IDataObject): IDataObject {
	return {
		jsonrpc: '2.0',
		id: 2,
		method: 'tools/call',
		params: {
			name,
			arguments: args,
		},
	};
}

export async function callUpRockMcpTool(
	this: UpRockMcpFunctions,
	name: string,
	args: IDataObject,
	itemIndex = 0,
): Promise<IDataObject> {
	const session = await initializeUpRockMcpSession.call(this, itemIndex);
	return callUpRockMcpToolInSession.call(this, session, name, args);
}

export async function callUpRockMcpToolInSession(
	this: UpRockMcpFunctions,
	session: UpRockMcpSession,
	name: string,
	args: IDataObject,
): Promise<IDataObject> {
	const response = await postJsonRpc.call(
		this,
		session.url,
		buildMcpToolCallRequest(name, args),
		session.sessionId,
	);

	return assertJsonRpcResult('tools/call', response.body);
}
