(function(g){
 'use strict';
 function create({storage,now=()=>Date.now()}={}){
  const ready=new Set(),blocked=new Set();
  const key=(book,unit)=>`dekiru:build-my-speech:v1:${book}:${unit}`;
  const access=()=>typeof storage==='function'?storage():storage||g.localStorage;
  function load(preset){
   const k=key(preset.book,preset.unit),fresh=g.SpeechModel.initialState(preset);
   if(blocked.has(k))return {state:fresh,status:'blocked',message:'この端末に保存できません。この画面では続けられます。'};
   let raw,db;
   try{db=access();raw=db.getItem(k);}catch(e){blocked.add(k);return {state:fresh,status:'blocked',message:'保存領域を利用できません。この画面では続けられます。'};}
   if(raw===null){ready.add(k);return {state:fresh,status:'new',message:'この端末に自動保存します。'};}
   try{const restored=g.SpeechModel.reconcile(preset,JSON.parse(raw));ready.add(k);return {state:restored.state,status:'saved',message:restored.warnings.length?'保存した文を復元しました。一部の設定を現在の教材に合わせました。':'保存した文を復元しました。'};}
   catch(e){
    try{let backup=k+':backup:'+now(),n=0;while(db.getItem(backup)!==null)backup=k+':backup:'+now()+':'+(++n);db.setItem(backup,raw);ready.add(k);return {state:fresh,status:'recovered',message:'読み込めない保存内容を退避しました。新しい文を作れます。'};}
    catch(e){blocked.add(k);return {state:fresh,status:'blocked',message:'以前の保存内容を安全に退避できません。上書きせず、この画面内だけで編集します。'};}
   }
  }
  function save(preset,state){
   const k=key(preset.book,preset.unit);
   if(!ready.has(k)&&!blocked.has(k))load(preset);
   if(blocked.has(k))return {ok:false,message:'保存できません。この画面内の文は保持しています。閉じると失われます。'};
   try{if(state.unitId!==preset.unitId||state.schemaVersion!==1)throw Error('Different unit');g.SpeechModel.reconcile(preset,state);access().setItem(k,JSON.stringify(state));return {ok:true,message:'この端末に保存しました。'};}
   catch(e){return {ok:false,message:'保存できません。この画面内の文は保持しています。閉じると失われます。'};}
  }
  return {key,load,save};
 }
 g.SpeechStore={create};
})(window);
