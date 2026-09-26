(() => {
  'use strict';
  const setsKey='dekiru.grade34.cardSets.v1',oldKey='dekiru:nhe-vocabulary:nh6:5',newKey='dekiru:nhe-vocabulary:nh6:6';
  const prefix='dekiru:nhe6-unit6-migration:v1:',backupKey=prefix+'backup',doneKey=prefix+'done';
  function readSets(raw){
    if(raw===null)return null;
    const data=JSON.parse(raw);
    if(data.v!==1||!Array.isArray(data.sets)||data.sets.some(s=>!s||typeof s.id!=='string'||typeof s.unit!=='string'||typeof s.name!=='string'||!s.payload))throw Error('保存したセットの形式を確認できません。');
    return data;
  }
  function run(storage){
    try {
      if(storage.getItem(doneKey)==='1')return {ok:true,migrated:false};
      let backup=storage.getItem(backupKey);
      if(backup===null){
        const raw=storage.getItem(setsKey),data=readSets(raw),selection=storage.getItem(oldKey);
        if(selection!==null&&!Array.isArray(JSON.parse(selection)))throw Error('単語の選択状態を確認できません。');
        const names=new Set((data?.sets||[]).filter(s=>s.unit==='nh6:6').map(s=>s.name));
        const moves=(data?.sets||[]).filter(s=>s.unit==='nh6:5').map(s=>{
          let name=s.name,n=1;
          while(names.has(name)){const suffix='（移行'+n+++ '）';name=s.name.slice(0,60-suffix.length)+suffix;}
          names.add(name);return {id:s.id,name};
        });
        backup=JSON.stringify({raw,selection,moves});
        // Keep an untouched snapshot before any data is changed. Never remove this backup automatically.
        storage.setItem(backupKey,backup);
      }
      const saved=JSON.parse(backup),data=readSets(storage.getItem(setsKey));
      if(data){
        let changed=false;
        for(const move of saved.moves){const s=data.sets.find(s=>s.id===move.id&&s.unit==='nh6:5');if(s){s.unit='nh6:6';s.name=move.name;changed=true;}}
        if(changed)storage.setItem(setsKey,JSON.stringify(data));
      }
      if(saved.selection!==null&&storage.getItem(newKey)===null)storage.setItem(newKey,saved.selection);
      if(storage.getItem(oldKey)!==null)storage.removeItem(oldKey);
      storage.setItem(doneKey,'1');
      return {ok:true,migrated:saved.moves.length>0||saved.selection!==null};
    }catch(error){return {ok:false,migrated:false,error:String(error.message||error)};}
  }
  window.NheMigration={run};
})();
