# ddys-cli

[简体中文](README.zh-CN.md)

Official command-line tool for the DDYS API. It is meant for site owners and developers who need a quick way to search DDYS, inspect API responses, test a cache proxy, and generate ready-to-copy embed snippets.

## Features

- Search, suggestions, latest, hot, movie detail, sources, related, comments, calendar, dictionaries, collections, shares, requests, activities, user, and me commands.
- Authenticated write commands for request creation, comments, invalid-resource reports, follow, and unfollow.
- Raw API caller for debugging any `/api/v1` path.
- `ddys doctor` checks API or Worker proxy health.
- `ddys embed` generates Web Component snippets for `@ddysiodev/widgets`.
- `ddys worker-env` generates Cloudflare Worker proxy environment variables.
- Table, text, JSON, NDJSON, and raw envelope output.
- Zero runtime dependencies and standard `fetch`.

## Install

After publishing:

```bash
npm install -g @ddysiodev/ddys-cli
```

Before publishing, run it from this repository:

```bash
node packages/cli/bin/ddys.js search matrix
```

## Quick Start

```bash
ddys search matrix --limit 5
ddys suggest matrix
ddys latest --format json
ddys hot --type movie --limit 10
ddys movie i-robot
ddys sources i-robot
ddys calendar --year 2026 --month 7
```

Use a cache proxy or custom API base:

```bash
ddys latest --api-base https://example.com/ddys-api
```

Environment variables:

```text
DDYS_API_BASE=https://ddys.io/api/v1
DDYS_PUBLIC_BASE=https://ddys.io
DDYS_API_KEY=ddys_xxx
DDYS_TIMEOUT_MS=15000
DDYS_CLI_FORMAT=table
```

## API Debugging

```bash
ddys api GET /latest --query-param limit=3 --format json
ddys api GET /movies/i-robot/sources --raw
ddys api POST /requests --auth --json "{\"title\":\"Dune 2\",\"year\":2024}"
```

`--auth` adds `Authorization: Bearer $DDYS_API_KEY`.

## Write Commands

```bash
ddys create-request --title "Dune 2" --year 2024 --type movie
ddys comment-create --target-type movie --target-id 4786 --content "Great movie"
ddys comment-delete 12345
ddys report-invalid --resource-id 1002 --movie-id 4786 --reason dead_link
ddys follow diduan
ddys unfollow diduan
```

Authenticated commands require `DDYS_API_KEY`.

## Diagnostics

```bash
ddys doctor
ddys doctor --api-base https://example.com/ddys-api
ddys doctor --api-key ddys_xxx --format json
```

The doctor command checks `latest`, `types`, `search`, and `me` when an API key is present.

## Embed Snippets

```bash
ddys embed search
ddys embed latest --limit 12 --theme auto
ddys embed movie-card --slug i-robot
ddys embed all --api-base https://example.com/ddys-api
```

Generated snippets load `@ddysiodev/widgets` from jsDelivr by default.

## Worker Proxy Env

```bash
ddys worker-env
ddys worker-env --api-base https://ddys.io/api/v1 --allowed-origins https://example.com
ddys worker-env --format env
ddys worker-env --format json
```

## Shell Completion

```bash
ddys completion bash
ddys completion zsh
ddys completion powershell
```

## Output Formats

```bash
ddys search matrix --format table
ddys search matrix --format text
ddys search matrix --format json
ddys search matrix --format ndjson
ddys search matrix --raw
```

`--raw` prints the full DDYS API envelope.

## Development

```bash
node scripts/build.mjs
node scripts/check.mjs
node --test test/*.test.mjs
```

Release ZIP:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\build-package.ps1
```
