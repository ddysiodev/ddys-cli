import { DdysUsageError } from './errors.js';

export function renderOutput(payload, options = {}) {
  const format = options.raw ? 'raw' : options.format || 'table';
  if (format === 'raw') return `${JSON.stringify(payload, null, 2)}\n`;

  const data = payload?.data !== undefined ? payload.data : payload;
  if (format === 'json') return `${JSON.stringify(data, null, 2)}\n`;
  if (format === 'ndjson') return renderNdjson(data);
  if (format === 'text') return `${renderText(data, options)}\n`;
  return `${renderTable(data, options)}\n`;
}

export function renderDoctor(results, options = {}) {
  if (options.format === 'json' || options.raw) return `${JSON.stringify(results, null, 2)}\n`;
  const rows = results.map((item) => ({
    check: item.name,
    status: item.ok ? 'ok' : 'fail',
    ms: item.ms === null ? '-' : String(item.ms),
    detail: item.detail || ''
  }));
  return `${table(rows, ['check', 'status', 'ms', 'detail'])}\n`;
}

export function renderText(data, options = {}) {
  if (Array.isArray(data)) return data.map((item, index) => renderItem(item, index + 1)).join('\n\n');
  if (data && typeof data === 'object') return renderItem(data);
  return String(data ?? '');
}

export function renderTable(data, options = {}) {
  if (Array.isArray(data)) return table(data.map((item) => summarizeItem(item)), listColumns(data, options));
  if (data && typeof data === 'object') {
    const rows = Object.entries(flattenObject(data)).map(([key, value]) => ({ key, value: scalar(value) }));
    return table(rows, ['key', 'value']);
  }
  return String(data ?? '');
}

export function table(rows, columns) {
  const normalized = rows.map((row) => Object.fromEntries(columns.map((column) => [column, scalar(row?.[column])])));
  const widths = Object.fromEntries(columns.map((column) => [
    column,
    Math.max(column.length, ...normalized.map((row) => displayWidth(row[column])))
  ]));
  const header = columns.map((column) => pad(column, widths[column])).join('  ');
  const divider = columns.map((column) => '-'.repeat(widths[column])).join('  ');
  const body = normalized.map((row) => columns.map((column) => pad(row[column], widths[column])).join('  '));
  return [header, divider, ...body].join('\n');
}

export function unwrapEnvelope(payload) {
  if (!payload || typeof payload !== 'object') return payload;
  return payload.data !== undefined ? payload.data : payload;
}

export function parseJsonInput(value, label = 'JSON') {
  try {
    return JSON.parse(String(value || '{}'));
  } catch {
    throw new DdysUsageError(`${label} must be valid JSON.`);
  }
}

function renderNdjson(data) {
  const items = Array.isArray(data) ? data : [data];
  return `${items.map((item) => JSON.stringify(item)).join('\n')}\n`;
}

function renderItem(item, index) {
  if (!item || typeof item !== 'object') return String(item ?? '');
  const lines = [];
  const prefix = index ? `${index}. ` : '';
  const title = item.title || item.name || item.slug || item.id || item.username || 'item';
  lines.push(`${prefix}${title}`);
  for (const key of ['year', 'type', 'region', 'genre', 'rating', 'status', 'url', 'description', 'summary']) {
    if (item[key] !== undefined && item[key] !== null && item[key] !== '') lines.push(`   ${key}: ${scalar(item[key])}`);
  }
  return lines.join('\n');
}

function summarizeItem(item) {
  if (!item || typeof item !== 'object') return { value: item };
  return {
    id: item.id || item.vod_id || item.slug || item.username || '',
    title: item.title || item.name || item.vod_name || item.username || '',
    year: item.year || item.release_year || '',
    type: item.type || item.category || '',
    region: item.region || item.area || '',
    url: item.url || item.link || item.detailUrl || item.detail_url || ''
  };
}

function listColumns(data, options) {
  const sample = Array.isArray(data) ? data.find((item) => item && typeof item === 'object') : null;
  if (!sample) return ['value'];
  if (options.columns) return String(options.columns).split(',').map((column) => column.trim()).filter(Boolean);
  const columns = ['id', 'title', 'year', 'type', 'region', 'url'];
  return columns.filter((column) => column === 'title' || data.some((item) => item?.[column] || summarizeItem(item)[column]));
}

function flattenObject(value, prefix = '') {
  const output = {};
  for (const [key, item] of Object.entries(value || {})) {
    const name = prefix ? `${prefix}.${key}` : key;
    if (item && typeof item === 'object' && !Array.isArray(item)) Object.assign(output, flattenObject(item, name));
    else output[name] = item;
  }
  return output;
}

function scalar(value) {
  if (value === undefined || value === null) return '';
  if (Array.isArray(value)) return value.map(scalar).join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value).replace(/\s+/g, ' ').trim();
}

function displayWidth(value) {
  return String(value).length;
}

function pad(value, width) {
  const text = String(value);
  return `${text}${' '.repeat(Math.max(0, width - displayWidth(text)))}`;
}
