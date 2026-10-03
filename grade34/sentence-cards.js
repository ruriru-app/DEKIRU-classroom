/* Shared sentence-card markup and contraction interaction; no Unit state. */
window.SentenceCards=(()=>{
 'use strict';
 const TIMING=Object.freeze({hold:550,restore:3000});
 const escape=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
 const sizeClass=word=>[...String(word||'')].length>=12?' extra-long':[...String(word||'')].length>=9?' long':'';
 function create({root=document,resolveImage=()=>'',iconUrl='',audio,contractions={},onSelect=()=>{},onLayout=()=>{}}={}){
  let disposed=false,listeners=[],timerIds=new Set(),restores=new Set();
  const schedule=(fn,ms)=>{const id=setTimeout(()=>{timerIds.delete(id);if(!disposed)fn();},ms);timerIds.add(id);return id;};
  const listen=(el,event,fn)=>{el.addEventListener(event,fn);listeners.push(()=>el.removeEventListener(event,fn));};
  function card(token){
   const image=resolveImage(token),word=token.word||'',speech=token.speech||word,parts=contractions[word.toLowerCase()]||[];
   const picture=image?'<img src="'+escape(image)+'"'+(token.imageTone==='sepia'?' class="talk-image-sepia"':'')+' alt="" onerror="this.parentElement.classList.add(&quot;symbol&quot;);this.parentElement.textContent=&quot;?&quot;">':'<span aria-hidden="true">'+escape(token.symbol||'•')+'</span>';
   const expansion=parts.length?' data-talk-expansion="'+escape(parts.join('|'))+'" title="長押しすると元の形を表示"':'';
   const selection=token.selectionKey?' data-talk-selection-key="'+escape(token.selectionKey)+'" data-talk-selection-role="'+escape(token.role)+'"':'';
   return '<button class="talk-card role-'+escape(token.role)+'" type="button" data-talk-speech="'+escape(speech)+'"'+selection+expansion+' aria-label="'+escape(word)+' の音声を再生"><span class="talk-card-picture '+(image?'':'symbol')+'">'+picture+'</span><span class="talk-card-word'+sizeClass(word)+'">'+escape(word)+'</span></button>';
  }
  function row(tokens,punctuation='',extraClass='',spacerPositions=[]){
   const display=tokens.map((t,i)=>i? t:{...t,word:String(t.word||'').replace(/^./,c=>c.toUpperCase())});
   const parts=display.map(t=>t.speech||t.word),text=parts.join(' ')+punctuation;
   const positions=new Set(spacerPositions===true?[0]:Array.isArray(spacerPositions)?spacerPositions:[]);
   const cards=display.map((t,i)=>(positions.has(i)?'<span class="talk-card-spacer" aria-hidden="true"></span>':'')+'<span class="talk-token-slot" data-talk-token-slot>'+card(t)+'</span>').join('');
   return '<div class="talk-sentence-row '+escape(extraClass)+'"><button class="talk-sentence-audio" type="button" data-talk-sentence="'+escape(text)+'" data-talk-parts="'+escape(JSON.stringify(parts))+'" aria-label="文章全体を発音する"><img src="'+escape(iconUrl)+'" alt=""></button>'+cards+'<span class="talk-punctuation" aria-hidden="true">'+escape(punctuation)+'</span></div>';
  }
  function fitLabels(container){
   if(!container?.isConnected||disposed)return;
   container.querySelectorAll('.talk-card-word,.talk-choice-word').forEach(label=>{
    label.style.fontSize='';label.style.paddingInline='1px';
    const minimum=label.classList.contains('talk-choice-word')?9:11;
    let size=parseFloat(getComputedStyle(label).fontSize)||minimum;
    const range=document.createRange();range.selectNodeContents(label);
    while(range.getBoundingClientRect().width>Math.max(1,label.clientWidth-2)&&size>minimum){size=Math.max(minimum,size-1);label.style.fontSize=size+'px';}
   });
  }
  function fit(stage,zoomPercent=null){
   const content=stage?.firstElementChild;if(!content)return 1;
   content.style.zoom='1';fitLabels(stage);
   const box=content.getBoundingClientRect(),fitted=Math.max(.01,Math.min(1,(stage.clientWidth-24)/Math.max(1,box.width),(stage.clientHeight-24)/Math.max(1,box.height)));
   const scale=zoomPercent===null?fitted:Math.max(10,Math.min(400,Number(zoomPercent)||100))/100;
   content.style.zoom=String(scale);return scale;
  }
  function unbind(){listeners.forEach(fn=>fn());listeners=[];timerIds.forEach(clearTimeout);timerIds.clear();restores.forEach(fn=>fn());restores.clear();}
  function bind(stage){
   unbind();if(disposed)return;
   stage.querySelectorAll('[data-talk-sentence]').forEach(button=>listen(button,'click',()=>{let parts=[];try{parts=JSON.parse(button.dataset.talkParts||'[]');}catch{}audio?.sentence(button.dataset.talkSentence,parts,button);}));
   stage.querySelectorAll('[data-talk-speech]').forEach(button=>{
    let timer=null,longPressed=false;
    function expand(){
     const slot=button.closest('[data-talk-token-slot]'),parts=String(button.dataset.talkExpansion||'').split('|').filter(Boolean);
     if(!slot||!parts.length||slot.dataset.expanding==='true')return;
     longPressed=true;slot.dataset.expanding='true';slot.classList.add('show-contraction-parts');
     slot.innerHTML=parts.map(word=>{const lower=word.toLowerCase();return card({word,speech:word,role:lower==='do'?'verb':lower==='not'?'negative':'neutral',symbol:lower==='do'?'〇':lower==='not'?'×':'•'});}).join('');
     slot.querySelectorAll('[data-talk-speech]').forEach(el=>listen(el,'click',()=>audio?.speak(el.dataset.talkSpeech,el)));
     fitLabels(slot);onLayout();
     const restore=()=>{slot.replaceChildren(button);slot.classList.remove('show-contraction-parts');delete slot.dataset.expanding;longPressed=false;restores.delete(restore);fitLabels(slot);onLayout();};
     restores.add(restore);schedule(restore,TIMING.restore);
    }
    const finish=()=>{clearTimeout(timer);timerIds.delete(timer);};
    listen(button,'pointerdown',()=>{if(button.dataset.talkExpansion){finish();timer=schedule(expand,TIMING.hold);}});
    listen(button,'pointerup',finish);listen(button,'pointercancel',finish);listen(button,'pointerleave',()=>{if(!longPressed)finish();});
    listen(button,'contextmenu',e=>{if(button.dataset.talkExpansion){e.preventDefault();finish();expand();}});
    listen(button,'click',e=>{if(longPressed){longPressed=false;e.preventDefault();return;}if(button.dataset.talkSelectionKey)onSelect(button.dataset.talkSelectionKey,button.dataset.talkSelectionRole);audio?.speak(button.dataset.talkSpeech,button);});
   });
  }
  function dispose(){disposed=true;unbind();}
  return {card,row,bind,fit,fitLabels,dispose};
 }
 return {create,TIMING,escape,sizeClass};
})();
