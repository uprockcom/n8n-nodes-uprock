import type { IDataObject } from 'n8n-workflow';

type ParsedMcpContent = IDataObject | IDataObject[] | string | number | boolean | null;

export type McpContentBlock = IDataObject & {
	type?: string;
	text?: string;
	mimeType?: string;
	data?: string;
};

export type McpToolResult = IDataObject & {
	content?: McpContentBlock[];
	isError?: boolean;
};

export type NormalizeMcpToolResultOptions = {
	includeRaw?: boolean;
};

function isDataObject(value: unknown): value is IDataObject {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toOutputValue(value: unknown): string | number | boolean | null {
	if (
		typeof value === 'string' ||
		typeof value === 'number' ||
		typeof value === 'boolean' ||
		value === null
	) {
		return value;
	}

	return JSON.stringify(value) ?? String(value);
}

export function parseMcpTextContent(text: string): ParsedMcpContent {
	try {
		return JSON.parse(text) as ParsedMcpContent;
	} catch {
		return text;
	}
}

function normalizeMcpContentBlock(block: McpContentBlock): ParsedMcpContent | McpContentBlock {
	if (block.type === 'text' && typeof block.text === 'string') {
		return parseMcpTextContent(block.text);
	}

	return block;
}

function getStringValue(source: IDataObject, keys: string[]): string | undefined {
	for (const key of keys) {
		const value = source[key];

		if (typeof value === 'string') {
			return value;
		}
	}

	return undefined;
}

function getNumberValue(source: IDataObject, keys: string[]): number | undefined {
	for (const key of keys) {
		const value = source[key];

		if (typeof value === 'number') {
			return value;
		}
	}

	return undefined;
}

function getObjectValue(source: IDataObject, keys: string[]): IDataObject | undefined {
	for (const key of keys) {
		const value = source[key];

		if (isDataObject(value)) {
			return value;
		}
	}

	return undefined;
}

function getArrayValue(source: IDataObject, keys: string[]): unknown[] | undefined {
	for (const key of keys) {
		const value = source[key];

		if (Array.isArray(value)) {
			return value;
		}
	}

	return undefined;
}

function getNestedStringValue(source: IDataObject, path: string[]): string | undefined {
	let current: unknown = source;

	for (const key of path) {
		if (!isDataObject(current)) {
			return undefined;
		}

		current = current[key];
	}

	return typeof current === 'string' ? current : undefined;
}

function normalizeCrawlFetchResult(result: unknown): IDataObject {
	if (!isDataObject(result)) {
		return {
			result: toOutputValue(result),
		};
	}

	const htmlResource = getNestedStringValue(result, ['content', 'html', 'resource']);
	const markdownResource = getNestedStringValue(result, ['content', 'markdown', 'resource']);
	const viewportResource = getNestedStringValue(result, ['screenshots', 'viewport', 'resource']);

	const normalized: IDataObject = {
		status: getStringValue(result, ['status']),
		job_id: getStringValue(result, ['job_id', 'jobId']),
		meta: getObjectValue(result, ['meta']),
		summary: getStringValue(result, ['summary']),
		content: {
			html: {
				resource: htmlResource,
			},
			markdown: {
				resource: markdownResource,
			},
		},
		screenshots: {
			viewport: {
				resource: viewportResource,
			},
		},
		resourceUris: {
			html: htmlResource,
			markdown: markdownResource,
			viewportScreenshot: viewportResource,
		},
	};

	return normalized;
}

function collectScreenshotResourceUris(value: unknown, resources: string[] = []): string[] {
	if (Array.isArray(value)) {
		for (const item of value) {
			collectScreenshotResourceUris(item, resources);
		}

		return resources;
	}

	if (!isDataObject(value)) {
		return resources;
	}

	for (const [key, nestedValue] of Object.entries(value)) {
		if (
			key === 'resource' &&
			typeof nestedValue === 'string' &&
			(nestedValue.startsWith('sweep://') || nestedValue.includes('/screenshot'))
		) {
			resources.push(nestedValue);
		}

		collectScreenshotResourceUris(nestedValue, resources);
	}

	return resources;
}

function collectMetricFields(source: IDataObject): IDataObject {
	const metrics: IDataObject = {};
	const metricKeys = [
		'ttfb',
		'TTFB',
		'fcp',
		'FCP',
		'lcp',
		'LCP',
		'cls',
		'CLS',
		'load_time',
		'loadTime',
		'time_ms',
		'timeMs',
		'transfer_size',
		'transferSize',
		'http_protocol',
		'httpProtocol',
	];

	for (const key of metricKeys) {
		const value = source[key];

		if (typeof value === 'number' || typeof value === 'string') {
			metrics[key] = value;
		}
	}

	const nestedMetrics = getObjectValue(source, ['metrics', 'webVitals', 'web_vitals']);

	return {
		...metrics,
		...(nestedMetrics ?? {}),
	};
}

function normalizeSweepJob(job: unknown): IDataObject {
	if (!isDataObject(job)) {
		return {
			value: String(job),
		};
	}

	const screenshotResourceUris = collectScreenshotResourceUris(job);

	return {
		region: getStringValue(job, ['region', 'country']),
		status: getStringValue(job, ['status', 'state']),
		error: getStringValue(job, ['error', 'error_message', 'errorMessage']),
		metrics: collectMetricFields(job),
		screenshotResourceUris,
		raw: job,
	};
}

function normalizeSweepResult(result: unknown): IDataObject {
	if (!isDataObject(result)) {
		return {
			result: toOutputValue(result),
		};
	}

	const jobs = getArrayValue(result, ['jobs', 'results', 'checks']) ?? [];
	const normalizedJobs = jobs.map((job) => normalizeSweepJob(job));
	const failedJobErrors = normalizedJobs
		.map((job) => job.error)
		.filter((error): error is string => typeof error === 'string' && error.length > 0);
	const screenshotResourceUris = collectScreenshotResourceUris(result);
	const failedJobs = getNumberValue(result, ['failed_jobs', 'failedJobs']) ?? failedJobErrors.length;
	const totalJobs = getNumberValue(result, ['total_jobs', 'totalJobs']) ?? normalizedJobs.length;

	return {
		report_url: getStringValue(result, ['report_url', 'reportUrl']),
		totalJobs,
		failedJobs,
		completedJobs: getNumberValue(result, ['completed_jobs', 'completedJobs']),
		jobs: normalizedJobs,
		failedJobErrors,
		screenshotResourceUris,
		metrics: getObjectValue(result, ['metrics', 'summary', 'webVitals', 'web_vitals']),
	};
}

function normalizeResourceContent(content: IDataObject): IDataObject {
	const uri = getStringValue(content, ['uri', 'resource']);
	const mimeType = getStringValue(content, ['mimeType', 'mime_type', 'contentType', 'content_type']);
	const text = getStringValue(content, ['text', 'content']);
	const data = getStringValue(content, ['data', 'blob']);
	const sizeBytes =
		typeof content.size_bytes === 'number'
			? content.size_bytes
			: typeof content.sizeBytes === 'number'
				? content.sizeBytes
				: undefined;

	const normalized: IDataObject = {};

	if (uri) {
		normalized.uri = uri;
	}

	if (mimeType) {
		normalized.mimeType = mimeType;
		normalized.contentType = mimeType;
	}

	if (text !== undefined) {
		normalized.text = text;
	}

	if (data !== undefined) {
		normalized.data = data;
		normalized.dataSizeBytes = data.length;
	}

	if (sizeBytes !== undefined) {
		normalized.sizeBytes = sizeBytes;
	}

	if (text === undefined && data === undefined) {
		normalized.metadata = content;
	}

	return normalized;
}

function normalizeResourceFetchResult(result: unknown): IDataObject {
	if (Array.isArray(result)) {
		return {
			resources: result.map((item) =>
				isDataObject(item) ? normalizeResourceContent(item) : { value: item },
			),
		};
	}

	if (!isDataObject(result)) {
		return {
			text: typeof result === 'string' ? result : undefined,
			value: typeof result === 'string' ? undefined : toOutputValue(result),
		};
	}

	const contents = Array.isArray(result.contents) ? result.contents : undefined;

	if (contents) {
		return {
			...result,
			resources: contents.map((item) =>
				isDataObject(item) ? normalizeResourceContent(item) : { value: item },
			),
		};
	}

	return normalizeResourceContent(result);
}

function getPrimaryResource(result: IDataObject): IDataObject | undefined {
	if (Array.isArray(result.resources) && isDataObject(result.resources[0])) {
		return result.resources[0];
	}

	return result;
}

function normalizeSearchResult(item: unknown): IDataObject {
	if (!isDataObject(item)) {
		return { value: String(item) };
	}

	return {
		url: getStringValue(item, ['url']),
		title: getStringValue(item, ['title']),
		description: getStringValue(item, ['description']),
	};
}

function normalizeWebResearchResult(result: unknown): IDataObject {
	if (!isDataObject(result)) {
		return {
			result: toOutputValue(result),
		};
	}

	const results = Array.isArray(result.results)
		? result.results.map((item) => normalizeSearchResult(item))
		: [];

	return {
		query: getStringValue(result, ['query']),
		count: getNumberValue(result, ['count']),
		results,
	};
}

export function normalizeMcpToolResult(
	command: string,
	result: McpToolResult,
	options: NormalizeMcpToolResultOptions = {},
): IDataObject {
	const content = Array.isArray(result.content) ? result.content : [];
	const parsedContent = content.map(normalizeMcpContentBlock);
	const parsedResult = parsedContent.length === 1 ? parsedContent[0] : parsedContent;
	const primaryParsedResult = parsedContent.find(isDataObject) ?? parsedResult;
	const isError = result.isError === true;

	const output: IDataObject = {
		command,
		isError,
		mcpResult: parsedResult,
		result:
			command === 'resource_fetch'
				? normalizeResourceFetchResult(primaryParsedResult)
				: command === 'crawl_fetch'
					? normalizeCrawlFetchResult(primaryParsedResult)
					: command === 'sweep'
						? normalizeSweepResult(primaryParsedResult)
						: command === 'web_research'
							? normalizeWebResearchResult(primaryParsedResult)
							: parsedResult,
	};

	if (command === 'crawl_fetch' && isDataObject(output.result)) {
		output.status = output.result.status;
		output.job_id = output.result.job_id;
		output.meta = output.result.meta;
		output.summary = output.result.summary;
		output.content = output.result.content;
		output.screenshots = output.result.screenshots;
		output.resourceUris = output.result.resourceUris;
	}

	if (command === 'resource_fetch' && isDataObject(output.result)) {
		const primaryResource = getPrimaryResource(output.result);

		output.uri = primaryResource?.uri;
		output.mimeType = primaryResource?.mimeType;
		output.contentType = primaryResource?.contentType;
		output.text = primaryResource?.text;
		output.data = primaryResource?.data;
		output.dataSizeBytes = primaryResource?.dataSizeBytes;
		output.sizeBytes = primaryResource?.sizeBytes;
		output.metadata = primaryResource?.metadata;
		output.resources = output.result.resources;
	}

	if (command === 'sweep' && isDataObject(output.result)) {
		output.report_url = output.result.report_url;
		output.totalJobs = output.result.totalJobs;
		output.failedJobs = output.result.failedJobs;
		output.completedJobs = output.result.completedJobs;
		output.jobs = output.result.jobs;
		output.metrics = output.result.metrics;
		output.failedJobErrors = output.result.failedJobErrors;
		output.screenshotResourceUris = output.result.screenshotResourceUris;
	}

	if (command === 'web_research' && isDataObject(output.result)) {
		output.query = output.result.query;
		output.count = output.result.count;
		output.results = output.result.results;
	}

	if (isError || options.includeRaw === true) {
		output.raw = result;
	}

	return output;
}
