window.RoulettePresetTile=(()=>{
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function render(game){
    const expressions=game.expressions.length?game.expressions:['英語表現は未設定です'];
    const groups=game.groups||[];
    return `<article class="roulette-preset-tile" aria-label="${esc(game.name)}">
      <img class="roulette-preset-art" src="assets/ui/roulette-preset-base.svg" alt="" draggable="false">
      ${game.practice?.ids?.length?`<button type="button" class="roulette-preset-practice" data-roulette-practice="${esc(JSON.stringify(game.practice))}" aria-label="発音練習" aria-haspopup="dialog"><span aria-hidden="true">🔊</span> 発音練習</button>`:''}
      <div class="roulette-preset-expression${expressions.join(' ').length>45?' long':''}" tabindex="0">${expressions.map(s=>`<p>${esc(s)}</p>`).join('')}</div>
      <button type="button" class="roulette-preset-words" data-roulette-words="${esc(JSON.stringify(groups))}" aria-label="WORDS：${esc(groups.map(g=>g.category).join('・'))}の使用単語を見る" aria-haspopup="dialog"><span>${esc(groups.map(g=>g.category).join('・')||'カテゴリー未設定')}</span></button>
      <a class="roulette-preset-play" href="${esc(game.url)}" target="_blank" rel="noopener" aria-label="Play"></a>
      <button type="button" class="roulette-preset-share" data-game-share="${esc(game.url)}" data-game-name="${esc(game.name)}" aria-label="ゲームを配る"></button>
    </article>`;
  }
  document.addEventListener('click',event=>{
    const practice=event.target.closest('[data-roulette-practice]');
    if(practice){openPractice(practice);return;}
    const trigger=event.target.closest('[data-roulette-words]');if(!trigger)return;
    const dialog=document.createElement('dialog');dialog.className='roulette-words-dialog';dialog.setAttribute('aria-label','今回使う単語');
    const groups=JSON.parse(trigger.dataset.rouletteWords);
    dialog.innerHTML='<header><h2>今回使う単語</h2><button type="button" autofocus>閉じる</button></header>'+groups.map(g=>`<section><h3>${esc(g.category)} <small>${g.words.length}語</small></h3><ul>${g.words.map(w=>`<li>${esc(w)}</li>`).join('')}</ul></section>`).join('');
    dialog.querySelector('button').onclick=()=>dialog.close();
    dialog.addEventListener('close',()=>{dialog.remove();if(trigger.isConnected)trigger.focus();});
    dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
    document.body.append(dialog);dialog.showModal();
  });
  function openPractice(trigger){
    const settings=JSON.parse(trigger.dataset.roulettePractice),byId=new Map(window.DEKIRU_DATA.cards.map(c=>[c.id,c]));
    const cards=[...new Set(settings.ids)].map(id=>byId.get(id)).filter(Boolean);
    const dialog=document.createElement('dialog');dialog.className='roulette-words-dialog roulette-practice-dialog';dialog.setAttribute('aria-label','発音練習');
    dialog.innerHTML='<header><h2>発音練習</h2><button type="button" autofocus>閉じる</button></header><p>カードをタップして発音を聞こう（'+cards.length+'語）</p><div class="roulette-practice-cards"></div><p class="roulette-practice-status" role="status"></p>';
    for(const card of cards){
      const form=settings.preference?window.SentenceForms.preference(card):card;
      const button=document.createElement('button');button.type='button';button.dataset.practiceCard=card.id;button.setAttribute('aria-label',form.english);
      const src=window.CardSet.source(card);
      if(src){const img=document.createElement('img');img.src=src;img.alt='';img.onerror=()=>{img.hidden=true;};button.append(img);}
      const label=document.createElement('span');label.textContent=form.english;button.append(label);
      button.onclick=()=>{
        if(!window.speechSynthesis||!window.SpeechSynthesisUtterance){dialog.querySelector('[role="status"]').textContent='このブラウザでは読み上げが利用できません。';return;}
        speakText(form.speech||form.english,button);
      };
      dialog.querySelector('.roulette-practice-cards').append(button);
    }
    dialog.querySelector('header button').onclick=()=>dialog.close();
    dialog.addEventListener('close',()=>{stopTalkSpeechSequence();dialog.remove();if(trigger.isConnected)trigger.focus();});
    document.body.append(dialog);dialog.showModal();
  }
  return {render};
})();
