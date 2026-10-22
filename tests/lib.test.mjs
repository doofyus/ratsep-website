import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readTheme, initialTheme, contrast } from '../lib.js';

test('readTheme returns a stored theme', () => {
  assert.equal(readTheme({ getItem: () => 'dark' }), 'dark');
});

test('readTheme ignores unknown values', () => {
  assert.equal(readTheme({ getItem: () => 'blue' }), null);
});

test('readTheme survives storage that throws', () => {
  assert.equal(readTheme({ getItem: () => { throw new Error('blocked'); } }), null);
});

test('initialTheme follows the system without a stored choice', () => {
  assert.equal(initialTheme(null, true), 'dark');
  assert.equal(initialTheme(null, false), 'light');
});

test('initialTheme prefers the stored choice', () => {
  assert.equal(initialTheme('light', true), 'light');
});

test('contrast gives WCAG ratios', () => {
  assert.ok(Math.abs(contrast('#000000', '#FFFFFF') - 21) < 0.01);
  assert.ok(Math.abs(contrast('#7A6A63', '#F4E9E2') - 4.33) < 0.02);
});

test('nextId wraps around', async () => {
  const { nextId } = await import('../lib.js');
  assert.equal(nextId(['a', 'b', 'c'], 'c'), 'a');
  assert.equal(nextId(['a', 'b', 'c'], 'a'), 'b');
});

test('nextId restarts from an id outside the cycle', async () => {
  const { nextId } = await import('../lib.js');
  assert.equal(nextId(['a', 'b'], 'more'), 'a');
});

test('shouldRun only when nothing holds it', async () => {
  const { shouldRun } = await import('../lib.js');
  const idle = { reduced: false, hovered: false, focused: false, hidden: false };
  assert.equal(shouldRun(idle), true);
  for (const flag of Object.keys(idle)) assert.equal(shouldRun({ ...idle, [flag]: true }), false, flag);
});

test('only a mouse counts as hovering', async () => {
  const { isHover } = await import('../lib.js');
  assert.equal(isHover({ pointerType: 'mouse' }), true);
  assert.equal(isHover({ pointerType: 'touch' }), false);
  assert.equal(isHover({ pointerType: 'pen' }), false);
});

test('mini header shows when scrolling up away from the top', async () => {
  const { headerVisible } = await import('../lib.js');
  const base = { threshold: 400, current: false };
  assert.equal(headerVisible({ ...base, y: 1200, lastY: 1260 }), true);
  assert.equal(headerVisible({ ...base, current: true, y: 1260, lastY: 1200 }), false);
  assert.equal(headerVisible({ ...base, current: true, y: 300, lastY: 340 }), false);
  assert.equal(headerVisible({ ...base, current: true, y: 1201, lastY: 1203 }), true);
  assert.equal(headerVisible({ ...base, current: false, y: 1203, lastY: 1201 }), false);
});

test('browser bar colour matches the theme', async () => {
  const { themeColor } = await import('../lib.js');
  assert.equal(themeColor('light'), '#F5F4F0');
  assert.equal(themeColor('dark'), '#1B1E23');
});
