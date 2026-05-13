import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);

const {
	UpRockCrawlerApi,
} = require('../dist/credentials/UpRockCrawlerApi.credentials.js');

test('credential exposes an MCP initialize test request', () => {
	const credential = new UpRockCrawlerApi();

	assert.equal(credential.test.request.method, 'POST');
	assert.equal(credential.test.request.headers.Accept, 'application/json, text/event-stream');
	assert.equal(credential.test.request.body.method, 'initialize');
	assert.equal(credential.test.request.body.params.protocolVersion, '2024-11-05');
	assert.match(credential.test.request.url, /^=\{\{.+\/mcp"\}\}$/);
});
