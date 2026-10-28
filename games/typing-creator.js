(()=>{
'use strict';
const $=id=>document.getElementById(id),C=TypingCore,S=TypingStore.create(localStorage),esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const data=window.GAMES_DATA,completed=new Set(data.completedPictureCardIds||[]),cards=data.cards.filter(c=>completed.has(c.id)&&c.image&&['standard','plus','lets-try'].includes(c.displayGroup));
let entries=[],editing='',chosen=new Set(),dirty=false;
const status=text=>$('status').textContent=text;
function changed(){dirty=true;$('share-panel').hidden=true;}
function renderEntries(){
 $('entry-heading').textContent='問題一覧（'+entries.length+'問）';
 $('entries').innerHTML=entries.map((e,i)=>'<div class="entry"><span>'+(i+1)+'</span><input data-index="'+i+'" data-field="japanese" aria-label="'+(i+1)+'問目の日本語" value="'+esc(e.japanese)+'"><input data-index="'+i+'" data-field="english" lang="en" spellcheck="false" aria-label="'+(i+1)+'問目の英語" value="'+esc(e.english)+'"><button type="button" data-remove="'+i+'">外す</button></div>').join('');
}
function renderWords(){
 const category=$('category').value,query=$('search').value.toLowerCase().trim();
 const selected=cards.filter(c=>(!category||c.category===category)&&(!query||(c.english+' '+c.japanese).toLowerCase().includes(query)));
 $('vocabulary').innerHTML=selected.map(c=>'<label><input type="checkbox" data-word="'+esc(c.id)+'"'+(chosen.has(c.id)?' checked':'')+'><span>'+esc(c.english)+'<small> / '+esc(c.japanese||'')+'</small></span></label>').join('');
}
function payload(){
 return C.preset({version:1,type:'english-typing',id:editing||C.newId(),title:$('title').value,instructions:$('instructions').value,entries,assignedUnits:[...document.querySelectorAll('[data-unit]:checked')].map(x=>x.dataset.unit)});
}
function urlFor(value){const url=new URL('typing.html',location.href);url.hash='d='+ShareCodec.encodeJson(C.activity(value));return url.href;}
function showShare(value){$('share-url').value=urlFor(value);$('open-player').href=$('share-url').value;$('share-panel').hidden=false;}
function library(){
 try{
  $('library').innerHTML=S.list().map(p=>'<article class="library-item"><h3>'+esc(p.title)+'</h3><small>'+p.entries.length+'問 / '+(p.assignedUnits.map(x=>(x.startsWith('nh5')?'５年':'６年')+' Unit '+x.split(':')[1]).join('・')||'Unit未指定')+'</small><div class="actions"><button type="button" data-edit="'+esc(p.id)+'">編集</button><button type="button" data-share="'+esc(p.id)+'">配布</button><button type="button" data-delete="'+esc(p.id)+'">削除</button></div></article>').join('')||'<p class="help">保存した教材がここに表示されます。</p>';
 }catch(error){status(error.message);}
}
function load(p){
 editing=p.id;entries=p.entries.map(e=>({...e}));$('title').value=p.title;$('instructions').value=p.instructions;
 document.querySelectorAll('[data-unit]').forEach(input=>input.checked=p.assignedUnits.includes(input.dataset.unit));
 renderEntries();$('share-panel').hidden=true;dirty=false;status('教材を読み込みました。');
}
function add(newEntries){
 if(entries.length+newEntries.length>100)throw Error('問題は100問以内にしてください。');
 entries.push(...newEntries);changed();renderEntries();status(newEntries.length+'問を追加しました。保存前に内容を確認してください。');
}
$('category').innerHTML='<option value="">すべてのカテゴリ</option>'+Object.entries(data.categoryLabels).filter(([id])=>cards.some(c=>c.category===id)).map(([id,label])=>'<option value="'+esc(id)+'">'+esc(label)+'</option>').join('');
$('units').innerHTML=['nh5','nh6'].flatMap(book=>Array.from({length:8},(_,i)=>'<label><input type="checkbox" data-unit="'+book+':'+(i+1)+'">'+(book==='nh5'?'５年生':'６年生')+' Unit '+(i+1)+'</label>')).join('');
$('category').onchange=$('search').oninput=renderWords;
$('vocabulary').onchange=event=>{const id=event.target.dataset.word;if(id)event.target.checked?chosen.add(id):chosen.delete(id);};
$('clear-selected').onclick=()=>{chosen.clear();renderWords();};
$('add-selected').onclick=()=>{try{if(!chosen.size)throw Error('単語を選んでください。');add(cards.filter(c=>chosen.has(c.id)).map(c=>C.entry({cardId:c.id,japanese:c.japanese||'',english:c.english})));chosen.clear();renderWords();}catch(error){status(error.message);}};
$('add-paste').onclick=()=>{try{add(C.parsePaste($('paste').value));$('paste').value='';}catch(error){status(error.message);}};
$('entries').oninput=event=>{if(event.target.dataset.field){entries[Number(event.target.dataset.index)][event.target.dataset.field]=event.target.value;changed();}};
$('entries').onclick=event=>{const button=event.target.closest('[data-remove]');if(button){entries.splice(Number(button.dataset.remove),1);changed();renderEntries();}};
for(const id of ['title','instructions','units'])$(id).addEventListener('input',changed);
$('save').onclick=()=>{try{const saved=S.save(payload());editing=saved.id;entries=saved.entries.map(e=>({...e}));dirty=false;renderEntries();library();showShare(saved);status('保存しました。選んだUnitのActivitiesに表示されます。児童へはURLを配布してください。');}catch(error){status(error.message);}};
$('preview').onclick=()=>{try{const url=urlFor(payload()),link=document.createElement('a');link.href=url;link.target='_blank';link.rel='noopener';document.body.append(link);link.click();link.remove();status('児童画面を開きました。教材は「教材を保存」で保存できます。');}catch(error){status(error.message);}};
$('new').onclick=()=>{if(dirty&&!confirm('未保存の編集を終えて、新しい教材を作りますか？'))return;editing='';entries=[];$('title').value='英語タイピング';$('instructions').value='';document.querySelectorAll('[data-unit]').forEach(x=>x.checked=false);$('share-panel').hidden=true;renderEntries();dirty=false;status('新しい教材を作成します。');};
$('library').onclick=event=>{
 const button=event.target.closest('button');if(!button)return;
 try{
  const id=button.dataset.edit||button.dataset.share||button.dataset.delete,p=S.list().find(x=>x.id===id);if(!p)throw Error('教材が見つかりません。');
  if(button.dataset.edit){if(dirty&&!confirm('未保存の編集を終えて、この教材を開きますか？'))return;load(p);}
  if(button.dataset.share){showShare(p);status('保存済みの教材の児童用URLです。');}
  if(button.dataset.delete&&confirm('「'+p.title+'」を保存一覧とUnitから削除しますか？')){S.remove(id);if(editing===id){editing='';dirty=true;}$('share-panel').hidden=true;library();status('保存一覧とUnitから削除しました。すでに配布したURLはそのまま使えます。');}
 }catch(error){status(error.message);}
};
$('copy-url').onclick=async()=>{try{await navigator.clipboard.writeText($('share-url').value);status('児童用URLをコピーしました。');}catch{$('share-url').focus();$('share-url').select();status('URLを選択しました。手動でコピーしてください。');}};
const requested=new URLSearchParams(location.search).get('edit');
renderWords();renderEntries();library();
if(requested){try{const p=S.list().find(x=>x.id===requested);if(!p)throw Error('指定した教材が見つかりません。同じブラウザで開いてください。');load(p);}catch(error){status(error.message);}}
})();

