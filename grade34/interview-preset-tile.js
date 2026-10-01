/* Official artwork only. Personal presets retain their normal tiles. */
window.InterviewPresetTile=(()=>{
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function render(p){
  const preset=window.InterviewLinks.get(p.id,'published');
  const practice=JSON.stringify({ids:preset.cardIds,preference:true});
  const data=window.DEKIRU_DATA,cards=new Map(data.cards.map(card=>[card.id,card]));
  const categories=[...new Set(preset.cardIds.map(id=>cards.get(id)?.category).filter(Boolean))];
  const labels=categories.map(category=>data.categoryLabels[category]||category),words=labels.join('・')||'単語';
  const activity=preset.question.template.trim()==='Do you like (P)?'?'question':'like_question';
  return `<article class="interview-preset-tile" aria-label="${esc(p.title)}">
   <img src="assets/ui/interview-preset-base.svg" alt="" draggable="false">
   <button type="button" class="interview-preset-expression" data-interview-sentence="${activity}" data-interview-cards="${esc(JSON.stringify(preset.cardIds))}" aria-label="この表現で文で話そう" title="タップして文で話そう">${preset.question.template.split('\n').map(s=>`<span>${esc(s)}</span>`).join('')}</button>
   <button type="button" class="interview-preset-words${categories.length>1?' interview-preset-words-multiple':''}" data-interview-practice="${esc(practice)}" aria-label="${esc(words)}の発音練習" title="タップして発音練習"><span>${labels.length?labels.map(esc).join('<br>'):esc(words)}</span></button>
   <a class="interview-preset-play" href="${esc(p.href)}" aria-label="Play：Interviewの準備" title="クラスを選んでInterviewを始める"></a>
   <a class="interview-preset-share" href="${esc(p.href)}#rosterSelect" aria-label="シートを配る" title="クラスを選んでシートを配る"></a>
  </article>`;
 }
 document.addEventListener('click',event=>{
  const trigger=event.target.closest('[data-interview-practice]');if(!trigger)return;
  const {ids}=JSON.parse(trigger.dataset.interviewPractice),cards=new Map(window.DEKIRU_DATA.cards.map(c=>[c.id,c]));
  const dialog=document.createElement('dialog');dialog.className='roulette-words-dialog roulette-practice-dialog';dialog.setAttribute('aria-label','発音練習');
  dialog.innerHTML='<header><h2>発音練習</h2><button type="button" autofocus>閉じる</button></header><p>カードをタップして発音を聞こう</p><div class="roulette-practice-cards"></div><p role="status"></p>';
  for(const id of ids){const card=cards.get(id);if(!card)continue;
   const button=document.createElement('button');button.type='button';button.dataset.practiceCard=id;button.setAttribute('aria-label',card.english);
   const img=document.createElement('img');img.src=CardSet.source(card);img.alt='';
   const label=document.createElement('span');label.textContent=card.english;button.append(img,label);
   button.onclick=()=>{if(!window.speechSynthesis||!window.SpeechSynthesisUtterance){dialog.querySelector('[role="status"]').textContent='このブラウザでは読み上げが利用できません。';return;}
    speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(card.speech||card.english);utterance.lang='en-US';utterance.rate=.55;speechSynthesis.speak(utterance);
   };dialog.querySelector('.roulette-practice-cards').append(button);
  }
  dialog.querySelector('header button').onclick=()=>dialog.close();
  const fullscreen=document.createElement('button');fullscreen.type='button';fullscreen.textContent='⛶';fullscreen.setAttribute('aria-label','全画面表示');
  fullscreen.onclick=async()=>{try{if(document.fullscreenElement===dialog)await document.exitFullscreen();else await dialog.requestFullscreen();}catch{dialog.classList.toggle('practice-expanded');}};
  dialog.querySelector('header').insertBefore(fullscreen,dialog.querySelector('header button'));
  dialog.addEventListener('close',()=>{window.speechSynthesis?.cancel();dialog.remove();if(trigger.isConnected)trigger.focus();});
  document.body.append(dialog);dialog.showModal();
 });
 return {render};
})();
