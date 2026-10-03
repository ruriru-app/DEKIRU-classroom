window.SpeechInputs=(()=>{
 'use strict';
 const esc=x=>window.SentenceCards.escape(x);
 function mount(root,{preset,getState,catalog,dispatch}){
  let current='',composing=false,editing=null;
  const slot=()=>preset.slots.find(s=>s.id===current);
  const wordActions=id=>'<span class="speech-word-actions"><button type="button" data-edit-word="'+esc(id)+'" aria-label="この追加語を編集">編集</button><button type="button" data-delete-word="'+esc(id)+'" aria-label="この追加語を削除">削除</button></span>';
  function choices(){
   const s=slot(),state=getState();if(!s)return [];
   if(s.inputType==='country-search')return catalog.findCountries(state.drafts[s.id]?.search||'');
   const filter=state.ui.filters[s.id]||'ALL',official=preset.choiceSets[s.choiceSetId].map(c=>({...c,kind:'choice'})),custom=(state.myWords[s.myWordsGroupId]||[]).map(c=>({id:c.id,label:c.text,kind:'custom'}));
   return filter==='MY WORDS'?custom:filter==='ALL'?[...official,...custom]:official.filter(c=>c.category===filter);
  }
  function list(){
   const s=slot(),state=getState(),items=choices();
   if(s.inputType==='list'){
    const selected=state.slotValues[s.id],missing=!items.some(c=>c.id===selected?.id);
    return '<label>候補のリスト<select data-choice-list aria-label="候補のリスト">'+(missing?'<option value="" disabled selected>作文中：'+esc(selected?.insertText||'')+'</option>':'')+items.map(c=>'<option value="'+esc(c.id)+'" data-choice-kind="'+c.kind+'"'+(selected?.id===c.id?' selected':'')+'>'+esc(c.label)+'</option>').join('')+'</select></label><div class="speech-list-words">'+items.filter(c=>c.kind==='custom').map(c=>'<span>'+esc(c.label)+wordActions(c.id)+'</span>').join('')+'</div>';
   }
   return '<div class="speech-candidates">'+(items.length?items.map(c=>'<div class="speech-candidate"><button type="button" data-speech-choice="'+esc(c.id)+'" data-choice-kind="'+(c.kind||'choice')+'" aria-pressed="'+(state.slotValues[s.id]?.id===c.id)+'">'+(c.imageUrl?'<img src="'+esc(c.imageUrl)+'" alt="">':'')+'<span>'+esc(c.label)+'</span></button>'+(c.kind==='custom'?wordActions(c.id):'')+'</div>').join(''):'<p>'+ (s.inputType==='country-search'?'見つかりません。別の国名で検索してください。':'まだ候補がありません。「＋ ほかの言葉」から追加できます。')+'</p>')+'</div>';
  }
  function render(id){if(current!==id||!getState().ui.inputOpen)editing=null;current=id;const s=slot(),state=getState();root.hidden=!s;if(!s){root.replaceChildren();return;}
   const filters=['ALL',...(s.allowMyWords?['MY WORDS']:[]),...new Set(preset.choiceSets[s.choiceSetId].map(c=>c.category).filter(Boolean))];
   root.innerHTML='<div data-speech-inputs>'+ (s.inputType==='country-search'?'<label>国名を検索<input data-country-search aria-label="国名を検索" placeholder="日本語・かな・英語" value="'+esc(state.drafts[id]?.search||'')+'"></label>':'<div class="speech-filters">'+filters.map(f=>'<button type="button" data-filter="'+esc(f)+'" aria-pressed="'+((state.ui.filters[id]||'ALL')===f)+'">'+esc(f)+'</button>').join('')+'</div>')+(state.ui.inputOpen&&s.allowMyWords?'<form data-word-form class="speech-word-form"><h3>'+(editing?'追加した言葉を編集する':'ほかの言葉を追加する')+'</h3><label>英語を入力<input data-word-input aria-label="英語を入力" value="'+esc(editing?editing.text:state.drafts[id]?.text||'')+'"></label><p>'+esc(s.hint)+'</p><p data-input-message role="status">1～200文字で入力できます。</p><div><button type="submit">'+(editing?'更新':'追加する')+'</button> <button type="button" data-cancel-word>キャンセル</button></div></form>':'<div class="speech-picker">'+(s.allowMyWords?'<button type="button" class="speech-add-word" data-add-word>＋ ほかの言葉</button>':'')+'<div data-candidate-host>'+list()+'</div></div>')+'</div>';
  }
  function click(e){const b=e.target.closest('button');if(!b)return;
   if(b.hasAttribute('data-speech-choice'))dispatch({type:'select',slotId:current,selection:{kind:b.dataset.choiceKind||'choice',id:b.dataset.speechChoice}});
   else if(b.hasAttribute('data-filter'))dispatch({type:'ui',patch:{filters:{[current]:b.dataset.filter}}});
   else if(b.hasAttribute('data-add-word')){editing=null;dispatch({type:'ui',patch:{inputOpen:true}});root.querySelector('[data-word-input]')?.focus();}
   else if(b.hasAttribute('data-edit-word')){const word=(getState().myWords[slot().myWordsGroupId]||[]).find(w=>w.id===b.dataset.editWord);if(word){editing={...word};dispatch({type:'ui',patch:{inputOpen:true}});root.querySelector('[data-word-input]')?.focus();}}
   else if(b.hasAttribute('data-cancel-word'))dispatch({type:'ui',patch:{inputOpen:false}});
   else if(b.hasAttribute('data-delete-word')&&window.confirm('候補から削除しても、作った文は残ります。削除しますか？'))dispatch({type:'delete-word',groupId:slot().myWordsGroupId,id:b.dataset.deleteWord});
  }
  // Editing is transactional: do not overwrite the saved add-word draft before 更新.
  function input(e){if(e.target.matches('[data-country-search]')){dispatch({type:'draft',slotId:current,field:'search',text:e.target.value});root.querySelector('[data-candidate-host]').innerHTML=list();}else if(e.target.matches('[data-word-input]')){if(editing)editing.text=e.target.value;else dispatch({type:'draft',slotId:current,field:'text',text:e.target.value});}}
  function submit(e){if(!e.target.matches('[data-word-form]'))return;e.preventDefault();if(composing)return;const result=dispatch({type:editing?'edit-word':'add-word',slotId:current,id:editing?editing.id:'word-'+crypto.randomUUID(),text:root.querySelector('[data-word-input]').value});if(!result.ok)root.querySelector('[data-input-message]').textContent=result.error;}
  function compositionStart(){composing=true;}function compositionEnd(){composing=false;}
  function keydown(e){if(e.key==='Enter'&&(composing||e.isComposing||e.keyCode===229))e.preventDefault();}
  function change(e){if(e.target.matches('[data-choice-list]'))dispatch({type:'select',slotId:current,selection:{kind:e.target.selectedOptions[0]?.dataset.choiceKind||'choice',id:e.target.value}});}
  const events={click,input,change,submit,compositionstart:compositionStart,compositionend:compositionEnd,keydown};for(const [name,fn]of Object.entries(events))root.addEventListener(name,fn);
  return {render,dispose(){for(const [name,fn]of Object.entries(events))root.removeEventListener(name,fn);}};
 }
 return {mount};
})();
