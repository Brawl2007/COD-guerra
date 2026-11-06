import test from 'node:test';
import assert from 'node:assert/strict';
import main from '../playwright.config.js';
import m02 from '../tools/m02/playwright-m02-01.config.js';

test('main Playwright config ignores M02 specs', () => {
  assert.ok([].concat(main.testIgnore).includes('**/m02-*.spec.js'));
});

test('M02 config still includes the m02-01 spec', () => {
  assert.equal(m02.testMatch, 'm02-01-quinta.spec.js');
  assert.ok(!m02.testIgnore);
});
