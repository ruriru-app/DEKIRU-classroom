window.SpeechEditor=(()=>{
 'use strict';
 const esc=x=>window.SentenceCards.escape(x),roles=[['subject','だれが'],['negative','打ち消し'],['verb','何する'],['adjective','どんな'],['object','だれを・何を'],['place','どこ'],['time','いつ']];
 function mount(root,{preset,catalog,store}){
  const restored=store.load(preset);let state=restored.state,cards=null,summaryView=null,disposed=false;
  const bookLabel={nh5:'NHE5',nh6:'NHE6',lt1:"Let’s Try! 1",lt2:"Let’s Try! 2"}[preset.book]||preset.book;
  root.innerHTML='<header class="speech-header"><div><small>'+esc(bookLabel)+' Unit '+preset.unit+'　'+esc(preset.title)+'</small><h1>BUILD MY SPEECH</h1></div><p data-speech-status role="status"></p><button type="button" data-speech-fullscreen aria-pressed="false">全画面</button></header><div class="speech-layout"><nav aria-label="話す内容"><div data-step-menu></div></nav><section class="speech-workspace" aria-label="文を作る"><div data-editor-controls></div><div class="talk-stage" data-speech-stage></div><div class="speech-input-host"></div></section></div>';
  const status=root.querySelector('[data-speech-status]'),menu=root.querySelector('[data-step-menu]'),controls=root.querySelector('[data-editor-controls]'),stage=root.querySelector('[data-speech-stage]'),inputRoot=root.querySelector('.speech-input-host');
  status.textContent=restored.message;status.dataset.saved=String(restored.status==='saved');
  function notify(message){status.textContent=message;}
  const audio=window.SentenceAudio.create({root,getRate:()=>state.ui.rate,getEnabled:()=>state.ui.stepId==='summary'||state.ui.sound,onError:notify});
  const inputs=window.SpeechInputs.mount(inputRoot,{preset,getState:()=>state,catalog,dispatch});
  function dispatch(action){
   const focused=document.activeElement;const focusAttribute=focused&&root.contains(focused)?[...focused.attributes].find(a=>/^data-(speech-step|speech-optional|speech-choice|speech-slot|speech-variant|filter|rate|sound|clear|zoom)$/.test(a.name)):null;
   const result=window.SpeechModel.reduce(preset,state,action);if(!result.ok){notify(result.error);return result;}
   state=result.state;const saved=store.save(preset,state);status.dataset.saved=String(saved.ok);notify(saved.ok?'✓ この端末に自動保存':saved.message);
   // Drafts save without replacing focused/composing inputs.
   if(action.type!=='draft'){render();if(focusAttribute)root.querySelector('['+focusAttribute.name+'="'+CSS.escape(focusAttribute.value)+'"]')?.focus({preventScroll:true});}return result;
  }
  function render(){
   if(disposed)return;audio.stop();cards?.dispose();cards=null;summaryView?.dispose();summaryView=null;
   let number=0;menu.innerHTML=preset.steps.map(s=>'<div class="speech-menu-item">'+(s.required?'<span class="speech-required-number">'+(++number)+'</span>':'<input type="checkbox" data-speech-optional="'+s.id+'" aria-label="'+esc(s.label)+'をまとめに入れる"'+(state.optionalEnabled[s.id]?' checked':'')+'>')+'<button type="button" data-speech-step="'+s.id+'" aria-current="'+(state.ui.stepId===s.id?'step':'false')+'">'+esc(s.label)+'</button></div>').join('')+'<button type="button" class="speech-summary-entry" data-speech-step="summary" aria-current="'+(state.ui.stepId==='summary'?'step':'false')+'">まとめ</button>';
   const step=preset.steps.find(s=>s.id===state.ui.stepId);
   stage.classList.toggle('speech-summary-stage',!step);
   if(!step){controls.innerHTML='<h2>まとめ</h2>';inputs.render('');summaryView=window.SpeechSummary.mount(stage,{preset,getState:()=>state,dispatch,audio});summaryView.render();return;}
   const slots=window.SpeechModel.editableSlots(preset,state,step.id);
   controls.innerHTML='<div class="speech-rules">'+roles.map(([role,label])=>'<span class="talk-rule role-'+role+'">'+label+'</span>').join('')+'</div><div class="speech-tools"><strong>'+esc(step.label)+'</strong><button type="button" data-sound aria-pressed="'+state.ui.sound+'">音声 '+(state.ui.sound?'ON':'OFF')+'</button><button type="button" data-clear aria-pressed="'+state.ui.clearSpeech+'">区切り読み</button><label>速さ <select data-rate aria-label="速さ">'+[[.55,'ゆっくり'],[.85,'ふつう'],[1.2,'はやく']].map(([v,l])=>'<option value="'+v+'"'+(state.ui.rate===v?' selected':'')+'>'+l+'</option>').join('')+'</select></label><button type="button" data-reset'+(!preset.slots.some(s=>s.ownerStepId===step.id)&&!step.variants?' disabled':'')+'>↺ この文をもどす</button><label>大きさ <input data-zoom type="range" min="10" max="400" value="'+(state.ui.zoomPercent||100)+'" aria-label="文カードの大きさ"></label><button type="button" data-auto>自動</button></div>'+(step.variants?'<div class="speech-variants">'+step.variants.map(v=>'<button type="button" data-speech-variant="'+v.id+'" aria-pressed="'+(state.stepVariants[step.id]===v.id)+'">'+esc(v.label)+'</button>').join('')+'</div>':'');
   cards=window.SentenceCards.create({root,resolveImage:t=>t.imageUrl||catalog.card(t.cardId)?.imageUrl||'',iconUrl:'../grade34/assets/ui/originals/読み上げボタン.svg',audio:{speak:(text,element)=>audio.speak(text,element.isConnected?element:stage.querySelector('[data-speech-slot="'+CSS.escape(state.ui.slotId)+'"]')),sentence:(text,parts,element)=>audio.sentence(text,parts,element,state.ui.clearSpeech)},contractions:preset.contractions,onSelect:id=>dispatch({type:'ui',patch:{slotId:id}}),onLayout:fit});
   stage.innerHTML='<div class="speech-sentences">'+window.SpeechModel.stepSentences(preset,state,step.id).map(s=>cards.row(s.tokens,s.punctuation)).join('')+'</div>';
   stage.querySelectorAll('[data-talk-selection-key]').forEach(b=>{b.dataset.speechSlot=b.dataset.talkSelectionKey;b.setAttribute('aria-pressed',String(b.dataset.speechSlot===state.ui.slotId));b.setAttribute('aria-label',b.textContent.trim()+' を入れ替える');});
   stage.querySelectorAll('.talk-card').forEach(b=>{if([...(b.querySelector('.talk-card-word')?.textContent||'')].length>60)b.dataset.longWord='true';});
   cards.bind(stage);inputs.render(slots.some(s=>s.id===state.ui.slotId)?state.ui.slotId:slots[0]?.id||'');requestAnimationFrame(fit);
  }
  function fit(){
   if(disposed||!cards)return;const scale=cards.fit(stage,state.ui.zoomPercent);
   // Auto-fit never makes long words microscopic; overflow stays inside the stage.
   if(state.ui.zoomPercent===null){const sizes=[...stage.querySelectorAll('.talk-card-word')].map(el=>parseFloat(getComputedStyle(el).fontSize));const minimum=Math.min(...sizes);if(minimum&&minimum*scale<14)stage.firstElementChild.style.zoom=String(Math.max(scale,14/minimum));}
  }
  function click(e){const b=e.target.closest('button');if(!b||!root.contains(b))return;
   if(b.dataset.speechStep)dispatch({type:'ui',patch:{stepId:b.dataset.speechStep}});
   else if(b.dataset.speechVariant)dispatch({type:'variant',stepId:state.ui.stepId,variantId:b.dataset.speechVariant});
   else if(b.hasAttribute('data-sound'))dispatch({type:'ui',patch:{sound:!state.ui.sound}});
   else if(b.hasAttribute('data-clear'))dispatch({type:'ui',patch:{clearSpeech:!state.ui.clearSpeech}});
   else if(b.hasAttribute('data-auto'))dispatch({type:'ui',patch:{zoomPercent:null}});
   else if(b.hasAttribute('data-reset')){if(window.confirm('この文を初期の内容にもどします。'+(state.ui.stepId==='origin'?'生産国を使うほかの文にも反映されます。':'')+'よろしいですか？'))dispatch({type:'reset-step',stepId:state.ui.stepId});}
   else if(b.hasAttribute('data-speech-fullscreen'))toggleFullscreen();
  }
  function change(e){if(e.target.matches('[data-speech-optional]'))dispatch({type:'optional',stepId:e.target.dataset.speechOptional,enabled:e.target.checked});else if(e.target.matches('[data-rate]'))dispatch({type:'ui',patch:{rate:Number(e.target.value)}});else if(e.target.matches('[data-zoom]'))dispatch({type:'ui',patch:{zoomPercent:Number(e.target.value)}});}
  function expanded(value){root.classList.toggle('speech-expanded',value);const b=root.querySelector('[data-speech-fullscreen]');b.setAttribute('aria-pressed',String(value));b.textContent=value?'全画面を解除':'全画面';fit();}
  async function toggleFullscreen(){
   if(root.classList.contains('speech-expanded')){expanded(false);if(document.fullscreenElement)try{await document.exitFullscreen();}catch{}return;}
   expanded(true);if(root.requestFullscreen)try{await root.requestFullscreen();}catch{/* App-level expanded layout remains available. */}
  }
  function fullscreenchange(){expanded(document.fullscreenElement===root);}
  function keydown(e){if(e.key==='Escape'&&root.classList.contains('speech-expanded')){expanded(false);if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});}}
  function pause(){audio.stop();cards?.dispose();cards=null;}
  function visibility(){if(document.hidden)pause();else render();}
  function pageshow(){if(!disposed)render();}
  root.addEventListener('click',click);root.addEventListener('change',change);window.addEventListener('resize',fit);document.addEventListener('fullscreenchange',fullscreenchange);document.addEventListener('keydown',keydown);document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',pause);window.addEventListener('pageshow',pageshow);render();
  return {getState:()=>JSON.parse(JSON.stringify(state)),dispatch,dispose(){disposed=true;audio.dispose();cards?.dispose();summaryView?.dispose();inputs.dispose();root.removeEventListener('click',click);root.removeEventListener('change',change);window.removeEventListener('resize',fit);document.removeEventListener('fullscreenchange',fullscreenchange);document.removeEventListener('keydown',keydown);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',pause);window.removeEventListener('pageshow',pageshow);}};
 }
 return {mount};
})();
(()=>{
 const root=document.querySelector('#speech-app');if(!root)return;
 try{
  const query=new URLSearchParams(location.search),book=query.get('book'),unit=query.get('unit');
  if(!window.SpeechPresets.list().some(p=>p.book===book&&String(p.unit)===unit))throw Error('このUnitの教材はまだありません。');
  const catalog=window.SpeechCatalog.create({data:window.DEKIRU_DATA,source:window.CardSet.source,countries:window.WorldCountries,search:window.WorldSearch.find,sourceBase:new URL('../grade34/',location.href).href,assetBase:new URL('assets/build-my-speech/',location.href).href});
  const preset=window.SpeechPresets.get(book,unit,catalog);
  window.SpeechEditor.mount(root,{preset,catalog,store:window.SpeechStore.create()});
 }catch(error){root.textContent='教材を開けませんでした。'+error.message;}
})();
