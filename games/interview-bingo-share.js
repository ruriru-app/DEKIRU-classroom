(function(root){
 'use strict';
 const M=root.InterviewModel||(typeof require==='function'?require('../grade34/interview-model.js'):null);
 const C=root.ShareCodec||(typeof require==='function'?require('../grade34/share-codec.js'):null);
 const D=root.InterviewBingoDelivery||(typeof require==='function'?require('./interview-bingo-delivery.js'):null);
 const limit=160000;
 function pack(d){
  const a=d.activity,r=d.roster;
  return [1,d.deliveryId,d.issuedAt,d.expiresAt,[a.title,a.studentInstructions,a.expressions.template,a.expressions.slots[0]?.id??null,a.cardIds],d.size,[r.className,r.students.map(s=>[s.id,s.number,s.name])]];
 }
 function unpack(w){
  M.check(Array.isArray(w)&&w.length===7&&w[0]===1,'未対応の配信URLです');
  const [version,deliveryId,issuedAt,expiresAt,a,size,r]=w;
  M.check(Array.isArray(a)&&a.length===5&&Array.isArray(a[4]),'活動の形式が不正です');
  M.check(a[3]===null||typeof a[3]==='string','差し替え部分の形式が不正です');
  M.check(Array.isArray(r)&&r.length===2&&Array.isArray(r[1])&&r[1].length<=100,'名簿の形式が不正です');
  const students=r[1].map(s=>{M.check(Array.isArray(s)&&s.length===3,'児童の形式が不正です');return {id:s[0],number:s[1],name:s[2]};});
  return D.validate({version,type:'interview-bingo-delivery',deliveryId,issuedAt,expiresAt,activity:{title:a[0],studentInstructions:a[1],expressions:{template:a[2],slots:a[3]===null?[]:[{id:a[3],type:'picture-card',cardIds:a[4]}]},cardIds:a[4]},size,roster:{className:r[0],students}});
 }
 async function transform(bytes,decompress){
  const stream=new Blob([bytes]).stream().pipeThrough(decompress?new DecompressionStream('deflate'):new CompressionStream('deflate'));
  const reader=stream.getReader(),parts=[];let length=0;
  try{for(;;){const {value,done}=await reader.read();if(done)break;length+=value.length;if(length>limit){await reader.cancel();throw Error('配信データが大きすぎます');}parts.push(value);}}finally{reader.releaseLock();}
  const result=new Uint8Array(length);let offset=0;for(const part of parts){result.set(part,offset);offset+=part.length;}return result;
 }
 async function buildShortUrl(delivery,baseUrl){
  const value=D.validate(delivery);
  C.encodeJson(value);
  let bytes=new TextEncoder().encode(JSON.stringify(pack(value))),prefix='b1j.';
  M.check(bytes.length<=limit,'配信データが大きすぎます');
  if(typeof CompressionStream!=='undefined'){bytes=await transform(bytes,false);prefix='b1z.';}
  const url=new URL(baseUrl);url.hash='bingo='+prefix+C.bytesToBase64Url(bytes);return url.href;
 }
 async function decodeShared(token){
  M.check(typeof token==='string'&&token.length<=220000,'配信データが大きすぎます');
  M.check(/^b1[jz]\.[A-Za-z0-9_-]+$/.test(token),'配信URLの形式が不正です');
  let bytes=C.base64UrlToBytes(token.slice(4));M.check(bytes.length<=limit,'配信データが大きすぎます');
  if(token[2]==='z'){M.check(typeof DecompressionStream!=='undefined','新しいバージョンのブラウザで開いてください');bytes=await transform(bytes,true);}
  return unpack(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)));
 }
 const api={buildShortUrl,decodeShared};root.InterviewBingoShare=api;if(typeof module==='object')module.exports=api;
})(typeof window==='object'?window:globalThis);
