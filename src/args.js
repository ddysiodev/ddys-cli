import { DdysUsageError } from './errors.js';

const SHORT_FLAGS = {
  h: 'help',
  v: 'version',
  q: 'query',
  f: 'format',
  n: 'limit',
  p: 'page'
};

export function parseArgv(argv = []) {
  const options = {};
  const positionals = [];

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--') {
      positionals.push(...argv.slice(index + 1));
      break;
    }
    if (token.startsWith('--')) {
      const parsed = parseLongOption(token, argv, index);
      options[parsed.key] = mergeOptionValue(options[parsed.key], parsed.value, parsed.key);
      index = parsed.index;
      continue;
    }
    if (/^-[A-Za-z]$/.test(token)) {
      const key = SHORT_FLAGS[token.slice(1)];
      if (!key) throw new DdysUsageError(`Unknown short option ${token}.`);
      if (isValueOption(key)) {
        const value = argv[index + 1];
        if (value === undefined || value.startsWith('-')) throw new DdysUsageError(`${token} requires a value.`);
        options[key] = mergeOptionValue(options[key], value, key);
        index += 1;
      } else {
        options[key] = true;
      }
      continue;
    }
    positionals.push(token);
  }

  return {
    command: positionals[0] || (options.version ? 'version' : 'help'),
    positionals,
    options
  };
}

export function camelCaseOption(name) {
  return String(name).replace(/-([a-z])/g, (_match, char) => char.toUpperCase());
}

export function splitComma(value) {
  return String(value || '').split(',').map((item) => item.trim()).filter(Boolean);
}

export function collectKeyValue(value) {
  const pairs = Array.isArray(value) ? value : value === undefined ? [] : [value];
  const output = {};
  for (const pair of pairs) {
    const separator = String(pair).indexOf('=');
    if (separator <= 0) throw new DdysUsageError(`Expected key=value, received ${pair}.`);
    const key = String(pair).slice(0, separator).trim();
    const raw = String(pair).slice(separator + 1).trim();
    if (!key) throw new DdysUsageError(`Expected key=value, received ${pair}.`);
    output[key] = raw;
  }
  return output;
}

function parseLongOption(token, argv, index) {
  let name = token.slice(2);
  let value;
  const equals = name.indexOf('=');
  if (equals >= 0) {
    value = name.slice(equals + 1);
    name = name.slice(0, equals);
  }

  let booleanValue;
  if (name.startsWith('no-')) {
    booleanValue = false;
    name = name.slice(3);
  }

  const key = camelCaseOption(name);
  if (!key) throw new DdysUsageError(`Invalid option ${token}.`);
  if (booleanValue !== undefined) return { key, value: booleanValue, index };
  if (value !== undefined) return appendOptionValue(argv, index, key, value);
  if (!isValueOption(key)) return { key, value: true, index };

  const next = argv[index + 1];
  if (next === undefined || next.startsWith('-')) throw new DdysUsageError(`--${name} requires a value.`);
  return appendOptionValue(argv, index + 1, key, next);
}

function appendOptionValue(argv, index, key, value) {
  if (key === 'queryParam' || key === 'header') {
    return {
      key,
      value,
      index
    };
  }
  return { key, value, index };
}

function mergeOptionValue(current, value, key) {
  if (!Array.isArray(value) && current === undefined) return value;
  if (!Array.isArray(value) && (Array.isArray(current) || isRepeatableOption(key))) return appendValue(current, value);
  if (Array.isArray(value)) return [...(Array.isArray(current) ? current : current === undefined ? [] : [current]), ...value];
  return value;
}

function appendValue(current, value) {
  if (current === undefined) return [value];
  return [...(Array.isArray(current) ? current : [current]), value];
}

function isRepeatableOption(key) {
  return key === 'queryParam' || key === 'header';
}

function isValueOption(key) {
  return ![
    'help',
    'version',
    'raw',
    'verbose',
    'color',
    'auth',
    'pretty',
    'compact',
    'offline',
    'includeScript',
    'noHeaders'
  ].includes(key);
}
