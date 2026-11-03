/* Run: node scripts/verify-reference-alarm-interface.cjs */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const sandbox = {window: {}};
vm.runInNewContext(read('reference-alarm-interface.js'), sandbox,
  {filename: 'reference-alarm-interface.js'});
const api = sandbox.window.MGSAlarmInterface;
let checks = 0;
function check(label, fn) {
  try { fn(); checks++; } catch (error) { error.message = label + ': ' + error.message; throw error; }
}
check('model listing', () => assert.equal(api.models.join(','), 'unknown,tai,mega3'));
check('unknown fail-closed', () => assert.equal(api.model('invented').url, null));
check('default no model', () => assert.equal(api.model('unknown').url, null));
check('TAI official documentation', () => assert.match(api.model('tai').url, /^https:\/\/www\.beaconmedaes\.com\/en-us\/nfpa-documentation\/tai-notification-system-documentation$/));
check('MEGA3 official documentation', () => assert.match(api.model('mega3').url, /^https:\/\/www\.beaconmedaes\.com\/en-us\/nfpa-documentation\/mega3-alarm-documentation$/));
check('manufacturer models distinct', () => assert.notEqual(api.model('tai').url, api.model('mega3').url));
check('evidence checklist present', () => assert.equal(api.evidence.length, 6));
check('equipment and sensor part numbers required', () => assert.ok(api.evidence[1].includes('part number')));
check('installer must consult actual drawings', () => assert.ok(api.evidence[4].includes('actual drawings')));
check('independent verification remains separate', () => assert.ok(api.evidence[5].includes('independent')));
check('module does not touch storage', () => assert.ok(!read('reference-alarm-interface.js').includes('localStorage')));
check('module does not call backend', () => assert.ok(!read('reference-alarm-interface.js').includes('fetch(')));
check('module contains no wiring pinout table', () => assert.ok(!/terminal\s*[0-9]\s*(?:=|:)/i.test(read('reference-alarm-interface.js'))));
check('HTML includes alarm module first', () => assert.ok(read('reference.html').indexOf('reference-alarm-interface.js') < read('reference.html').indexOf('<script src="reference.js">')));
check('page mounts at area alarm only', () => assert.ok(read('reference.js').includes("component.id === 'area-alarm'")));
check('page uses alarm module', () => assert.ok(read('reference.js').includes('window.MGSAlarmInterface.mount')));
console.log('Manufacturer alarm document selector guards: ' + checks + ' passed.');
