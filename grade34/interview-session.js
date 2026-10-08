(function(root){
 'use strict';
 const M=root.InterviewModel||(typeof require==='function'?require('./interview-model.js'):null),Share=root.InterviewShare||(typeof require==='function'?require('./interview-share.js'):null);
 function active(d,now){M.validateDelivery(d);M.date(now);M.check(!Share.isExpired(d,Date.parse(now)),'活動時間が終了しました');}
 function selectedIds(d,s){return s.version===1?(s.selectedCardId?{[d.preset.question.slots[0]?.id]:s.selectedCardId}:{}):s.selectedCardIds;}
 function selectedCards(d,s,cards){const ids=selectedIds(d,s)||{};return Object.fromEntries(d.preset.question.slots.map(slot=>[slot.id,cards.find(c=>c.id===ids[slot.id])]));}
 function create(d,now){active(d,now);return {version:2,deliveryId:d.deliveryId,presetId:d.presetId,attemptId:M.newId('attempt'),phase:'compose',selectedCardId:null,selectedCardIds:{},completedQuestion:d.preset.question.slots.length?'':d.preset.question.template,assignments:Object.fromEntries(d.roster.students.map(s=>[s.id,null])),startedAt:null,updatedAt:now,timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC'};}
 function choose(d,s,card,now,slotId=d.preset.question.slots[0]?.id){
  active(d,now);M.check(s.phase==='compose','質問を変更するには戻ってください');const slot=d.preset.question.slots.find(v=>v.id===slotId);M.check(slot&&card&&slot.cardIds.includes(card.id),'カードを選んでください');
  const ids={...selectedIds(d,s),[slotId]:card.id},labels={...(s.selectedCardLabels||{}),[slotId]:card.english};
  const map=Object.fromEntries(Object.entries(ids).map(([id,cid])=>[id,{id:cid,english:labels[id]}]));
  const complete=d.preset.question.slots.every(v=>ids[v.id]&&labels[v.id]);
  return {...s,version:2,selectedCardIds:ids,selectedCardLabels:labels,selectedCardId:ids[d.preset.question.slots[0].id]||null,completedQuestion:complete?M.completeQuestion(d.preset,map):'',updatedAt:now};
 }
 function start(d,s,now){active(d,now);const ids=selectedIds(d,s)||{};M.check(s.phase==='compose'&&s.completedQuestion&&d.preset.question.slots.every(v=>v.cardIds.includes(ids[v.id])),'カードを選んでください');return {...s,phase:'sheet',startedAt:now,updatedAt:now};}
 function move(d,s,studentId,areaId,now){active(d,now);M.check(s.phase==='sheet','Interviewを開始してください');M.check(Object.hasOwn(s.assignments,studentId),'名前を確認してください');M.check(areaId===null||d.preset.answerAreas.some(a=>a.id===areaId),'回答先を確認してください');return {...s,assignments:{...s.assignments,[studentId]:areaId},updatedAt:now};}
 function validate(d,s,cards){
  M.validateDelivery(d);M.check([1,2].includes(s?.version)&&s.deliveryId===d.deliveryId&&s.presetId===d.presetId&&['compose','sheet'].includes(s.phase),'保存した活動が一致しません');M.id(s.attemptId);M.date(s.updatedAt);M.text(s.timeZone,'時間帯',100);
  const ids=selectedIds(d,s);M.check(ids&&typeof ids==='object'&&!Array.isArray(ids),'選択カードが不正です');
  M.check(Object.entries(ids).every(([id,cid])=>d.preset.question.slots.some(v=>v.id===id&&v.cardIds.includes(cid))&&cards.some(c=>c.id===cid)),'選択カードが不正です');
  if(!d.preset.question.slots.length)M.check(s.selectedCardId===null,'固定文のカードが不正です');
  const map=selectedCards(d,s,cards),complete=d.preset.question.slots.every(v=>map[v.id]),question=complete?M.completeQuestion(d.preset,map):'';
  // Upgrade a saved raw dictionary form without discarding the pupil's answers.
  M.check(s.completedQuestion===question||(complete&&s.completedQuestion===M.completeQuestion(d.preset,map,false)),'質問文が一致しません');
  M.check(s.assignments&&typeof s.assignments==='object'&&!Array.isArray(s.assignments),'回答が不正です');
  const kids=d.roster.students.map(k=>k.id);M.check(Object.keys(s.assignments).length===kids.length&&kids.every(id=>Object.hasOwn(s.assignments,id)),'名簿が一致しません');
  M.check(Object.values(s.assignments).every(a=>a===null||d.preset.answerAreas.some(v=>v.id===a)),'回答先が不正です');
  if(s.phase==='sheet'){M.check(!!question,'質問が未完成です');M.date(s.startedAt);}else M.check(s.startedAt===null&&Object.values(s.assignments).every(a=>a===null),'文章作りの状態が不正です');
  return {version:2,deliveryId:s.deliveryId,presetId:s.presetId,attemptId:s.attemptId,phase:s.phase,selectedCardId:ids[d.preset.question.slots[0]?.id]||null,selectedCardIds:{...ids},selectedCardLabels:Object.fromEntries(Object.entries(map).filter(([,c])=>c).map(([id,c])=>[id,c.english])),completedQuestion:question,assignments:Object.fromEntries(kids.map(id=>[id,s.assignments[id]])),startedAt:s.startedAt,updatedAt:s.updatedAt,timeZone:s.timeZone};
 }
 function tokens(d,selection,template=d.preset.question.template){const map=selection?.id?{[d.preset.question.slots[0]?.id]:selection}:selection||{},out=[];let offset=0;for(const part of template.split(/(\(P[1-9]?\))/g)){if(/^\(P[1-9]?\)$/.test(part)){const slotId=part.slice(1,-1),card=map[slotId];out.push({kind:'picture',text:card?M.cardForm(template,card,offset).english:'えらんでね',cardId:card?.id||null,slotId});}else for(const text of part.match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*|[^\s\p{L}\p{N}]/gu)||[])out.push({kind:/^[\p{L}\p{N}]/u.test(text)?'word':'punctuation',text});offset+=part.length;}return out;}
 function result(d,s,cards){const v=validate(d,s,cards),answerAreas=d.preset.answerAreas.map(a=>({...a,students:d.roster.students.filter(k=>v.assignments[k.id]===a.id)})),unassigned=d.roster.students.filter(k=>v.assignments[k.id]===null);return {preset:d.preset,title:d.preset.title,selectedCard:cards.find(c=>c.id===v.selectedCardId)||null,selectedCards:Object.values(selectedCards(d,v,cards)).filter(Boolean),selectedCardIds:v.selectedCardIds,completedQuestion:v.completedQuestion,answerAreas,unassigned,interviewedCount:d.roster.students.length-unassigned.length,startedAt:v.startedAt,updatedAt:v.updatedAt,timeZone:v.timeZone};}
 const api={create,choose,start,move,reset:create,validate,tokens,result,selectedCards};root.InterviewSession=api;if(typeof module==='object')module.exports=api;
})(typeof window==='object'?window:globalThis);
