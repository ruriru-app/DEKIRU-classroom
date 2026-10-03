window.SpeechSummary=(()=>{
 'use strict';
 const esc=x=>window.SentenceCards.escape(x);
 function mount(root,{preset,getState,dispatch,audio,toolbar,audioControls,speakerIcon}){
  let dragging='';
  function sentences(){return window.SpeechModel.summary(preset,getState());}
  function render(){const ui=getState().ui,rows=sentences();
   const disabled=ui.summaryReordering?' disabled':'';
   toolbar.innerHTML='<div class="speech-summary-toolbar"><h2>まとめ</h2><div class="speech-summary-actions"><button type="button" data-writing aria-pressed="'+ui.summaryWriting+'">4線表記にする</button><button type="button" data-read-all'+disabled+'>全文を読む</button><button type="button" data-stop'+disabled+'>停止</button><button type="button" data-reorder aria-pressed="'+ui.summaryReordering+'">'+(ui.summaryReordering?'完了':'文の順序を入れ替える')+'</button></div>'+audioControls(ui,ui.summaryReordering,true)+'</div>';
   root.innerHTML='<div class="speech-summary"><div class="speech-summary-lines'+(ui.summaryWriting?' speech-summary-writing':'')+'">'+rows.map((s,i)=>'<article data-speech-sentence="'+esc(s.id)+'"'+(ui.summaryReordering?' draggable="true"':'')+'>'+(ui.summaryReordering?'':'<button type="button" class="talk-sentence-audio" data-read-one aria-label="この文を読む"><img src="'+esc(speakerIcon)+'" alt=""></button>')+'<p data-summary-text>'+esc(s.text)+'</p>'+(ui.summaryReordering?'<div class="speech-order-buttons"><button type="button" data-move="-1" aria-label="上へ"'+(i===0?' disabled':'')+'>↑</button><button type="button" data-move="1" aria-label="下へ"'+(i===rows.length-1?' disabled':'')+'>↓</button></div>':'')+'</article>').join('')+'</div></div>';
  }
  const element=id=>[...root.querySelectorAll('[data-speech-sentence]')].find(el=>el.dataset.speechSentence===id);
  function play(rows){const ui=getState().ui;if(ui.summaryReordering)return;audio.sequence(rows.map(s=>({text:s.text,parts:s.parts.flatMap(part=>String(part).trim().split(/\s+/)).filter(Boolean),segmented:ui.clearSpeech,element:element(s.id)})));}
  function click(e){const b=e.target.closest('button');if(!b)return;const ui=getState().ui;
   if(b.hasAttribute('data-writing'))dispatch({type:'ui',patch:{summaryWriting:!ui.summaryWriting}});
   else if(b.hasAttribute('data-reorder'))dispatch({type:'ui',patch:{summaryReordering:!ui.summaryReordering}});
   else if(b.hasAttribute('data-stop'))audio.stop();
   else if(b.hasAttribute('data-read-all'))play(sentences());
   else if(b.hasAttribute('data-read-one'))play(sentences().filter(s=>s.id===b.closest('[data-speech-sentence]').dataset.speechSentence));
   else if(b.hasAttribute('data-move')){const id=b.closest('[data-speech-sentence]').dataset.speechSentence;dispatch({type:'move-sentence',sentenceId:id,targetIndex:sentences().findIndex(s=>s.id===id)+Number(b.dataset.move)});}
  }
  function dragstart(e){const row=e.target.closest('[data-speech-sentence]');if(!getState().ui.summaryReordering||!row)return;dragging=row.dataset.speechSentence;e.dataTransfer.setData('text/plain',dragging);e.dataTransfer.effectAllowed='move';}
  function dragover(e){if(dragging&&e.target.closest('[data-speech-sentence]'))e.preventDefault();}
  function drop(e){const row=e.target.closest('[data-speech-sentence]');if(!dragging||!row)return;e.preventDefault();const id=dragging;dragging='';dispatch({type:'move-sentence',sentenceId:id,targetIndex:sentences().findIndex(s=>s.id===row.dataset.speechSentence)});}
  function dragend(){dragging='';}
  const events={click,dragstart,dragover,drop,dragend};for(const [name,fn]of Object.entries(events))root.addEventListener(name,fn);toolbar.addEventListener('click',click);
  return {render,dispose(){audio.stop();for(const [name,fn]of Object.entries(events))root.removeEventListener(name,fn);toolbar.removeEventListener('click',click);}};
 }
 return {mount};
})();
