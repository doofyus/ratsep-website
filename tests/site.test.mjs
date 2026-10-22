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
  const wide = style.match(/@media \(min-width: 908px\)\s*{([\s\S]*?)\n}/);
  assert.ok(wide && /\.era-title\s*{[^}]*position:\s*sticky/.test(wide[1]));
  const outside = style.replace(wide[0], '');
  assert.ok(!/position:\s*sticky/.test(outside));
});

const text = (fragment) => fragment.replace(/<[^>]+>/g, '').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&').replace(/\s+/g, ' ');

test('hero copy', () => {
  const page = html();
  assert.ok(/<h1[^>]*>Mikk Rätsep<\/h1>/.test(page));
  const flat = text(page);
  assert.ok(flat.includes('Software engineer in Tallinn. Fifteen years of writing [Objective‑C], .Swift and |> Elixir, much of it on Bluetooth, security and vehicle data, from iPhone apps to the protocol between phone and car to the backend behind it all.'));
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
  for (const s of ['2011 – 2016', '2014 – today', '2022 – today', 'From the Mac to iOS', 'Every byte counts',
    'And on the server', 'Many carmakers, one format',
    'My first real product was a Mac payroll app for the Swedish market. A year later I moved to iOS and built apps for clients, several carmakers among them.',
    'For our own hardware, I designed how phones talk to it: an encrypted Bluetooth protocol, a binary format that became the open Auto API, and the security around them.',
    'Several Swift backends for my own startups and apps, the first one written over a Christmas break, and a few smaller services at work.',
    'The data never stops, and no two carmakers send it the same way. I build and run a part of the pipeline: the Elixir services that bring it all in and keep it flowing, even when one side misbehaves.']) {
    assert.ok(flat.includes(s), s);
  }
  assert.ok(eras[1].includes('<a href="https://github.com/highmobility/auto-api">Auto API</a>'));
  const figures = [...eras[1].matchAll(/<figure class="showcase[^"]*" data-era="(\w+)"/g)].map((m) => m[1]);
  assert.deepEqual(figures, ['oc', 'sw', 'sw', 'ex']);
});

const figure = (era, index = 0) => {
  const all = [...html().matchAll(new RegExp(`<figure class="showcase[^"]*" data-era="${era}"[\\s\\S]*?</figure>`, 'g'))];
  assert.ok(all[index], `no ${era} figure ${index}`);
  return all[index][0];
};

const checkIllustration = (fig, { label, items, open, close }) => {
  assert.ok(new RegExp(`<svg role="img" aria-label="${label.replace(/[.?*+()[\]]/g, '\\$&')}"`).test(fig), 'svg label');
  const sel = fig.match(/data-sel="(\w+)"/)[1];
  assert.equal(sel, items[0][0]);
  const flat = text(fig);
  for (const [id, name, note] of items) {
    assert.ok(fig.includes(`data-id="${id}"`), id);
    assert.ok(flat.includes(`${open}${name}${close}`), name);
    assert.ok(flat.includes(note), note);
  }
  const parts = [...fig.matchAll(/data-part="([^"]+)"/g)].flatMap((m) => m[1].split(' '));
  for (const id of fig.match(/data-cycle="([^"]+)"/)[1].split(' ')) assert.ok(parts.includes(id), `no part for ${id}`);
};

test('obj-c illustration', () => {
  checkIllustration(figure('oc'), {
    label: 'A Mac window with a payroll table',
    open: '[', close: ']',
    items: [
      ['mac', 'Payroll', 'A Mac app for the Swedish market. My first real product.'],
      ['tv', 'Social TV', 'Watch live TV and talk about it as it airs.'],
      ['car', 'Carmaker apps', 'iOS apps for several European carmakers.'],
      ['more', 'And more', 'About a dozen other, smaller projects.']
    ]
  });
});

test('swift illustration', () => {
  checkIllustration(figure('sw', 0), {
    label: 'A phone, a watch and a key talk to a car: their messages become Auto API, pass through a secure link and go over Bluetooth to the car; beside the car, parking from a phone and approach detection',
    open: '.', close: '',
    items: [
      ['autoApi', 'autoApi', 'The open car data protocol I designed.'],
      ['secureLink', 'secureLink', 'Encrypted, signed Bluetooth, in as few bytes as possible.'],
      ['connect', 'connect', 'SDKs letting phones and other devices talk to cars.'],
      ['rnd', 'prototypes', 'Parking a car from a phone, and a car that senses which side you approach.']
    ]
  });
});

test('swift server illustration', () => {
  checkIllustration(figure('sw', 1), {
    label: 'A Swift server in the middle: a car crossing a zone sends it an event that goes on to a customer; a bank feeds it account data; invoices arrive by email or from a camera; a phone app and its database talk to it',
    open: '.', close: '',
    items: [
      ['geofencing', 'geofencing', 'Zones for car fleets: cross a line, an event goes out.'],
      ['openBanking', 'openBanking', 'Every bank account in one place, through open banking.'],
      ['invoices', 'invoices', 'Invoices scanned with computer vision or forwarded by email.'],
      ['startups', 'startups', 'Backends for my other ideas and apps.']
    ]
  });
});

test('elixir illustration', () => {
  checkIllustration(figure('ex'), {
    label: "Three carmakers' data passes registration, comes in through ingest and is translated into one shape; two customers get it from translate, a third from the cache",
    open: ':', close: '',
    items: [
      ['all', 'services', 'For several carmakers, built and run in Elixir.'],
      ['registration', 'registration', 'Each car cleared with its carmaker first.'],
      ['ingest', 'ingest', 'Data polled, queued or pushed, all brought in.'],
      ['translate', 'translate', 'Every format into one shared data model.'],
      ['cache', 'cache', 'The newest value of everything, on request.']
    ]
  });
});

test('side projects', () => {
  const side = html().match(/<section id="side"[\s\S]*?<\/section>/)[0];
  const titles = [...side.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>/g)].map((m) => text(m[1]));
  assert.deepEqual(titles, ['Kegler', 'LAN Organizer', 'A startup', 'Every bank, one view', 'Nature sounds', 'The house']);
  const flat = text(side);
  for (const line of ['A bowling score log for iPhone.',
    'Plan a LAN party in real time: game votes, Steam libraries and who brings what.',
    'A privacy tool, then invoices by email. I led a couple of developers and wrote the backend and the iOS app.',
    'All your bank accounts in one iOS app, with its own Swift backend.',
    'An iOS app for nature sound observations, made for the University of Tartu’s natural history museum.',
    'Dashboards, automations, smart switches and the rest of the smart home.']) assert.ok(flat.includes(line), line);
  assert.ok(side.includes('<a href="https://kegler.ratsep.org">Kegler</a>'));
  assert.ok(side.includes('<a href="https://lan-organizer.ratsep.org">LAN Organizer</a>'));
});

