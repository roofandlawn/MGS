/* Field identification only: no terminal pinouts, installation approvals or verification claims. */
(function(root){
'use strict';
const limits=Object.freeze({
  panelManufacturer:120,panelFamily:120,panelModel:120,panelRevision:80,
  sensorManufacturer:120,sensorPartNumber:120,sensorService:100,sensorRange:100,
  panelZoneId:120,factoryDoc:180,factoryDocRevision:80,
  approvedDrawing:180,reviewedBy:120,photoId:100,notes:600
});
const fields=Object.freeze(Object.keys(limits));
const evidence=Object.freeze({
  panelManufacturer:'Panel manufacturer',panelModel:'Exact panel model / part number',
  sensorManufacturer:'Sensor manufacturer',sensorPartNumber:'Exact sensor part number',
  sensorService:'Gas service / channel',sensorRange:'Sensor range and units',
  panelZoneId:'Panel / zone / room ID',factoryDoc:'Manufacturer wiring document ID',
  factoryDocRevision:'Wiring document revision',
  approvedDrawing:'Approved drawing / point schedule',photoId:'Installation photo'
});
function h(value){
  return String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function normalize(raw){
  const input=raw&&typeof raw==='object'?raw:{},out={};
  fields.forEach(key=>{out[key]=String(input[key]??'').trim().slice(0,limits[key]);});
  out.updatedAt=/^\d{4}-\d{2}-\d{2}T/.test(String(input.updatedAt||''))?String(input.updatedAt):null;
  return out;
}
function status(raw,photos){
  const record=normalize(raw), list=Array.isArray(photos)?photos:[];
  const linkedPhoto=list.find(p=>p.id===record.photoId)||null;
  const missing=Object.entries(evidence)
    .filter(([key])=>key==='photoId'?!linkedPhoto:!record[key])
    .map(([,label])=>label);
  const total=Object.keys(evidence).length;
  return {linkedPhoto,missing,total,recorded:total-missing.length,photoMissing:Boolean(record.photoId&&!linkedPhoto)};
}
function row(label,value){
  return '<div><dt>'+h(label)+'</dt><dd>'+h(value||'Not recorded')+'</dd></div>';
}
function cardMarkup(alarm,photos){
  if(!alarm||alarm.type!=='Area alarm')return '';
  const record=alarm.equipment?normalize(alarm.equipment):null;
  const s=record?status(record,photos):null;
  const description=record
    ? '<strong>Equipment documentation: '+s.recorded+' of '+s.total+' evidence fields recorded</strong>'
      +'<dl>'+row('Panel',[record.panelManufacturer,record.panelFamily,record.panelModel,record.panelRevision].filter(Boolean).join(' / '))
      +row('Sensor channel',[record.sensorService,record.sensorManufacturer,record.sensorPartNumber].filter(Boolean).join(' / '))
      +row('Manufacturer document',[record.factoryDoc,record.factoryDocRevision].filter(Boolean).join(' / '))
      +row('Approved drawing',record.approvedDrawing)
      +row('Project photo',s.linkedPhoto?(s.linkedPhoto.caption||s.linkedPhoto.location||'Linked photo')
        :(s.photoMissing?'Previously linked photo no longer exists':'Not linked'))+'</dl>'
      +(s.missing.length?'<small>Still to document: '+h(s.missing.join(', '))+'</small>'
        :'<small>Fields recorded; independent verification is NOT confirmed.</small>')
    :'<strong>Equipment identification not recorded</strong><small>Record installed panel, sensor, factory-document and drawing information.</small>';
  return '<div class="area-alarm-equipment">'+description
    +'<button type="button" class="secondary" data-alarm-equipment="'+h(alarm.id)+'">'
    +(record?'Edit equipment details':'+ Record equipment details')+'</button>'
    +'<small>Documentation only. Do not infer wiring terminals or approval.</small></div>';
}
function reportMarkup(alarm,photos){
  if(!alarm||alarm.type!=='Area alarm'||!alarm.equipment)return '';
  const e=normalize(alarm.equipment),s=status(e,photos);
  const details=[
    ['Panel manufacturer',e.panelManufacturer],['Family',e.panelFamily],['Panel model',e.panelModel],
    ['Panel revision',e.panelRevision],['Sensor manufacturer',e.sensorManufacturer],
    ['Sensor part number',e.sensorPartNumber],['Gas service',e.sensorService],
    ['Sensor range',e.sensorRange],['Panel / zone / room',e.panelZoneId],
    ['Factory wiring document',e.factoryDoc],['Document revision',e.factoryDocRevision],
    ['Approved drawing',e.approvedDrawing],['Document reviewer',e.reviewedBy],
    ['Photo',s.linkedPhoto?(s.linkedPhoto.caption||s.linkedPhoto.location||s.linkedPhoto.id):
      (s.photoMissing?'Linked photo missing':'Not linked')],['Notes',e.notes]
  ];
  return '<div class="alarm-equipment-report"><strong>Equipment documentation (not verification)</strong><br>'
    +details.map(([label,value])=>'<small><strong>'+h(label)+':</strong> '+h(value||'Not recorded')+'</small>').join('<br>')
    +'<br><small>Evidence fields recorded: '+s.recorded+'/'+s.total+'; pending: '
    +h(s.missing.join(', ')||'None; independent verification still required')+'</small></div>';
}
const api=Object.freeze({fields,normalize,status,cardMarkup,reportMarkup});
root.MGSAreaAlarmEquipment=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
