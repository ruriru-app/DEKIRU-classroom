/* Public presets never enter personal storage. Personal tiles keep their delete action. */
(()=>{
 'use strict';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const store=()=>window.InterviewBingoStore.create(localStorage,{validCardIds:null});
 function officialTile(p,bookId,unit){return `<article class="official-bingo-tile" data-official-bingo="${esc(p.id)}"><div class="official-bingo-top"><span>公式プリセット</span><strong>INTERVIEW BINGO</strong></div><h3>${esc(p.title)}</h3><p class="official-bingo-expression">${esc(p.expressions.template)}</p><p class="official-bingo-words">文房具 · ${p.cardIds.length}語</p><a class="official-bingo-start" href="${esc(window.InterviewBingoRoutes.prepareHref(p.id,bookId,Number(unit),'published'))}">教師用の準備へ <span aria-hidden="true">→</span></a><small>マス数の設定・児童画面の試用・配布用カードの印刷</small></article>`;}
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
