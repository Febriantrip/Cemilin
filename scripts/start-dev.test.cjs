'use strict';

const assert = require('node:assert/strict');
const net = require('node:net');
const { test } = require('node:test');
const { findAvailablePort, preferredPort } = require('./start-dev.cjs');

test('valid preferred port and safe fallback', () => {
  assert.equal(preferredPort('8787', 8787), 8787);
  assert.equal(preferredPort('99999', 8787), 8787);
  assert.equal(preferredPort('not-a-port', 5173), 5173);
});

test('auto-select skips a port already occupied by another app', async () => {
  const blocker = net.createServer();
  await new Promise((resolve) => blocker.listen({ host: '0.0.0.0', port: 0 }, resolve));
  const occupiedPort = blocker.address().port;
  try {
    const selected = await findAvailablePort(occupiedPort, 30);
    assert.notEqual(selected, occupiedPort);
    assert.ok(selected > occupiedPort);
  } finally {
    await new Promise((resolve) => blocker.close(resolve));
  }
});

test('selected port can be bound by a server', async () => {
  const selected = await findAvailablePort(5173);
  const listener = net.createServer();
  await new Promise((resolve) => listener.listen({ host: '0.0.0.0', port: selected }, resolve));
  assert.equal(listener.address().port, selected);
  await new Promise((resolve) => listener.close(resolve));
});
