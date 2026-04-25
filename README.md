# @uprock-ai/n8n-nodes-uprock

This is an n8n community node package for UpRock. It provides the **UpRock Crawler** node for running UpRock MCP crawler, sweep, resource fetch, and web research commands in n8n workflows.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

- [Installation](#installation)
- [Releasing](#releasing)
- [Use The UpRock Node In Your Own n8n Instance](#use-the-uprock-node-in-your-own-n8n-instance)
- [Operations](#operations)
- [Credentials](#credentials)
- [Usage](#usage)
- [Compatibility](#compatibility)
- [Resources](#resources)

## Installation

Install the package named `@uprock-ai/n8n-nodes-uprock` in a self-hosted n8n instance. n8n Cloud doesn't load unverified npm community node packages, so run this node on self-hosted n8n.

You can install community nodes from the n8n UI when your instance supports it:

1. Go to **Settings** > **Community Nodes**.
2. Select **Install**.
3. Enter `@uprock-ai/n8n-nodes-uprock`.
4. Restart n8n if your deployment doesn't reload community packages automatically.

For command-line and production deployment patterns, use the runbooks below.

## Releasing

npm publishing is automated from GitHub Releases through [`.github/workflows/release.yml`](.github/workflows/release.yml).

Before using it, add an `NPM_TOKEN` repository secret with publish access to the `@uprock-ai/n8n-nodes-uprock` package on npm.

Release flow:

1. Make sure `gh` is authenticated and your local `main` matches `origin/main`.
2. Preview the next release with `npm run release:dry-run`.
3. Create the release with `npm run release`.
4. The script fetches the latest semver tag, bumps the package minor version, updates `package-lock.json` and `CHANGELOG.md`, commits `chore(release): vX.Y.Z`, pushes `main` and the new tag, and creates the GitHub Release.
5. GitHub Actions installs dependencies, checks that the tag matches `package.json`, runs `npm run verify:static`, builds the package, performs an npm dry run, and then publishes it.

Stable GitHub Releases publish to npm with the `latest` dist-tag. GitHub prereleases publish with the `next` dist-tag.
For this repository, npm provenance is skipped while the GitHub source repository is private, because npm only accepts provenance for public source repositories.

Use `./scripts/release-minor.sh --prerelease` if you need the GitHub Release marked as a prerelease.

## Use The UpRock Node In Your Own n8n Instance

These instructions are intended for DevOps teams running self-hosted n8n. They assume the npm package name is `@uprock-ai/n8n-nodes-uprock` and the node display name is **UpRock Crawler**.

### Prerequisites

- Self-hosted n8n with community packages enabled. Keep `N8N_COMMUNITY_PACKAGES_ENABLED=true` explicit in Docker, Kubernetes, and systemd configs.
- Owner or admin access to install community nodes.
- Network egress from n8n to `https://mcp.uprock.ai`.
- An UpRock MCP API key UUID for the n8n credential.
- The same package version installed on every n8n process that can execute workflows. In queue mode, install it on the main, webhook, and worker containers or hosts.

### Docker

The safest Docker setup is to persist n8n's user data directory, because n8n loads community packages from disk at startup. Persist `/home/node/.n8n`, or at minimum `/home/node/.n8n/nodes`.

Example Docker Compose service:

```yaml
services:
  n8n:
    image: n8nio/n8n:latest
    container_name: n8n
    ports:
      - '5678:5678'
    environment:
      N8N_COMMUNITY_PACKAGES_ENABLED: 'true'
      GENERIC_TIMEZONE: 'UTC'
      TZ: 'UTC'
    volumes:
      - n8n_data:/home/node/.n8n

volumes:
  n8n_data:
```

Use a pinned n8n image tag instead of `latest` for production rollouts.

Install the package inside the running container:

```sh
docker exec -it -u node n8n sh
mkdir -p ~/.n8n/nodes
cd ~/.n8n/nodes
npm install @uprock-ai/n8n-nodes-uprock
exit
docker restart n8n
```

If your Compose service name is `n8n` but the container name is different, use:

```sh
docker compose exec -u node n8n sh
```

Upgrade or pin a specific package version by replacing `<version>` with the release you want:

```sh
docker exec -it -u node n8n sh
cd ~/.n8n/nodes
npm install @uprock-ai/n8n-nodes-uprock@<version>
exit
docker restart n8n
```

For blue/green, rolling, or queue-mode deployments, bake the package installation into the image or run the install step against the persistent n8n volume before starting the new containers. Do not deploy one worker version with the package and another without it.

### Without Docker

Install the package as the same OS user that runs n8n. Do not install it as `root` unless n8n itself runs as `root`.

For an n8n service user named `n8n`:

```sh
sudo -u n8n sh -lc 'mkdir -p ~/.n8n/nodes && cd ~/.n8n/nodes && npm install @uprock-ai/n8n-nodes-uprock'
sudo systemctl restart n8n
```

For a local npm-based n8n install running as your current user:

```sh
mkdir -p ~/.n8n/nodes
cd ~/.n8n/nodes
npm install @uprock-ai/n8n-nodes-uprock
n8n start
```

Upgrade or pin a package version by replacing `<version>` with the release you want:

```sh
cd ~/.n8n/nodes
npm install @uprock-ai/n8n-nodes-uprock@<version>
```

Restart every n8n process after installation or upgrade so n8n reloads the community package.

### Install An Unreleased Build From This Repository

Use this when testing a commit before it is published to npm:

```sh
npm ci
npm run build
npm pack
```

Copy the generated `uprock-ai-n8n-nodes-uprock-<version>.tgz` to the n8n host or container, then install it from the same `~/.n8n/nodes` directory:

```sh
cd ~/.n8n/nodes
npm install /path/to/uprock-ai-n8n-nodes-uprock-<version>.tgz
```

Restart n8n after installing the tarball.

### Configure The UpRock Credential

After n8n restarts:

1. Open n8n and create an **UpRock Crawler API** credential.
2. Paste only the UpRock API key UUID into **API Key UUID**.
3. Leave **MCP Base URL** as `https://mcp.uprock.ai` unless you are targeting a staging or local MCP endpoint.
4. Add an **UpRock Crawler** node to a workflow and choose a command.

### Operational Notes

- Keep the installed package version pinned in production change tickets and deployment manifests.
- Persist `/home/node/.n8n/nodes` for Docker deployments, otherwise package files can disappear when containers are recreated.
- If n8n reports missing community packages after a container replacement, verify that the persisted volume contains `~/.n8n/nodes/node_modules/@uprock-ai/n8n-nodes-uprock`.
- Community packages execute inside the n8n runtime. Review and approve upgrades the same way you handle other workflow runtime dependencies.
- n8n's official references: [community node installation](https://docs.n8n.io/integrations/community-nodes/installation/), [manual npm installation](https://docs.n8n.io/integrations/community-nodes/installation/manual-install/), and [community node troubleshooting](https://docs.n8n.io/integrations/community-nodes/troubleshooting/).

## Operations

The UpRock Crawler node exposes one **Command** selector. Most commands map directly to UpRock MCP tools, while `fetch` is a convenience command that chains MCP calls:

- `fetch`: Crawl a URL, then return both Markdown and HTML content
- `crawl_fetch`: Fetch a URL through the UpRock crawl network
- `resource_fetch`: Fetch full content for a `crawl://` or `sweep://` resource URI
- `sweep`: Test website reliability and performance across geographic regions
- `web_research`: Search the web across search engines and geographic perspectives

### Command Parameters

`fetch`

- Required: `url`
- Optional: `method`, `body`, `country`, `deviceType`, `timeoutSeconds`, `retries`
- Returns both Markdown and HTML content plus crawl metadata
- Internally runs `crawl_fetch`, then `resource_fetch` for returned Markdown and HTML resources

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

Use `fetch` when you want the crawler output and the full page content in one node. It returns crawl metadata, summary, resource URIs, Markdown text, and HTML text.

Use `resource_fetch` when a prior command returns a `crawl://` or `sweep://` resource URI. Markdown and HTML resources return text content, while screenshot-like resources return resource metadata and binary-safe fields.

Use `sweep` to run regional reliability checks. The default regions are `NA`, `EU`, and `APAC`, and checks run concurrently.

Use `web_research` for search. Put geographic terms in the query only when they are the subject of the search. Use **Suggested Countries** when you want search results from a particular geographic perspective.

## Common Workflows

Fetch a URL:

1. Add an UpRock Crawler node.
2. Select `fetch`.
3. Set `url`.
4. Read Markdown from `markdown.text` and HTML from `html.text`.

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
