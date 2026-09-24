window.InterviewLinks=(()=>{
 'use strict';
 const base=new URL('.',document.currentScript.src),M=window.InterviewModel;
 let error='';
 function get(id,source){M.check(source==='local'||source==='published','保存先の指定が不正です');const rows=source==='local'?InterviewStore.create(localStorage).listPresets():(window.INTERVIEW_CATALOG||[]);const p=rows.find(p=>p.id===id);M.check(p,'プリセットが見つかりません。同じブラウザで保存したものか確認してください。');return M.validatePreset(p);}
 function assigned(bookId,unit){error='';let local=[];try{local=InterviewStore.create(localStorage).listPresets();}catch(e){error=e.message;}
 const results=[];for(const [source,rows] of [['published',window.INTERVIEW_CATALOG||[]],['local',local]])for(const value of rows){try{const p=M.validatePreset(value);if(!p.assignedUnits.some(u=>u.bookId===bookId&&u.unit===Number(unit)))continue;const url=new URL('interview.html',base);url.search=new URLSearchParams({preset:p.id,source,book:bookId,unit:String(unit)}).toString();results.push({id:p.id,title:p.title,question:M.sentenceTemplates(p.question.template).join(' / '),description:p.description,href:url.href,source});}catch(e){error=e.message;}}return results;
 }
 const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function tiles(book,unit){const rows=assigned(book,unit);return rows.map(p=>p.source==='published'&&window.InterviewPresetTile?InterviewPresetTile.render(p):`${p.source==='local'?`<article class="personal-interview-tile" data-personal-interview="${esc(p.id)}">`:''}<a class="feature-tile activity interview-activity-tile" href="${esc(p.href)}"><strong>${esc(p.title)}</strong><p class="interview-tile-question">${esc(p.question)}</p><p class="interview-tile-description">${esc(p.description)}</p></a>${p.source==='local'?`<button type="button" class="personal-interview-delete" data-interview-delete="${esc(p.id)}">削除</button></article>`:''}`).join('')+(error?`<p role="status">Interview: ${esc(error)}</p>`:'');}
 document.addEventListener('click',event=>{
  const button=event.target.closest('[data-interview-delete]');if(!button)return;
  if(!confirm('この個人保存のInterviewを削除しますか？すべてのUnitと作成画面の一覧から削除されます。公式プリセットは残ります。'))return;
  try{InterviewStore.create(localStorage).deletePreset(button.dataset.interviewDelete);
   document.querySelectorAll('[data-personal-interview]').forEach(e=>{if(e.dataset.personalInterview===button.dataset.interviewDelete)e.remove();});
  }catch(e){alert(e.message);}
 });
 return {get,assigned,tiles};
})();
