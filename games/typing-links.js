window.TypingActivities=(()=>{
'use strict';const base=new URL('.',document.currentScript.src),esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function tiles(book,unit){
 try{
  const rows=TypingStore.create(localStorage).list().filter(p=>p.assignedUnits.includes(book+':'+Number(unit)));
  return rows.map(p=>{
   const url=new URL('typing.html',base);url.hash='d='+ShareCodec.encodeJson(TypingCore.activity(p));
   const edit=new URL('typing-creator.html',base);edit.searchParams.set('edit',p.id);
   return '<article class="feature-tile"><strong>英語タイピング<br>'+esc(p.title)+'</strong><p>'+p.entries.length+'問・音声と綴りを確認しながら練習</p><div class="tile-actions"><a href="'+esc(url.href)+'" target="_blank" rel="noopener">ひらく</a><button type="button" data-typing-copy="'+esc(url.href)+'">児童用URLをコピー</button><a href="'+esc(edit.href)+'" target="_blank" rel="noopener">編集</a></div><p data-typing-status role="status" hidden></p><input data-typing-url readonly hidden aria-label="児童用URL"></article>';
  }).join('');
 }catch(error){return '<p role="status">英語タイピング：'+esc(error.message)+'</p>';}
}
document.addEventListener('click',async event=>{
 const button=event.target.closest('[data-typing-copy]');if(!button)return;
 const tile=button.closest('article'),status=tile.querySelector('[data-typing-status]'),field=tile.querySelector('[data-typing-url]');
 status.hidden=false;
 try{await navigator.clipboard.writeText(button.dataset.typingCopy);status.textContent='児童用URLをコピーしました。';}
 catch{field.value=button.dataset.typingCopy;field.hidden=false;field.focus();field.select();status.textContent='URLを選択しました。手動でコピーしてください。';}
});
return {tiles};
})();