test('about', () => {
  const about = html().match(/<section id="about"[\s\S]*?<\/section>/)[0];
  const flat = text(about);
  assert.ok(!about.includes('class="lead"'), 'about has no lead sentence');
  for (const line of ['Based in', 'Tallinn, after three years in Berlin',
    'Background', 'First program: a Breakout clone in QBasic, at school', 'Studied at the University of Tartu and TalTech, then left for work',
    'Community', 'Organised the Tallinn iOS meetup for several years and gave talks there on iOS and new technologies',
    'Talks', 'Co‑presented Nearest Neighbors, Distant Words at ElixirConf EU 2024',
    'Off the keyboard', 'Riding motorcycles']) assert.ok(flat.includes(line), line);
  assert.ok(about.includes('<a href="https://www.youtube.com/watch?v=8lTbtDwBN40">Nearest Neighbors, Distant Words</a>'));
});

test('footer links', () => {
  const footer = html().match(/<footer[\s\S]*?<\/footer>/)[0];
  const links = [...footer.matchAll(/<a href="([^"]+)">([^<]+)<\/a>/g)].map((m) => [m[1], m[2]]);
  assert.deepEqual(links, [['mailto:mikk@ratsep.org', 'mikk@ratsep.org'], ['https://github.com/doofyus', 'GitHub'],
    ['https://www.linkedin.com/in/mikkr', 'LinkedIn']]);
});

