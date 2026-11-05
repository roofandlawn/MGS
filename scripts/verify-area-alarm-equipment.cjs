'use strict';
const assert=require('node:assert/strict');
const E=require('../area-alarm-equipment.js');
assert.equal(E.cardMarkup({id:'x',type:'Master alarm'},[]),'');
assert.equal(E.reportMarkup({id:'x',type:'Master alarm'},[]),'');
assert.equal(E.normalize(null).panelModel,'');
assert.equal(E.maxChannels,16);
assert.ok(!E.fields.includes('terminal'));
const r=E.normalize({panelManufacturer:'  BeaconMedaes  ',panelModel:'<script>alert(1)</script>',
  photoId:'p1',sensorService:'Oxygen',sensorPartNumber:'First sensor',
  updatedAt:'2026-11-04T08:00:00.000Z'});
assert.equal(r.panelManufacturer,'BeaconMedaes');
assert.equal(r.photoId,'p1');
assert.equal(r.updatedAt,'2026-11-04T08:00:00.000Z');
assert.equal(E.normalize({panelModel:'x'.repeat(400)}).panelModel.length,120);
assert.equal(r.sensorChannels.length,1,'legacy sensor fields migrate on read');
assert.equal(r.sensorChannels[0].sensorPartNumber,'First sensor');
assert.equal(r.sensorChannels[0].id,'legacy-1');
const legacyRoundtrip=E.normalize(JSON.parse(JSON.stringify(r)));
assert.deepEqual(legacyRoundtrip.sensorChannels,r.sensorChannels,'legacy upgrade must not duplicate channels');
const missing=E.status(r,[]);
assert.equal(missing.photoMissing,true);
assert.ok(missing.missing.includes('Installation photo'));
const linked=E.status(r,[{id:'p1',caption:'Nurse station panel'}]);
assert.equal(linked.photoMissing,false);
assert.ok(!linked.missing.includes('Installation photo'));
const a={id:'a1',type:'Area alarm',equipment:r};
const card=E.cardMarkup(a,[]);
assert.match(card,/data-alarm-equipment="a1"/);
assert.match(card,/Previously linked photo no longer exists/);
assert.ok(!card.includes('<script>'));
assert.match(card,/&lt;script&gt;/);
const report=E.reportMarkup(a,[{id:'p1',caption:'<img src=x>'}]);
assert.ok(!report.includes('<img'));
assert.match(report,/&lt;img src=x&gt;/);
assert.match(report,/not verification/);
const multi=E.normalize({panelModel:'Panel ABC',sensorChannels:[
  {id:'o2',channelLabel:'Zone A',sensorService:'Oxygen',sensorPartNumber:'P01',sensorRange:'0-100 psi'},
  {id:'air',channelLabel:'Zone B',sensorService:'Medical air',sensorPartNumber:'P02',sensorManufacturer:'Maker'},
  {id:'vac',sensorService:'Vacuum',sensorLocation:'L2',sensorRange:'0-30 inHg'}
]});
assert.equal(multi.sensorChannels.length,3);
assert.equal(multi.sensorService,'Oxygen','legacy field mirrors first channel');
assert.equal(multi.sensorChannels[1].sensorService,'Medical air');
assert.match(E.cardMarkup({id:'multi',type:'Area alarm',equipment:multi},[]),/3 sensor channel/);
assert.match(E.reportMarkup({id:'multi',type:'Area alarm',equipment:multi},[]),/Medical air/);
assert.ok(E.status(multi,[]).missing.includes('Channel 2: Sensor range and units'));
const malicious=E.extraChannelMarkup({id:'bad" onmouseover="x',sensorService:'<svg onload=alert(1)>'},1);
assert.ok(!malicious.includes('<svg'));
assert.ok(!malicious.includes('data-channel-id="bad" onmouseover="x"'));
assert.match(malicious,/&lt;svg/);
assert.equal(E.normalize({sensorChannels:Array.from({length:30},(_,i)=>({sensorService:'Service '+i}))}).sensorChannels.length,16);
assert.equal(E.normalize({sensorChannels:[],sensorService:'Oxygen'}).sensorChannels.length,0,
  'explicit empty channel list is not replaced by stale legacy field');
assert.equal(E.status({panelManufacturer:'Maker'},[]).recorded,1,
  'empty panel must not count nonexistent sensor details');
console.log('Area-alarm multi-channel model, legacy migration and HTML safeguards passed.');
