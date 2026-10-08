(function(root){
 'use strict';
 const check=(condition,message)=>{if(!condition)throw Error(message);};
 function text(value,label,max,empty=false){check(typeof value==='string'&&value.length<=max&&(empty||value.trim().length>0),label+'を確認してください。');return value;}
 function id(value){check(typeof value==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(value),'IDを確認してください。');return value;}
 function date(value){check(typeof value==='string'&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString()===value,'日時を確認してください。');return value;}
 function newId(){return 'intro-'+(root.crypto?.randomUUID?root.crypto.randomUUID():Date.now().toString(36)+'-'+Math.random().toString(36).slice(2));}
 function activity(value,validCardIds){
  const known=validCardIds||(root.GAMES_DATA?new Set(root.GAMES_DATA.completedPictureCardIds):null);
  check(value&&Array.isArray(value.cardIds)&&value.cardIds.length>=1&&value.cardIds.length<=100,'候補カードを1〜100枚選んでください。');
  const cardIds=value.cardIds.map(id);check(new Set(cardIds).size===cardIds.length,'候補カードが重複しています。');check(!known||cardIds.every(v=>known.has(v)),'使えないカードが含まれています。');
  check(Number.isInteger(value.maxCards)&&value.maxCards>=1&&value.maxCards<=5,'選べる枚数を1〜5枚にしてください。');
  const nameSize=value.nameSize===undefined?'large':value.nameSize;check(['small','medium','large'].includes(nameSize),'名前の表示サイズを確認してください。');
  return {title:text(value.title,'活動タイトル',80),studentInstructions:text(value.studentInstructions,'児童への説明',500,true),cardIds,maxCards:value.maxCards,nameSize};
 }
 function validatePreset(value,validCardIds){check(value?.version===1&&value.type==='self-introduction','自己紹介シートの形式を確認してください。');return {version:1,type:'self-introduction',id:id(value.id),name:text(value.name,'保存名',80),...activity(value,validCardIds),createdAt:date(value.createdAt),updatedAt:date(value.updatedAt)};}
 function validateDelivery(value,validCardIds){check(value?.version===1&&value.type==='self-introduction-delivery','配布シートの形式を確認してください。');return {version:1,type:'self-introduction-delivery',deliveryId:id(value.deliveryId),issuedAt:date(value.issuedAt),activity:activity(value.activity,validCardIds)};}
 function snapshot(preset){const p=validatePreset(preset);return validateDelivery({version:1,type:'self-introduction-delivery',deliveryId:newId(),issuedAt:new Date().toISOString(),activity:activity(p)});}
 const api={validatePreset,validateDelivery,snapshot,newId,check};root.SelfIntroductionModel=api;if(typeof module==='object')module.exports=api;
})(typeof window==='object'?window:globalThis);
