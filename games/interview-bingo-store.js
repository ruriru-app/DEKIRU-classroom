(function(root){
  'use strict';
  const B=root.InterviewBingoModel||(typeof require==='function'?require('./interview-bingo-model.js'):null);
  const KEY='dekiru-interview-bingo-presets-v1';
  function create(storage,{validCardIds}={}){
    function listPresets(){
      try{
        const raw=storage.getItem(KEY);if(raw===null)return [];
        const rows=JSON.parse(raw);
        if(!Array.isArray(rows)||rows.length>500)throw Error();
        const clean=rows.map(v=>B.validatePreset(v,validCardIds));
        if(new Set(clean.map(v=>v.id)).size!==clean.length)throw Error();
        return clean;
      }catch{throw Error('Interview Bingoの保存データを読み込めません。既存データは上書きせず保持しています。');}
    }
    function write(rows){
      try{storage.setItem(KEY,JSON.stringify(rows));}
      catch{throw Error('保存できませんでした。ブラウザの保存容量や設定を確認してください。');}
    }
    function savePreset(value){
      const clean=B.validatePreset(value),rows=listPresets(),index=rows.findIndex(p=>p.id===clean.id);
      if(index<0){if(rows.length>=500)throw Error('保存件数が上限です');rows.push(clean);}else rows[index]=clean;
      write(rows);return clean;
    }
    return {listPresets,savePreset,deletePreset:id=>write(listPresets().filter(p=>p.id!==id))};
  }
  const api={create,KEY};root.InterviewBingoStore=api;if(typeof module==='object')module.exports=api;
})(typeof window==='object'?window:globalThis);
