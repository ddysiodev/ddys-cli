import { DdysApiError, DdysNetworkError, DdysParseError, DdysTimeoutError } from './errors.js';

export class DdysClient {
  constructor(config, runtime = {}) {
    this.config = config;
    this.fetch = runtime.fetch || globalThis.fetch;
    if (typeof this.fetch !== 'function') {
      throw new DdysApiError('No fetch implementation available.');
    }
  }

  async request(method, path, options = {}) {
    const endpoint = normalizePath(path);
    const auth = Boolean(options.auth);
    if (auth && !this.config.apiKey) {
      throw new DdysApiError('DDYS_API_KEY is required for this command.', {
        status: 401,
        endpoint,
        exitCode: 2
      });
    }

    const url = buildUrl(this.config.apiBase, endpoint, options.query);
    const headers = {
      accept: 'application/json',
      'user-agent': this.config.userAgent,
      ...(options.headers || {})
    };
    if (auth) headers.authorization = `Bearer ${this.config.apiKey}`;
    if (options.body !== undefined) headers['content-type'] = 'application/json; charset=utf-8';

    const timeout = createTimeoutSignal(this.config.timeoutMs);
    let response;
    try {
      response = await this.fetch(url, {
        method,
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: timeout.signal
      });
    } catch (error) {
      if (timeout.timedOut()) {
        throw new DdysTimeoutError(`Request timed out after ${this.config.timeoutMs}ms.`, {
          endpoint,
          cause: error
        });
      }
      throw new DdysNetworkError(error?.message || 'Network request failed.', { endpoint, cause: error });
    } finally {
      timeout.cancel();
    }

    const text = await response.text();
    let payload;
    try {
      payload = text ? JSON.parse(text) : {};
    } catch (error) {
      throw new DdysParseError('Failed to parse DDYS API response as JSON.', {
        status: response.status,
        endpoint,
        details: text,
        cause: error
      });
    }

    if (!response.ok || payload?.success === false) {
      throw new DdysApiError(payload?.message || `HTTP ${response.status}`, {
        status: response.status,
        endpoint,
        details: payload
      });
    }
    return payload;
  }
}

export function createDdysClient(config, runtime = {}) {
  return new DdysClient(config, runtime);
}

export function buildUrl(baseUrl, path, query = {}) {
  const url = new URL(`${baseUrl}${normalizePath(path)}`);
  for (const [key, value] of Object.entries(query || {})) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item !== undefined && item !== null && item !== '') url.searchParams.append(key, String(item));
      }
      continue;
    }
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

export function normalizePath(path) {
  const value = String(path || '').trim();
  return value.startsWith('/') ? value : `/${value}`;
}

export function encodePathSegment(value) {
  return encodeURIComponent(String(value));
}

function createTimeoutSignal(timeoutMs) {
  if (!timeoutMs || timeoutMs <= 0 || typeof AbortController === 'undefined') {
    return { signal: undefined, cancel() {}, timedOut: () => false };
  }
  const controller = new AbortController();
  let didTimeout = false;
  const timer = setTimeout(() => {
    didTimeout = true;
    controller.abort(new Error(`Request timed out after ${timeoutMs}ms.`));
  }, timeoutMs);
  return {
    signal: controller.signal,
    cancel() {
      clearTimeout(timer);
    },
    timedOut() {
      return didTimeout;
    }
  };
}
