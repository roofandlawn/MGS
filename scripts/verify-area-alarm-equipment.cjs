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
const photos=[{id:'o2-photo',caption:'Oxygen sensor at valve box'},
  {id:'air-photo',caption:'Air sensor photo'}];
const withEvidence=E.normalize({panelModel:'Multigas panel',sensorChannels:[
  {id:'oxygen',channelLabel:'O2-1',sensorService:'Oxygen',pointScheduleRef:'MG-301 / O2-1',
    pointScheduleRevision:'C',photoId:'o2-photo'},
  {id:'air',channelLabel:'AIR-1',sensorService:'Medical air',pointScheduleRef:'MG-301 / AIR-1',
    pointScheduleRevision:'B',photoId:'air-photo'}
]});
assert.equal(E.normalize(JSON.parse(JSON.stringify(withEvidence))).sensorChannels[1].photoId,'air-photo');
assert.equal(withEvidence.sensorChannels[0].pointScheduleRef,'MG-301 / O2-1');
const evidenceStatus=E.status(withEvidence,photos);
assert.equal(evidenceStatus.channels[0].photoMissing,false);
assert.equal(evidenceStatus.channels[1].photoMissing,false);
assert.ok(!evidenceStatus.missing.includes('Channel 2: Channel installation photo'));
const afterDelete=E.status(withEvidence,photos.slice(0,1));
assert.equal(afterDelete.channels[0].photoMissing,false);
assert.equal(afterDelete.channels[1].photoMissing,true);
assert.ok(afterDelete.missing.includes('Channel 2: Channel installation photo'));
const channelReport=E.reportMarkup({id:'e',type:'Area alarm',equipment:withEvidence},photos);
assert.match(channelReport,/MG-301 \/ O2-1/);
assert.match(channelReport,/MG-301 \/ AIR-1/);
assert.match(channelReport,/Oxygen sensor at valve box/);
assert.match(channelReport,/Air sensor photo/);
assert.match(E.cardMarkup({type:'Area alarm',id:'e',equipment:withEvidence},photos.slice(0,1)),/Previously linked channel photo missing/);
assert.match(E.photoOptionsMarkup(photos,'air-photo'),/Air sensor photo/);
assert.match(E.photoOptionsMarkup(photos,'deleted-photo'),/Previously linked channel photo missing/);
const safe=E.extraChannelMarkup({pointScheduleRef:'<svg onload=alert(1)>',
  photoId:'unlisted" onfocus="hack'},1,photos);
assert.ok(!safe.includes('<svg'));
assert.ok(!safe.includes('value="unlisted" onfocus="hack"'));
assert.match(safe,/&lt;svg/);
const functionalTests=[
  {id:'o2-func',type:'Area alarm functional test',system:'Oxygen',date:'2026-11-07',status:'Needs attention'},
  {id:'air-func',type:'Alarm low/high signal',system:'Medical air',date:'2026-11-07',status:'Pass'},
  {id:'pressure',type:'Standing pressure',system:'Oxygen',status:'Pass'}
];
assert.equal(E.alarmTestCandidates(functionalTests).length,2,'Other system tests cannot be offered as alarm tests');
const linked=E.normalize({sensorChannels:[
  {id:'o2',sensorService:'Oxygen',testIds:['o2-func','o2-func','air-func']},
  {id:'air',sensorService:'Medical air',testIds:['air-func']}
]});
assert.deepEqual(linked.sensorChannels[0].testIds,['o2-func','air-func'],'Repeated test links deduplicate');
assert.deepEqual(E.normalize(JSON.parse(JSON.stringify(linked))).sensorChannels[1].testIds,['air-func']);
assert.equal(E.normalizeChannel({testIds:'o2-func'},0).testIds.length,0,'Malformed test links are ignored');
assert.match(E.cardMarkup({id:'linked',type:'Area alarm',equipment:linked},[],functionalTests),/Needs attention/);
assert.match(E.reportMarkup({id:'linked',type:'Area alarm',equipment:linked},[],functionalTests),/Alarm low\/high signal/);
const deletedTestReport=E.reportMarkup({id:'linked',type:'Area alarm',equipment:linked},[],functionalTests.slice(1));
assert.match(deletedTestReport,/Previously linked alarm test record missing/,'Deleted test must remain flagged');
assert.ok(E.testChoicesMarkup(functionalTests,['o2-func']).includes('data-channel-test-id="o2-func" checked'));
assert.ok(!E.testChoicesMarkup(functionalTests,[]).includes('Standing pressure'));
const untrusted=E.testChoicesMarkup([{id:'bad" onload="x',type:'Alarm <script>alert(1)</script>'}],[]);
assert.ok(!untrusted.includes('<script>'));
assert.ok(!untrusted.includes('data-channel-test-id="bad" onload="x"'));
assert.match(untrusted,/&lt;script&gt;/);
const linkOnly=E.normalize({sensorChannels:[{testIds:['o2-func']}]});
assert.equal(linkOnly.sensorChannels.length,1,'Links alone must not silently discard a channel');
assert.equal(E.normalize({sensorChannels:[{sensorService:'Oxygen'}]}).sensorChannels[0].testIds.length,0);
console.log('Area-alarm channel test links, missing-record guards, and prior equipment checks passed.');
