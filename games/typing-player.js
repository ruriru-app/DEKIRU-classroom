(()=>{
'use strict';const $=id=>document.getElementById(id),C=TypingCore;
let activity,queue=[],cursor=0,showModel=true,last=null,statuses=[],correct=false,soundEnabled=true;
let failed=[],started=0,elapsed=0,running=false,clock=null,wordByWord=false,speechRate=.55,speechLanguage='en-US',speechGeneration=0,speechPause=null;
let mode='easy',phase='setup',recordEligible=true,audioContext=null,tones=[];
const modeNames={easy:'Easy',normal:'Normal',hard:'Hard'};
const cards=new Map((window.GAMES_DATA?.cards||[]).map(c=>[c.id,c]));
const current=()=>activity.entries[queue[cursor]];
function tone(kind){
 if(!soundEnabled)return;
 try{
  const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
  audioContext=audioContext||new Audio();if(audioContext.state==='suspended')audioContext.resume().catch(()=>{});
  const notes=kind==='record'?[[523,0,.14],[659,.14,.14],[784,.28,.3],[1047,.58,.4]]:[[880,0,.13],[660,.14,.22]];
  tones=tones.filter(x=>!x.ended);
  notes.forEach(([frequency,delay,duration])=>{
   const osc=audioContext.createOscillator(),gain=audioContext.createGain(),t=audioContext.currentTime+delay;
   osc.frequency.value=frequency;gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(.12,t+.01);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
   osc.connect(gain);gain.connect(audioContext.destination);const item={osc,ended:false};tones.push(item);
   osc.onended=()=>{item.ended=true;osc.disconnect();gain.disconnect();};osc.start(t);osc.stop(t+duration+.03);
  });
 }catch{}
}
function recordData(){const signature=JSON.stringify(activity.entries.map(e=>[e.english,e.japanese]));let hash=2166136261;for(let i=0;i<signature.length;i++)hash=Math.imul(hash^signature.charCodeAt(i),16777619);return {signature,key:'dekiru-typing-best-v1:'+mode+':'+(hash>>>0).toString(16)};}
function readBest(){try{const {signature,key}=recordData(),saved=JSON.parse(localStorage.getItem(key));return saved?.signature===signature&&Number.isFinite(saved.ms)&&saved.ms>0?saved.ms:null;}catch{return null;}}
function bestDisplay(){const best=readBest(),text=modeNames[mode]+' BEST：'+(best===null?'まだ記録がありません':(best/1000).toFixed(2)+'秒');$('best-time').textContent=text;$('finish-best').textContent=text;}
function saveBest(){
 $('new-record').hidden=true;$('record-notice').textContent='';
 if(!recordEligible||statuses.some(s=>s!=='correct')){$('record-notice').textContent='スキップや練習設定の変更があったため、今回は記録の対象外です。';return;}
 const best=readBest();if(elapsed<=0||(best!==null&&best<=elapsed)){bestDisplay();return;}
 try{const {signature,key}=recordData();localStorage.setItem(key,JSON.stringify({signature,ms:elapsed}));$('new-record').hidden=false;tone('record');}
 catch{$('record-notice').textContent='このブラウザに記録を保存できませんでした。';}
 bestDisplay();
}
function selectMode(value){
 mode=value;for(const name of Object.keys(modeNames))$('mode-'+name).setAttribute('aria-pressed',String(name===mode));
 const missing=mode==='hard'&&activity.entries.some(e=>!e.japanese);
 $('start').disabled=missing;$('setup-message').textContent=missing?'日本語が未登録の問題があるため、Hardでは開始できません。':'';
 bestDisplay();
}
function setup(){
 phase='setup';stopSpeech();clearInterval(clock);running=false;
 $('setup').hidden=false;$('practice').hidden=true;$('complete').hidden=true;$('practice-stats').hidden=true;$('audio-settings').hidden=true;$('new-record').hidden=true;
 $('progress').textContent=activity.entries.length+'問';selectMode(mode);$('start').focus();
}
function begin(){
 if($('start').disabled)return;
 phase='play';recordEligible=true;statuses=activity.entries.map(()=>null);queue=activity.entries.map((_,i)=>i);cursor=0;
 showModel=mode==='easy';speechLanguage=mode==='hard'?'ja-JP':'en-US';$('speech-language').value=speechLanguage;
 $('setup').hidden=true;$('audio-settings').hidden=false;$('practice-stats').hidden=false;$('timer').hidden=true;$('meaning').hidden=mode==='normal';
 $('mode-label').textContent=modeNames[mode];$('new-record').hidden=true;startClock(true);load();
}
function stopSpeech(){speechGeneration++;clearTimeout(speechPause);window.speechSynthesis?.cancel();}
function stats(){
 const ms=elapsed+(running?Date.now()-started:0),seconds=Math.floor(ms/1000),time=Math.floor(seconds/60)+'分'+String(seconds%60).padStart(2,'0')+(running?'':'.'+String(Math.floor(ms%1000/10)).padStart(2,'0'))+'秒';
 const count=statuses.filter((value,i)=>value==='correct'&&!failed[i]).length;
 $('first-pass').textContent='初回正解 '+count+' / '+activity.entries.length+'問';$('timer').textContent='タイム '+time;
 $('result-stats').textContent='間違いなしで入力できた問題：'+count+' / '+activity.entries.length+'問　タイム：'+time;
}
function startClock(reset=false){if(reset){elapsed=0;failed=activity.entries.map(()=>false);}started=Date.now();running=true;clearInterval(clock);clock=setInterval(stats,1000);stats();}
function model(){
 $('toggle-model').setAttribute('aria-pressed',String(showModel));$('toggle-model').textContent=showModel?'綴りを隠す':'綴りを見る';
 $('model').replaceChildren();$('model').classList.toggle('hidden-model',!showModel);
 if(!showModel){$('model').textContent='綴りを隠しています。音声を聞いて入力してみよう。';return;}
 if(!last){$('model').textContent=current().english;return;}
 const target=new Set(last.edits.filter(x=>x.kind==='replace'||x.kind==='missing').map(x=>x.index));
 Array.from(C.normalize(current().english)).forEach((char,index)=>{
  const span=document.createElement('span');span.textContent=char===' '&&target.has(index)?'␣':char;if(target.has(index))span.className='target';$('model').append(span);
 });
}
function previous(){
 $('previous').replaceChildren();$('previous-attempt').hidden=!last;$('error-detail').textContent='';
 if(!last)return;
 const details=[];let position=1;
 const label=char=>char===' '?'スペース':'「'+char+'」';
 last.edits.forEach(edit=>{
  const span=document.createElement('span');span.textContent=edit.kind==='missing'?'□':edit.actual===' '&&edit.kind!=='equal'?'␣':edit.actual;
  if(edit.kind!=='equal')span.className='error';
  $('previous').append(span);
  if(edit.kind==='extra')details.push(position+'文字目の'+label(edit.actual)+'が余分です。');
  if(edit.kind==='replace')details.push(position+'文字目の'+label(edit.actual)+(showModel?'を'+label(edit.expected)+'に直そう。':'を確認しよう。'));
  if(edit.kind==='missing')details.push(position+'文字目に'+(showModel?label(edit.expected)+'が足りません。':'文字が足りません。'));
  if(edit.actual)position++;
 });
 $('error-detail').textContent=details.join('\n');
}
function load(speechDelay=0){
 stopSpeech();last=null;correct=false;$('practice').hidden=false;$('complete').hidden=true;$('answer').value='';$('answer').disabled=false;$('check').disabled=false;$('next').hidden=true;$('skip').hidden=false;
 const item=current();$('japanese').textContent=item.japanese||'音声を聞いて英語を入力しよう。';$('progress').textContent=(cursor+1)+' / '+queue.length+'問';
 const card=cards.get(item.cardId),picture=$('picture');picture.hidden=true;picture.removeAttribute('src');picture.onerror=()=>picture.hidden=true;
 if(card?.image){const url=new URL(card.image,document.baseURI);if(url.origin===location.origin){picture.src=url.href;picture.hidden=false;}}
 $('feedback').classList.remove('success');$('feedback').textContent='音声や綴りを確認して、最後まで入力してから答え合わせをしよう。';model();previous();stats();$('answer').focus();
 if(speechDelay)speechPause=setTimeout(()=>speak(),speechDelay);else speak();
}
function finish(){
 phase='complete';
 stopSpeech();if(running){elapsed+=Date.now()-started;running=false;}clearInterval(clock);stats();$('practice').hidden=true;$('complete').hidden=false;
 const count=statuses.filter(x=>x==='correct').length,skipped=statuses.filter(x=>x!=='correct').length;
 $('result').textContent='正しく入力できた問題：'+count+' / '+activity.entries.length+'問'+(skipped?'　後回し：'+skipped+'問':'');
 $('retry-skipped').hidden=!skipped;$('progress').textContent='練習終了';
 $('timer').hidden=false;saveBest();$('complete').focus();
}
function next(skip=false){
 if(skip&&!correct){statuses[queue[cursor]]='skipped';failed[queue[cursor]]=true;recordEligible=false;}
 if(cursor+1<queue.length){cursor++;load(correct?600:0);}else finish();
}
function speak(){
 if(!soundEnabled||!activity||$('practice').hidden)return;
 if(!window.speechSynthesis||!window.SpeechSynthesisUtterance){$('feedback').textContent='このブラウザでは音声を再生できません。綴りを見ながら練習できます。';return;}
 stopSpeech();const generation=speechGeneration,text=speechLanguage==='ja-JP'?current().japanese:current().english;
 if(!text){$('feedback').textContent='この問題には日本語が登録されていません。';return;}
 const words=wordByWord?text.split(/\s+/).filter(Boolean):[text];
 function play(i){
  if(generation!==speechGeneration||!soundEnabled)return;
  const utterance=new SpeechSynthesisUtterance(words[i]);utterance.lang=speechLanguage;utterance.rate=speechRate;
  utterance.onend=()=>{if(generation===speechGeneration&&i+1<words.length)speechPause=setTimeout(()=>play(i+1),360);};
  utterance.onerror=event=>{if(generation!==speechGeneration||!soundEnabled||['canceled','interrupted'].includes(event.error))return;$('feedback').textContent=event.error==='not-allowed'?'音声を始めるには「発音を聞く」を押してください。':'音声を再生できませんでした。「発音を聞く」をもう一度押してください。';};
  speechSynthesis.speak(utterance);
 }play(0);
}
$('answer-form').onsubmit=event=>{
 event.preventDefault();if(correct||phase!=='play')return;
 if(!C.normalize($('answer').value)){$('feedback').textContent='英語を入力してから答え合わせをしよう。';$('answer').focus();return;}
 try{
  last=C.compare(current().english,$('answer').value);
  if(last.correct){correct=true;statuses[queue[cursor]]='correct';tone('correct');last=null;previous();next();}
  else{failed[queue[cursor]]=true;previous();model();$('feedback').textContent='下の「あなたの入力」を確認して、この入力欄に全体をもう一度入力しよう。';$('feedback').classList.remove('success');$('answer').value='';$('answer').focus();}
 }catch(error){$('feedback').textContent=error.message;}
};
$('toggle-model').onclick=()=>{showModel=!showModel;if(showModel&&mode!=='easy')recordEligible=false;model();previous();$('answer').focus();};
$('listen').onclick=()=>speak();
$('sound-toggle').onclick=()=>{
 soundEnabled=!soundEnabled;
 $('sound-toggle').setAttribute('aria-pressed',String(soundEnabled));
 $('sound-toggle').setAttribute('aria-label',soundEnabled?'音声をオフにする':'音声をオンにする');
 $('listen').disabled=!soundEnabled;
 if(soundEnabled)speak();else{stopSpeech();tones.forEach(x=>{try{x.osc.stop();}catch{}});}
};
$('word-toggle').onclick=()=>{wordByWord=!wordByWord;$('word-toggle').setAttribute('aria-pressed',String(wordByWord));speak();};
$('speech-rate').onchange=()=>{const value=Number($('speech-rate').value);if([.55,.85,1.2].includes(value)){speechRate=value;speak();}};
$('speech-language').onchange=()=>{speechLanguage=$('speech-language').value==='ja-JP'?'ja-JP':'en-US';recordEligible=false;speak();};
$('next').onclick=()=>next();$('skip').onclick=()=>next(true);
$('restart').onclick=begin;
$('choose-mode').onclick=setup;$('start').onclick=begin;
for(const value of Object.keys(modeNames))$('mode-'+value).onclick=()=>selectMode(value);
$('retry-skipped').onclick=()=>{phase='play';queue=activity.entries.map((_,i)=>i).filter(i=>statuses[i]!=='correct');cursor=0;startClock();load();};
window.addEventListener('pagehide',()=>{stopSpeech();clearInterval(clock);});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopSpeech();});
try{
 const token=new URLSearchParams(location.hash.slice(1)).get('d');if(!token)throw Error('教材のURLを確認してください。先生から配られたURLで開いてください。');
 activity=C.activity(ShareCodec.decodeJson(token));$('title').textContent=activity.title;$('instructions').textContent=activity.instructions;
 const params=new URLSearchParams(location.search),book=params.get('book'),unit=params.get('unit');
 $('unit-label').textContent=/^nh[56]$/.test(book)&&/^[1-8]$/.test(unit)?(book==='nh5'?'５':'６')+'年生Unit'+unit:activity.title;
 queue=activity.entries.map((_,i)=>i);statuses=activity.entries.map(()=>null);setup();
}catch(error){$('setup').hidden=true;$('practice').hidden=true;$('complete').hidden=true;$('fatal').textContent=error.message;}
})();

