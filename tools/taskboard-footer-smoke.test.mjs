import test from 'node:test';
import assert from 'node:assert/strict';

import {
  extractFooterLabel,
  isVersionFooterLabel,
  resolveChromeBinary,
} from './taskboard-footer-smoke.mjs';

test('extractFooterLabel reads the rendered footer text', () => {
  const dom = `
    <app-root>
      <main>Board</main>
      <footer class="footer"><small>Backend version 1.2.3-SNAPSHOT</small></footer>
    </app-root>
  `;

  assert.equal(extractFooterLabel(dom), 'Backend version 1.2.3-SNAPSHOT');
});

test('extractFooterLabel fails when the footer is missing', () => {
  assert.throws(() => extractFooterLabel('<main>Board</main>'), /No <footer> element found/);
});

test('isVersionFooterLabel accepts a real version and rejects the fallback label', () => {
  assert.equal(isVersionFooterLabel('Backend version 0.0.1-SNAPSHOT'), true);
  assert.equal(isVersionFooterLabel('Backend version unavailable'), false);
});

test('resolveChromeBinary prefers CHROME_BIN when it points at an existing binary', () => {
  const binary = resolveChromeBinary({
    CHROME_BIN: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  });

  assert.equal(binary, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
});
