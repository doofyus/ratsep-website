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
