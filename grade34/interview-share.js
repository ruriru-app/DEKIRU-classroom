(function(root){
 'use strict';
 const M=root.InterviewModel||(typeof require==='function'?require('./interview-model.js'):null),C=root.ShareCodec||(typeof require==='function'?require('./share-codec.js'):null);
 function snapshot(preset,roster,hours=1){
  M.check([1,4,12,24].includes(hours),'有効期間を選んでください');
  const now=Date.now();return M.validateDelivery({version:2,type:'interview-delivery',deliveryId:M.newId('delivery'),issuedAt:new Date(now).toISOString(),expiresAt:new Date(now+hours*3600000).toISOString(),presetId:preset.id,preset,roster});
 }
 function isExpired(value,now=Date.now()){const d=M.validateDelivery(value);return d.version===2&&now>=Date.parse(d.expiresAt);}
 function encode(value){return C.encodeJson(M.validateDelivery(value));}
 function decode(token){return M.validateDelivery(C.decodeJson(token));}
 function buildUrl(delivery,baseUrl){const url=new URL(baseUrl);url.hash='interview='+encode(delivery);return url.href;}
 // Versioned transport only: persistent IDs and the delivery model are unchanged.
 const presets=root.InterviewSharePresets||(typeof require==='function'?require('./interview-share-presets.js'):{});
 function compactPreset(p){const json=JSON.stringify(M.validatePreset(p));return Object.keys(presets).find(key=>JSON.stringify(M.validatePreset(presets[key]))===json)||p;}
 function pack(d){const r=d.roster;return [1,d.version,d.deliveryId,d.issuedAt,d.expiresAt||null,compactPreset(d.preset),[r.id,r.className,r.createdAt,r.updatedAt,r.students.map(s=>s.number===undefined?[s.id,s.name]:[s.id,s.name,s.number])]];}
 function unpack(v){
  M.check(Array.isArray(v)&&v.length===7&&v[0]===1,'未対応の配信URLです');
  const [wire,version,deliveryId,issuedAt,expiresAt,encodedPreset,r]=v;
  if(typeof encodedPreset==='string')M.check(Object.prototype.hasOwnProperty.call(presets,encodedPreset),'この配信に対応した新しいページを開いてください');
  const preset=typeof encodedPreset==='string'?M.validatePreset(presets[encodedPreset]):encodedPreset;
  M.check(Array.isArray(r)&&r.length===5&&Array.isArray(r[4])&&r[4].length<=100,'名簿の形式が不正です');
  const students=r[4].map(s=>{M.check(Array.isArray(s)&&(s.length===2||s.length===3),'名簿の形式が不正です');return {id:s[0],name:s[1],...(s.length===3?{number:s[2]}:{})};});
  return M.validateDelivery({version,type:'interview-delivery',deliveryId,issuedAt,...(expiresAt!==null?{expiresAt}:{}),presetId:preset?.id,preset,roster:{version:1,id:r[0],className:r[1],createdAt:r[2],updatedAt:r[3],students}});
 }
 async function transform(bytes,decompress){
  const stream=new Blob([bytes]).stream().pipeThrough(decompress?new DecompressionStream('deflate'):new CompressionStream('deflate'));
  const reader=stream.getReader(),parts=[];let length=0;
  try{for(;;){const {value,done}=await reader.read();if(done)break;length+=value.length;if(length>160000){await reader.cancel();throw Error('配信データが大きすぎます');}parts.push(value);}}finally{reader.releaseLock();}
  const result=new Uint8Array(length);let offset=0;for(const part of parts){result.set(part,offset);offset+=part.length;}return result;
 }
 async function buildShortUrl(delivery,baseUrl){
  const value=M.validateDelivery(delivery);
  // Keep the same size limit as the original format before compressing.
  encode(value);
  let bytes=new TextEncoder().encode(JSON.stringify(pack(value))),prefix='i1j.';
  if(typeof CompressionStream!=='undefined'){bytes=await transform(bytes,false);prefix='i1z.';}
  const url=new URL(baseUrl);url.hash='interview='+prefix+C.bytesToBase64Url(bytes);return url.href;
 }
 async function decodeShared(token){
  M.check(typeof token==='string'&&token.length<=220000,'配信データが大きすぎます');
  if(!token.startsWith('i1'))return decode(token);
  M.check(/^i1[jz]\.[A-Za-z0-9_-]+$/.test(token),'配信URLの形式が不正です');
  let bytes=C.base64UrlToBytes(token.slice(4));M.check(bytes.length<=160000,'配信データが大きすぎます');
  if(token[2]==='z'){M.check(typeof DecompressionStream!=='undefined','新しいバージョンのブラウザで開いてください');bytes=await transform(bytes,true);}
  return unpack(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)));
 }
 const api={snapshot,encode,decode,buildUrl,buildShortUrl,decodeShared,isExpired};root.InterviewShare=api;if(typeof module==='object')module.exports=api;
})(typeof window==='object'?window:globalThis);
