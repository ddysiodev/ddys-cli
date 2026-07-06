import { collectKeyValue, splitComma } from './args.js';
import { DEFAULT_LIMIT, VERSION } from './constants.js';
import { parsePositiveInteger } from './config.js';
import { createDdysClient, encodePathSegment } from './client.js';
import { renderEmbed, renderWorkerEnv } from './embed.js';
import { DdysUsageError } from './errors.js';
import { parseJsonInput, renderDoctor, renderOutput } from './format.js';
import { renderCompletion, renderHelp } from './help.js';

const READ_METHOD = 'GET';

export async function executeCommand(parsed, config, runtime = {}) {
  const command = normalizeCommand(parsed.command);
  const args = parsed.positionals.slice(1);
  const options = parsed.options;
  const client = createDdysClient(config, runtime);

  if (options.help && command !== 'help') return textResult(renderHelp(command));
  if (command === 'help') return textResult(renderHelp(args[0] || ''));
  if (command === 'version') return textResult(`${VERSION}\n`);
  if (command === 'completion') return textResult(renderCompletion(args[0] || options.shell || 'bash'));
  if (command === 'embed') return textResult(`${renderEmbed(args[0] || options.component || 'search', { ...options, apiBase: options.apiBase })}\n`);
  if (command === 'worker-env') return textResult(`${renderWorkerEnv(options)}\n`);
  if (command === 'doctor') return textResult(await runDoctor(client, config, options));

  if (command === 'api') {
    const method = String(args[0] || options.method || READ_METHOD).toUpperCase();
    const path = args[1] || options.path;
    if (!path) throw new DdysUsageError('api requires <method> <path>.');
    const payload = await client.request(method, path, {
      query: collectKeyValue(options.queryParam),
      headers: collectKeyValue(options.header),
      body: options.json ? parseJsonInput(options.json, '--json') : undefined,
      auth: Boolean(options.auth)
    });
    return outputResult(payload, config, options);
  }

  const payload = await runApiCommand(command, args, options, client);
  return outputResult(payload, config, options);
}

export function normalizeCommand(command) {
  const value = String(command || 'help').trim().toLowerCase();
  const aliases = {
    s: 'search',
    find: 'search',
    new: 'latest',
    newest: 'latest',
    popular: 'hot',
    list: 'movies',
    detail: 'movie',
    source: 'sources',
    dict: 'types',
    request: 'create-request',
    report: 'report-invalid',
    env: 'worker-env',
    completions: 'completion',
    '--help': 'help',
    '-h': 'help',
    '--version': 'version',
    '-v': 'version'
  };
  return aliases[value] || value;
}

async function runApiCommand(command, args, options, client) {
  switch (command) {
    case 'search': {
      const q = options.query || args.join(' ');
      if (!q) throw new DdysUsageError('search requires a keyword.');
      return client.request(READ_METHOD, '/search', { query: withPagination(options, { q }) });
    }
    case 'latest':
      return client.request(READ_METHOD, '/latest', { query: listQuery(options) });
    case 'hot':
      return client.request(READ_METHOD, '/hot', { query: listQuery(options) });
    case 'movies':
      return client.request(READ_METHOD, '/movies', { query: moviesQuery(options) });
    case 'movie':
      return client.request(READ_METHOD, `/movies/${encodePathSegment(requiredArg(args, 'movie requires <slug>.'))}`);
    case 'sources':
      return client.request(READ_METHOD, `/movies/${encodePathSegment(requiredArg(args, 'sources requires <slug>.'))}/sources`);
    case 'related':
      return client.request(READ_METHOD, `/movies/${encodePathSegment(requiredArg(args, 'related requires <slug>.'))}/related`, { query: listQuery(options) });
    case 'comments':
      return client.request(READ_METHOD, `/movies/${encodePathSegment(requiredArg(args, 'comments requires <slug>.'))}/comments`, { query: pageQuery(options) });
    case 'calendar':
      return client.request(READ_METHOD, '/calendar', { query: calendarQuery(options) });
    case 'types':
      return client.request(READ_METHOD, '/types');
    case 'genres':
      return client.request(READ_METHOD, '/genres');
    case 'regions':
      return client.request(READ_METHOD, '/regions');
    case 'collections':
      return client.request(READ_METHOD, '/collections', { query: pageQuery(options) });
    case 'collection':
      return client.request(READ_METHOD, `/collections/${encodePathSegment(requiredArg(args, 'collection requires <slug>.'))}`, { query: pageQuery(options) });
    case 'shares':
      return client.request(READ_METHOD, '/shares', { query: pageQuery(options) });
    case 'share':
      return client.request(READ_METHOD, `/shares/${encodePathSegment(requiredArg(args, 'share requires <id>.'))}`);
    case 'requests':
      return client.request(READ_METHOD, '/requests', { query: pageQuery(options) });
    case 'activities':
      return client.request(READ_METHOD, '/activities', { query: withPagination(options, { type: options.type }) });
    case 'user':
      return client.request(READ_METHOD, `/user/${encodePathSegment(requiredArg(args, 'user requires <username>.'))}`);
    case 'me':
      return client.request(READ_METHOD, '/me', { auth: true });
    case 'create-request':
      return client.request('POST', '/requests', { body: requestBody(options), auth: true });
    case 'comment-create':
      return client.request('POST', '/comments', { body: commentBody(options), auth: true });
    case 'comment-delete':
      return client.request('DELETE', `/comments/${encodePathSegment(requiredArg(args, 'comment-delete requires <id>.'))}`, { auth: true });
    case 'report-invalid':
      return client.request('POST', '/report', { body: reportBody(options), auth: true });
    case 'follow':
      return client.request('POST', '/follow', { body: { username: requiredArg(args, 'follow requires <username>.'), action: 'follow' }, auth: true });
    case 'unfollow':
      return client.request('POST', '/follow', { body: { username: requiredArg(args, 'unfollow requires <username>.'), action: 'unfollow' }, auth: true });
    default:
      throw new DdysUsageError(`Unknown command: ${command}.`);
  }
}

