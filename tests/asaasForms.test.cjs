const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
function fixture() {
  const calls = [];
  const script = fs.readFileSync(path.join(__dirname, '../src/views/AsaasView.vue'), 'utf8').match(/<script setup>([\s\S]*?)<\/script>/)[1]
    .replace(/^import .*$/gm, '').replace('import.meta.env.VITE_API_URL', 'undefined');
  const context = {
    ref: value => ({ value }), computed: fn => ({ get value() { return fn(); } }), onMounted() {}, onUnmounted() {},
    localStorage: { getItem: () => JSON.stringify({ accessToken: 'test-token' }) },
    crypto: require('node:crypto').webcrypto,
    window: { confirm: () => true }, AbortController, URLSearchParams, URL, setTimeout, clearTimeout,
    fetch: async (url, options) => { calls.push({ url, method: options.method || 'GET', body: options.body && JSON.parse(options.body), headers: options.headers }); return { ok: true, json: async () => ({ id: 'created', data: [], totalCount: 0, hasMore: false, dates: {} }) }; }
  };
  vm.runInNewContext(script + '\nglobalThis.ui = { open, form, save, modal, customer, tab, action, error, modalError, changeTab, filters, page };', context);
  return { ui: context.ui, calls };
}
test('recurring form creates a subscription with nextDueDate and a stable request identifier', async () => {
  const { ui, calls } = fixture();
  ui.open('charge', { id: 'cus_test' });
  Object.assign(ui.form.value, { recurring: true, value: 29.9, dueDate: '2026-11-10' });
  await ui.save();
  const request = calls.find(c => c.method === 'POST');
  assert.equal(request.url, '/api/asaas/subscriptions');
  assert.equal(request.body.nextDueDate, '2026-11-10');
  assert.equal(request.body.dueDate, undefined);
  assert.equal(request.body.cycle, 'MONTHLY');
  assert.ok(request.headers['X-Request-Id'].length >= 16);
});
test('invoice form submits the selected municipal code and explicit tax values', async () => {
  const { ui, calls } = fixture();
  ui.open('invoice', { id: 'pay_test', customer: 'cus_test', value: 10 });
  Object.assign(ui.form.value, { serviceDescription: 'Servico', municipalServiceName: 'Servico municipal', municipalServiceCode: '1.01', iss: 2, cofins: 0, csll: 0, inss: 0, ir: 0, pis: 0 });
  await ui.save();
  const request = calls.find(c => c.method === 'POST');
  assert.equal(request.body.payment, 'pay_test');
  assert.equal(request.body.customer, undefined);
  assert.equal(request.body.taxes.iss, 2);
  assert.equal(request.body.taxes.retainIss, false);
  assert.equal(request.body.iss, undefined);
});
test('editing a fiscal note preserves additional taxes and targets that note instead of creating another', async () => {
  const { ui, calls } = fixture();
  ui.open('invoice', { id: 'inv_test', payment: 'pay_test', value: 10, taxes: { iss: 2, cofins: 0, csll: 0, inss: 0, ir: 0, pis: 0, customFiscalField: 'preserved' } }, true);
  await ui.save();
  const request = calls.find(c => c.method === 'PUT');
  assert.equal(request.url, '/api/asaas/invoices/inv_test');
  assert.equal(request.body.payment, 'pay_test');
  assert.equal(request.body.taxes.customFiscalField, 'preserved');
  assert.equal(calls.filter(c => c.method === 'POST').length, 0);
});
test('invoice submission refuses unspecified taxes before sending any request', async () => {
  const { ui, calls } = fixture();
  ui.open('invoice', { id: 'pay_test', customer: 'cus_test', value: 10 });
  await ui.save();
  assert.equal(calls.length, 0);
  assert.ok(ui.modalError.value);
});
