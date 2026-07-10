import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parseArgv,
  renderEmbed,
  renderWorkerEnv,
  runCli
} from '../src/index.js';

function jsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status || 200,
    headers: { 'content-type': 'application/json' }
  });
}

function createFetch() {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    const requestUrl = new URL(String(url));
    const body = init.body ? JSON.parse(init.body) : null;
    calls.push({ url: requestUrl.toString(), pathname: requestUrl.pathname, search: requestUrl.search, init, body });
    if (requestUrl.pathname.endsWith('/latest')) return jsonResponse({ success: true, data: [{ id: 1, title: 'Latest Movie', year: 2026, url: 'https://ddys.io/movie/latest' }] });
    if (requestUrl.pathname.endsWith('/hot')) return jsonResponse({ success: true, data: [{ id: 2, title: 'Hot Movie', type: 'movie' }] });
    if (requestUrl.pathname.endsWith('/search')) return jsonResponse({ success: true, data: [{ id: 3, title: 'Matrix', year: 1999, url: 'https://ddys.io/movie/matrix' }], meta: { total: 1 } });
    if (requestUrl.pathname.endsWith('/suggest')) return jsonResponse({ success: true, data: [{ title: 'Matrix', slug: 'matrix' }] });
    if (requestUrl.pathname.endsWith('/types')) return jsonResponse({ success: true, data: [{ id: 'movie', title: 'Movie' }] });
    if (requestUrl.pathname.endsWith('/me')) return jsonResponse({ success: true, data: { username: 'tester' } });
    if (requestUrl.pathname.endsWith('/requests') && init.method === 'POST') return jsonResponse({ success: true, data: { id: 9, title: body.title } });
    if (requestUrl.pathname.endsWith('/comments') && init.method === 'POST') return jsonResponse({ success: true, data: { id: 10, content: body.content } });
    if (requestUrl.pathname.includes('/comments/') && init.method === 'DELETE') return jsonResponse({ success: true, data: { deleted: true } });
    if (requestUrl.pathname.endsWith('/report') && init.method === 'POST') return jsonResponse({ success: true, data: { ok: true } });
    if (requestUrl.pathname.endsWith('/follow') && init.method === 'POST') return jsonResponse({ success: true, data: { username: body.username, action: body.action } });
    if (requestUrl.pathname.includes('/movies/')) return jsonResponse({ success: true, data: { id: 4, title: 'I Robot', slug: 'i-robot', url: 'https://ddys.io/movie/i-robot' } });
    return jsonResponse({ success: false, message: 'missing' }, { status: 404 });
  };
  return { fetchImpl, calls };
}

test('parseArgv handles options, aliases, and repeatable query params', () => {
  const parsed = parseArgv(['api', 'GET', '/latest', '--query-param', 'limit=3', '--query-param=type=movie', '-f', 'json']);
  assert.equal(parsed.command, 'api');
  assert.deepEqual(parsed.positionals, ['api', 'GET', '/latest']);
  assert.deepEqual(parsed.options.queryParam, ['limit=3', 'type=movie']);
  assert.equal(parsed.options.format, 'json');
});

test('search command builds query and renders table output', async () => {
  const { fetchImpl, calls } = createFetch();
  const result = await runCli(['search', 'matrix', '--limit', '5'], {}, { fetch: fetchImpl });
  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout.includes('Matrix'), true);
  assert.equal(new URL(calls[0].url).searchParams.get('q'), 'matrix');
  assert.equal(new URL(calls[0].url).searchParams.get('limit'), '5');
});

test('suggest command calls suggestions endpoint with keyword', async () => {
  const { fetchImpl, calls } = createFetch();
  const result = await runCli(['suggest', 'matrix', '--format', 'json'], {}, { fetch: fetchImpl });
  assert.equal(result.exitCode, 0);
  assert.equal(JSON.parse(result.stdout)[0].title, 'Matrix');
  assert.equal(calls[0].pathname.endsWith('/suggest'), true);
  assert.equal(new URL(calls[0].url).searchParams.get('q'), 'matrix');
});

