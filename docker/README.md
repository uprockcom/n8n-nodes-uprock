# Local n8n Docker Harness

This repo includes a local Docker Compose setup for testing the built UpRock Crawler node inside n8n.

## Start n8n

```sh
./scripts/n8n-local.sh up
```

Or start it in the background:

```sh
./scripts/n8n-local.sh up-detached
```

Open n8n at:

```text
http://localhost:5678
```

## How It Loads The Node

The helper script runs `npm run build` first. Docker Compose then mounts the built files into n8n's custom node directory:

```text
./dist/nodes       -> /home/node/.n8n/custom/nodes
./dist/credentials -> /home/node/.n8n/custom/credentials
./dist/icons       -> /home/node/.n8n/custom/icons
```

n8n runtime state is stored in:

```text
.n8n-data/
```

That folder is local-only and ignored by git.

## Test The Node

1. Create an **UpRock Crawler API** credential.
2. Paste only the API key UUID into **API Key UUID**.
3. Add the **UpRock Crawler** node to a workflow.
4. Select one command: `crawl_fetch`, `resource_fetch`, `sweep`, or `web_research`.

## Common Commands

```sh
./scripts/n8n-local.sh logs
./scripts/n8n-local.sh rebuild
./scripts/n8n-local.sh down
```
