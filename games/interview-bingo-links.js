/* Personal Bingo tiles only; official catalog and Interview data stay separate. */
(()=>{
 'use strict';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const store=()=>window.InterviewBingoStore.create(localStorage,{validCardIds:null});
 function tiles(bookId,unit){
  try{return store().listPresets().filter(p=>p.assignedUnits.some(u=>u.bookId===bookId&&u.unit===Number(unit))).map(p=>`<article class="personal-interview-tile" data-personal-bingo="${esc(p.id)}"><a class="feature-tile activity interview-activity-tile" href="${esc(window.InterviewBingoRoutes.prepareHref(p.id,bookId,Number(unit)))}"><strong>${esc(p.title)}</strong><p>INTERVIEW BINGO</p><p class="interview-tile-question">${esc(p.expressions.template)}</p><p class="interview-tile-description">候補${p.cardIds.length}語・教師用の準備へ</p></a><button type="button" class="personal-interview-delete" data-delete-bingo="${esc(p.id)}">削除</button></article>`).join('');}
  catch(e){return `<p role="status">${esc(e.message)}</p>`;}
 }
 document.addEventListener('click',event=>{
  const button=event.target.closest('[data-delete-bingo]');if(!button)return;
  if(!confirm('この個人保存のInterview Bingoを削除しますか？Gamesと、割り当てたすべてのUnitから削除されます。'))return;
  try{store().deletePreset(button.dataset.deleteBingo);document.querySelectorAll('[data-personal-bingo]').forEach(e=>{if(e.dataset.personalBingo===button.dataset.deleteBingo)e.remove();});}catch(e){alert(e.message);}
 });
 window.InterviewBingoLinks={tiles};
})();
