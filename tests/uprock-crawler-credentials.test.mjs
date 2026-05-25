import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);

const {
	UpRockCrawlerApi,
} = require('../dist/credentials/UpRockCrawlerApi.credentials.js');
const {
	MCP_CLIENT_INFO,
	MCP_PROTOCOL_VERSION,
	UPROCK_CLIENT_HEADER_NAME,
	UPROCK_CLIENT_HEADER_VALUE,
} = require('../dist/nodes/UpRockCrawler/shared/transport.js');

test('credential exposes an MCP initialize test request', () => {
	const credential = new UpRockCrawlerApi();

	assert.equal(credential.test.request.method, 'POST');
	assert.equal(credential.test.request.headers.Accept, 'application/json, text/event-stream');
	assert.equal(
		credential.test.request.headers[UPROCK_CLIENT_HEADER_NAME],
		UPROCK_CLIENT_HEADER_VALUE,
	);
	assert.equal(credential.test.request.body.method, 'initialize');
	assert.equal(credential.test.request.body.params.protocolVersion, MCP_PROTOCOL_VERSION);
	assert.deepEqual(credential.test.request.body.params.clientInfo, MCP_CLIENT_INFO);
	assert.match(credential.test.request.url, /^=\{\{.+\/mcp"\}\}$/);
});
