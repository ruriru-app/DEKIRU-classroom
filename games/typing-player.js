(()=>{
'use strict';const $=id=>document.getElementById(id),C=TypingCore;
let activity,queue=[],cursor=0,showModel=true,last=null,statuses=[],correct=false,soundEnabled=true;
const cards=new Map((window.GAMES_DATA?.cards||[]).map(c=>[c.id,c]));
const current=()=>activity.entries[queue[cursor]];
function model(){
 $('toggle-model').setAttribute('aria-pressed',String(showModel));$('toggle-model').textContent=showModel?'綴りを隠す':'綴りを見る';
 $('model').replaceChildren();$('model').classList.toggle('hidden-model',!showModel);
 if(!showModel){$('model').textContent='綴りを隠しています。音声を聞いて入力してみよう。';return;}
 if(!last){$('model').textContent=current().english;return;}
 const target=new Set(last.edits.filter(x=>x.kind==='replace'||x.kind==='missing').map(x=>x.index));
 // Extra typed letters have no target letter: mark the nearest boundary on the model.
 const boundaries=new Set(last.edits.filter(x=>x.kind==='extra').map(x=>x.index));
 Array.from(C.normalize(current().english)).forEach((char,index)=>{
  if(boundaries.has(index)){const mark=document.createElement('span');mark.className='boundary target';mark.textContent='▏';mark.setAttribute('aria-label','ここに余分な文字が入りました');$('model').append(mark);}
  const span=document.createElement('span');span.textContent=char===' '&&target.has(index)?'␣':char;if(target.has(index))span.className='target';$('model').append(span);
 });
 if(boundaries.has(Array.from(C.normalize(current().english)).length)){const mark=document.createElement('span');mark.className='boundary target';mark.textContent='▏';$('model').append(mark);}
}
function previous(){
 $('previous').replaceChildren();$('previous-attempt').hidden=!last;
 if(!last)return;
 last.edits.forEach(edit=>{
  const span=document.createElement('span');span.textContent=edit.kind==='missing'?'□':edit.actual===' '&&edit.kind!=='equal'?'␣':edit.actual;
  if(edit.kind!=='equal')span.className='error';
  $('previous').append(span);
 });
}
function load(){
 window.speechSynthesis?.cancel();last=null;correct=false;$('practice').hidden=false;$('complete').hidden=true;$('answer').value='';$('answer').disabled=false;$('check').disabled=false;$('next').hidden=true;$('skip').hidden=false;
 const item=current();$('japanese').textContent=item.japanese||'音声を聞いて英語を入力しよう。';$('progress').textContent=(cursor+1)+' / '+queue.length+'問';
 const card=cards.get(item.cardId),picture=$('picture');picture.hidden=true;picture.removeAttribute('src');picture.onerror=()=>picture.hidden=true;
 if(card?.image){const url=new URL(card.image,document.baseURI);if(url.origin===location.origin){picture.src=url.href;picture.hidden=false;}}
 $('feedback').classList.remove('success');$('feedback').textContent='音声や綴りを確認して、最後まで入力してから答え合わせをしよう。';model();previous();$('answer').focus();speak(.8);
}
function finish(){
 window.speechSynthesis?.cancel();$('practice').hidden=true;$('complete').hidden=false;
 const count=statuses.filter(x=>x==='correct').length,skipped=statuses.filter(x=>x!=='correct').length;
 $('result').textContent='正しく入力できた問題：'+count+' / '+activity.entries.length+'問'+(skipped?'　後回し：'+skipped+'問':'');
 $('retry-skipped').hidden=!skipped;$('progress').textContent='練習終了';
}
function next(skip=false){
 if(skip&&!correct)statuses[queue[cursor]]='skipped';
 if(cursor+1<queue.length){cursor++;load();}else finish();
}
function speak(rate){
 if(!soundEnabled||!activity||$('practice').hidden)return;
 if(!window.speechSynthesis||!window.SpeechSynthesisUtterance){$('feedback').textContent='このブラウザでは音声を再生できません。綴りを見ながら練習できます。';return;}
 speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(current().english);utterance.lang='en-US';utterance.rate=rate;
 utterance.onerror=event=>{if(!soundEnabled||['canceled','interrupted'].includes(event.error))return;$('feedback').textContent=event.error==='not-allowed'?'音声を始めるには「発音を聞く」を押してください。':'音声を再生できませんでした。「発音を聞く」をもう一度押してください。';};speechSynthesis.speak(utterance);
}
$('answer-form').onsubmit=event=>{
 event.preventDefault();if(correct)return;
 if(!C.normalize($('answer').value)){$('feedback').textContent='英語を入力してから答え合わせをしよう。';$('answer').focus();return;}
 try{
  last=C.compare(current().english,$('answer').value);
  if(last.correct){correct=true;statuses[queue[cursor]]='correct';last=null;previous();next();}
  else{previous();model();$('feedback').textContent='赤い部分を確認して、もう一度、全体を入力しよう。';$('feedback').classList.remove('success');$('answer').value='';$('answer').focus();}
 }catch(error){$('feedback').textContent=error.message;}
};
$('toggle-model').onclick=()=>{showModel=!showModel;model();$('answer').focus();};
$('listen').onclick=()=>speak(.8);$('listen-slow').onclick=()=>speak(.55);
$('sound-toggle').onclick=()=>{
 soundEnabled=!soundEnabled;
 $('sound-toggle').setAttribute('aria-pressed',String(soundEnabled));
 $('sound-toggle').setAttribute('aria-label',soundEnabled?'音声をオフにする':'音声をオンにする');
 $('sound-toggle').textContent=soundEnabled?'🔊 音声オン':'🔇 音声オフ';
 $('listen').disabled=$('listen-slow').disabled=!soundEnabled;
 if(soundEnabled)speak(.8);else window.speechSynthesis?.cancel();
};
$('next').onclick=()=>next();$('skip').onclick=()=>next(true);
$('restart').onclick=()=>{statuses=activity.entries.map(()=>null);queue=activity.entries.map((_,i)=>i);cursor=0;load();};
$('retry-skipped').onclick=()=>{queue=activity.entries.map((_,i)=>i).filter(i=>statuses[i]!=='correct');cursor=0;load();};
window.addEventListener('pagehide',()=>window.speechSynthesis?.cancel());
document.addEventListener('visibilitychange',()=>{if(document.hidden)window.speechSynthesis?.cancel();});
try{
 const token=new URLSearchParams(location.hash.slice(1)).get('d');if(!token)throw Error('教材のURLを確認してください。先生から配られたURLで開いてください。');
 activity=C.activity(ShareCodec.decodeJson(token));$('title').textContent=activity.title;$('instructions').textContent=activity.instructions;
 queue=activity.entries.map((_,i)=>i);statuses=activity.entries.map(()=>null);load();
}catch(error){$('practice').hidden=true;$('complete').hidden=true;$('fatal').textContent=error.message;}
})();