async function runDoctor(client, config, options) {
  const checks = [
    ['latest', () => client.request(READ_METHOD, '/latest', { query: { limit: 1 } })],
    ['types', () => client.request(READ_METHOD, '/types')],
    ['search', () => client.request(READ_METHOD, '/search', { query: { q: options.query || '星际', limit: 1 } })]
  ];
  if (config.apiKey) checks.push(['me', () => client.request(READ_METHOD, '/me', { auth: true })]);
  const results = [];
  for (const [name, task] of checks) {
    const started = Date.now();
    try {
      await task();
      results.push({ name, ok: true, ms: Date.now() - started, detail: '' });
    } catch (error) {
      results.push({ name, ok: false, ms: Date.now() - started, detail: error.message });
    }
  }
  return renderDoctor(results, { ...options, raw: config.raw, format: config.format });
}

function outputResult(payload, config, options) {
  return textResult(renderOutput(payload, { ...options, raw: config.raw || options.raw, format: options.format || config.format }));
}

function textResult(stdout) {
  return { stdout, stderr: '', exitCode: 0 };
}

function listQuery(options) {
  return withPagination(options, {
    type: options.type,
    genre: options.genre,
    region: options.region
  });
}

function moviesQuery(options) {
  return withPagination(options, {
    type: options.type,
    genre: options.genre,
    region: options.region,
    sort: options.sort,
    year: options.year,
    q: options.query
  });
}

function calendarQuery(options) {
  return {
    year: options.year || new Date().getFullYear(),
    month: options.month || new Date().getMonth() + 1,
    type: options.type || undefined
  };
}

function pageQuery(options) {
  return withPagination(options, {});
}

function withPagination(options, query) {
  const output = { ...query };
  if (options.limit !== undefined) output.limit = parsePositiveInteger(options.limit, 'limit');
  else if (options.perPage === undefined && options.per_page === undefined && options.page === undefined) output.limit = DEFAULT_LIMIT;
  if (options.page !== undefined) output.page = parsePositiveInteger(options.page, 'page');
  if (options.perPage !== undefined) output.per_page = parsePositiveInteger(options.perPage, 'per-page');
  if (options.per_page !== undefined) output.per_page = parsePositiveInteger(options.per_page, 'per_page');
  for (const [key, value] of Object.entries(output)) if (value === undefined || value === '') delete output[key];
  return output;
}

function requestBody(options) {
  if (options.json) return parseJsonInput(options.json, '--json');
  const body = {
    title: options.title,
    year: options.year,
    type: options.type,
    douban_id: options.doubanId,
    imdb_id: options.imdbId,
    note: options.note
  };
  requireFields(body, ['title']);
  return cleanObject(body);
}

function commentBody(options) {
  if (options.json) return parseJsonInput(options.json, '--json');
  const body = {
    target_type: options.targetType,
    target_id: options.targetId,
    content: options.content
  };
  requireFields(body, ['target_type', 'target_id', 'content']);
  return cleanObject(body);
}

function reportBody(options) {
  if (options.json) return parseJsonInput(options.json, '--json');
  const body = {
    resource_id: options.resourceId,
    movie_id: options.movieId,
    reason: options.reason || 'invalid_resource'
  };
  requireFields(body, ['resource_id']);
  return cleanObject(body);
}

function requiredArg(args, message) {
  const value = args[0];
  if (!value) throw new DdysUsageError(message);
  return value;
}

function requireFields(body, fields) {
  for (const field of fields) {
    if (body[field] === undefined || body[field] === null || body[field] === '') {
      throw new DdysUsageError(`${field} is required.`);
    }
  }
}

function cleanObject(input) {
  const output = {};
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined && value !== null && value !== '') output[key] = value;
  }
  return output;
}
