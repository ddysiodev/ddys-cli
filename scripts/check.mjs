import { spawnSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import process from 'node:process';

const root = process.cwd();
const failures = [];

const requiredFiles = [
  'package.json',
  'README.md',
  'README.zh-CN.md',
  'LICENSE',
  '.gitignore',
  'bin/ddys.js',
  'src/index.js',
  'src/commands.js',
  'src/client.js',
  'src/config.js',
  'src/args.js',
  'src/embed.js',
  'src/format.js',
  'src/help.js',
  'src/index.d.ts',
  'scripts/build.mjs',
  'scripts/check.mjs',
  'scripts/build-package.ps1',
  'test/cli.test.mjs',
  'test/package.test.mjs',
  'examples/embed.html',
  'examples/commands.md'
];

for (const file of requiredFiles) await mustExist(file);
await checkPackage();
await checkSyntax();
await checkExports();
await checkDocs();
await checkForbiddenFiles();
await checkForbiddenText();
await checkEncoding();

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, package: '@ddysiodev/ddys-cli', files: (await listFiles(root)).length }, null, 2));

async function checkPackage() {
  const pkg = JSON.parse(await read('package.json'));
  assert(pkg.name === '@ddysiodev/ddys-cli', 'package name mismatch.');
  assert(/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(pkg.version), 'package version must be semver-like.');
  assert(pkg.type === 'module', 'package must be ESM.');
  assert(pkg.bin?.ddys === './bin/ddys.js', 'ddys bin missing.');
  assert(pkg.exports?.['.']?.import === './dist/index.js', 'root import export must point to dist.');
  assert(pkg.exports?.['.']?.types === './dist/index.d.ts', 'root types export must point to dist declarations.');
  assert(pkg.files?.includes('bin') && pkg.files?.includes('dist'), 'package files must include bin and dist.');
  assert(pkg.publishConfig?.access === 'public', 'package must be public publishable.');
  assert((await read('src/constants.js')).includes(`VERSION = '${pkg.version}'`), 'runtime version must match package.json.');
  const bin = await read('bin/ddys.js');
  assert(bin.startsWith('#!/usr/bin/env node'), 'CLI bin must have node shebang.');
  assert(bin.includes('../dist/index.js'), 'CLI bin must import built dist.');
  const buildPackage = await read('scripts/build-package.ps1');
  assert(buildPackage.includes('ddys-cli-v{0}.zip'), 'release ZIP name must match package.');
  assert(buildPackage.includes('-Encoding UTF8') && buildPackage.includes('ConvertFrom-Json'), 'release script must read package.json as UTF-8 JSON.');
  assert(buildPackage.includes('Replace("\\", "/")'), 'release ZIP must use portable paths.');
}

async function checkSyntax() {
  for (const full of await listFiles(root)) {
    const rel = slash(path.relative(root, full));
    if (!/\.(js|mjs)$/i.test(rel)) continue;
    const result = spawnSync(process.execPath, ['--check', full], { stdio: 'inherit' });
    assert(result.status === 0, `${rel} failed node --check.`);
  }
}

async function checkExports() {
  const entry = await import(pathToFileURL(path.join(root, 'src/index.js')).href);
  for (const name of ['runCli', 'main', 'parseArgv', 'loadConfig', 'createDdysClient', 'renderEmbed', 'renderWorkerEnv', 'renderCompletion']) {
    assert(typeof entry[name] === 'function', `src export missing ${name}.`);
  }
  if (await exists('dist/index.js')) {
    const dist = await import(pathToFileURL(path.join(root, 'dist/index.js')).href);
    assert(typeof dist.runCli === 'function', 'dist export missing runCli.');
  }
}

async function checkDocs() {
  const en = await read('README.md');
  const zh = await read('README.zh-CN.md');
  assert(en.includes('[简体中文](README.zh-CN.md)') && zh.includes('[English](README.md)'), 'READMEs must link to each other.');
  for (const fragment of ['ddys search', 'ddys suggest', 'ddys doctor', 'ddys embed', 'ddys worker-env', 'DDYS_API_KEY', 'DDYS_API_BASE']) {
    assert(en.includes(fragment), `README.md missing ${fragment}.`);
    assert(zh.includes(fragment), `README.zh-CN.md missing ${fragment}.`);
  }
}

async function checkForbiddenFiles() {
  for (const full of await listFiles(root)) {
    const rel = slash(path.relative(root, full));
    assert(!/(^|\/)(node_modules|coverage|package)(\/|$)/.test(rel), `forbidden path: ${rel}`);
    assert(!/\.(log|tmp|cache|tgz|zip)$/i.test(rel), `forbidden file: ${rel}`);
    assert(rel === '.env.example' || !/(^|\/)\.env(\.|$)/.test(rel), `forbidden env file: ${rel}`);
    assert(!['pnpm-lock.yaml', 'package-lock.json', 'yarn.lock'].includes(path.basename(rel)), `forbidden lockfile: ${rel}`);
  }
}

async function checkForbiddenText() {
  const patterns = ['ghp_', 'github_pat_', 'npm_', 'sk-', '\uFFFD', 'ddys-dingtalk-bot', 'ddys-wecom-bot'];
  for (const full of await listFiles(root)) {
    const rel = slash(path.relative(root, full));
    if (!isTextFile(rel) || rel === 'scripts/check.mjs') continue;
    const text = await fs.readFile(full, 'utf8');
    for (const pattern of patterns) assert(!text.includes(pattern), `${rel} contains forbidden text pattern ${pattern}.`);
  }
}

async function checkEncoding() {
  for (const full of await listFiles(root)) {
    const rel = slash(path.relative(root, full));
    if (!isTextFile(rel)) continue;
    const buffer = await fs.readFile(full);
    assert(!(buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf), `${rel} has BOM.`);
    assert(!buffer.toString('utf8').includes('\uFFFD'), `${rel} has replacement char.`);
  }
}

async function mustExist(rel) {
  try {
    await fs.stat(path.join(root, rel));
  } catch {
    failures.push(`Missing required file: ${rel}`);
  }
}

async function exists(rel) {
  try {
    await fs.stat(path.join(root, rel));
    return true;
  } catch {
    return false;
  }
}

async function read(rel) {
  return fs.readFile(path.join(root, rel), 'utf8');
}

async function listFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const out = [];
  for (const entry of entries) {
    if (['.git', 'node_modules', 'coverage', 'package'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await listFiles(full));
    else out.push(full);
  }
  return out;
}

function isTextFile(rel) {
  return /\.(js|mjs|json|d\.ts|md|html|txt)$/i.test(rel) || rel === '.gitignore' || rel === 'LICENSE';
}

function slash(value) {
  return value.replace(/\\/g, '/');
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}
