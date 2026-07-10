import { VERSION } from './constants.js';

export function renderHelp(command = '') {
  if (command && command !== 'help') return renderCommandHelp(command);
  return `ddys-cli ${VERSION}

Usage:
  ddys <command> [arguments] [options]

Read commands:
  search <keyword>          Search DDYS
  suggest <keyword>         Show search suggestions
  latest                    Show latest updates
  hot                       Show hot content
  movies                    List movies
  movie <slug>              Show movie detail
  sources <slug>            Show movie sources
  related <slug>            Show related movies
  comments <slug>           Show movie comments
  calendar                  Show calendar
  types | genres | regions  Show dictionaries
  collections | shares      Show lists
  requests | activities     Show community lists
  user <username> | me       Show user data

Write commands:
  create-request            Create a request, requires DDYS_API_KEY
  comment-create            Create a comment, requires DDYS_API_KEY
  comment-delete <id>       Delete a comment, requires DDYS_API_KEY
  report-invalid            Report an invalid resource, requires DDYS_API_KEY
  follow <username>         Follow a user, requires DDYS_API_KEY
  unfollow <username>       Unfollow a user, requires DDYS_API_KEY

Utility commands:
  api <method> <path>       Raw API call
  doctor                    Test API/proxy health
  embed <component>         Generate widgets HTML
  worker-env                Generate worker proxy env vars
  completion <shell>        Generate shell completion

Global options:
  --api-base <url>          Default: DDYS_API_BASE or https://ddys.io/api/v1
  --public-base <url>       Default: DDYS_PUBLIC_BASE or https://ddys.io
  --api-key <key>           Default: DDYS_API_KEY
  --timeout <ms>            Default: DDYS_TIMEOUT_MS or 15000
  --format <type>           table, json, ndjson, text, raw
  --raw                     Print full API envelope
  -h, --help                Show help
  -v, --version             Show version

Examples:
  ddys search 星际 --limit 5
  ddys suggest 星际
  ddys latest --format json
  ddys movie i-robot
  ddys api GET /latest --query-param limit=3
  ddys doctor --api-base https://example.com/ddys-api
  ddys embed search --api-base https://example.com/ddys-api
`;
}

function renderCommandHelp(command) {
  const map = {
    search: 'ddys search <keyword> [--type movie] [--limit 10] [--format table|json|text]',
    suggest: 'ddys suggest <keyword> [--format table|json|text]',
    latest: 'ddys latest [--type movie] [--limit 10]',
    hot: 'ddys hot [--type movie] [--limit 10]',
    movies: 'ddys movies [--type movie] [--genre sci-fi] [--region US] [--page 1] [--per-page 24]',
    movie: 'ddys movie <slug>',
    sources: 'ddys sources <slug>',
    calendar: 'ddys calendar --year 2026 --month 7',
    api: 'ddys api <method> <path> [--query-param key=value] [--json {...}] [--auth]',
    doctor: 'ddys doctor [--api-base https://example.com/ddys-api] [--api-key ddys_xxx]',
    embed: 'ddys embed search|latest|hot|calendar|movie-card|collection|all [--api-base url]',
    'worker-env': 'ddys worker-env [--api-base https://ddys.io/api/v1] [--format toml|env|json]'
  };
  return `${map[command] || `Unknown command: ${command}`}\n`;
}

export function renderCompletion(shell = 'bash') {
  const commands = 'search suggest latest hot movies movie sources related comments calendar types genres regions collections collection shares share requests activities user me create-request comment-create comment-delete report-invalid follow unfollow api doctor embed worker-env completion help version';
  if (shell === 'zsh') {
    return `#compdef ddys\n_arguments '1:command:(${commands})' '*::arg:->args'\n`;
  }
  if (shell === 'powershell') {
    return `Register-ArgumentCompleter -Native -CommandName ddys -ScriptBlock {\n  param($wordToComplete)\n  '${commands}'.Split(' ') | Where-Object { $_ -like \"$wordToComplete*\" } | ForEach-Object { [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_) }\n}\n`;
  }
  return `complete -W "${commands}" ddys\n`;
}
