/* Public presets never enter personal storage. Personal tiles keep their delete action. */
(()=>{
 'use strict';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const artwork=new URL('assets/ui/interview-bingo-preset.svg',document.currentScript?.src||location.href).href;
 const store=()=>window.InterviewBingoStore.create(localStorage,{validCardIds:null});
 function officialTile(p,bookId,unit){
  const data=window.DEKIRU_DATA||window.GAMES_DATA||{},cards=new Map((data.cards||[]).map(card=>[card.id,card]));
  const categories=[...new Set(p.cardIds.map(id=>cards.get(id)?.category).filter(Boolean))];
  const words=categories.map(category=>data.categoryLabels?.[category]||category).join('・')||'単語';
  const practice=JSON.stringify({ids:p.cardIds,preference:false});
  const href=window.InterviewBingoRoutes.prepareHref(p.id,bookId,Number(unit),'published');
  return `<article class="official-bingo-tile" data-official-bingo="${esc(p.id)}" aria-label="${esc(p.title)}">
   <img src="${esc(artwork)}" alt="" draggable="false">
   <button type="button" class="official-bingo-expression" data-interview-sentence="question" data-interview-cards="${esc(JSON.stringify(p.cardIds))}" data-preset-practice-key="${esc(p.id)}" aria-label="${esc(p.expressions.template)}：この表現で文で話そう" title="この表現で文で話そう">${esc(p.expressions.template)}</button>
   <button type="button" class="official-bingo-words" data-interview-practice="${esc(practice)}" aria-label="${esc(words)}の発音練習" title="${esc(words)}の発音練習">${esc(words)}</button>
   <a class="official-bingo-play" data-bingo-tile-play href="${esc(href)}" aria-label="Play：Interview Bingoの準備" title="Interview Bingoの準備へ"></a>
   <a class="official-bingo-share" data-bingo-tile-share href="${esc(href)}#bingoDistribution" aria-label="シートを配る" title="シートを配る"></a>
  </article>`;
 }
 function tiles(bookId,unit){
  const assigned=p=>p.assignedUnits.some(u=>u.bookId===bookId&&u.unit===Number(unit));let output='';
  for(const value of window.INTERVIEW_BINGO_CATALOG||[]){try{const p=window.InterviewBingoModel.validatePreset(value,null);if(assigned(p))output+=officialTile(p,bookId,unit);}catch(e){output+=`<p role="status">公式Bingo: ${esc(e.message)}</p>`;}}
  try{output+=store().listPresets().filter(assigned).map(p=>`<article class="personal-interview-tile" data-personal-bingo="${esc(p.id)}"><a class="feature-tile activity interview-activity-tile" href="${esc(window.InterviewBingoRoutes.prepareHref(p.id,bookId,Number(unit)))}"><strong>${esc(p.title)}</strong><p>INTERVIEW BINGO</p><p class="interview-tile-question">${esc(p.expressions.template)}</p><p class="interview-tile-description">候補${p.cardIds.length}語・教師用の準備へ</p></a><button type="button" class="personal-interview-delete" data-delete-bingo="${esc(p.id)}">削除</button></article>`).join('');}
  catch(e){output+=`<p role="status">${esc(e.message)}</p>`;}return output;
 }
 document.addEventListener('click',event=>{
  const button=event.target.closest('[data-delete-bingo]');if(!button)return;
  if(!confirm('この個人保存のInterview Bingoを削除しますか？Gamesと、割り当てたすべてのUnitから削除されます。'))return;
  try{store().deletePreset(button.dataset.deleteBingo);document.querySelectorAll('[data-personal-bingo]').forEach(e=>{if(e.dataset.personalBingo===button.dataset.deleteBingo)e.remove();});}catch(e){alert(e.message);}
 });
 window.InterviewBingoLinks={tiles};
})();
