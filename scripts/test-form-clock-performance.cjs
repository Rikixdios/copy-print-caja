const fs = require('node:fs'), path = require('node:path'), ts = require('typescript'), vm = require('node:vm'), assert = require('node:assert/strict');
let constructors = 0;
const countedIntl = { DateTimeFormat: function (...args) { constructors++; return new Intl.DateTimeFormat(...args); } };
const cache = {};
function load(file) {
  file = path.resolve(file);
  if (cache[file]) return cache[file].exports;
  const mod = cache[file] = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file + '.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    module: mod, exports: mod.exports, require: name => load(path.resolve(path.dirname(file), name)), Intl: countedIntl, Date,
  });
  return mod.exports;
}
const { businessMoment } = load('app/business-time');
const { teamDate, attendanceRows, lastAttendanceMark, canMarkAttendance } = load('app/team-work-model');
const { displayTime } = load('app/date-format');
assert.equal(businessMoment(new Date('2026-10-27T02:59:59Z')).date, '2026-10-26');
assert.equal(businessMoment(new Date('2026-10-27T03:00:00Z')).date, '2026-10-27');
for (let i = 0; i < 5000; i++) {
  assert.equal(teamDate('2026-10-26T15:00:00Z'), '2026-10-26');
  assert.equal(displayTime('2026-10-26T15:00:00Z'), '12:00hs');
  businessMoment(new Date('2026-10-26T15:00:00Z'));
}
assert.equal(constructors, 3, 'reuse formatters; never construct one for every record or keystroke');
const marks = [
  { id: 'entry', advisor: 'Diana', at: '2026-10-26T12:00:00Z', kind: 'entrada' },
  { id: 'exit', advisor: 'Diana', at: '2026-10-26T13:00:00Z', kind: 'salida' },
  { id: 'undo', advisor: 'Diana', at: '2026-10-26T13:01:00Z', kind: 'correccion', corrects: 'exit' },
];
const at = '2026-10-26T14:00:00Z';
assert.equal(attendanceRows(marks)[0].salida, undefined);
assert.equal(lastAttendanceMark(marks, 'Diana', at).id, 'entry');
assert.equal(canMarkAttendance(marks, 'Diana', 'entrada', at), false);
assert.equal(canMarkAttendance(marks, 'Diana', 'almuerzo', at), true);
assert.equal(canMarkAttendance(marks, 'Diana', 'regreso', at), false);
assert.equal(canMarkAttendance(marks, 'Diana', 'salida', at), true);
assert.equal(canMarkAttendance(marks, 'Diana', 'entrada', '2026-10-27T14:00:00Z'), true);
console.log('PASS form clocks: 15,000 date/time lookups use only three formatters; Paraguay midnight, attendance corrections, allowed actions and next day stay correct.');
