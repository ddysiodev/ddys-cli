# ddys-cli

[English](README.md)

低端影视 API 的官方命令行工具。它面向站长和开发者，用来快速搜索 DDYS、查看 API 响应、测试缓存代理，并生成可复制的嵌入代码。

## 功能

- 覆盖 search、latest、hot、movie、sources、related、comments、calendar、types、genres、regions、collections、shares、requests、activities、user、me 等读取命令。
- 支持 create-request、comment-create、comment-delete、report-invalid、follow、unfollow 等需要鉴权的写命令。
- `ddys api` 可调试任意 `/api/v1` 路径。
- `ddys doctor` 可检查官方 API 或 Worker 代理健康状态。
- `ddys embed` 可生成 `@ddysiodev/widgets` 的 Web Components 嵌入代码。
- `ddys worker-env` 可生成 Cloudflare Worker 代理环境变量。
- 支持 table、text、json、ndjson 和 raw envelope 输出。
- 零运行时依赖，使用标准 `fetch`。

## 安装

发布后：

```bash
npm install -g ddys-cli
```

发布前可在本仓库中运行：

```bash
node packages/cli/bin/ddys.js search matrix
```

## 快速开始

```bash
ddys search matrix --limit 5
ddys latest --format json
ddys hot --type movie --limit 10
ddys movie i-robot
ddys sources i-robot
ddys calendar --year 2026 --month 7
```

使用缓存代理或自定义 API Base：

```bash
ddys latest --api-base https://example.com/ddys-api
```

环境变量：

```text
DDYS_API_BASE=https://ddys.io/api/v1
DDYS_PUBLIC_BASE=https://ddys.io
DDYS_API_KEY=ddys_xxx
DDYS_TIMEOUT_MS=15000
DDYS_CLI_FORMAT=table
```

## API 调试

```bash
ddys api GET /latest --query-param limit=3 --format json
ddys api GET /movies/i-robot/sources --raw
ddys api POST /requests --auth --json "{\"title\":\"Dune 2\",\"year\":2024}"
```

`--auth` 会添加 `Authorization: Bearer $DDYS_API_KEY`。

## 写命令

```bash
ddys create-request --title "Dune 2" --year 2024 --type movie
ddys comment-create --target-type movie --target-id 4786 --content "Great movie"
ddys comment-delete 12345
ddys report-invalid --resource-id 1002 --movie-id 4786 --reason dead_link
ddys follow diduan
ddys unfollow diduan
```

鉴权命令需要配置 `DDYS_API_KEY`。

## 诊断

```bash
ddys doctor
ddys doctor --api-base https://example.com/ddys-api
ddys doctor --api-key ddys_xxx --format json
```

doctor 会检查 `latest`、`types`、`search`，如果有 API Key 还会检查 `me`。

## 嵌入代码

```bash
ddys embed search
ddys embed latest --limit 12 --theme auto
ddys embed movie-card --slug i-robot
ddys embed all --api-base https://example.com/ddys-api
```

生成的代码默认从 jsDelivr 加载 `@ddysiodev/widgets`。

## Worker 代理环境变量

```bash
ddys worker-env
ddys worker-env --api-base https://ddys.io/api/v1 --allowed-origins https://example.com
ddys worker-env --format env
ddys worker-env --format json
```

## Shell 补全

```bash
ddys completion bash
ddys completion zsh
ddys completion powershell
```

## 输出格式

```bash
ddys search matrix --format table
ddys search matrix --format text
ddys search matrix --format json
ddys search matrix --format ndjson
ddys search matrix --raw
```

`--raw` 会输出完整 DDYS API envelope。

## 开发

```bash
node scripts/build.mjs
node scripts/check.mjs
node --test test/*.test.mjs
```

Release ZIP：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\build-package.ps1
```