test('json output unwraps data while raw output keeps envelope', async () => {
  const { fetchImpl } = createFetch();
  const json = await runCli(['latest', '--format', 'json'], {}, { fetch: fetchImpl });
  const raw = await runCli(['latest', '--raw'], {}, { fetch: fetchImpl });
  assert.equal(JSON.parse(json.stdout)[0].title, 'Latest Movie');
  assert.equal(JSON.parse(raw.stdout).success, true);
});

test('custom api command supports query params, auth, and JSON body', async () => {
  const { fetchImpl, calls } = createFetch();
  const get = await runCli(['api', 'GET', '/latest', '--query-param', 'limit=3', '--format', 'json'], {}, { fetch: fetchImpl });
  assert.equal(get.exitCode, 0);
  assert.equal(new URL(calls[0].url).searchParams.get('limit'), '3');

  const post = await runCli(
    ['api', 'POST', '/requests', '--auth', '--json', '{"title":"Dune 2"}', '--format', 'json'],
    { DDYS_API_KEY: 'ddys_test_key' },
    { fetch: fetchImpl }
  );
  assert.equal(post.exitCode, 0);
  assert.equal(calls[1].init.headers.authorization, 'Bearer ddys_test_key');
  assert.equal(calls[1].body.title, 'Dune 2');
});

test('write commands require API key and send normalized bodies', async () => {
  const { fetchImpl, calls } = createFetch();
  const denied = await runCli(['create-request', '--title', 'Dune 2'], {}, { fetch: fetchImpl });
  assert.equal(denied.exitCode, 2);
  assert.equal(denied.stderr.includes('DDYS_API_KEY'), true);

  const ok = await runCli(['create-request', '--title', 'Dune 2', '--year', '2024'], { DDYS_API_KEY: 'ddys_test_key' }, { fetch: fetchImpl });
  assert.equal(ok.exitCode, 0);
  assert.equal(calls.at(-1).body.title, 'Dune 2');
  assert.equal(calls.at(-1).body.year, '2024');
});

test('doctor reports check status and includes me when API key exists', async () => {
  const { fetchImpl, calls } = createFetch();
  const result = await runCli(['doctor'], { DDYS_API_KEY: 'ddys_test_key' }, { fetch: fetchImpl });
  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout.includes('latest'), true);
  assert.equal(result.stdout.includes('me'), true);
  assert.equal(calls.some((call) => call.pathname.endsWith('/me')), true);
});

test('embed, worker-env, completion, version, and help do not call API', async () => {
  const { fetchImpl, calls } = createFetch();
  assert.equal((await runCli(['embed', 'search', '--api-base', 'https://example.com/ddys-api'], {}, { fetch: fetchImpl })).stdout.includes('<ddys-search'), true);
  assert.equal((await runCli(['worker-env', '--format', 'env'], {}, { fetch: fetchImpl })).stdout.includes('DDYS_API_BASE='), true);
  const completion = await runCli(['completion', 'powershell'], {}, { fetch: fetchImpl });
  assert.equal(completion.stdout.includes('Register-ArgumentCompleter'), true);
  assert.equal(completion.stdout.includes('suggest'), true);
  assert.match((await runCli(['version'], {}, { fetch: fetchImpl })).stdout, /^0\.1\.1/);
  const help = await runCli(['help'], {}, { fetch: fetchImpl });
  assert.equal(help.stdout.includes('ddys search'), true);
  assert.equal(help.stdout.includes('ddys suggest'), true);
  assert.equal(calls.length, 0);
});

test('render helpers generate expected snippets', () => {
  assert.equal(renderEmbed('movie-card', { slug: 'i-robot', includeScript: false }).includes('slug="i-robot"'), true);
  assert.equal(renderWorkerEnv({ format: 'json' }).includes('"DDYS_API_BASE"'), true);
});

test('invalid usage returns exit code 2', async () => {
  const { fetchImpl } = createFetch();
  const result = await runCli(['movie'], {}, { fetch: fetchImpl });
  assert.equal(result.exitCode, 2);
  assert.equal(result.stderr.includes('movie requires'), true);
});
