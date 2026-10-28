(function(root){
'use strict';const C=root.TypingCore||(typeof require==='function'?require('./typing-core.js'):null),KEY='dekiru-typing-presets-v1';
function create(storage){
 function list(){try{const raw=storage.getItem(KEY);if(raw===null)return [];const rows=JSON.parse(raw);if(!Array.isArray(rows)||rows.length>200)throw Error();const clean=rows.map(C.preset);if(new Set(clean.map(x=>x.id)).size!==clean.length)throw Error();return clean;}catch{throw Error('保存したタイピング教材を読み込めません。保存データは上書きしていません。');}}
 function write(rows){try{storage.setItem(KEY,JSON.stringify(rows));}catch{throw Error('保存できませんでした。ブラウザの容量や設定を確認してください。');}}
 function save(value){const clean=C.preset(value),rows=list(),index=rows.findIndex(x=>x.id===clean.id);if(index>=0)rows[index]=clean;else{if(rows.length>=200)throw Error('保存件数が上限です。');rows.push(clean);}write(rows);return clean;}
 return {list,save,remove:id=>write(list().filter(x=>x.id!==id))};
}
const api={create,KEY};root.TypingStore=api;if(typeof module==='object')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