test('metadata', () => {
  const page = html();
  for (const tag of ['<meta property="og:title" content="Mikk Rätsep">', '<meta property="og:image" content="https://ratsep.org/og.png">',
    '<meta property="og:url" content="https://ratsep.org/">', '<meta name="twitter:card" content="summary_large_image">']) {
    assert.ok(page.includes(tag), tag);
  }
  assert.ok(/<meta property="og:description" content="[^"]+">/.test(page));
  for (const [rel, file] of [['icon', 'favicon.svg'], ['icon', 'favicon.png'], ['apple-touch-icon', 'apple-touch-icon.png']]) {
    assert.ok(page.includes(`rel="${rel}"`) && page.includes(`href="${file}"`), file);
    assert.ok(existsSync(file), file);
  }
  assert.ok(existsSync('og.png'));
});

test('obj-c content animations restart each time their screen is shown', () => {
  const rules = [...css().matchAll(/([^{}]+){([^}]*animation:\s*oc-[^}]*)}/g)].map((m) => m[1].trim());
  assert.ok(rules.length > 0);
  for (const selector of rules) {
    for (const part of selector.split(',')) assert.ok(part.trim().startsWith('.oc-content.on'), part.trim());
  }
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
  assert.ok(page.includes('<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">'));
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

test('reduced motion stops everything', () => {
  const blocks = [...css().matchAll(/@media \(prefers-reduced-motion: reduce\)\s*{([\s\S]*?)\n}/g)].map((m) => m[1]).join('\n');
  assert.ok(/\.pulse-head[^{]*{[^}]*(animation:\s*none|display:\s*none)/.test(blocks) || /\.pulse-head,\s*\.pulse-tail[^{]*{[^}]*(animation:\s*none|display:\s*none)/.test(blocks));
  assert.ok(/\.pulse-tail/.test(blocks));
  assert.ok(/\.showcase \*[^{]*{[^}]*transition:\s*none/.test(blocks));
  assert.ok(/\.lang \.ha[^{]*{[^}]*transition:\s*none/.test(blocks));
});

test('the repo does not carry the names list', (t) => {
  const list = '.ai/context/forbidden-names.txt';
  if (!existsSync(list)) return t.skip('names list is local only');
  const names = readFileSync(list, 'utf8').split('\n').map((s) => s.trim().toLowerCase()).filter(Boolean);
  for (const file of ['tests/site.test.mjs', 'tests/lib.test.mjs', 'README.md', 'style.css', 'script.js', 'lib.js']) {
    const body = readFileSync(file, 'utf8').toLowerCase();
    for (const name of names) assert.ok(!new RegExp(`\\b${name.replace(/\s+/g, '\\s+')}\\b`).test(body), `${file} names "${name}"`);
  }
});

test('highlight fades stroke and fill together', () => {
  const style = css();
  for (const cls of ['fl', 'fa']) {
    const rule = style.match(new RegExp(`\\.showcase \\.${cls} {([^}]*)}`));
    assert.ok(rule, cls);
    assert.ok(!/transition/.test(rule[1]), `.${cls} overrides the shared transition`);
  }
});

test('list names use each drawing ink in dark', () => {
  const style = css();
  assert.ok(/\.showcase \.item-name {[^}]*color: var\(--item-ink, var\(--ink\)\)/.test(style));
  assert.ok(/:root\[data-theme="dark"\] \.band-sw {[^}]*--item-ink: #EDE3DE/.test(style));
  assert.ok(/:root\[data-theme="dark"\] \.band-ex {[^}]*--item-ink: #D9D1E2/.test(style));
});

test('drawings are smaller and centred on phones', () => {
  const phone = css().match(/@media \(max-width: 560px\)\s*{([\s\S]*?)\n}/);
  assert.ok(phone, 'no phone media query');
  const rule = phone[1].match(/\.showcase > svg\s*{([^}]*)}/);
  assert.ok(rule, 'no svg rule for phones');
  const max = Number(rule[1].match(/max-width:\s*(\d+)px/)?.[1]);
  assert.ok(max && max <= 260, `max-width ${max}`);
  assert.ok(/margin-inline:\s*auto/.test(rule[1]));
});

test('content keeps clear of the notch', () => {
  const inner = css().match(/\n\.inner {([^}]*)}/)[1];
  assert.ok(/padding-left:\s*max\(var\(--gutter\), env\(safe-area-inset-left\)\)/.test(inner));
  assert.ok(/padding-right:\s*max\(var\(--gutter\), env\(safe-area-inset-right\)\)/.test(inner));
});

test('hero language names link to their eras', () => {
  const hero = html().match(/<section class="hero">[\s\S]*?<\/section>/)[0];
  for (const [era, id] of [['oc', 'objc'], ['sw', 'swift'], ['ex', 'elixir']]) {
    assert.ok(hero.includes(`<a class="lang lang-${era}" href="#${id}">`), era);
  }
});

test('in-page links scroll smoothly unless motion is reduced', () => {
  assert.ok(/@media \(prefers-reduced-motion: no-preference\)\s*{\s*html\s*{\s*scroll-behavior:\s*smooth;/.test(css()));
});

test('wrapped sections line up with the hero text', () => {
  const narrow = css().match(/@media \(max-width: 907px\)\s*{([\s\S]*?)\n}/);
  assert.ok(narrow && /\.split > \.right\s*{[^}]*max-width:\s*820px/.test(narrow[1]));
});

test('theme toggle hidden without js', () => {
  assert.ok(/html:not\(\.js\) \.theme-toggle\s*{\s*display:\s*none;?\s*}/.test(css()));
});

test('obj-c pulse ring stays visible under reduced motion, as in the sketch', () => {
  const blocks = [...css().matchAll(/@media \(prefers-reduced-motion: reduce\)\s*{([\s\S]*?)\n}/g)].map((m) => m[1]).join('\n');
  assert.ok(!/\.oc-pulse\s*{[^}]*opacity:\s*0/.test(blocks));
});

test('swift title carries its idiom like the others', () => {
  const band = html().match(/<section id="swift"[\s\S]*?<div class="era-name">([\s\S]*?)<\/div>/)[1];
  assert.equal(band, '<span class="soft">.</span>Swift');
});

test('obj-c "and more" shows several small phones', () => {
  const more = html().match(/<g class="oc-content" data-part="more">([\s\S]*?)\n<\/g>\n<\/g>/);
  assert.ok(more, 'no more content');
  const phones = (more[1].match(/class="oc-anim oc-pop oc-phone"/g) ?? []).length;
  assert.ok(phones >= 2, `${phones} side phones`);
  assert.ok(!more[1].includes('>?</text>'), 'still the question mark');
  assert.ok(/\.showcase-oc\[data-sel="more"\] \.oc-frame\s*{[^}]*width:\s*70px/.test(css()), 'frame does not shrink');
});

test('obj-c cycle includes and more', () => {
  assert.ok(figure('oc').includes('data-cycle="mac tv car more"'));
});

test('"and more" phones keep moving gently while shown', () => {
  const style = css();
  for (const name of ['oc-scan', 'oc-tap', 'oc-sway']) {
    assert.ok(new RegExp(`\\.oc-content\\.on [^{]*{[^}]*${name}[^;]*infinite`).test(style), name);
    assert.ok(style.includes(`@keyframes ${name}`), `keyframes ${name}`);
  }
  assert.ok(html().includes('class="oc-anim oc-scan"'));
});
