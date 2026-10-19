(()=>{
'use strict';
const $=id=>document.getElementById(id), Core=window.PracticeSpeechCore, normalize=window.MemorizeCore.normalizeTokens;
const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
let sentences=[],index=0,result=null,selected=-1,practiced=new Set(),visited=new Set(),recognizer=null,mode='',busy=false,session=0;
const current=()=>sentences[index]?.text||'';
function message(text){$('system-message').textContent=text;}
function lock(value){
 busy=value;
 document.querySelectorAll('button,textarea').forEach(el=>el.disabled=value);
 if(value){$(mode==='word'?'record-word':'record').disabled=false;$(mode==='word'?'record-word':'record').textContent='■ 読み終わった';}
 else{$('record').textContent='🎤 文を読む';$('record-word').textContent='🎤 この単語を読む';$('previous').disabled=index===0;if(!Recognition){$('record').disabled=true;$('record-word').disabled=true;}}
}
function render(){
 $('position').textContent=(index+1)+' / '+sentences.length+' 文';
 $('sentence').replaceChildren();$('sentence').classList.toggle('success',Boolean(result?.complete));
 const words=Core.words(current());let cursor=0;
 words.forEach((word,i)=>{
  $('sentence').append(document.createTextNode(current().slice(cursor,word.start)));
  const span=document.createElement(result&&!result.flags[i]?'button':'span');
  span.textContent=word.text;span.className='word';
  if(result&&!result.flags[i]){
   span.type='button';span.classList.add('missed');span.classList.toggle('practiced',practiced.has(i));
   span.setAttribute('aria-pressed',String(selected===i));span.setAttribute('aria-label',word.text+' を練習'+(practiced.has(i)?'、単語は伝わりました':''));
   span.addEventListener('click',()=>selectWord(i));
  }
  $('sentence').append(span);cursor=word.end;
 });
 $('sentence').append(document.createTextNode(current().slice(cursor)));
 $('word-panel').hidden=selected<0;
 if(selected>=0)$('selected-word').textContent=words[selected].text;
 $('next').hidden=!result?.complete;
 $('next').textContent=index===sentences.length-1?'練習を終える':'次の文へ';
 lock(busy);
}
function selectWord(i){if(busy)return;window.speechSynthesis?.cancel();selected=i;$('word-feedback').textContent=practiced.has(i)?'この単語は伝わりました。もう一度練習することもできます。':'お手本を聞いて、この単語だけ読もう。';render();}
function resetSentence(){result=null;selected=-1;practiced.clear();visited.clear();$('feedback').textContent='文のお手本を聞いて、マイクボタンで読もう。';$('word-feedback').textContent='';message('');render();}
function nextWord(){
 if(selected>=0)visited.add(selected);
 const next=result.flags.findIndex((matched,i)=>!matched&&!practiced.has(i)&&!visited.has(i));
 selected=next;
 if(next>=0)$('word-feedback').textContent='次の単語です。お手本を聞いて読もう。';
 else $('feedback').textContent='単語の練習が終わりました。「文を読む」で文全体をもう一度読もう。';
 render();
}
function speak(text){
 if(busy)return;
 if(!window.speechSynthesis){message('このブラウザではお手本を再生できません。');return;}
 speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(text);utterance.lang='en-US';utterance.rate=.75;
 utterance.onerror=()=>message('お手本を再生できませんでした。もう一度押してください。');
 speechSynthesis.speak(utterance);
}
function assess(transcript){
 if(mode==='word'){
  const word=Core.words(current())[selected].text;
  if(Core.assess(word,transcript,normalize).complete){
   practiced.add(selected);visited.add(selected);
   const remaining=result.flags.some((flag,i)=>!flag&&!practiced.has(i)&&!visited.has(i));
   $('word-feedback').textContent='伝わりました！';
   $('feedback').textContent=remaining?'この単語は伝わりました。「いったん次へ」で次の単語を練習できます。':'単語の練習が終わりました。「文を読む」で文全体をもう一度読もう。';
  }else $('word-feedback').textContent='まだ確認できませんでした。お手本を聞いて、もう一度はっきり読もう。';
 }else{
  result=Core.assess(current(),transcript,normalize);practiced.clear();visited.clear();selected=-1;
  $('feedback').textContent=result.complete?'全部伝わりました！':result.extra?'単語は伝わりました。表示された文だけを、もう一度読もう。':'オレンジの単語を押して、単語だけ練習しよう。';
 }
 render();
}
function record(kind){
 if(busy){try{recognizer?.stop();}catch{}return;}
 if(!Recognition){message('このブラウザでは音声入力を使えません。Chromeなど音声入力に対応したブラウザで開いてください。');return;}
 window.speechSynthesis?.cancel();mode=kind;
 const token=++session;let transcript='',error='',timer;
 const instance=new Recognition();recognizer=instance;
 instance.lang='en-US';instance.continuous=true;instance.interimResults=false;instance.maxAlternatives=1;
 instance.onresult=event=>{transcript=Array.from(event.results).filter(r=>r.isFinal).map(r=>r[0].transcript).join(' ');};
 instance.onerror=event=>{error=event.error||'unknown';};
 instance.onend=()=>{
  clearTimeout(timer);if(token!==session)return;recognizer=null;lock(false);
  if(error||!transcript.trim()){
   const errors={'not-allowed':'マイクの使用を許可してから、もう一度押してください。','service-not-allowed':'音声入力が許可されていません。ブラウザの設定を確認してください。','audio-capture':'マイクが見つかりません。接続を確認してください。',network:'音声入力に接続できませんでした。通信を確認して再挑戦してください。'};
   message(errors[error]||'声を確認できませんでした。マイクボタンを押して、もう一度読もう。');return;
  }
  message('');assess(transcript);
 };
 try{instance.start();lock(true);message('聞いています。読み終わったら「読み終わった」を押してください。');timer=setTimeout(()=>{if(token===session)try{instance.stop();}catch{}},30000);}
 catch{recognizer=null;lock(false);message('音声入力を開始できませんでした。もう一度押してください。');}
}
$('import-form').addEventListener('submit',event=>{
 event.preventDefault();const parsed=window.MemorizeCore.parseSpeech($('manuscript').value);
 if(!parsed.length){message('練習する英文を入力してください。');return;}
 if(parsed.some(s=>Core.words(s.text).length>100)){message('1文を100語以内に分けてください。');return;}
 sentences=parsed;index=0;$('import-form').hidden=true;$('practice').hidden=false;resetSentence();
});
$('edit').onclick=()=>{window.speechSynthesis?.cancel();$('import-form').hidden=false;$('practice').hidden=true;$('manuscript').focus();};
$('previous').onclick=()=>{window.speechSynthesis?.cancel();if(index>0){index--;resetSentence();}};
$('next').onclick=()=>{window.speechSynthesis?.cancel();if(index<sentences.length-1){index++;resetSentence();}else{$('feedback').textContent='すべての文の練習が終わりました！';$('next').hidden=true;}};
$('listen').onclick=()=>speak(current());
$('listen-word').onclick=()=>speak(Core.words(current())[selected]?.text||'');
$('record').onclick=()=>record('sentence');$('record-word').onclick=()=>record('word');
$('skip-word').onclick=nextWord;
function cancel(){session++;if(recognizer){try{recognizer.abort();}catch{}recognizer=null;}window.speechSynthesis?.cancel();lock(false);}
window.addEventListener('pagehide',cancel);
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancel();message('音声入力を止めました。続けるときは、もう一度マイクボタンを押してください。');}});
if(!Recognition)message('このブラウザでは音声入力を使えません。Chromeなど音声入力に対応したブラウザで開いてください。');
})();


