import { DEFAULT_PUBLIC_BASE } from './constants.js';
import { DdysUsageError } from './errors.js';

const WIDGET_CDN = 'https://cdn.jsdelivr.net/npm/@ddysiodev/widgets/dist/index.js';

export function renderEmbed(component, options = {}) {
  const name = String(component || 'search').trim().toLowerCase();
  const apiBase = options.apiBase || '';
  const theme = options.theme || '';
  const limit = options.limit || '';
  const type = options.type || '';
  const attrs = {
    'api-base': apiBase,
    theme,
    limit,
    type
  };

  const script = options.includeScript === false ? '' : `<script type="module" src="${WIDGET_CDN}"></script>\n`;
  if (name === 'search') return `${script}<ddys-search${attributes(attrs)}></ddys-search>`;
  if (name === 'latest') return `${script}<ddys-latest${attributes(attrs)}></ddys-latest>`;
  if (name === 'hot') return `${script}<ddys-hot${attributes(attrs)}></ddys-hot>`;
  if (name === 'calendar') {
    return `${script}<ddys-calendar${attributes({ ...attrs, year: options.year, month: options.month })}></ddys-calendar>`;
  }
  if (name === 'movie-card') {
    const slug = options.slug || options.movie || '';
    if (!slug) throw new DdysUsageError('embed movie-card requires --slug.');
    return `${script}<ddys-movie-card${attributes({ ...attrs, slug })}></ddys-movie-card>`;
  }
  if (name === 'collection') {
    const slug = options.slug || '';
    return `${script}<ddys-collection${attributes({ ...attrs, slug })}></ddys-collection>`;
  }
  if (name === 'all') {
    return [
      script.trimEnd(),
      '<ddys-search></ddys-search>',
      '<ddys-latest limit="12"></ddys-latest>',
      '<ddys-hot limit="12"></ddys-hot>',
      '<ddys-calendar></ddys-calendar>'
    ].filter(Boolean).join('\n');
  }
  throw new DdysUsageError(`Unknown embed component: ${component}.`);
}

export function renderWorkerEnv(options = {}) {
  const apiBase = options.apiBase || 'https://ddys.io/api/v1';
  const proxyPrefix = options.proxyPrefix || '/ddys-api';
  const allowedOrigins = options.allowedOrigins || '*';
  const defaultCacheTtl = options.defaultCacheTtl || '600';
  const timeout = options.timeout || options.upstreamTimeoutMs || '12000';
  const format = String(options.format || 'toml').toLowerCase();

  if (format === 'json') {
    return JSON.stringify({
      DDYS_API_BASE: apiBase,
      PROXY_PREFIX: proxyPrefix,
      ALLOWED_ORIGINS: allowedOrigins,
      ENABLE_AUTH_PROXY: String(Boolean(options.enableAuthProxy)),
      ENABLE_WRITE_METHODS: String(Boolean(options.enableWriteMethods)),
      REQUIRE_ALLOWED_ORIGIN_FOR_AUTH: 'true',
      DEFAULT_CACHE_TTL: String(defaultCacheTtl),
      UPSTREAM_TIMEOUT_MS: String(timeout),
      RETRY_GET_ON_TRANSIENT_ERROR: 'true',
      USER_AGENT: 'ddys-worker-proxy/0.1.0',
      DEBUG: 'false'
    }, null, 2);
  }

  if (format === 'env') {
    return [
      `DDYS_API_BASE=${apiBase}`,
      `PROXY_PREFIX=${proxyPrefix}`,
      `ALLOWED_ORIGINS=${allowedOrigins}`,
      `ENABLE_AUTH_PROXY=${Boolean(options.enableAuthProxy)}`,
      `ENABLE_WRITE_METHODS=${Boolean(options.enableWriteMethods)}`,
      'REQUIRE_ALLOWED_ORIGIN_FOR_AUTH=true',
      `DEFAULT_CACHE_TTL=${defaultCacheTtl}`,
      `UPSTREAM_TIMEOUT_MS=${timeout}`,
      'RETRY_GET_ON_TRANSIENT_ERROR=true',
      'USER_AGENT=ddys-worker-proxy/0.1.0',
      'DEBUG=false'
    ].join('\n');
  }

  return [
    '[vars]',
    `DDYS_API_BASE = "${escapeToml(apiBase)}"`,
    `PROXY_PREFIX = "${escapeToml(proxyPrefix)}"`,
    `ALLOWED_ORIGINS = "${escapeToml(allowedOrigins)}"`,
    `ENABLE_AUTH_PROXY = "${Boolean(options.enableAuthProxy)}"`,
    `ENABLE_WRITE_METHODS = "${Boolean(options.enableWriteMethods)}"`,
    'REQUIRE_ALLOWED_ORIGIN_FOR_AUTH = "true"',
    `DEFAULT_CACHE_TTL = "${defaultCacheTtl}"`,
    `UPSTREAM_TIMEOUT_MS = "${timeout}"`,
    'RETRY_GET_ON_TRANSIENT_ERROR = "true"',
    'USER_AGENT = "ddys-worker-proxy/0.1.0"',
    'DEBUG = "false"'
  ].join('\n');
}

export function renderPublicUrl(path, publicBase = DEFAULT_PUBLIC_BASE) {
  return new URL(path, `${publicBase}/`).toString();
}

function attributes(input) {
  const pairs = Object.entries(input || {}).filter(([, value]) => value !== undefined && value !== null && value !== '');
  return pairs.length ? ` ${pairs.map(([key, value]) => `${key}="${escapeHtml(value)}"`).join(' ')}` : '';
}

function escapeHtml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeToml(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
