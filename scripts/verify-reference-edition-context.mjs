import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
const script = readFileSync(new URL('../reference-edition-context.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../reference.html', import.meta.url), 'utf8');
const ui = readFileSync(new URL('../reference.js', import.meta.url), 'utf8');
const window = {};
runInNewContext(script, { window });
const { selectedProject, compare } = window.MGSReferenceEditionContext;
const store = (value, key = 'mgs-prototype-v3') => ({ getItem: name => name === key ? JSON.stringify(value) : null });
let count = 0;
function verify(fn) { fn(); count++; }
verify(() => assert.equal(selectedProject(null), null));
verify(() => assert.equal(selectedProject({ getItem() { throw Error('denied'); } }), null));
verify(() => assert.equal(selectedProject({ getItem() { return '{broken'; } }), null));
verify(() => assert.equal(selectedProject(store({ projects: [] })), null));
verify(() => assert.equal(selectedProject(store({
  selectedProjectId: 'b', projects: [{ id:'a', name:'A', codeBasis:{edition:'2018'} }, { id:'b', name:'B', codeBasis:{edition:'2024'} }]
})).edition,'2024'));
verify(() => assert.equal(selectedProject(store({
  selectedProjectId: 'missing', projects:[{id:'a',name:'A',codeBasis:{edition:'2018'}}]
})).id,'a'));
verify(() => assert.equal(selectedProject(store({
  projects:[{id:'a',name:'A',codeBasis:{edition:'bad'}}]
})).edition,'unconfirmed'));
verify(() => assert.equal(selectedProject(store({
  projects:[{id:'legacy',name:'Legacy',codeBasis:{edition:'2018'}}]
},'mgs-prototype-v2')).edition,'2018'));
verify(() => assert.equal(compare(null,'NFPA 99-2024').status,'none'));
verify(() => assert.equal(compare({edition:'2024'},'NFPA 99-2024').status,'match'));
verify(() => assert.equal(compare({edition:'2018'},'NFPA 99-2024').status,'mismatch'));
verify(() => assert.equal(compare({edition:'other'},'NFPA 99-2024').status,'other'));
verify(() => assert.equal(compare({edition:'unconfirmed'},'NFPA 99-2024').status,'unconfirmed'));
verify(() => assert.equal(compare({edition:'2024'},'unknown').status,'mismatch'));
verify(() => assert.ok(html.indexOf('reference-edition-context.js') < html.indexOf('reference.js')));
verify(() => assert.ok(ui.includes('NFPA 99-2024 section map (reference only)')));
console.log('Reference edition safeguards: ' + count + ' checks passed.');
