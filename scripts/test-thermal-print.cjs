const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('app/dashboard.tsx', 'utf8');
const html = source.slice(source.indexOf('function printThermalReceipt('), source.indexOf('\nfunction ThermalReceipt'));
const script = html.slice(html.indexOf('<script>') + 8, html.indexOf('window.onafterprint='));
async function check(height, expected) {
  const pageStyle = {textContent: ''};
  const events = {};
  let printed = 0, decoded = 0;
  let contentHeight = height;
  const context = {document: {
    fonts: {ready: Promise.resolve()},
    images: [{decode: async () => {decoded++;}}, {decode: async () => {throw Error('missing logo');}}],
    querySelector: () => ({getBoundingClientRect: () => ({height: contentHeight}), scrollHeight: contentHeight}),
    getElementById: () => pageStyle,
  }, window: {addEventListener: (name, fn) => events[name] = fn, print: () => {assert.equal(decoded, 1); printed++;}}, requestAnimationFrame: fn => fn()};
  vm.runInNewContext(script, context);
  await context.window.onload();
  assert.equal(printed, 1);
  assert.equal(pageStyle.textContent, `@page{size:80mm ${expected}mm;margin:0}`);
  contentHeight += 96;
  events.beforeprint();
  assert.equal(pageStyle.textContent, `@page{size:80mm ${Math.ceil(contentHeight*25.4/96)+1}mm;margin:0}`);
}
(async () => {
  await check(400, 107);
  await check(1800, 478);
  assert.ok(html.includes('main{width:72mm'));
  console.log('Thermal print: short/long tickets, assets, and remeasurement passed.');
})();
