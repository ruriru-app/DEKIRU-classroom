/* Dedicated teacher preparation. Presets and rosters are read-only here. */
(()=>{
 'use strict';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function mount({root,search=location.search}){
  const B=window.InterviewBingoModel,Q=window.InterviewBingoSetup,R=window.InterviewBingoRoutes;
  let student=null,printer=null,roster=null,teacher=null,destroyed=false,stale=false,changed=false,tab='teacher';
  root.innerHTML='<header class="bingo-prep-header"><button type="button" data-prep-back aria-label="Unitへ戻る">◀ 戻る</button><h1>Interview Bingoの準備</h1></header><p data-prep-error role="alert"></p>';
  const error=root.querySelector('[data-prep-error]');
  let route,preset,cards,map,fingerprint,store;
  try{
   route=R.parse(search);store=window.InterviewBingoStore.create(localStorage,{validCardIds:null});
   const found=store.listPresets().find(p=>p.id===route.presetId);if(!found)throw Error('このブラウザにプリセットが見つかりません。作成したブラウザで開くか、Gamesで設定ファイルを読み込んでください。');
   map=new Map(window.InterviewBingoCards.available().map(c=>[c.id,c]));preset=B.validatePreset(found,new Set(map.keys()));
   if(!preset.assignedUnits.some(u=>u.bookId===route.bookId&&u.unit===route.unit))throw Error('このUnitには割り当てられていません。元のUnitから開き直してください。');
   fingerprint=JSON.stringify(preset);cards=preset.cardIds.map(id=>map.get(id));
  }catch(e){error.textContent=e.message;root.querySelector('[data-prep-back]').onclick=()=>{location.href=route?R.unitHref(route.bookId,route.unit):'index.html#/createActivities';};return {destroy(){destroyed=true;}};}
  let draft=Q.initial({cardIds:preset.cardIds,recommendedMyCardWordCount:preset.recommendations.myCardWordCount,setName:preset.title}),applied=null,batch=null;
  const ui=document.createElement('div');ui.innerHTML=`<p class="bingo-prep-note">設定はこのページ内だけで保持します。再読み込みすると初期設定に戻ります。プリセット・名簿は変更しません。</p><nav class="bingo-prep-tabs" aria-label="準備画面"><button type="button" data-prep-tab="teacher">教師用</button><button type="button" data-prep-tab="student">児童（仮名で試用）</button><button type="button" data-prep-tab="print">配布用カード</button></nav><section data-prep-pane="teacher" class="bingo-prep-layout"><article class="bingo-prep-summary"><h2>${esc(preset.title)}</h2><p><strong>児童への説明</strong><br>${esc(preset.studentInstructions)}</p><p><strong>教師用メモ</strong><br>${esc(preset.teacherMemo)}</p><h3>活動で使う表現</h3><p class="bingo-prep-expressions">${esc(preset.expressions.template)}</p><div class="bingo-prep-slots">${preset.expressions.slots.map(s=>`<label>(${s.id}) の確認<select data-prep-slot="${s.id}">${cards.map(c=>`<option value="${esc(c.id)}">${esc(c.english)}</option>`).join('')}</select></label>`).join('')}</div><p data-prep-completed class="bingo-prep-expressions"></p></article><div class="bingo-prep-right"></div></section><section data-prep-pane="student" class="bingo-prep-student" hidden></section><section data-prep-pane="print" class="bingo-prep-print" hidden></section>`;root.append(ui);
  const right=root.querySelector('.bingo-prep-right');
  roster=window.InterviewBingoRosterPreview.create({onCountChange(){if(teacher)updateSettings();}});
  roster.element.addEventListener('change',()=>{changed=true;});
  student=window.InterviewBingoStudent.create();
  printer=window.InterviewBingoPrint.create({canOutput:()=>fresh()&&!!batch&&Q.printKey(batch.config)===Q.printKey(draft),onRegenerate:()=>generate(true)});
  teacher=window.InterviewBingoTeacher.create({tryLabel:'児童画面を仮名で試す',onChange:changeConfig,onTry:()=>show('student'),onGenerate:()=>generate(false),onUseRosterCount(){const n=roster.getSelectedCount();if(n!==null)changeConfig({...draft,participantCount:n});}});
  root.querySelector('.bingo-prep-summary').append(teacher.candidatesElement);right.append(roster.element,teacher.element);
  root.querySelector('[data-prep-pane=student]').append(student.element);root.querySelector('[data-prep-pane=print]').append(printer.element);
  function fresh(){
   if(stale||destroyed)return false;
   try{const p=store.listPresets().find(p=>p.id===route.presetId);if(!p||JSON.stringify(B.validatePreset(p,new Set(map.keys())))!==fingerprint)throw Error('changed');return true;}
   catch{stale=true;batch=null;printer.invalidate('プリセットが変更されました。準備画面を開き直してください。');student.collapse();student.element.inert=true;error.textContent='プリセットが変更・削除されたか、読み込めなくなりました。元のUnitから準備画面を開き直してください。';return false;}
  }
  function changeConfig(next){if(Q.printKey(next)!==Q.printKey(draft)){batch=null;printer.invalidate('設定が変更されました。教師用画面から配布用カードを作り直してください。');}draft=next;changed=true;updateSettings();}
  function updateSettings(extra=[]){
   const distribution=batch?Object.fromEntries(batch.config.candidateIds.map(id=>[id,0])):null;
   if(batch)for(const ids of batch.cards.slice(0,draft.participantCount))for(const id of ids)distribution[id]++;
   const validation=Q.validate(draft,preset.cardIds);validation.errors.push(...extra);
   teacher.update({config:draft,cards,recommendations:preset.recommendations,dirty:!applied||Q.boardKey(applied)!==Q.boardKey(draft),...validation,rosterCount:roster.getSelectedCount(),distribution});
  }
  function applyTrial(){
   if(!fresh()||Q.validate(draft,preset.cardIds).errors.length){updateSettings();return false;}
   if(draft.candidateIds.length*2<draft.size*draft.size){updateSettings([{message:'同じカードを2回ずつ使っても全マスを作れません。候補を増やすか、サイズを小さくしてください。'}]);return false;}
   const reset=!applied||Q.boardKey(applied)!==Q.boardKey(draft);
   if(reset&&student.getProgress().filled&&!confirm('BINGOの配置と名前がリセットされます。変更しますか？'))return false;
   student.update({activity:{title:preset.title,studentInstructions:preset.studentInstructions,expressions:preset.expressions},cards:draft.candidateIds.map(id=>map.get(id)),config:draft,reset});applied={...draft,candidateIds:[...draft.candidateIds]};return true;
  }
  function show(next){if(next==='student'&&!applyTrial())next='teacher';tab=next;root.querySelectorAll('[data-prep-pane]').forEach(p=>p.hidden=p.dataset.prepPane!==tab);root.querySelectorAll('[data-prep-tab]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.prepTab===tab)));updateSettings();}
  function generate(force){if(!fresh()||Q.validate(draft,preset.cardIds).errors.length){show('teacher');return;}if(force||!batch){batch=window.InterviewBingoMyCard.generate(draft);printer.update({batch,cards:draft.candidateIds.map(id=>map.get(id))});}show('print');}
  function expressions(){
   const slots=[...root.querySelectorAll('[data-prep-slot]')];
   const result=window.InterviewBingoExpressions.render(preset.expressions,map.get(slots[0]?.value),{completeExpressions:B.completeExpressions,forms:window.SentenceForms});
   root.querySelector('[data-prep-completed]').textContent=slots.length<=1?result.text:B.completeExpressions(preset,Object.fromEntries(slots.map(s=>[s.dataset.prepSlot,map.get(s.value)])))+'\n複数の独立した差し替え枠は、この児童プレビューでは未対応です。';
  }
  root.querySelectorAll('[data-prep-slot]').forEach(s=>s.onchange=expressions);expressions();
  root.querySelectorAll('[data-prep-tab]').forEach(b=>b.onclick=()=>show(b.dataset.prepTab));
  root.querySelector('[data-prep-back]').onclick=()=>{if((changed||batch||student.getProgress().filled)&&!confirm('このページの設定・配置を終了してUnitへ戻りますか？'))return;location.href=R.unitHref(route.bookId,route.unit);};
  function refresh(){if(destroyed)return;fresh();roster.refresh();}
  function storage(e){if(e.key===null||e.key==='dekiru-interview-bingo-presets-v1')fresh();if(e.key===null||e.key==='dekiru-class-rosters-v1')roster.refresh();}
  window.addEventListener('focus',refresh);window.addEventListener('storage',storage);show('teacher');
  return {destroy(){destroyed=true;window.removeEventListener('focus',refresh);window.removeEventListener('storage',storage);student.destroy();printer.destroy();teacher.destroy();}};
 }
 window.InterviewBingoPrepare={mount};document.addEventListener('DOMContentLoaded',()=>{const root=document.getElementById('bingoPreparation');if(root)mount({root});});
})();
