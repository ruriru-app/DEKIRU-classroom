window.RoulettePresetTile=(()=>{
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function render(game){
    const expressions=game.expressions.length?game.expressions:['英語表現は未設定です'];
    const groups=game.groups||[];
    return `<article class="roulette-preset-tile" aria-label="${esc(game.name)}">
      <img class="roulette-preset-art" src="assets/ui/roulette-preset-base.svg" alt="" draggable="false">
      <div class="roulette-preset-expression${expressions.join(' ').length>45?' long':''}" tabindex="0">${expressions.map(s=>`<p>${esc(s)}</p>`).join('')}</div>
      <button type="button" class="roulette-preset-words" data-roulette-words="${esc(JSON.stringify(groups))}" aria-label="WORDS：${esc(groups.map(g=>g.category).join('・'))}の使用単語を見る" aria-haspopup="dialog"><span>${esc(groups.map(g=>g.category).join('・')||'カテゴリー未設定')}</span></button>
      <a class="roulette-preset-play" href="${esc(game.url)}" target="_blank" rel="noopener" aria-label="Play"></a>
      <button type="button" class="roulette-preset-share" data-game-share="${esc(game.url)}" data-game-name="${esc(game.name)}" aria-label="ゲームを配る"></button>
    </article>`;
  }
  document.addEventListener('click',event=>{
    const trigger=event.target.closest('[data-roulette-words]');if(!trigger)return;
    const dialog=document.createElement('dialog');dialog.className='roulette-words-dialog';dialog.setAttribute('aria-label','今回使う単語');
    const groups=JSON.parse(trigger.dataset.rouletteWords);
    dialog.innerHTML='<header><h2>今回使う単語</h2><button type="button" autofocus>閉じる</button></header>'+groups.map(g=>`<section><h3>${esc(g.category)} <small>${g.words.length}語</small></h3><ul>${g.words.map(w=>`<li>${esc(w)}</li>`).join('')}</ul></section>`).join('');
    dialog.querySelector('button').onclick=()=>dialog.close();
    dialog.addEventListener('close',()=>{dialog.remove();if(trigger.isConnected)trigger.focus();});
    dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
    document.body.append(dialog);dialog.showModal();
  });
  return {render};
})();
