/* Run with: node scripts/verify-reference-topology.cjs */
(function checkTopology() {
  'use strict';
  const assert = require('node:assert/strict');
  const fs = require('node:fs');
  const path = require('node:path');
  const vm = require('node:vm');
  const root = path.resolve(__dirname, '..');
  const read = name => fs.readFileSync(path.join(root,name),'utf8');
  const sandbox = {window:{}};
  vm.runInNewContext(read('reference-topology.js'),sandbox,{filename:'reference-topology.js'});
  const api = sandbox.window.MGSTopologyDiagrams;
  let total=0;
  const test = (name, run) => { try {run();total++;}catch(e){e.message=name+': '+e.message;throw e;} };
  const valid2018 = {state:'public-source-summary',edition:'2018'};
  const valid2024 = {state:'public-source-summary',edition:'2024'};

  test('api installed',()=>assert.equal(typeof api.mount,'function'));
  test('2018 gate',()=>assert.equal(api.allowed(valid2018),true));
  test('2024 gate',()=>assert.equal(api.allowed(valid2024),true));
  test('unconfirmed gate',()=>assert.equal(api.allowed({state:'unavailable',edition:null}),false));
  test('unexpected edition gate',()=>assert.equal(api.allowed({state:'public-source-summary',edition:'2012'}),false));
  test('null gate',()=>assert.equal(api.allowed(null),false));
  test('three modes',()=>assert.equal(api.modes.length,3));
  test('bad mode unavailable',()=>assert.equal(api.describe('not-a-mode'),null));
  test('no SVG for bad mode',()=>assert.equal(api.svgFor('not-a-mode'),''));
  for(const modeId of ['single','shared','separate']){
    const data=api.describe(modeId), markup=api.svgFor(modeId);
    test(modeId+' has a visible valve',()=>assert.ok(data.nodes.some(n=>n.kind==='valve')));
    test(modeId+' has a visible sensor',()=>assert.ok(data.nodes.some(n=>n.kind==='sensor')));
    test(modeId+' has a visible alarm',()=>assert.ok(data.nodes.some(n=>n.kind==='alarm')));
    test(modeId+' has solid pipe connection',()=>assert.ok(markup.includes('data-topology-link="pipe"')));
    test(modeId+' has distinct dashed signal',()=>assert.ok(markup.includes('data-topology-link="signal"')));
    test(modeId+' has accessible node labels',()=>assert.ok(markup.includes('role="button" tabindex="0" aria-label=')));
    test(modeId+' has text-only path',()=>assert.ok(data.sequence.includes('Sensor')||data.sequence.includes('sensor')));
    test(modeId+' has explicit caution',()=>assert.ok(data.warning.length>70));
    test(modeId+' output is SVG',()=>assert.ok(markup.startsWith('<svg')));
  }
  test('shared topology has two room outlets',()=>assert.equal(api.describe('shared').nodes.filter(n=>n.kind==='outlet').length,2));
  test('separate topology has two zone valves',()=>assert.equal(api.describe('separate').nodes.filter(n=>n.kind==='valve').length,2));
  test('separate topology has two sensors',()=>assert.equal(api.describe('separate').nodes.filter(n=>n.kind==='sensor').length,2));
  test('no anesthetizing layout',()=>assert.ok(!api.modes.some(m=>api.describe(m).heading.toLowerCase().includes('anesthetizing'))));
  test('module does not write project storage',()=>assert.ok(!read('reference-topology.js').includes('localStorage')));
  test('module does not call backend',()=>assert.ok(!read('reference-topology.js').includes('fetch(')));
  test('html loads topology before page',()=>assert.ok(read('reference.html').indexOf('reference-topology.js')<read('reference.html').indexOf('<script src="reference.js">')));
  test('detail mounts only when host exists',()=>assert.ok(read('reference.js').includes('if (topologyHost) window.MGSTopologyDiagrams.mount')));
  test('detail creates topology host',()=>assert.ok(read('reference.js').includes('data-topology-host')));
  test('stylesheet includes scroll container',()=>assert.ok(read('reference.css').includes('.topology-viewport{width:100%;')));
  console.log(`Medical-gas interactive topology guards: ${total} checks passed.`);
})();
