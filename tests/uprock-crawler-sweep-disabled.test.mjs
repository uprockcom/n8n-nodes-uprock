import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);

const { setSweepEnabled } = require('../dist/nodes/UpRockCrawler/shared/features.js');
setSweepEnabled(false);

const { UpRockCrawler } = require('../dist/nodes/UpRockCrawler/UpRockCrawler.node.js');
const { commandDescription } = require('../dist/nodes/UpRockCrawler/commands/index.js');

function createExecuteContext(parameterItems = [{}]) {
	const requests = [];

	return {
		requests,
		context: {
			async getCredentials() {
				return {
					apiKey: '00000000-0000-4000-8000-000000000000',
					mcpBaseUrl: 'https://mcp.test/',
				};
			},
			getInputData() {
				return parameterItems.map(() => ({ json: {} }));
			},
			getNodeParameter(name, itemIndex, defaultValue) {
				const parameters = parameterItems[itemIndex] ?? {};

				return Object.hasOwn(parameters, name) ? parameters[name] : defaultValue;
			},
			continueOnFail() {
				return false;
			},
			getNode() {
				return {
					name: 'upRockCrawler',
				};
			},
			helpers: {
				async httpRequest(options) {
					requests.push(options);
					throw new Error('HTTP request should not be called when sweep is disabled');
				},
			},
		},
	};
}

test('hides sweep from the command selector by default', () => {
	const commandProperty = commandDescription.find((property) => property.name === 'command');

	assert.ok(commandProperty);
	assert.equal(
		commandProperty.options.some((option) => option.value === 'sweep'),
		false,
	);
});

test('rejects sweep execution when the feature flag is disabled', async () => {
	const node = new UpRockCrawler();
	const { context, requests } = createExecuteContext([
		{
			command: 'sweep',
			url: 'https://example.com',
		},
	]);

	await assert.rejects(
		() => node.execute.call(context),
		(error) => {
			assert.match(
				error.message,
				/The sweep command is temporarily disabled in this build\./,
			);
			assert.equal(requests.length, 0);
			return true;
		},
	);
});
