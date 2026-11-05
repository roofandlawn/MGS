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
const channelFields=Object.freeze(['channelLabel','sensorLocation','sensorManufacturer','sensorPartNumber','sensorService','sensorRange']);
const channelLimits=Object.freeze({channelLabel:120,sensorLocation:160,
  sensorManufacturer:120,sensorPartNumber:120,sensorService:100,sensorRange:100});
const panelEvidence=Object.freeze({
  panelManufacturer:'Panel manufacturer',panelModel:'Exact panel model / part number',
  panelZoneId:'Panel / zone / room ID',factoryDoc:'Manufacturer wiring document ID',
  factoryDocRevision:'Wiring document revision',approvedDrawing:'Approved drawing / point schedule',
  photoId:'Installation photo'
});
const channelEvidence=Object.freeze({
  sensorManufacturer:'Sensor manufacturer',sensorPartNumber:'Exact sensor part number',
  sensorService:'Gas service',sensorRange:'Sensor range and units'
});
function h(value){
  return String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function normalizeChannel(raw,index){
  const input=raw&&typeof raw==='object'?raw:{};
  const out={id:String(input.id||'').trim().slice(0,100)||'channel-'+String(index+1)};
  channelFields.forEach(key=>{out[key]=String(input[key]??'').trim().slice(0,channelLimits[key]);});
  return out;
}
function hasChannelData(channel){return channelFields.some(key=>Boolean(channel[key]));}
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
    const pending=Object.entries(channelEvidence)
      .filter(([key])=>!channel[key]).map(([,label])=>label);
    missing.push(...pending.map(label=>'Channel '+(index+1)+': '+label));
    return {id:channel.id,missing:pending,recorded:Object.keys(channelEvidence).length-pending.length};
  });
  if(!channels.length) missing.push('At least one sensor channel');
  const total=Object.keys(panelEvidence).length+Math.max(1,channels.length)*Object.keys(channelEvidence).length;
  return {linkedPhoto,missing,total,recorded:total-missing.length,
    channels,photoMissing:Boolean(record.photoId&&!linkedPhoto)};
}
function row(label,value){
  return '<div><dt>'+h(label)+'</dt><dd>'+h(value||'Not recorded')+'</dd></div>';
}
function channelSummary(channel,index){
  return row('Channel '+(index+1)+(channel.channelLabel?' — '+channel.channelLabel:''),
    [channel.sensorService,channel.sensorLocation,channel.sensorManufacturer,channel.sensorPartNumber,
      channel.sensorRange].filter(Boolean).join(' / '));
}
function cardMarkup(alarm,photos){
  if(!alarm||alarm.type!=='Area alarm')return '';
  const record=alarm.equipment?normalize(alarm.equipment):null;
  const s=record?status(record,photos):null;
  const description=record
    ? '<strong>Equipment documentation: '+s.recorded+' of '+s.total+' evidence fields recorded</strong>'
      +'<small>'+record.sensorChannels.length+' sensor channel(s) on this panel</small>'
      +'<dl>'+row('Panel',[record.panelManufacturer,record.panelFamily,record.panelModel,record.panelRevision].filter(Boolean).join(' / '))
      +row('Panel / zone ID',record.panelZoneId)
      +record.sensorChannels.map(channelSummary).join('')
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
function reportMarkup(alarm,photos){
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
      const pairs=[['Gas service',channel.sensorService],['Channel label',channel.channelLabel],
        ['Sensor location',channel.sensorLocation],['Sensor manufacturer',channel.sensorManufacturer],
        ['Sensor part number',channel.sensorPartNumber],['Sensor range',channel.sensorRange]];
      return '<div><strong>Channel '+(index+1)+'</strong><br>'
        +pairs.map(([label,value])=>'<small><strong>'+h(label)+':</strong> '+h(value||'Not recorded')+'</small>').join('<br>')+'</div>';
    }).join('')
    :'<small>No sensor channels recorded.</small>';
  return '<div class="alarm-equipment-report"><strong>Equipment documentation (not verification)</strong><br>'
    +details.map(([label,value])=>'<small><strong>'+h(label)+':</strong> '+h(value||'Not recorded')+'</small>').join('<br>')
    +'<div class="alarm-channel-report">'+channels+'</div>'
    +'<br><small>Evidence fields recorded: '+s.recorded+'/'+s.total+'; pending: '
    +h(s.missing.join(', ')||'None; independent verification still required')+'</small></div>';
}
function extraChannelMarkup(raw,index){
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
    +'</fieldset>';
}
function collectChannels(form){
  const first={
    id:form.dataset.firstChannelId||'channel-1',
    channelLabel:form.elements.channelLabel.value,
    sensorLocation:form.elements.sensorLocation.value
  };
  ['sensorManufacturer','sensorPartNumber','sensorService','sensorRange'].forEach(key=>{
    first[key]=form.elements[key].value;
  });
  const entries=[first];
  form.querySelectorAll('.sensor-extra-channel').forEach(group=>{
    const channel={id:group.dataset.channelId};
    group.querySelectorAll('[data-channel-field]').forEach(input=>{
      if(channelFields.includes(input.dataset.channelField))
        channel[input.dataset.channelField]=input.value;
    });
    entries.push(channel);
  });
  return entries.slice(0,maxChannels).map(normalizeChannel).filter(hasChannelData);
}
const api=Object.freeze({fields,channelFields,maxChannels,normalizeChannel,normalize,
  status,cardMarkup,reportMarkup,extraChannelMarkup,collectChannels});
root.MGSAreaAlarmEquipment=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
