/* Unit-neutral, JSON-only composition state. All linguistic forms belong to presets. */
window.SpeechModel=(()=>{
 'use strict';
 const clone=x=>JSON.parse(JSON.stringify(x)),own=(o,k)=>Object.hasOwn(o||{},k),validId=id=>typeof id==='string'&&/^[\w:.-]{1,100}$/.test(id)&&!['__proto__','constructor','prototype'].includes(id);
 const text=value=>typeof value==='string'&&value.trim()&&[...value.trim()].length<=200?value.trim():null;
 const definitions=step=>step.variants?.length?step.variants.flatMap(v=>v.sentences):step.sentences;
 const active=(step,state)=>step.variants?.length?(step.variants.find(v=>v.id===state.stepVariants[step.id])||step.variants.find(v=>v.id===step.defaultVariantId)||step.variants[0]).sentences:step.sentences;
 const slotFor=(p,id)=>p.slots.find(s=>s.id===id),stepFor=(p,id)=>p.steps.find(s=>s.id===id);
 function validatePreset(p){
  const errors=[];
  if(!p||p.schemaVersion!==1||!Array.isArray(p.steps)||!p.steps.length||!Array.isArray(p.slots)||!p.choiceSets)return ['Invalid speech preset'];
  const steps=new Set(),slots=new Set(),sentences=new Map();
  for(const s of p.steps){
   if(!validId(s.id)||steps.has(s.id))errors.push('Duplicate/invalid step '+s.id);steps.add(s.id);
   if(!Array.isArray(s.sentences))errors.push('Missing sentence array '+s.id);
   if(s.variants){const ids=s.variants.map(v=>v.id);if(new Set(ids).size!==ids.length||!ids.includes(s.defaultVariantId))errors.push('Invalid variants '+s.id);}
   const groups=s.variants?.length?s.variants.map(v=>v.sentences):[s.sentences];
   for(const group of groups){const local=new Set();for(const sentence of group||[]){
    if(!validId(sentence.id)||local.has(sentence.id)||(sentences.has(sentence.id)&&sentences.get(sentence.id)!==s.id))errors.push('Duplicate/invalid sentence '+sentence.id);
    local.add(sentence.id);sentences.set(sentence.id,s.id);
    if(!Array.isArray(sentence.tokens)||!sentence.tokens.length)errors.push('Empty sentence '+sentence.id);
   }}
  }
  for(const s of p.slots){
   if(!validId(s.id)||slots.has(s.id)||!steps.has(s.ownerStepId))errors.push('Invalid slot '+s.id);slots.add(s.id);
   if(!['picture-card','country-search','list','my-words'].includes(s.inputType))errors.push('Invalid input type '+s.id);
   if(!Array.isArray(p.choiceSets[s.choiceSetId]))errors.push('Missing choices '+s.id);
   if(s.allowMyWords&&!validId(s.myWordsGroupId))errors.push('Invalid MY WORDS group '+s.id);
  }
  for(const list of Object.values(p.choiceSets)){if(!Array.isArray(list)){errors.push('Invalid choices');continue;}const ids=new Set();for(const c of list){if(!validId(c.id)||ids.has(c.id)||!text(c.insertText))errors.push('Invalid choice '+c.id);ids.add(c.id);}}
  for(const s of p.steps)for(const sentence of definitions(s)||[])for(const t of sentence.tokens||[])if(t.slotId&&!slots.has(t.slotId))errors.push('Unknown slot '+t.slotId);
  return errors;
 }
 function canonical(p,state,slot,selection,restore=false){
  if(!selection||!slot)return null;
  if(selection.kind==='choice'){
   const c=(p.choiceSets[slot.choiceSetId]||[]).find(x=>x.id===selection.id);
   if(!c)return null;
   const value={kind:'choice',id:c.id,label:c.label,insertText:c.insertText};
   for(const field of ['cardRef','imageUrl','speechText','audioUrl'])if(c[field])value[field]=c[field];return value;
  }
  if(!slot.allowMyWords)return null;
  if(selection.kind==='custom'){
   const item=(state.myWords[slot.myWordsGroupId]||[]).find(w=>w.id===selection.id);
   if(item)return {kind:'custom',id:item.id,label:item.text,insertText:item.text};
  }
  if(restore&&['custom','detached'].includes(selection.kind)&&validId(selection.id)&&text(selection.insertText))return {kind:'detached',id:selection.id,label:selection.insertText.trim(),insertText:selection.insertText.trim()};
  return null;
 }
 function available(p,state){return p.steps.filter(s=>s.required||state.optionalEnabled[s.id]).flatMap(s=>active(s,state).map(x=>x.id));}
 function ensureOrder(p,state){
  const valid=new Set(p.steps.flatMap(s=>definitions(s).map(x=>x.id)));
  state.sentenceOrder=[...new Set(state.sentenceOrder.filter(id=>valid.has(id)))];
  for(const id of available(p,state))if(!state.sentenceOrder.includes(id))state.sentenceOrder.push(id);
 }
 function initialState(p){
  const errors=validatePreset(p);if(errors.length)throw new Error(errors.join('; '));
  const state={schemaVersion:1,unitId:p.unitId,slotValues:{},stepVariants:{},optionalEnabled:{},sentenceOrder:[],myWords:{},drafts:{},ui:{stepId:p.steps[0].id,slotId:'',filters:{},rate:.55,sound:true,clearSpeech:false,zoomPercent:null,summaryWriting:false,summaryAudio:false,summaryReordering:false,inputOpen:false}};
  for(const step of p.steps){if(step.variants?.length)state.stepVariants[step.id]=step.defaultVariantId;if(!step.required)state.optionalEnabled[step.id]=false;}
  for(const slot of p.slots){if(slot.allowMyWords)state.myWords[slot.myWordsGroupId]||=[];state.slotValues[slot.id]=canonical(p,state,slot,slot.defaultValue,true);if(!state.slotValues[slot.id])throw new Error('Invalid default '+slot.id);}
  state.ui.slotId=editableSlots(p,state,state.ui.stepId)[0]?.id||'';ensureOrder(p,state);return state;
 }
 function editableSlots(p,state,stepId){
  const step=stepFor(p,stepId);if(!step)return [];
  return [...new Set(active(step,state).flatMap(s=>s.tokens.filter(t=>t.slotId&&t.editable!==false).map(t=>t.slotId)))].map(id=>slotFor(p,id)).filter(Boolean);
 }
 function stepSentences(p,state,stepId){
  const step=stepFor(p,stepId);if(!step)return [];
  return active(step,state).map(sentence=>{
   const tokens=sentence.tokens.map((t,index)=>{
    const value=t.slotId?state.slotValues[t.slotId]:null;
    const raw=value?.insertText??t.word??'',word=index===0?raw.replace(/^./,c=>c.toUpperCase()):raw;
    return {word,role:t.role||'neutral',speech:value?.speechText||t.speech||word,cardId:value?.cardRef||t.cardRef||'',imageUrl:value?.imageUrl||t.imageUrl||'',symbol:t.symbol||'',selectionKey:t.slotId&&t.editable!==false?t.slotId:''};
   });
   return {id:sentence.id,stepId,tokens,text:tokens.map(t=>t.word).join(' ')+(sentence.punctuation||''),parts:tokens.map(t=>t.speech),punctuation:sentence.punctuation||''};
  });
 }
 function summary(p,state){const map=new Map(p.steps.filter(s=>s.required||state.optionalEnabled[s.id]).flatMap(s=>stepSentences(p,state,s.id)).map(s=>[s.id,s]));return state.sentenceOrder.filter(id=>map.has(id)).map(id=>map.get(id));}
 function setUi(p,state,patch={}){
  const ui=state.ui;
  if(own(patch,'stepId')&&(patch.stepId==='summary'||stepFor(p,patch.stepId))){ui.stepId=patch.stepId;ui.slotId=editableSlots(p,state,ui.stepId)[0]?.id||'';ui.inputOpen=false;}
  if(own(patch,'slotId')&&editableSlots(p,state,ui.stepId).some(s=>s.id===patch.slotId)){ui.slotId=patch.slotId;ui.inputOpen=false;}
  for(const key of ['sound','clearSpeech','summaryWriting','summaryAudio','summaryReordering','inputOpen'])if(typeof patch[key]==='boolean')ui[key]=patch[key];
  if([.55,.85,1.2].includes(patch.rate))ui.rate=patch.rate;
  if(own(patch,'zoomPercent')&&(patch.zoomPercent===null||Number.isFinite(patch.zoomPercent)))ui.zoomPercent=patch.zoomPercent===null?null:Math.max(10,Math.min(400,patch.zoomPercent));
  if(patch.filters&&typeof patch.filters==='object')for(const slot of p.slots){const value=patch.filters[slot.id];if(typeof value==='string'&&value.length<100)ui.filters[slot.id]=value;}
 }
 function reduce(p,before,action){
  const state=clone(before),slot=slotFor(p,action.slotId),step=stepFor(p,action.stepId);
  const reject=error=>({ok:false,state:before,error});
  switch(action.type){
   case 'select': {const value=canonical(p,state,slot,action.selection);if(!value||!editableSlots(p,state,state.ui.stepId).some(s=>s.id===slot.id))return reject('この候補は選べません。');state.slotValues[slot.id]=value;break;}
   case 'variant': if(!step?.variants?.some(v=>v.id===action.variantId))return reject('文の種類がありません。');state.stepVariants[step.id]=action.variantId;if(state.ui.stepId===step.id)setUi(p,state,{stepId:step.id});break;
   case 'optional': if(!step||step.required||typeof action.enabled!=='boolean')return reject('必須の文は外せません。');state.optionalEnabled[step.id]=action.enabled;break;
   case 'reset-step': if(!step)return reject('文がありません。');for(const s of p.slots.filter(s=>s.ownerStepId===step.id)){state.slotValues[s.id]=canonical(p,state,s,s.defaultValue,true);delete state.drafts[s.id];}if(step.variants)state.stepVariants[step.id]=step.defaultVariantId;if(state.ui.stepId===step.id)setUi(p,state,{stepId:step.id});break;
   case 'move-sentence': {
    const ids=summary(p,state).map(s=>s.id),from=ids.indexOf(action.sentenceId);
    if(from<0||!Number.isInteger(action.targetIndex)||action.targetIndex<0||action.targetIndex>=ids.length)return reject('この位置には移動できません。');
    ids.splice(action.targetIndex,0,ids.splice(from,1)[0]);let i=0;const shown=new Set(ids);state.sentenceOrder=state.sentenceOrder.map(id=>shown.has(id)?ids[i++]:id);break;
   }
   case 'add-word': {
    const value=text(action.text);if(!slot?.allowMyWords||!value||!validId(action.id))return reject('英語を1～200文字で入力してください。');
    const words=state.myWords[slot.myWordsGroupId]||=[];
    if(words.some(w=>w.id===action.id))return reject('同じ登録番号があります。');
    words.push({id:action.id,text:value});state.myWords[slot.myWordsGroupId]=words;state.slotValues[slot.id]={kind:'custom',id:action.id,label:value,insertText:value};state.ui.inputOpen=false;state.drafts[slot.id]={...(state.drafts[slot.id]||{}),text:''};break;
   }
   case 'delete-word': {
    const group=action.groupId;if(!p.slots.some(s=>s.myWordsGroupId===group)||!own(state.myWords,group))return reject('語群がありません。');
    state.myWords[group]=state.myWords[group].filter(w=>w.id!==action.id);
    for(const s of p.slots.filter(s=>s.myWordsGroupId===group)){const value=state.slotValues[s.id];if(value?.kind==='custom'&&value.id===action.id)state.slotValues[s.id]={kind:'detached',id:value.id,label:value.insertText,insertText:value.insertText};}break;
   }
   case 'draft': if(!slot||!['text','search'].includes(action.field)||typeof action.text!=='string'||action.text.length>10000)return reject('入力が長すぎます。');state.drafts[slot.id]||={};state.drafts[slot.id][action.field]=action.text;break;
   case 'ui':setUi(p,state,action.patch);break;
   default:return reject('操作がありません。');
  }
  ensureOrder(p,state);return {ok:true,state};
 }
 function reconcile(p,saved){
  const state=initialState(p),warnings=[];
  if(!saved||typeof saved!=='object'||saved.schemaVersion!==1||saved.unitId!==p.unitId)throw new Error('保存形式またはUnitが一致しません。');
  for(const group of Object.keys(state.myWords)){const seen=new Set();state.myWords[group]=(Array.isArray(saved.myWords?.[group])?saved.myWords[group]:[]).filter(w=>{if(!w||!validId(w.id)||seen.has(w.id)||!text(w.text)){warnings.push('無効な追加語を除外しました。');return false;}seen.add(w.id);return true;}).map(w=>({id:w.id,text:w.text.trim()}));}
  for(const slot of p.slots){if(!own(saved.slotValues,slot.id))continue;const value=canonical(p,state,slot,saved.slotValues[slot.id],true);if(value)state.slotValues[slot.id]=value;else warnings.push('無効な選択を初期値に戻しました。');}
  for(const step of p.steps){if(step.variants?.some(v=>v.id===saved.stepVariants?.[step.id]))state.stepVariants[step.id]=saved.stepVariants[step.id];if(!step.required&&typeof saved.optionalEnabled?.[step.id]==='boolean')state.optionalEnabled[step.id]=saved.optionalEnabled[step.id];}
  if(Array.isArray(saved.sentenceOrder))state.sentenceOrder=saved.sentenceOrder.filter(id=>typeof id==='string');ensureOrder(p,state);
  for(const slot of p.slots)for(const field of ['text','search']){const value=saved.drafts?.[slot.id]?.[field];if(typeof value==='string'&&value.length<=10000){state.drafts[slot.id]||={};state.drafts[slot.id][field]=value;}}
  setUi(p,state,saved.ui);return {state,warnings};
 }
 return {validatePreset,initialState,reduce,stepSentences,summary,editableSlots,reconcile};
})();
