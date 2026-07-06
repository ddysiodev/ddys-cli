import { DEFAULT_API_BASE, DEFAULT_FORMAT, DEFAULT_PUBLIC_BASE, DEFAULT_TIMEOUT_MS, USER_AGENT } from './constants.js';
import { DdysUsageError } from './errors.js';

export function loadConfig(options = {}, env = {}) {
  return {
    apiBase: normalizeBaseUrl(readOption(options, 'apiBase', readEnv(env, 'DDYS_API_BASE', DEFAULT_API_BASE)), 'api base'),
    publicBase: normalizeBaseUrl(readOption(options, 'publicBase', readEnv(env, 'DDYS_PUBLIC_BASE', DEFAULT_PUBLIC_BASE)), 'public base'),
    apiKey: String(readOption(options, 'apiKey', readEnv(env, 'DDYS_API_KEY', '')) || '').trim(),
    timeoutMs: parseNonNegativeInteger(readOption(options, 'timeout', readEnv(env, 'DDYS_TIMEOUT_MS', DEFAULT_TIMEOUT_MS)), 'timeout'),
    format: normalizeFormat(readOption(options, 'format', readEnv(env, 'DDYS_CLI_FORMAT', DEFAULT_FORMAT))),
    raw: parseBoolean(readOption(options, 'raw', false)),
    color: parseBoolean(readOption(options, 'color', readEnv(env, 'NO_COLOR', '') ? false : true)),
    verbose: parseBoolean(readOption(options, 'verbose', false)),
    userAgent: USER_AGENT
  };
}

export function normalizeBaseUrl(value, label = 'URL') {
  let url;
  try {
    url = new URL(String(value || '').trim());
  } catch {
    throw new DdysUsageError(`${label} must be a valid URL.`);
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new DdysUsageError(`${label} must use http or https.`);
  }
  url.pathname = url.pathname.replace(/\/+$/, '');
  url.search = '';
  url.hash = '';
  return url.toString().replace(/\/$/, '');
}

export function normalizeFormat(value) {
  const format = String(value || DEFAULT_FORMAT).trim().toLowerCase();
  if (!['table', 'json', 'ndjson', 'text', 'raw'].includes(format)) {
    throw new DdysUsageError('--format must be one of table, json, ndjson, text, raw.');
  }
  return format;
}

export function parseBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (value === undefined || value === null || value === '') return false;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return Boolean(value);
}

export function parsePositiveInteger(value, label) {
  const number = Number.parseInt(String(value), 10);
  if (!Number.isSafeInteger(number) || number <= 0) {
    throw new DdysUsageError(`${label} must be a positive integer.`);
  }
  return number;
}

export function parseNonNegativeInteger(value, label) {
  const number = Number.parseInt(String(value), 10);
  if (!Number.isSafeInteger(number) || number < 0) {
    throw new DdysUsageError(`${label} must be a non-negative integer.`);
  }
  return number;
}

export function readEnv(env, key, fallback = undefined) {
  const value = env?.[key];
  return value === undefined || value === null || value === '' ? fallback : value;
}

function readOption(options, key, fallback) {
  const value = options?.[key];
  return value === undefined || value === null || value === '' ? fallback : value;
}
