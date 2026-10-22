import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const html = () => readFileSync('index.html', 'utf8');

test('document basics', () => {
  const page = html();
  assert.ok(page.includes('<html lang="en"'));
  assert.ok(page.includes('<meta charset="utf-8">'));
  assert.ok(page.includes('<meta name="viewport" content="width=device-width, initial-scale=1">'));
  assert.ok(page.includes('<title>Mikk Rätsep</title>'));
});

test('custom domain', () => {
  assert.equal(readFileSync('CNAME', 'utf8').trim(), 'ratsep.org');
  assert.ok(existsSync('.nojekyll'));
});

test('no forbidden names', (t) => {
  const list = '.ai/context/forbidden-names.txt';
  if (!existsSync(list)) return t.skip('names list is local only');
  const page = html().toLowerCase();
  const names = readFileSync(list, 'utf8').split('\n').map((s) => s.trim().toLowerCase()).filter(Boolean);
  for (const name of names) assert.ok(!new RegExp(`\\b${name.replace(/\s+/g, '\\s+')}\\b`).test(page), `found "${name}"`);
});
