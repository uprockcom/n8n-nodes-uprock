# n8n-nodes-uprock

This is an n8n community node package for UpRock. It provides the **UpRock Crawler** node for running UpRock MCP crawler, sweep, resource fetch, and web research commands in n8n workflows.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

[Installation](#installation)
[Operations](#operations)
[Credentials](#credentials)
[Usage](#usage)
[Compatibility](#compatibility)
[Resources](#resources)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

## Operations

The UpRock Crawler node exposes one **Command** selector. Each command maps to an UpRock MCP tool:

- `crawl_fetch`: Fetch a URL through the UpRock crawl network
- `resource_fetch`: Fetch full content for a `crawl://` or `sweep://` resource URI
- `sweep`: Test website reliability and performance across geographic regions
- `web_research`: Search the web across search engines and geographic perspectives

### Command Parameters

`crawl_fetch`

- Required: `url`
- Optional: `method`, `body`, `country`, `deviceType`, `timeoutSeconds`, `retries`
- Default method: `CRAWL_FULL_PAGE`
- `body` is used only with `POST` and `PUT`

`resource_fetch`

- Required: `uri`
- Accepts resource URIs starting with `crawl://` or `sweep://`

`sweep`

- Required: `url`
- Optional: `device`, `regions`, `timeout`, `tries`
- Default device: `mobile`
- Default regions: `NA`, `EU`, `APAC`

`web_research`

- Required: `query`
- Optional: `max_results`, `num_sources`, `suggested_countries`
- Defaults: `max_results` is `12`, `num_sources` is `5`
- `suggested_countries` controls where the search runs from, not what the query is about

## Credentials

Create an **UpRock Crawler API** credential in n8n.

Required field:

- **API Key UUID**: Your UpRock MCP API key UUID

Advanced field:

- **MCP Base URL**: Defaults to `https://mcp.uprock.ai`; change only for local or staging MCP endpoints

The node builds the MCP URL internally as:

```text
https://mcp.uprock.ai/{apiKey}/mcp
```

You do not need to paste the full MCP URL into the node.

Credential flow:

1. Copy only the UUID part of your UpRock MCP URL.
2. Paste that UUID into **API Key UUID**.
3. Leave **MCP Base URL** unchanged unless you are testing a local or staging endpoint.
4. The node combines the base URL and UUID internally when it calls MCP.

## Usage

Use `crawl_fetch` to fetch a page. The default method is `CRAWL_FULL_PAGE`, which renders JavaScript and is the most reliable option for modern sites. Use `GET` when you know the target is a static page or API endpoint.

Use `resource_fetch` when a prior command returns a `crawl://` or `sweep://` resource URI. Markdown and HTML resources return text content, while screenshot-like resources return resource metadata and binary-safe fields.

Use `sweep` to run regional reliability checks. The default regions are `NA`, `EU`, and `APAC`, and checks run concurrently.

Use `web_research` for search. Put geographic terms in the query only when they are the subject of the search. Use **Suggested Countries** when you want search results from a particular geographic perspective.

## Common Workflows

Fetch a URL:

1. Add an UpRock Crawler node.
2. Select `crawl_fetch`.
3. Set `url`.
4. Use `resourceUris.markdown` or `resourceUris.html` from the output when you need the full extracted content.

Fetch returned resources:

1. Run `crawl_fetch` or `sweep`.
2. Copy a returned `crawl://` or `sweep://` URI into a second UpRock Crawler node.
3. Select `resource_fetch`.
4. Read `text` for markdown or HTML resources, or use the returned metadata fields for screenshot-like resources.

Run a regional sweep:

1. Select `sweep`.
2. Set `url`.
3. Keep the default regions `NA`, `EU`, and `APAC`, or choose the regions to test from.
4. Use `report_url`, `jobs`, `failedJobErrors`, and `screenshotResourceUris` from the output.

Search from a geographic perspective:

1. Select `web_research`.
2. Put the subject in `query`.
3. Use `suggested_countries` only to control where the search runs from.
4. Read normalized search rows from `results`.

## Compatibility

Compatible with n8n community node packages.

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- [UpRock](https://www.uprock.com/)
