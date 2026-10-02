(function(root){
 'use strict';
 const M=root.InterviewModel||(typeof require==='function'?require('../grade34/interview-model.js'):null);
 const B=root.InterviewBingoModel||(typeof require==='function'?require('./interview-bingo-model.js'):null);
 const durations=[1,4,12,24];
 function shape(value,keys,label){
  M.check(value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key)),label+'の形式が不正です');
 }
 function canonicalText(value,label,max,empty=false){const clean=M.text(value,label,max,empty);M.check(clean===value,label+'の形式が不正です');return clean;}
 function canonicalId(value){const clean=M.id(value);M.check(clean===value,'IDの形式が不正です');return clean;}
 function iso(value){
  M.check(typeof value==='string'&&value.length===24&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString()===value,'日時はISO形式で入力してください');
  return value;
 }
 function number(value){
  M.check(typeof value==='string'&&/^\d{1,12}$/.test(value)&&Number(value)>0&&String(Number(value))===value,'出席番号は正の整数で入力してください');
  return value;
 }
 function ids(values,validCardIds){
  const result=M.array(values,100,'候補カード',1).map(canonicalId);M.unique(result,'候補カード');
  if(validCardIds)M.check(result.every(id=>validCardIds.has(id)),'使用できないカードが含まれています');
  return result;
 }
 function expressions(value,cardIds){
  shape(value,['template','slots'],'表現');
  const template=canonicalText(value.template,'活動で使う表現',200);
  const slots=M.array(value.slots,1,'差し替え部分').map(slot=>{
   shape(slot,['id','type','cardIds'],'差し替え部分');
   M.check(/^P[1-9]?$/.test(slot.id)&&slot.type==='picture-card','未対応の差し替え部分です');
   const slotCards=ids(slot.cardIds);
   M.check(slotCards.length===cardIds.length&&slotCards.every((id,i)=>id===cardIds[i]),'差し替えカードが候補と一致しません');
   return {id:slot.id,type:'picture-card',cardIds:slotCards};
  });
  const markers=template.match(/\([A-Z][A-Z0-9_]*\)/g)||[];
  M.check(markers.every(marker=>slots.some(slot=>`(${slot.id})`===marker))&&slots.every(slot=>markers.includes(`(${slot.id})`)),'差し替えは (P)、または (P1)〜(P9) で指定してください');
  return {template,slots};
 }
 function validateConfig(config,availableIds,participantCount){
  const errors=[],warnings=[],error=(field,message)=>errors.push({field,message});
  const size=config?.size,selected=config?.candidateIds;
  if(![3,4,5].includes(size))error('size','BINGOサイズは3×3・4×4・5×5から選んでください。');
  if(!Number.isInteger(participantCount)||participantCount<1||participantCount>100)error('participantCount','参加人数は1～100人の整数で入力してください。');
  const available=availableIds instanceof Set?availableIds:new Set(Array.isArray(availableIds)?availableIds:[]);
  const valid=Array.isArray(selected)&&selected.length>=1&&selected.length<=100&&new Set(selected).size===selected.length&&selected.every(id=>typeof id==='string'&&/^[A-Za-z0-9_-]+$/.test(id)&&id.length<=100&&available.has(id));
  if(!valid)error('candidateIds','候補カードを1～100語の中から選んでください。');
  if(valid&&[3,4,5].includes(size)&&selected.length*2<size*size)error('candidateIds','同じカードを2回ずつ使っても全マスを作れません。候補を増やすか、サイズを小さくしてください。');
  if(Number.isInteger(participantCount)&&participantCount>0&&[3,4,5].includes(size)&&participantCount<=size*size)warnings.push({field:'participantCount',message:`自分を除く相手が足りないため全マスは埋められません（全マスには本人を含め${size*size+1}人必要です）。少ない本数のBINGOを目指す活動はできます。`});
  return {errors,warnings};
 }
 function validate(value,validCardIds=null){
  shape(value,['version','type','deliveryId','issuedAt','expiresAt','activity','size','roster'],'配信データ');
  M.check(value.version===1&&value.type==='interview-bingo-delivery','未対応のInterview Bingo配信データです');
  const deliveryId=canonicalId(value.deliveryId),issuedAt=iso(value.issuedAt),expiresAt=iso(value.expiresAt);
  M.check(durations.includes((Date.parse(expiresAt)-Date.parse(issuedAt))/3600000),'有効期間が不正です');
  shape(value.activity,['title','studentInstructions','expressions','cardIds'],'活動');
  const cardIds=ids(value.activity.cardIds,validCardIds);
  const activity={title:canonicalText(value.activity.title,'活動タイトル',80),studentInstructions:canonicalText(value.activity.studentInstructions,'児童への説明',500,true),expressions:expressions(value.activity.expressions,cardIds),cardIds};
  M.check([3,4,5].includes(value.size),'BINGOサイズが不正です');
  M.check(cardIds.length*2>=value.size*value.size,'同じカードを2回ずつ使っても全マスを作れません。候補を増やすか、サイズを小さくしてください。');
  shape(value.roster,['className','students'],'名簿');
  const students=M.array(value.roster.students,100,'名簿',1).map((student,i)=>{
   shape(student,['id','number','name'],'児童');
   M.check(student.id===`p${i+1}`,'児童IDが不正です');
   return {id:student.id,number:number(student.number),name:canonicalText(student.name,'名前',80,true)};
  });
  M.unique(students.map(s=>Number(s.number)),'出席番号');
  return {version:1,type:'interview-bingo-delivery',deliveryId,issuedAt,expiresAt,activity,size:value.size,roster:{className:canonicalText(value.roster.className,'クラス名',80),students}};
 }
 function snapshot({preset,config,roster,hours=1,now=Date.now(),deliveryId},validCardIds){
  M.check(durations.includes(hours),'有効期間を選んでください');
  M.check(Number.isFinite(now),'発行日時が不正です');
  const source=B.validatePreset(preset,validCardIds);
  const students=M.array(roster?.students,100,'名簿',1);
  const checks=validateConfig(config,source.cardIds,students.length);
  M.check(!checks.errors.length,checks.errors.map(e=>e.message).join(' '));
  const selected=config.candidateIds;
  const value={
   version:1,type:'interview-bingo-delivery',deliveryId:deliveryId===undefined?M.newId('delivery'):deliveryId,
   issuedAt:new Date(now).toISOString(),expiresAt:new Date(now+hours*3600000).toISOString(),
   activity:{title:source.title,studentInstructions:source.studentInstructions,expressions:{template:source.expressions.template,slots:source.expressions.slots.map(slot=>({id:slot.id,type:'picture-card',cardIds:selected.filter(id=>slot.cardIds.includes(id))}))},cardIds:[...selected]},
   size:config.size,roster:{className:roster.className,students:students.map((s,i)=>({id:`p${i+1}`,number:s.number,name:s.name}))}
  };
  return validate(value,validCardIds);
 }
 function isExpired(delivery,now=Date.now()){return now>=Date.parse(validate(delivery).expiresAt);}
 const api={snapshot,validate,isExpired,validateConfig};root.InterviewBingoDelivery=api;if(typeof module==='object')module.exports=api;
})(typeof window==='object'?window:globalThis);
