(function(root){
 'use strict';
 const D=root.InterviewBingoDelivery||(typeof require==='function'?require('./interview-bingo-delivery.js'):null);
 const S=root.InterviewBingoSession||(typeof require==='function'?require('./interview-bingo-session.js'):null);
 const SAVE_ERROR='この端末では途中保存できません。ページを閉じると記録が失われます';
 function create(storage){
  function context(delivery,selfId){
   const valid=D.validate(delivery);
   if(!valid.roster.students.some(pupil=>pupil.id===selfId))throw Error('本人を名簿から選んでください');
   return {delivery:JSON.stringify(valid),selfId,key:`dekiru-interview-bingo-progress-v1:${valid.deliveryId}:${selfId}`,options:{size:valid.size,cardIds:valid.activity.cardIds,studentIds:valid.roster.students.filter(pupil=>pupil.id!==selfId).map(pupil=>pupil.id)}};
  }
  function parse(raw,details){
   const saved=JSON.parse(raw);
   if(!saved||typeof saved!=='object'||Array.isArray(saved)||Object.keys(saved).length!==4||!['version','delivery','selfId','state'].every(key=>Object.hasOwn(saved,key))||saved.version!==1||saved.delivery!==details.delivery||saved.selfId!==details.selfId)throw Error('保存した配信と一致しません');
   return S.validateState(saved.state,details.options);
  }
  return {
   read(delivery,selfId){
    let details;try{details=context(delivery,selfId);}catch(error){return {status:'corrupt',error};}
    let raw;try{raw=storage.getItem(details.key);}catch(error){return {status:'unavailable',error};}
    if(raw===null)return {status:'empty'};
    try{return {status:'saved',state:parse(raw,details)};}catch(error){return {status:'corrupt',error};}
   },
   save(delivery,selfId,state){
    try{
     const details=context(delivery,selfId),clean=S.validateState(state,details.options);
     const previous=storage.getItem(details.key);
     if(previous!==null)parse(previous,details);
     storage.setItem(details.key,JSON.stringify({version:1,delivery:details.delivery,selfId,state:clean}));
     return {ok:true};
    }catch{return {ok:false,error:SAVE_ERROR};}
   },
   remove(delivery,selfId){try{storage.removeItem(context(delivery,selfId).key);return {ok:true};}catch{return {ok:false,error:'保存データを削除できませんでした'};}}
  };
 }
 const api={create};root.InterviewBingoProgress=api;if(typeof module==='object')module.exports=api;
})(typeof window==='object'?window:globalThis);
