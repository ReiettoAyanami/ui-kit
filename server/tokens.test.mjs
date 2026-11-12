import { test } from 'node:test';
import assert from 'node:assert/strict';

import { applyValues, invalidReason, readTokens, renderCss, tokensByName } from './tokens.mjs';

const percent = { name: '--kit-glass', type: 'percent', min: 0, max: 100 };
const length = { name: '--kit-border', type: 'length', min: 1, max: 4 };
const color = { name: '--kit-status-good', type: 'color' };
const easing = { name: '--kit-rise-easing', type: 'easing' };

test('values of the right shape and range pass', () => {
  assert.equal(invalidReason(percent, '56%'), null);
  assert.equal(invalidReason(length, '2px'), null);
  assert.equal(invalidReason(color, '#6ed889'), null);
  assert.equal(invalidReason(easing, 'cubic-bezier(0.05, 0.7, 0.1, 1)'), null);
  assert.equal(invalidReason(easing, 'ease-out'), null);
});

test('values out of range or of another shape are refused', () => {
  assert.equal(invalidReason(percent, '101%'), 'above 100');
  assert.equal(invalidReason(length, '0px'), 'below 1');
  assert.equal(invalidReason(length, '2em'), 'not a length value');
  assert.equal(invalidReason(color, 'red'), 'not a color value');
});

test('nothing that could break out of the CSS declaration gets through', () => {
  for (const value of ['2px; } body { display: none', '#fff;}', 'cubic-bezier(0,0,0,1); x: y', '56%}']) {
    for (const token of [percent, length, color, easing]) assert.notEqual(invalidReason(token, value), null, `${token.type}: ${value}`);
  }
});

test('applyValues changes only what it is given, and refuses unknown names', async () => {
  const document = await readTokens();
  const { document: next } = applyValues(document, { '--kit-glass': '60%' });
  assert.equal(tokensByName(next).get('--kit-glass').value, '60%');
  assert.equal(tokensByName(document).get('--kit-glass').value, '56%', 'the original is untouched');
  assert.deepEqual(applyValues(document, { '--kit-nope': '1px' }).errors, [{ name: '--kit-nope', reason: 'unknown variable' }]);
  assert.equal(applyValues(document, { '--kit-glass': '60%', '--kit-border': '9px' }).document, undefined, 'all or nothing');
});

test('the CSS has one declaration per token, in a :root block', async () => {
  const document = await readTokens();
  const css = renderCss(document);
  assert.match(css, /^\/\* Generated from tokens\.json/);
  assert.match(css, /:root \{/);
  assert.match(css, /--kit-glass: 56%;/);
  assert.match(css, /--mat-sys-surface: #1f1f22;/);
  assert.equal(css.match(/^ {2}--[\w-]+: .+;$/gm).length, tokensByName(document).size);
});
