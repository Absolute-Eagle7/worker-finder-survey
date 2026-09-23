const test = require('node:test');
const assert = require('node:assert/strict');
const pkg = require('../package.json');

test('app exposes a start script for the server', () => {
  assert.equal(pkg.scripts.start, 'node server.js');
});
