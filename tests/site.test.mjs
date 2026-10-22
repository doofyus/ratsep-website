import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const html = () => readFileSync('index.html', 'utf8');
const css = () => readFileSync('style.css', 'utf8');

test('fonts are local', () => {
  const style = css();
  const faces = style.match(/@font-face\s*{[^}]*}/g) ?? [];
  const declared = new Set();
  for (const face of faces) {
    const urls = [...face.matchAll(/url\(["']?([^"')]+)["']?\)/g)].map((m) => m[1]);
    assert.ok(urls.length > 0);
    for (const url of urls) {
      assert.match(url, /^fonts\/[\w-]+\.woff2$/);
      assert.ok(existsSync(url), `missing ${url}`);
    }
    const family = face.match(/font-family:\s*["']([^"']+)["']/)[1];
    const weight = face.match(/font-weight:\s*(\d+)/)[1];
    declared.add(`${family} ${weight}`);
  }
  for (const w of [400, 500, 600, 700]) assert.ok(declared.has(`Schibsted Grotesk ${w}`), `Schibsted Grotesk ${w}`);
  for (const w of [400, 500]) assert.ok(declared.has(`IBM Plex Mono ${w}`), `IBM Plex Mono ${w}`);
  for (const text of [html(), style]) {
    assert.ok(!/googleapis|gstatic/.test(text));
  }
});

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
