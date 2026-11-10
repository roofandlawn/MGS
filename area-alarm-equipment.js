/* Area alarm panel + multiple sensor channels. Field documentation only: NOT wiring or verification. */
(function(root){
'use strict';
const maxChannels=16;
const limits=Object.freeze({
  panelManufacturer:120,panelFamily:120,panelModel:120,panelRevision:80,
  sensorManufacturer:120,sensorPartNumber:120,sensorService:100,sensorRange:100,
  panelZoneId:120,factoryDoc:180,factoryDocRevision:80,
  approvedDrawing:180,reviewedBy:120,photoId:100,notes:600
});
const fields=Object.freeze(Object.keys(limits));
const channelFields=Object.freeze(['channelLabel','sensorLocation','sensorManufacturer','sensorPartNumber','sensorService','sensorRange','pointScheduleRef','pointScheduleRevision','photoId']);
const channelLimits=Object.freeze({channelLabel:120,sensorLocation:160,
  sensorManufacturer:120,sensorPartNumber:120,sensorService:100,sensorRange:100,
  pointScheduleRef:180,pointScheduleRevision:80,photoId:100});
const panelEvidence=Object.freeze({
  panelManufacturer:'Panel manufacturer',panelModel:'Exact panel model / part number',
  panelZoneId:'Panel / zone / room ID',factoryDoc:'Manufacturer wiring document ID',
  factoryDocRevision:'Wiring document revision',approvedDrawing:'Approved drawing / point schedule',
  photoId:'Installation photo'
});
const channelEvidence=Object.freeze({
  sensorManufacturer:'Sensor manufacturer',sensorPartNumber:'Exact sensor part number',
  sensorService:'Gas service',sensorRange:'Sensor range and units',
  pointScheduleRef:'Approved channel point schedule / drawing',photoId:'Channel installation photo'
});
function h(value){
  return String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
const maxTestLinks=24;
function alarmTestCandidates(tests) {
  return (Array.isArray(tests)?tests:[]).filter(test =>
    test && String(test.id||'') && /alarm/i.test(String(test.type||'')));
}
function normalizedTestIds(values) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map(id=>String(id||'').trim().slice(0,100)).filter(Boolean))].slice(0,maxTestLinks);
}
function testLabel(test) {
  return [test.type,test.system,test.date,test.status].map(value=>String(value||'').trim())
    .filter(Boolean).join(' / ');
}
// Only explicitly identified services are compared. Vague entries such as
// "air", "source" or an empty service are unknown, not a confirmed mismatch.
const servicePatterns=Object.freeze([
  ['oxygen',/\b(?:oxygen|o2)\b/i],
  ['medical air',/\b(?:medical[\s-]+air|med[\s-]*air)\b/i],
  ['medical vacuum',/\b(?:medical[\s-]+vacuum|med[\s-]*vac(?:uum)?|vacuum)\b/i],
  ['nitrous oxide',/\b(?:nitrous[\s-]+oxide|n2o)\b/i],
  ['nitrogen',/\b(?:nitrogen|n2)\b/i],
  ['instrument air',/\b(?:instrument[\s-]+air)\b/i]
]);
function recognizedServices(value) {
  const source=String(value||'').normalize('NFKC');
  return servicePatterns.filter(([,pattern])=>pattern.test(source)).map(([service])=>service);
}
function gasServiceMismatch(channelService,testService) {
  const channel=recognizedServices(channelService),test=recognizedServices(testService);
  // A combined functional test is compatible when the channel service is
  // explicitly included. Unknown service values must not be treated as a mismatch.
  return channel.length>0 && test.length>0 && !channel.some(service=>test.includes(service));
}
function mismatchWarning(channelService,testService) {
  return gasServiceMismatch(channelService,testService)
    ? 'Gas-service mismatch: '+String(channelService).trim()+' channel linked to '
      +String(testService).trim()+' test. Review this association against approved records.'
    : '';
}
// Unknown labels are neither a proven match nor a proven mismatch.
function serviceLinkAssessment(channelService,testService) {
  const channel=recognizedServices(channelService),test=recognizedServices(testService);
  if (!channel.length || !test.length) return {
    state:'unconfirmed',
    message:'Gas service unconfirmed: the sensor channel or linked alarm test does not identify a recognized service. Confirm both against approved project records.'
  };
  if (!channel.some(service=>test.includes(service))) return {
    state:'mismatch',message:mismatchWarning(channelService,testService)
  };
  return {state:'match',message:''};
}
function testChoicesMarkup(tests,selectedIds,channelService='') {
  const selected=normalizedTestIds(selectedIds);
  const available=alarmTestCandidates(tests);
  const known=new Set(available.map(test=>String(test.id)));
  const choices=available.map(test=>({id:String(test.id),label:testLabel(test),service:test.system||''}));
  selected.filter(id=>!known.has(id)).forEach(id=>choices.push({
    id,label:'Previously linked alarm test record missing — uncheck to clear',service:'',missing:true}));
  return '<div class="channel-test-options" aria-label="Channel alarm functional-test links">'
    +'<small class="helper">Link existing alarm functional-test records from this project. A recorded result does not establish independent verification.</small>'
    +(choices.length?choices.map(test=>{
      const assessment=selected.includes(test.id)&&!test.missing
        ?serviceLinkAssessment(channelService,test.service):{state:'match',message:''};
      const statusClass=assessment.state==='mismatch'?' gas-service-mismatch'
        :(assessment.state==='unconfirmed'?' gas-service-unconfirmed':'');
      return '<label><input type="checkbox" data-channel-test-id="'+h(test.id)+'"'
        +(selected.includes(test.id)?' checked':'')+'><span class="channel-test-description">'
        +h(test.label)+'<small class="gas-service-warning'+statusClass+'" role="alert"'
        +(assessment.message?'':' hidden')+'>'+h(assessment.message)+'</small></span></label>';
    }).join('')
      :'<small class="helper">No alarm test records yet. Add one under the Tests tab, then return here.</small>')
    +'</div>';
}
function refreshServiceWarnings(form,tests) {
  const list=alarmTestCandidates(tests);
  const update=(host,service)=>{
    if(!host)return;
    host.querySelectorAll('[data-channel-test-id]').forEach(input=>{
      const test=list.find(t=>String(t.id)===input.dataset.channelTestId);
      const note=input.closest('label')?.querySelector('.gas-service-warning');
      if(!note)return;
      const assessment=input.checked&&test
        ?serviceLinkAssessment(service,test.system):{state:'match',message:''};
      note.textContent=assessment.message;
      note.classList.toggle('gas-service-mismatch',assessment.state==='mismatch');
      note.classList.toggle('gas-service-unconfirmed',assessment.state==='unconfirmed');
      note.hidden=!assessment.message;
    });
  };
  update(form.querySelector('#firstChannelTestLinks'),form.elements.sensorService?.value||'');
  form.querySelectorAll('.sensor-extra-channel').forEach(group=>{
    update(group,group.querySelector('[data-channel-field="sensorService"]')?.value||'');
  });
}
function testSummary(channel,tests) {
  if(!channel.testIds.length)return 'No alarm functional-test records linked';
  const list=Array.isArray(tests)?tests:[];
  return channel.testIds.map(id=>{
    const test=list.find(item=>String(item.id)===id && /alarm/i.test(String(item.type||'')));
    if(!test)return 'Previously linked alarm test record missing';
    const assessment=serviceLinkAssessment(channel.sensorService,test.system);
    return testLabel(test)+(assessment.message
      ?' ['+(assessment.state==='mismatch'?'WARNING: ':'UNCONFIRMED: ')+assessment.message+']':'');
  }).join(' | ');
}
function checkedTestIds(host) {
  if(!host)return [];
  return normalizedTestIds(Array.from(host.querySelectorAll('[data-channel-test-id]:checked'))
    .map(input=>input.dataset.channelTestId));
}
function normalizeChannel(raw,index){
  const input=raw&&typeof raw==='object'?raw:{};
  const out={id:String(input.id||'').trim().slice(0,100)||'channel-'+String(index+1)};
  channelFields.forEach(key=>{out[key]=String(input[key]??'').trim().slice(0,channelLimits[key]);});
  out.testIds=normalizedTestIds(input.testIds);
  return out;
}
function hasChannelData(channel){return channelFields.some(key=>Boolean(channel[key])) || channel.testIds.length>0;}
function normalize(raw){
  const input=raw&&typeof raw==='object'?raw:{},out={};
  fields.forEach(key=>{out[key]=String(input[key]??'').trim().slice(0,limits[key]);});
  // Legacy equipment used top-level sensor fields. Convert on read without dropping evidence.
  const rawChannels=Array.isArray(input.sensorChannels)?input.sensorChannels:[{
    id:'legacy-1',sensorManufacturer:out.sensorManufacturer,sensorPartNumber:out.sensorPartNumber,
    sensorService:out.sensorService,sensorRange:out.sensorRange
  }];
  out.sensorChannels=rawChannels.slice(0,maxChannels).map(normalizeChannel).filter(hasChannelData);
  // Keep the first sensor mirrored for old clients / reports until full schema migration.
  ['sensorManufacturer','sensorPartNumber','sensorService','sensorRange'].forEach(key=>{
    out[key]=out.sensorChannels[0]?.[key]||'';
  });
  out.updatedAt=/^\d{4}-\d{2}-\d{2}T/.test(String(input.updatedAt||''))?String(input.updatedAt):null;
  return out;
}
function status(raw,photos){
  const record=normalize(raw),list=Array.isArray(photos)?photos:[];
  const linkedPhoto=list.find(p=>p.id===record.photoId)||null;
  const missing=Object.entries(panelEvidence)
    .filter(([key])=>key==='photoId'?!linkedPhoto:!record[key])
    .map(([,label])=>label);
  const channels=record.sensorChannels.map((channel,index)=>{
    const linkedChannelPhoto=list.find(p=>p.id===channel.photoId)||null;
    const pending=Object.entries(channelEvidence)
      .filter(([key])=>key==='photoId'?!linkedChannelPhoto:!channel[key])
      .map(([,label])=>label);
    missing.push(...pending.map(label=>'Channel '+(index+1)+': '+label));
    return {id:channel.id,missing:pending,
      recorded:Object.keys(channelEvidence).length-pending.length,
      photoMissing:Boolean(channel.photoId&&!linkedChannelPhoto),linkedPhoto:linkedChannelPhoto};
  });
  if(!channels.length) missing.push(...Object.values(channelEvidence).map(label=>'Channel 1: '+label));
  const total=Object.keys(panelEvidence).length+Math.max(1,channels.length)*Object.keys(channelEvidence).length;
  return {linkedPhoto,missing,total,recorded:total-missing.length,
    channels,photoMissing:Boolean(record.photoId&&!linkedPhoto)};
}
function row(label,value){
  return '<div><dt>'+h(label)+'</dt><dd>'+h(value||'Not recorded')+'</dd></div>';
}
function channelSummary(channel,index,photos,tests=[]){
  const linked=photos.find(photo=>photo.id===channel.photoId);
  const photoStatus=linked?(linked.caption||linked.location||'Linked photo'):
    (channel.photoId?'Previously linked channel photo missing':'Channel photo not linked');
  return row('Channel '+(index+1)+(channel.channelLabel?' — '+channel.channelLabel:''),
    [channel.sensorService,channel.sensorLocation,channel.sensorManufacturer,channel.sensorPartNumber,
      channel.sensorRange,channel.pointScheduleRef,
      channel.pointScheduleRevision?'Rev '+channel.pointScheduleRevision:'',
      photoStatus,testSummary(channel,tests)].filter(Boolean).join(' / '));
}
function cardMarkup(alarm,photos,tests=[]){
  if(!alarm||alarm.type!=='Area alarm')return '';
  const record=alarm.equipment?normalize(alarm.equipment):null;
  const s=record?status(record,photos):null;
  const description=record
    ? '<strong>Equipment documentation: '+s.recorded+' of '+s.total+' evidence fields recorded</strong>'
      +'<small>'+record.sensorChannels.length+' sensor channel(s) on this panel</small>'
      +'<dl>'+row('Panel',[record.panelManufacturer,record.panelFamily,record.panelModel,record.panelRevision].filter(Boolean).join(' / '))
      +row('Panel / zone ID',record.panelZoneId)
      +record.sensorChannels.map((channel,index)=>channelSummary(channel,index,Array.isArray(photos)?photos:[],tests)).join('')
      +row('Manufacturer document',[record.factoryDoc,record.factoryDocRevision].filter(Boolean).join(' / '))
      +row('Approved drawing',record.approvedDrawing)
      +row('Project photo',s.linkedPhoto?(s.linkedPhoto.caption||s.linkedPhoto.location||'Linked photo')
        :(s.photoMissing?'Previously linked photo no longer exists':'Not linked'))+'</dl>'
      +(s.missing.length?'<small>Still to document: '+h(s.missing.join(', '))+'</small>'
        :'<small>Fields recorded; independent verification is NOT confirmed.</small>')
    :'<strong>Equipment identification not recorded</strong><small>Record the panel and each installed sensor channel.</small>';
  return '<div class="area-alarm-equipment">'+description
    +'<button type="button" class="secondary" data-alarm-equipment="'+h(alarm.id)+'">'
    +(record?'Edit equipment details':'+ Record equipment details')+'</button>'
    +'<small>Documentation only. Do not infer wiring terminals or approval.</small></div>';
}
function reportMarkup(alarm,photos,tests=[]){
  if(!alarm||alarm.type!=='Area alarm'||!alarm.equipment)return '';
  const e=normalize(alarm.equipment),s=status(e,photos);
  const details=[
    ['Panel manufacturer',e.panelManufacturer],['Family',e.panelFamily],['Panel model',e.panelModel],
    ['Panel revision',e.panelRevision],['Panel / zone / room',e.panelZoneId],
    ['Factory wiring document',e.factoryDoc],['Document revision',e.factoryDocRevision],
    ['Approved drawing',e.approvedDrawing],['Document reviewer',e.reviewedBy],
    ['Photo',s.linkedPhoto?(s.linkedPhoto.caption||s.linkedPhoto.location||s.linkedPhoto.id):
      (s.photoMissing?'Linked photo missing':'Not linked')],['Notes',e.notes]
  ];
  const channels=e.sensorChannels.length
    ? e.sensorChannels.map((channel,index)=>{
      const photo=s.channels[index].linkedPhoto;
      const pairs=[['Gas service',channel.sensorService],['Channel label',channel.channelLabel],
        ['Sensor location',channel.sensorLocation],['Sensor manufacturer',channel.sensorManufacturer],
        ['Sensor part number',channel.sensorPartNumber],['Sensor range',channel.sensorRange],
        ['Approved point schedule / drawing',channel.pointScheduleRef],
        ['Point schedule revision',channel.pointScheduleRevision],
        ['Linked alarm functional-test records',testSummary(channel,tests)],
        ['Channel installation photo',photo?(photo.caption||photo.location||photo.id):
          (channel.photoId?'Previously linked channel photo missing':'Not linked')]];
      return '<div><strong>Channel '+(index+1)+'</strong><br>'
        +pairs.map(([label,value])=>'<small><strong>'+h(label)+':</strong> '+h(value||'Not recorded')+'</small>').join('<br>')+'</div>';
    }).join('')
    :'<small>No sensor channels recorded.</small>';
  return '<div class="alarm-equipment-report"><strong>Equipment documentation (not verification)</strong><br>'
    +details.map(([label,value])=>'<small><strong>'+h(label)+':</strong> '+h(value||'Not recorded')+'</small>').join('<br>')
    +'<div class="alarm-channel-report">'+channels+'</div>'
    +'<br><small>Evidence fields recorded: '+s.recorded+'/'+s.total+'; pending: '
    +h(s.missing.join(', ')||'None; independent verification still required')+'</small>'
    +'<br><small>Test links reflect existing field records, not ASSE 6030 verification.</small></div>';
}
function photoOptionsMarkup(photos,selectedId){
  const list=Array.isArray(photos)?photos:[];
  const options=['<option value="">No channel photo linked</option>'];
  if(selectedId&&!list.some(photo=>photo.id===selectedId))
    options.push('<option value="'+h(selectedId)+'">Previously linked channel photo missing — replace or clear</option>');
  list.forEach(photo=>options.push('<option value="'+h(photo.id)+'">'+h(photo.caption||photo.location||'Project photo')+'</option>'));
  return options.join('');
}
function extraChannelMarkup(raw,index,photos=[],tests=[]){
  const c=normalizeChannel(raw,index);
  return '<fieldset class="equipment-fieldset sensor-extra-channel" data-channel-id="'+h(c.id)+'">'
    +'<legend>Channel '+(index+1)+'</legend>'
    +'<button type="button" class="secondary" data-remove-sensor-channel>Remove this channel</button>'
    +'<label>Channel / point label<input data-channel-field="channelLabel" maxlength="120" value="'+h(c.channelLabel)+'" placeholder="Point schedule identifier"></label>'
    +'<label>Sensor location<input data-channel-field="sensorLocation" maxlength="160" value="'+h(c.sensorLocation)+'" placeholder="Location as shown on approved drawings"></label>'
    +'<label>Sensor manufacturer<input data-channel-field="sensorManufacturer" maxlength="120" value="'+h(c.sensorManufacturer)+'"></label>'
    +'<label>Exact sensor part number<input data-channel-field="sensorPartNumber" maxlength="120" value="'+h(c.sensorPartNumber)+'"></label>'
    +'<label>Gas service / channel<input data-channel-field="sensorService" maxlength="100" value="'+h(c.sensorService)+'"></label>'
    +'<label>Sensor range and units<input data-channel-field="sensorRange" maxlength="100" value="'+h(c.sensorRange)+'"></label>'
    +'<label>Approved point schedule / drawing<input data-channel-field="pointScheduleRef" maxlength="180" value="'+h(c.pointScheduleRef)+'" placeholder="Sheet / point ID — approved documents only"></label>'
    +'<label>Point schedule revision<input data-channel-field="pointScheduleRevision" maxlength="80" value="'+h(c.pointScheduleRevision)+'"></label>'
    +'<label>Channel installation photo<select data-channel-field="photoId">'+photoOptionsMarkup(photos,c.photoId)+'</select></label>'
    +'<div class="channel-test-field"><strong>Linked alarm functional-test records</strong>'
    +testChoicesMarkup(tests,c.testIds,c.sensorService)+'</div>'
    +'</fieldset>';
}
function collectChannels(form){
  const first={
    id:form.dataset.firstChannelId||'channel-1',
    channelLabel:form.elements.channelLabel.value,
    sensorLocation:form.elements.sensorLocation.value,
    pointScheduleRef:form.elements.pointScheduleRef.value,
    pointScheduleRevision:form.elements.pointScheduleRevision.value,
    photoId:form.elements.channelPhotoId.value,
    testIds:checkedTestIds(form.querySelector('#firstChannelTestLinks'))
  };
  ['sensorManufacturer','sensorPartNumber','sensorService','sensorRange'].forEach(key=>{
    first[key]=form.elements[key].value;
  });
  const entries=[first];
  form.querySelectorAll('.sensor-extra-channel').forEach(group=>{
    const channel={id:group.dataset.channelId,testIds:checkedTestIds(group)};
    group.querySelectorAll('[data-channel-field]').forEach(input=>{
      if(channelFields.includes(input.dataset.channelField))
        channel[input.dataset.channelField]=input.value;
    });
    entries.push(channel);
  });
  return entries.slice(0,maxChannels).map(normalizeChannel).filter(hasChannelData);
}
const api=Object.freeze({fields,channelFields,maxChannels,maxTestLinks,normalizeChannel,normalize,
  status,cardMarkup,reportMarkup,extraChannelMarkup,photoOptionsMarkup,
  alarmTestCandidates,recognizedServices,gasServiceMismatch,mismatchWarning,serviceLinkAssessment,
  testChoicesMarkup,refreshServiceWarnings,testSummary,collectChannels});
root.MGSAreaAlarmEquipment=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
