import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../reference-edition-map.js', import.meta.url), 'utf8');
const window = {};
runInNewContext(source, { window });
const { records, indexFor } = window.MGSReferenceEditionMap;
let checks = 0;
const verify = fn => { fn(); checks++; };
const component = (id, nfpa) => ({ id, nfpa });
const ctx = edition => ({ status: 'mismatch', project: { edition } });
const master = 'NFPA 99-2024';
const sections = (item, context, edition=master) =>
  Array.from(indexFor(item, context, edition).sections);

verify(() => assert.deepEqual(sections(component('zone-valve', ['5.1.4.6','5.1.8.2.2']), ctx('2018')), ['5.1.4.6']));
verify(() => assert.deepEqual(sections(component('area-alarm', ['5.1.9.4','5.1.9.4.4']), ctx('2018')), ['5.1.9.4']));
verify(() => assert.deepEqual(sections(component('source-valve', ['5.1.4.2']), ctx('2018')), []));
verify(() => assert.deepEqual(sections(component('zone-valve', ['5.1.4.6']), ctx('other')), []));
verify(() => assert.deepEqual(sections(component('zone-valve', ['5.1.4.6']), {status:'unconfirmed',project:{edition:'unconfirmed'}}), []));
verify(() => assert.deepEqual(sections(component('zone-valve', ['5.1.4.6']), {status:'none',project:null}), ['5.1.4.6']));
verify(() => assert.deepEqual(sections(component('zone-valve', ['5.1.4.6','5.1.9.4.4']), {status:'match',project:{edition:'2024'}}), ['5.1.4.6','5.1.9.4.4']));
verify(() => assert.deepEqual(sections(component('zone-valve', ['2024-secret','5.1.4.6']), {status:'match',project:{edition:'2024'}}), ['5.1.4.6']));
verify(() => assert.deepEqual(sections(component('zone-valve', ['5.1.4.6']), ctx('2018'), 'NFPA 99-2018'), []));
verify(() => assert.equal(indexFor(component('zone-valve',[]),ctx('2018'),master).state, 'corroborated-heading'));
verify(() => assert.equal(indexFor(component('source-valve',['5.1.4.2']),ctx('2018'),master).state, 'unavailable'));
verify(() => assert.ok(records['zone-valve']['2018'].sourceUrl.startsWith('https://')));
verify(() => assert.ok(records['area-alarm']['2024'].sections.includes('5.1.9.4')));
verify(() => assert.deepEqual(sections(null,ctx('2018')), []));
console.log('NFPA edition locator safeguards: '+checks+' checks passed.');
