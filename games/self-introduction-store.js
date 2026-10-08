(function(root){
 'use strict';const M=root.SelfIntroductionModel||(typeof require==='function'?require('./self-introduction-model.js'):null),KEY='dekiru-self-introduction-presets-v1';
 function create(storage,{validCardIds}={}){
  function listPresets(){try{const raw=storage.getItem(KEY);if(raw===null)return [];const values=JSON.parse(raw);M.check(Array.isArray(values)&&values.length<=500,'保存形式');const rows=values.map(v=>M.validatePreset(v,validCardIds));M.check(new Set(rows.map(v=>v.id)).size===rows.length,'重複');return rows;}catch{throw Error('自己紹介の保存データを読み込めません。既存データは上書きせず保持しています。');}}
  function write(rows){try{storage.setItem(KEY,JSON.stringify(rows));}catch{throw Error('保存できませんでした。ブラウザの容量や設定を確認してください。');}}
  function savePreset(value){const clean=M.validatePreset(value,validCardIds),rows=listPresets(),index=rows.findIndex(p=>p.id===clean.id);if(index>=0)rows[index]=clean;else{M.check(rows.length<500,'保存件数が上限です。');rows.push(clean);}write(rows);return clean;}
  return {listPresets,savePreset,deletePreset:pid=>write(listPresets().filter(p=>p.id!==pid))};
 }
 const api={create,KEY};root.SelfIntroductionStore=api;if(typeof module==='object')module.exports=api;
})(typeof window==='object'?window:globalThis);
