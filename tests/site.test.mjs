import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const html = () => readFileSync('index.html', 'utf8');
const css = () => readFileSync('style.css', 'utf8');

const tokens = (selector) => {
  const block = css().match(new RegExp(`(?:^|\\n)${selector.replace(/[[\]]/g, '\\$&')}\\s*{([^}]*)}`));
  assert.ok(block, `no ${selector} block`);
  return Object.fromEntries([...block[1].matchAll(/(--[\w-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [m[1], m[2]]));
};

test('text tokens pass AA', async () => {
  const { contrast } = await import('../lib.js');
  const pairs = [
    ['--ink', '--bg'], ['--body', '--bg'], ['--muted', '--bg'],
    ['--oc-body', '--oc-band'], ['--oc-muted', '--oc-band'], ['--oc-note', '--oc-band'],
    ['--sw-body', '--sw-band'], ['--sw-muted', '--sw-band'], ['--sw-note', '--sw-band'],
    ['--ex-body', '--ex-band'], ['--ex-muted', '--ex-band'], ['--ex-note', '--ex-band']
  ];
  for (const selector of [':root', ':root[data-theme="dark"]']) {
    const t = tokens(selector);
    for (const [fg, bg] of pairs) {
      assert.ok(t[fg] && t[bg], `${selector} lacks ${fg} or ${bg}`);
      const ratio = contrast(t[fg], t[bg]);
      assert.ok(ratio >= 4.5, `${selector} ${fg} on ${bg} is ${ratio.toFixed(2)}`);
    }
  }
});

test('sticky only on wide screens', () => {
  const style = css();
  const wide = style.match(/@media \(min-width: 861px\)\s*{([\s\S]*?)\n}/);
  assert.ok(wide && /\.era-title\s*{[^}]*position:\s*sticky/.test(wide[1]));
  const outside = style.replace(wide[0], '');
  assert.ok(!/position:\s*sticky/.test(outside));
});

const text = (fragment) => fragment.replace(/<[^>]+>/g, '').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&').replace(/\s+/g, ' ');

test('hero copy', () => {
  const page = html();
  assert.ok(/<h1[^>]*>Mikk Rätsep<\/h1>/.test(page));
  const flat = text(page);
  assert.ok(flat.includes('Software engineer in Tallinn. Fifteen years of writing [Objective‑C], Swift and |> Elixir, much of it on Bluetooth, security and vehicle data, from iPhone apps to the protocol between phone and car to the backend behind it all.'));
  assert.ok(flat.includes('Today I work on a pipeline that moves millions of car data points an hour: integrations across carmakers, multiple layers deep and fault‑tolerant by design.'));
  for (const era of ['oc', 'sw', 'ex']) assert.ok(page.includes(`class="lang lang-${era}"`), era);
});

test('hero visible without js', () => {
  const hiding = [...css().matchAll(/([^{}]+){[^}]*opacity:\s*0[;\s]/g)].map((m) => m[1].trim());
  assert.ok(hiding.length > 0);
  for (const selector of hiding.filter((s) => s.includes('lang'))) {
    assert.ok(selector.startsWith('html.js .hero:not(.in)'), selector);
  }
});

test('era bands', () => {
  const page = html();
  const eras = page.match(/<div id="eras">([\s\S]*?)<!-- \/eras -->/);
  assert.ok(eras, 'no #eras');
  const ids = [...eras[1].matchAll(/<section[^>]*id="(\w+)"/g)].map((m) => m[1]);
  assert.deepEqual(ids, ['objc', 'swift', 'elixir']);
  const flat = text(eras[1]);
  for (const s of ['2011 – 2016', '2014 – 2024', '2022 – today', 'From the Mac to iOS', 'Every byte counts',
    'And on the server', 'Many carmakers, one format',
    'My first real product was a Mac payroll app for the Swedish market. A year later I moved to iOS and built apps for clients, several carmakers among them.',
    'For our own hardware, I designed how phones talk to it: an encrypted Bluetooth protocol, a binary format that became the open Auto API, and the security around them.',
    'A Swift backend I wrote over a Christmas break for my own startup, then a few smaller Swift services at work.',
    'The data never stops, and no two carmakers send it the same way. I build and run a part of the pipeline: the Elixir services that bring it all in and keep it flowing, even when one side misbehaves.']) {
    assert.ok(flat.includes(s), s);
  }
  assert.ok(eras[1].includes('<a href="https://github.com/highmobility/auto-api">Auto API</a>'));
  const figures = [...eras[1].matchAll(/<figure class="showcase" data-era="(\w+)"/g)].map((m) => m[1]);
  assert.deepEqual(figures, ['oc', 'sw', 'sw', 'ex']);
});

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
