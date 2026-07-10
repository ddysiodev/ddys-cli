import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

test('build outputs dist entry and declarations', async () => {
  assert.equal(existsSync(join(root, 'dist/index.js')), true);
  assert.equal(existsSync(join(root, 'dist/index.d.ts')), true);
  const dist = await import(pathToFileURL(join(root, 'dist/index.js')));
  assert.equal(typeof dist.runCli, 'function');
  assert.equal(typeof dist.renderEmbed, 'function');
});

test('package exposes ddys bin and safe publish files', async () => {
  const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  assert.equal(pkg.name, '@ddysiodev/ddys-cli');
  assert.equal(pkg.bin.ddys, './bin/ddys.js');
  assert.equal(pkg.exports['.'].import, './dist/index.js');
  assert.equal(pkg.files.includes('bin'), true);
  assert.equal(pkg.files.includes('dist'), true);
  assert.equal(pkg.files.includes('examples'), true);
  const bin = await readFile(join(root, 'bin/ddys.js'), 'utf8');
  assert.equal(bin.startsWith('#!/usr/bin/env node'), true);
});
