/* Card selection, original v0.0.46 speech and contraction behavior shared by Units. */
window.SentencePlayer=(()=>{
'use strict';
let context={},definition=null,unitKey='',cardById=new Map(),talkActivity=null;
let talkChoiceRole='object',talkChoiceTarget='object',talkSelected={},talkHiddenCategories=new Set();
let talkSoundEnabled=true,talkSpeechRate=.55,talkClearSpeech=false,talkZoom=null;
let talkSpeechSequenceId=0,talkSpeechPauseTimer=null,speakingElement=null;
const timers=new Set();
let stageObserver=null;
function fitStage(){
 const stage=document.getElementById('talkStage'),content=stage?.firstElementChild;
 if(!content)return;
 content.style.zoom='1';
 const width=content.getBoundingClientRect().width,height=content.getBoundingClientRect().height;
 const fitted=Math.min(1,(stage.clientWidth-24)/Math.max(1,width),(stage.clientHeight-24)/Math.max(1,height));
 const scale=talkZoom===null?fitted:talkZoom/100;
 content.style.zoom=String(scale);
 const range=document.getElementById('talkZoomRange'),label=document.getElementById('talkZoomValue');
 if(range)range.value=String(Math.round(scale*100));
 if(label)label.textContent=Math.round(scale*100)+'%';
}
const CONTRACTION_PARTS={"don't":['do','not'],"i'm":['I','am'],"you're":['you','are'],"it's":['it','is'],"that's":['that','is'],"what's":['what','is'],"who's":['who','is'],"can't":['can','not'],"won't":['will','not']};
const escapeHtml=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#039;");
const categoryLabel=category=>context.labels?.[category]||category;
function schedule(fn,delay){const id=setTimeout(()=>{timers.delete(id);fn();},delay);timers.add(id);return id;}
function stop(){stopTalkSpeechSequence();timers.forEach(clearTimeout);timers.clear();stageObserver?.disconnect();talkActivity=null;}
function menu(){return '<div class="sentence-menu talk-activity-list">'+definition.activities.map((a,i)=>'<button type="button" class="talk-activity-choice" data-talk-activity="'+a.id+'"><span class="talk-activity-heading"><span class="activity-number">'+(i+1)+'</span>'+escapeHtml(a.title)+'</span><strong>'+escapeHtml(a.example)+'</strong></button>').join('')+'</div>';}
function markup(key){
 if(unitKey!==key){stop();unitKey=key;}
 definition=window.SentenceUnits[key];
 if(definition&&talkActivity)return `  <div class="talk-shell">
    <div class="talk-topbar">
      <button class="talk-top-control talk-back-compact" id="sentence-back" type="button" aria-label="活動一覧へ戻る" title="活動一覧へ戻る"><img src="assets/ui/originals/戻る.svg" alt=""></button>
      <div class="talk-rules" aria-label="文の組み立ての色分け">
        <div class="talk-rule role-subject">だれが</div><div class="talk-rule role-negative">打ち消し</div><div class="talk-rule role-verb">何する</div><div class="talk-rule role-adjective">どんな</div><div class="talk-rule role-object">だれを・何を</div><div class="talk-rule role-place">どこ</div><div class="talk-rule role-time">いつ</div>
      </div>
      <div class="talk-audio-controls">
        <div class="talk-icon-row">
          <button class="talk-icon-control talk-sound-toggle" id="talkSoundToggle" type="button" aria-pressed="true" aria-label="カードの音声を切る" title="音声ON"><span class="talk-svg-crop"><img src="assets/ui/originals/音声ONOFFと読み方.svg" alt=""></span></button>
          <button class="talk-icon-control talk-clarity-toggle" id="talkClarityToggle" type="button" aria-pressed="false" aria-label="1枚ずつ区切って読む" title="1枚ずつ読む"><span class="talk-svg-crop second"><img src="assets/ui/originals/音声ONOFFと読み方.svg" alt=""></span></button>
        </div>
        <label class="talk-speed-control" for="talkSpeechRate"><span>速さ</span><select id="talkSpeechRate" aria-label="読み上げ速度"><option value="0.55" selected>ゆっくり</option><option value="0.85">ふつう</option><option value="1.20">はやめ</option></select></label>
      </div>
    </div>
    <div class="talk-stage-wrap">
      <button class="talk-stage-zoom" id="talkStageZoom" type="button" aria-expanded="false" aria-controls="talkZoomControls" aria-label="文カードの大きさを調整" title="文カードの大きさを調整">＋</button><button class="sentence-fullscreen fullscreen-button" data-fullscreen aria-label="全画面表示">⛶</button>
      <div class="talk-zoom-controls" id="talkZoomControls" hidden><label for="talkZoomRange">大きさ <output id="talkZoomValue">100%</output></label><input id="talkZoomRange" aria-label="文カードの拡大率" type="range" min="10" max="400" step="1" value="100"><button id="talkZoomFit" type="button">元のサイズに戻す</button></div>
      <div class="talk-stage" id="talkStage"></div>
    </div>
    <div class="talk-choice-panel">
      <div class="talk-choice-head">
        <div class="talk-role-tabs" aria-label="入れ替える文の部分">
          <button class="talk-role-tab role-subject" type="button" data-talk-role="subject" aria-pressed="false">だれが</button>
          <button class="talk-role-tab role-verb" type="button" data-talk-role="verb" aria-pressed="false">どうした</button>
          <button class="talk-role-tab role-object" type="button" data-talk-role="object" aria-pressed="true">だれを・なにを</button>
        </div>
        <div class="talk-category-filters" id="talkCategoryFilters" aria-label="表示するカテゴリー"></div>
      </div>
      <div class="talk-choices" id="talkChoices"></div>
    </div>
  </div>`;
 return '<header class="sentence-menu-heading"><button id="sentence-back" class="talk-back-compact" data-feature="close" aria-label="Unitページへ戻る"><img src="assets/ui/originals/戻る.svg" alt=""></button><h1>文で話そう</h1></header>'+(definition?menu():'<div class="empty-state">このUnitの「文で話そう」は準備中です。</div>');
}
function settings(){return definition?'<h2>文で話そう</h2><div class="sentence-activity-settings">'+definition.activities.map((a,i)=>'<button type="button" data-talk-activity="'+a.id+'" aria-pressed="'+(talkActivity===a.id)+'">'+(i+1)+'. '+escapeHtml(a.title)+'</button>').join('')+'</div><p>文のカードを押してから、下の候補を選ぶと入れ替えられます。</p>':'<p>このUnitの活動は準備中です。</p>';}
function attach(options){
 context=options;cardById=new Map(options.cards.map(c=>[c.id,c]));
 if(talkActivity&&definition)mount();
 const settingsNode=document.getElementById('specific-settings');if(settingsNode)settingsNode.innerHTML=settings();
}
function mount(){
 stageObserver?.disconnect();stageObserver=new ResizeObserver(fitStage);stageObserver.observe(document.getElementById('talkStage'));
 updateTalkSoundButton();updateTalkClarityButton();
 document.getElementById('talkSpeechRate').value=String(talkSpeechRate);
 renderTalkChoiceControls();renderTalkStage();renderTalkChoices();
}
function open(activity){
 if(!definition?.activities.some(a=>a.id===activity))return;
 stop();talkActivity=activity;talkChoiceRole='object';talkChoiceTarget=definition.target(activity);
 talkHiddenCategories.clear();if(definition.quantities){talkHiddenCategories.add('Count');talkHiddenCategories.add('Color');}talkSelected=definition.defaults(activity);talkZoom=null;
 const verbs=talkChoiceItems('verb',false),objects=talkChoiceItems('object',false);
 for(const [key,pool] of [['verb',verbs],['object',objects],['negativeObject',objects]]){
  if(pool.length&&!pool.some(c=>c.id===talkSelected[key]))talkSelected[key]=pool[0].id;
 }
 document.getElementById('unit-content').innerHTML=markup(unitKey);
 attach(context);
}
document.addEventListener('click',event=>{
 const choice=event.target.closest('[data-talk-activity]');
 if(choice){open(choice.dataset.talkActivity);return;}
 if(!talkActivity)return;
 if(event.target.closest('#sentence-back')){
  if(context.onPresetBack){const back=context.onPresetBack;stop();back();return;}
  const panel=document.getElementById('unit-content');
  if(document.fullscreenElement){document.exitFullscreen?.();return;}
  if(panel.classList.contains('fullscreen-content')){panel.classList.remove('fullscreen-content');return;}
  stop();panel.innerHTML=markup(unitKey);attach(context);return;
 }
 if(event.target.closest('#talkSoundToggle')){talkSoundEnabled=!talkSoundEnabled;if(!talkSoundEnabled)stopTalkSpeechSequence();updateTalkSoundButton();}
 if(event.target.closest('#talkClarityToggle')){talkClearSpeech=!talkClearSpeech;stopTalkSpeechSequence();updateTalkClarityButton();}
 if(event.target.closest('#talkStageZoom')){
  const panel=document.getElementById('talkZoomControls');panel.hidden=!panel.hidden;
  document.getElementById('talkStageZoom').setAttribute('aria-expanded',String(!panel.hidden));
 }
 if(event.target.closest('#talkZoomFit')){talkZoom=null;fitStage();}
 const role=event.target.closest('[data-talk-role]');
 if(role){talkChoiceRole=role.dataset.talkRole;talkChoiceTarget=talkChoiceRole==='object'?definition.target(talkActivity):talkChoiceRole;renderTalkChoiceControls();renderTalkChoices();}
});
document.addEventListener('input',event=>{if(event.target.id==='talkZoomRange'){talkZoom=Math.max(10,Math.min(400,Number(event.target.value)||100));fitStage();}});
document.addEventListener('change',event=>{if(event.target.id==='talkSpeechRate'){talkSpeechRate=Number(event.target.value)||.55;stopTalkSpeechSequence();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopTalkSpeechSequence();});
window.addEventListener('pagehide',stop);
window.addEventListener('resize',()=>{const stage=document.getElementById('talkStage');if(stage)fitTalkWordLabels(stage);});
function talkToken(word,role,cardId,symbol,speech,selectionKey){
  return {word,role,cardId:cardId||'',symbol:symbol||'',speech:speech||word.replace(/[,.?]$/,''),selectionKey:selectionKey||''};
}
function contractionParts(word){
  return CONTRACTION_PARTS[String(word||'').toLowerCase()]||[];
}
function talkWordSizeClass(word){
  const length=[...String(word||'')].length;
  return length>=12?' extra-long':length>=9?' long':'';
}
function fitTalkWordLabels(root){
  const apply=()=>{
    if(!root?.isConnected)return;
    const content=document.getElementById('talkStage')?.firstElementChild;
    if(content)content.style.zoom='1';
    root.querySelectorAll('.talk-card-word,.talk-choice-word').forEach(label=>{
      label.style.fontSize='';
      label.style.paddingInline='1px';
      const minimum=label.classList.contains('talk-choice-word')?9:11;
      let size=parseFloat(getComputedStyle(label).fontSize)||minimum;
      const available=Math.max(1,label.clientWidth-2);
      const textWidth=()=>{
        const range=document.createRange();
        range.selectNodeContents(label);
        return range.getBoundingClientRect().width;
      };
      while(textWidth()>available&&size>minimum){
        size=Math.max(minimum,size-1);
        label.style.fontSize=size+'px';
      }
    });
    fitStage();
  };
  requestAnimationFrame(apply);
  document.fonts?.ready.then(apply);
}
function sentenceStartToken(token,index){
  if(index!==0)return token;
  const word=String(token.word||'');
  if(!word)return token;
  return {...token,word:word.charAt(0).toUpperCase()+word.slice(1)};
}
function talkCardMarkup(token){
  const source=token.cardId?cardById.get(token.cardId):null;
  const image=source?context.source(source):'';
  const word=token.word||source?.english||'';
  const speech=token.speech||source?.speech||word;
  const expansionParts=contractionParts(word);
  const picture=image?'<img src="'+escapeHtml(image)+'" alt="" onerror="this.parentElement.classList.add(&quot;symbol&quot;);this.parentElement.textContent=&quot;?&quot;">':'<span aria-hidden="true">'+escapeHtml(token.symbol||'•')+'</span>';
  const expansionData=expansionParts.length?' data-talk-expansion="'+escapeHtml(expansionParts.join('|'))+'" title="長押しすると元の形を表示"':'';
  const selectionData=token.selectionKey?' data-talk-selection-key="'+escapeHtml(token.selectionKey)+'" data-talk-selection-role="'+escapeHtml(token.role)+'"':'';
  return '<button class="talk-card role-'+escapeHtml(token.role)+'" type="button" data-talk-speech="'+escapeHtml(speech)+'"'+selectionData+expansionData+' aria-label="'+escapeHtml(word)+' の音声を再生"><span class="talk-card-picture '+(image?'':'symbol')+'">'+picture+'</span><span class="talk-card-word'+talkWordSizeClass(word)+'">'+escapeHtml(word)+'</span></button>';
}
function talkRowMarkup(tokens,punctuation,extraClass,spacerPositions){
  const displayTokens=tokens.map(sentenceStartToken);
  const sentence=displayTokens.map(token=>token.speech||token.word).join(' ')+punctuation;
  const parts=displayTokens.map(token=>token.speech||token.word);
  const positions=new Set(spacerPositions===true?[0]:(Array.isArray(spacerPositions)?spacerPositions:[]));
  const cards=displayTokens.map((token,index)=>(positions.has(index)?'<span class="talk-card-spacer" aria-hidden="true"></span>':'')+'<span class="talk-token-slot" data-talk-token-slot>'+talkCardMarkup(token)+'</span>').join('');
  return '<div class="talk-sentence-row '+(extraClass||'')+'"><button class="talk-sentence-audio" type="button" data-talk-sentence="'+escapeHtml(sentence)+'" data-talk-parts="'+escapeHtml(JSON.stringify(parts))+'" aria-label="文章全体を発音する"><img src="assets/ui/originals/読み上げボタン.svg" alt=""></button>'+cards+'<span class="talk-punctuation" aria-hidden="true">'+escapeHtml(punctuation)+'</span></div>';
}
function talkChoiceItems(role,includeHidden){
  const seen=new Set();
  let cards=[];
  if(role==='subject'){
    cards=definition.subjects.map(id=>cardById.get(id));
  }else{
    const categories=role==='verb'?definition.verbCategories:definition.objectCategories;
    cards=context.items.filter(item=>categories.includes(item.category)).map(item=>cardById.get(item.cardId||item.id));
    if(role==='object'&&!includeHidden)cards=cards.filter(card=>card&&!talkHiddenCategories.has(card.category));
  }
  return cards.filter(card=>{
    if(!card||seen.has(card.id))return false;
    if(role==='verb'&&definition.verbIds&&!definition.verbIds.includes(card.id))return false;
    if(role==='object'&&definition.quantities&&card.displayGroup==='category')return false;
    seen.add(card.id);
    return true;
  });
}
function talkObjectCategories(){
  const available=new Set(talkChoiceItems('object',true).map(card=>card.category));
  return definition.objectCategories.filter(category=>available.has(category));
}
function renderTalkChoiceControls(){
  document.querySelectorAll('[data-talk-role]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.talkRole===talkChoiceRole)));
  const target=document.getElementById('talkCategoryFilters');
  if(talkChoiceRole!=='object'){
    target.innerHTML='';
    return;
  }
  target.innerHTML=talkObjectCategories().map(category=>{
    const visible=!talkHiddenCategories.has(category);
    return '<button class="talk-category-filter role-object '+(visible?'':'excluded')+'" type="button" data-talk-category="'+escapeHtml(category)+'" aria-pressed="'+String(visible)+'">'+escapeHtml(categoryLabel(category))+'</button>';
  }).join('');
  if(definition.quantities){
    target.insertAdjacentHTML('beforeend',[['Count','数'],['Color','色']].map(([key,label])=>'<label class="talk-category-filter talk-group-capsule role-adjective"><input type="checkbox" data-talk-group="'+key+'" '+(talkHiddenCategories.has(key)?'':'checked')+'>'+label+'</label>').join(''));
    target.querySelectorAll('[data-talk-group]').forEach(input=>input.addEventListener('change',()=>{if(input.checked)talkHiddenCategories.delete(input.dataset.talkGroup);else talkHiddenCategories.add(input.dataset.talkGroup);renderTalkChoices();}));
  }
  target.querySelectorAll('[data-talk-category]').forEach(button=>button.addEventListener('click',()=>{
    const category=button.dataset.talkCategory;
    if(talkHiddenCategories.has(category))talkHiddenCategories.delete(category);else talkHiddenCategories.add(category);
    const choices=talkChoiceItems('object',false);
    if(!definition.quantities&&choices.length&&!choices.some(card=>card.id===talkSelected[talkChoiceTarget]))talkSelected[talkChoiceTarget]=choices[0].id;
    renderTalkChoiceControls();
    renderTalkStage();
    renderTalkChoices();
  }));
}
function renderTalkChoices(){
  const target=document.getElementById('talkChoices');
  const choices=talkChoiceItems(talkChoiceRole,false);
  let extra='';
  if(definition.quantities&&talkChoiceRole==='object'){
    const choice=(attribute,value,label,card,active)=>'<button class="talk-choice talk-quick-choice role-adjective '+(active?'active':'')+'" type="button" '+attribute+'="'+escapeHtml(value)+'" aria-pressed="'+active+'"><span class="talk-choice-picture">'+(card?'<img src="'+escapeHtml(context.source(card))+'" alt="">':'<span class="talk-clear-color">―</span>')+'</span><span class="talk-choice-word">'+escapeHtml(label)+'</span></button>';
    if(!talkHiddenCategories.has('Count'))extra+=Array.from({length:5},(_,i)=>choice('data-talk-count',String(i+1),String(i+1),cardById.get('number_'+String(i+1).padStart(3,'0')),(talkSelected[talkChoiceTarget+'Count']||1)===i+1)).join('');
    if(!talkHiddenCategories.has('Color')){
      const color=talkSelected[talkChoiceTarget+'Color']||'';
      extra+=choice('data-talk-color','','色なし',null,color==='');
      extra+=context.cards.filter(c=>c.category==='colors'&&c.displayGroup!=='category').map(c=>choice('data-talk-color',c.english,c.english,c,color===c.english)).join('');
    }
  }
  if(!choices.length&&!extra){
    target.innerHTML='<div class="talk-no-choices">表示できるカードがありません。Unit画面に戻って、使う単語を選んでください。</div>';
    return;
  }
  target.innerHTML=extra+choices.map(card=>{
    const id=card.id;
    const active=id===talkSelected[talkChoiceTarget];
    return '<button class="talk-choice role-'+escapeHtml(talkChoiceRole)+' '+(active?'active':'')+'" type="button" data-talk-choice="'+escapeHtml(id)+'" aria-pressed="'+String(active)+'"><span class="talk-choice-picture"><img src="'+escapeHtml(context.source(card))+'" alt=""></span><span class="talk-choice-word'+talkWordSizeClass(card.english)+'">'+escapeHtml(card.english)+'</span></button>';
  }).join('');
  target.querySelectorAll('[data-talk-count],[data-talk-color]').forEach(button=>button.addEventListener('click',()=>{
    if(button.hasAttribute('data-talk-count'))talkSelected[talkChoiceTarget+'Count']=Number(button.dataset.talkCount);
    else talkSelected[talkChoiceTarget+'Color']=button.dataset.talkColor;
    renderTalkStage();renderTalkChoices();
  }));
  target.querySelectorAll('[data-talk-choice]').forEach(button=>button.addEventListener('click',()=>{
    talkSelected[talkChoiceTarget]=button.dataset.talkChoice;
    renderTalkStage();
    renderTalkChoices();
  }));
  fitTalkWordLabels(target);
}
function talkExpansionToken(part){
  const normalized=String(part||'').toLowerCase();
  if(normalized==='do')return talkToken('do','verb','','〇','do');
  if(normalized==='not')return talkToken('not','negative','','×','not');
  return talkToken(part,'neutral','','•',part);
}
function talkCardElement(token){
  const template=document.createElement('template');
  template.innerHTML=talkCardMarkup(token).trim();
  return template.content.firstElementChild;
}
function showTalkContractionParts(card,onRestore){
  const slot=card.closest('[data-talk-token-slot]');
  const parts=String(card.dataset.talkExpansion||'').split('|').filter(Boolean);
  if(!slot||!parts.length||slot.dataset.expanding==='true')return;
  slot.dataset.expanding='true';
  slot.classList.add('show-contraction-parts');
  const partCards=parts.map(part=>talkCardElement(talkExpansionToken(part)));
  slot.replaceChildren(...partCards);
  fitTalkWordLabels(slot);
  partCards.forEach(partCard=>partCard.addEventListener('click',()=>{
    if(talkSoundEnabled)speakText(partCard.dataset.talkSpeech,partCard,talkSpeechRate);
  }));
  schedule(()=>{
    slot.replaceChildren(card);
    slot.classList.remove('show-contraction-parts');
    delete slot.dataset.expanding;
    fitTalkWordLabels(slot);
    onRestore?.();
  },3000);
}
function bindTalkStageEvents(stage){
  stage.querySelectorAll('[data-talk-sentence]').forEach(button=>button.addEventListener('click',()=>{
    if(!talkSoundEnabled)return;
    let parts=[];
    try{parts=JSON.parse(button.dataset.talkParts||'[]');}catch{}
    speakTalkSentence(button.dataset.talkSentence,parts,button);
  }));
  stage.querySelectorAll('[data-talk-speech]').forEach(card=>{
    let timer=null;
    let longPressed=false;
    const showExpansion=()=>{
      if(!card.dataset.talkExpansion)return;
      longPressed=true;
      showTalkContractionParts(card,()=>{longPressed=false;});
    };
    const start=()=>{
      if(!card.dataset.talkExpansion)return;
      clearTimeout(timer);
      timer=schedule(showExpansion,550);
    };
    const finish=()=>{
      clearTimeout(timer);
    };
    card.addEventListener('pointerdown',start);
    card.addEventListener('pointerup',finish);
    card.addEventListener('pointercancel',finish);
    card.addEventListener('pointerleave',()=>{if(!longPressed)clearTimeout(timer)});
    card.addEventListener('contextmenu',event=>{if(card.dataset.talkExpansion){event.preventDefault();showExpansion();finish();}});
    card.addEventListener('click',event=>{
      if(longPressed){longPressed=false;event.preventDefault();return;}
      if(card.dataset.talkSelectionKey){
        talkChoiceTarget=card.dataset.talkSelectionKey;
        talkChoiceRole=card.dataset.talkSelectionRole||talkChoiceRole;
        if(definition.quantities&&/^(object|negativeObject)(Count|Color)$/.test(talkChoiceTarget)){
          talkHiddenCategories.delete(talkChoiceTarget.endsWith('Count')?'Count':'Color');
          talkChoiceTarget=talkChoiceTarget.replace(/(Count|Color)$/,'');talkChoiceRole='object';
        }
        renderTalkChoiceControls();
        renderTalkChoices();
      }
      if(talkSoundEnabled)speakText(card.dataset.talkSpeech,card,talkSpeechRate);
    });
  });
}
function renderTalkStage(){
  stopTalkSpeechSequence();
  const stage=document.getElementById('talkStage');
  stage.innerHTML=definition.render({cards:cardById,selected:talkSelected,activity:talkActivity,token:talkToken,row:talkRowMarkup});
  bindTalkStageEvents(stage);
  fitTalkWordLabels(stage);
}
function updateTalkSoundButton(){
  const button=document.getElementById('talkSoundToggle');
  button.setAttribute('aria-pressed',String(talkSoundEnabled));
  button.setAttribute('aria-label',talkSoundEnabled?'カードの音声を切る':'カードの音声を入れる');
  button.title=talkSoundEnabled?'音声ON':'音声OFF';
}
function updateTalkClarityButton(){
  const button=document.getElementById('talkClarityToggle');
  button.setAttribute('aria-pressed',String(talkClearSpeech));
  button.setAttribute('aria-label',talkClearSpeech?'1枚ずつ読むのを切る':'1枚ずつ区切って読む');
  button.title=talkClearSpeech?'1枚ずつ読む：ON':'1枚ずつ読む：OFF';
}

function stopTalkSpeechSequence(){
  talkSpeechSequenceId+=1;
  clearTimeout(talkSpeechPauseTimer);
  talkSpeechPauseTimer=null;
  window.speechSynthesis?.cancel();
  document.querySelectorAll('#talkStage .talk-card.speaking').forEach(card=>card.classList.remove('speaking'));
  speakingElement?.classList.remove('speaking');
  speakingElement=null;
}
function createSpeechUtterance(text,rate){
  const utterance=new SpeechSynthesisUtterance(text);
  utterance.lang='en-US';
  utterance.rate=Number.isFinite(rate)?rate:.86;
  const voices=window.speechSynthesis.getVoices();
  utterance.voice=voices.find(voice=>voice.lang==='en-US'&&voice.localService&&!/natural|online/i.test(voice.name))||voices.find(voice=>voice.lang==='en-US'&&voice.localService)||voices.find(voice=>voice.lang==='en-US')||voices.find(voice=>voice.lang?.startsWith('en')&&voice.localService)||voices.find(voice=>voice.lang?.startsWith('en'))||null;
  return utterance;
}
function speakText(text,element,rate){
  if(!text||!('speechSynthesis' in window)||!('SpeechSynthesisUtterance' in window))return;
  stopTalkSpeechSequence();
  const playbackId=talkSpeechSequenceId;
  const utterance=createSpeechUtterance(text,rate);
  speakingElement=element||null;
  speakingElement?.classList.add('speaking');
  utterance.onend=utterance.onerror=()=>{
    if(playbackId!==talkSpeechSequenceId)return;
    speakingElement?.classList.remove('speaking');
    speakingElement=null;
  };
  window.speechSynthesis.speak(utterance);
}
function speakTalkSentence(text,parts,element){
  if(!talkClearSpeech){
    speakText(text,element,talkSpeechRate);
    return;
  }
  if(!text||!('speechSynthesis' in window)||!('SpeechSynthesisUtterance' in window))return;
  const spokenParts=(Array.isArray(parts)&&parts.length?parts:[text]).map(part=>String(part||'').trim()).filter(Boolean);
  if(!spokenParts.length)return;
  const punctuation=String(text).trim().match(/[?!.]$/)?.[0]||'';
  if(punctuation)spokenParts[spokenParts.length-1]+=punctuation;
  stopTalkSpeechSequence();
  const sequenceId=talkSpeechSequenceId;
  const row=element?.closest('.talk-sentence-row');
  const slots=[...(row?.querySelectorAll('[data-talk-token-slot]')||[])];
  const clearHighlights=()=>slots.forEach(slot=>slot.querySelectorAll('.talk-card.speaking').forEach(card=>card.classList.remove('speaking')));
  const highlightSlot=index=>slots[index]?.querySelectorAll('.talk-card').forEach(card=>card.classList.add('speaking'));
  speakingElement=element||null;
  speakingElement?.classList.add('speaking');
  const finish=()=>{
    clearHighlights();
    if(sequenceId!==talkSpeechSequenceId)return;
    speakingElement?.classList.remove('speaking');
    speakingElement=null;
  };
  const speakPart=index=>{
    if(sequenceId!==talkSpeechSequenceId)return;
    if(index>=spokenParts.length){finish();return;}
    clearHighlights();
    highlightSlot(index);
    const utterance=createSpeechUtterance(spokenParts[index],talkSpeechRate);
    utterance.onend=()=>{
      clearHighlights();
      if(sequenceId!==talkSpeechSequenceId)return;
      talkSpeechPauseTimer=setTimeout(()=>speakPart(index+1),360);
    };
    utterance.onerror=finish;
    window.speechSynthesis.speak(utterance);
  };
  speakPart(0);
}
function openForCards(activity,ids,onPresetBack){
 const objects=ids.map(id=>cardById.get(id)).filter(Boolean);
 context={...context,onPresetBack,items:[...context.items.filter(c=>!definition.objectCategories.includes(c.category)),...objects]};
 open(activity);
 document.getElementById('unit-content')?.closest('.workspace')?.classList.add('preset-sentence-workspace');
}
return {markup,attach,settings,stop,openForCards};
})();
