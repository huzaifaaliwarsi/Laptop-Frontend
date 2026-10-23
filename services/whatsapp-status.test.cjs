const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const { EventEmitter } = require('node:events');
const tick = () => new Promise(resolve => setImmediate(resolve));

function fixture() {
  const requests = [], timers = new Map();
  const socket = new EventEmitter(); socket.connected = true;
  const context = { socket, api: { get: () => new Promise(resolve => requests.push(resolve)) },
    getSocket: () => socket, window: {}, localStorage: { getItem: () => '1' },
    setTimeout: (fn, ms) => { const id = Symbol(); timers.set(id, { fn, ms }); return id; },
    clearTimeout: id => timers.delete(id), module: { exports: {} } };
  let source = fs.readFileSync(require.resolve('./whatsapp-status.js'), 'utf8')
    .replace(/^import .*;\r?\n/gm, '').replace(/export /g, '');
  source += '\nmodule.exports = { subscribeWhatsAppStatus, getWhatsAppStatus, publishWhatsAppStatus };';
  vm.runInNewContext(source, context);
  return { ...context.module.exports, requests, timers, socket };
}

test('page and modal share one status request and a 60-second socket fallback', async () => {
  const f = fixture(); const a = f.subscribeWhatsAppStatus(() => {}), b = f.subscribeWhatsAppStatus(() => {});
  assert.equal(f.requests.length, 1);
  f.requests[0]({ success: true, data: { branchId: 1, connected: true } }); await tick();
  assert.equal(f.timers.size, 1); assert.equal([...f.timers.values()][0].ms, 60000);
  a(); b(); assert.equal(f.timers.size, 0);
});
test('late disconnected HTTP response cannot overwrite a connected socket event', async () => {
  const f = fixture(); const stop = f.subscribeWhatsAppStatus(() => {});
  f.socket.emit('whatsapp:status', { branchId: 1, connected: true, updatedAt: 20 });
  f.requests[0]({ success: true, data: { branchId: 1, connected: false, updatedAt: 10 } }); await tick();
  assert.equal(f.getWhatsAppStatus().connected, true);
  f.publishWhatsAppStatus({ branchId: 1, connected: false, updatedAt: 15 });
  assert.equal(f.getWhatsAppStatus().connected, true); stop();
});
test('rapid remount during HTTP request cannot create duplicate polling loops', async () => {
  const f = fixture(); f.subscribeWhatsAppStatus(() => {})();
  const stop = f.subscribeWhatsAppStatus(() => {});
  f.requests[0]({ success: true, data: { branchId: 1, connected: false } }); await tick();
  assert.equal(f.requests.length, 1); assert.equal(f.timers.size, 1); stop();
});
