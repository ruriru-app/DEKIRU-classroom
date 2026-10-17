const test = require('node:test');
const assert = require('node:assert/strict');

let Links = {};
try { Links = require('../grade56/make-sentences-links.js'); } catch (_) { /* Expected before implementation. */ }

test('a BUILD-enabled unit always receives BUILD first and MEMORIZE second', () => {
  assert.equal(typeof Links.entries, 'function');
  assert.deepEqual(
    Links.entries(true, 'nh6', 5).map(({ id, path }) => ({ id, path })),
    [
      { id: 'build', path: 'build-my-speech.html?book=nh6&unit=5' },
      { id: 'memorize', path: 'memorize-my-speech.html' },
    ],
  );
});

test('a unit without BUILD does not receive an unmatched MEMORIZE card', () => {
  assert.deepEqual(Links.entries(false, 'nh6', 5), []);
});
