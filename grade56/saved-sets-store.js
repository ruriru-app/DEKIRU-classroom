// NHE6 overrides are stored per ID. Shared Let's Try/NHE5 records stay untouched.
(()=>{'use strict';
 const prefix='dekiru:nhe6-saved-set:v1:',isSix=unit=>unit==='nh6:5'||unit==='nh6:6';
 function list(unit){
  if(!isSix(unit))return SavedCardSets.list(unit);
  const moves=new Map(NheMigration.moves(localStorage).map(m=>[m.id,m]));
  const rows=new Map([...SavedCardSets.list('nh6:5'),...SavedCardSets.list('nh6:6')].map(s=>{const move=s.unit==='nh6:5'?moves.get(s.id):null;return[s.id,move?{...s,unit:'nh6:6',name:move.name}:s];}));
  for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(!key?.startsWith(prefix))continue;const record=JSON.parse(localStorage.getItem(key));if(!record||typeof record.id!=='string'||!isSix(record.unit))throw Error('保存したセットを読み込めません。');if(record.deleted)rows.delete(record.id);else rows.set(record.id,record);}
  return [...rows.values()].filter(s=>s.unit===unit);
 }
 function write(record){try{localStorage.setItem(prefix+record.id,JSON.stringify(record));}catch{throw Error('保存できませんでした。ブラウザーの保存容量をご確認ください。');}}
 function save(unit,name,payload,id){
  if(!isSix(unit))return SavedCardSets.save(unit,name,payload,id);
  name=String(name).trim();if(!name||name.length>60)throw Error('セット名を1〜60文字で入力してください。');CardSet.resolve(payload);
  const sets=list(unit);if(id&&!sets.some(s=>s.id===id))throw Error('元のセットが見つかりません。画面を開き直してください。');if(sets.some(s=>s.name===name&&s.id!==id))throw Error('同じ名前のセットがあります。別の名前を付けてください。');
  const record={id:id||crypto.randomUUID(),unit,name,payload:JSON.parse(JSON.stringify(payload))};write(record);return record;
 }
 function remove(unit,id){if(!isSix(unit))return SavedCardSets.remove(unit,id);if(list(unit).some(s=>s.id===id))write({id,unit,deleted:true});}
 window.NheSetStore={list,save,remove};
})();
