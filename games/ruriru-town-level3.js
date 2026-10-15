(()=>{
 'use strict';
 const M=window.TownLevel3,$=id=>document.getElementById(id),directions=['north','east','south','west'];
 const sounds={place:$('placeSound'),turn:$('turnSound'),walk:$('walkSound')};
 let position=null,startLetter=null,goalId=null,pending=null,hintSentence='',hintAllowed=false;
 let completed=false,busy=false,history=[],motionFrame=null,walkTimer=null,actionEpoch=0,confirmAction=null,confirmationEpoch=0,preparingConfirmation=false;
 let speech;
 const isReady=()=>!!position&&!!goalId&&!completed&&!busy&&!document.hidden&&!preparingConfirmation&&!$('confirmDialog').open;
 const speechBusy=()=>speech&&['listening','processing','speaking','cooldown'].includes(speech.state);
 const spriteUrl=(dir,frame)=>`assets/ruriru-town/characters/${directions[dir]}-${frame}.png`;
 const sprites=directions.flatMap((_,dir)=>Array.from({length:4},(_,frame)=>{const image=new Image();image.src=spriteUrl(dir,frame);return image;}));
 function feedback(text,kind=''){$('feedback').textContent=text;$('feedback').className='feedback'+(kind?' '+kind:'');}
 function syncControls(){
  const state=speech?.state||'idle',blocked=speechBusy()||busy;
  $('record').disabled=!speech?.supported||!isReady()||['processing','speaking','cooldown'].includes(state);
  $('record').classList.toggle('listening',state==='listening');
  $('recordLabel').textContent=state==='listening'?'聞き取りを終える':'音声入力';
  $('execute').disabled=!pending||!isReady()||blocked;
  $('undo').disabled=!history.length||blocked;
  $('showHint').disabled=!hintAllowed||!isReady()||blocked;
  $('readHint').disabled=!hintSentence||!isReady()||blocked||!speech?.canRead;
  const labels={idle:completed?'GOAL!':isReady()?'話せるよ':'準備中',listening:'🎤 話してね',processing:'確認中',speaking:'🔊 お手本を聞いてね',cooldown:'もうすぐ話せるよ',error:'もう一度試せます'};
  $('voiceState').textContent=busy?'移動中':labels[state]||labels.idle;
 }
 function clearHint(){hintSentence='';hintAllowed=false;$('hintSentence').textContent='まずは自分で話してみよう。';$('hintSentence').className='hint-placeholder';$('readHint').hidden=true;}
 function clearSentence(){pending=null;$('recognized').textContent=position&&goalId?'音声入力を押して、一文話そう。':'スタートと目的地を選ぼう。';$('recognized').className='recognized placeholder';}
 function clearIndication(){$('sideArrow').hidden=true;document.querySelectorAll('.facility-target.indicated').forEach(button=>button.classList.remove('indicated'));$('success').hidden=true;}
 function stopSounds(){for(const audio of Object.values(sounds)){audio.pause();try{audio.currentTime=0;}catch{}}}
 function playSound(kind){stopSounds();try{sounds[kind].play()?.catch(()=>{});}catch{}}
 function draw(frame=0){
  const char=$('char');if(!position){char.hidden=true;return;}
  const point=M.point(position);char.style.left=point.x/M.size.width*100+'%';char.style.top=point.y/M.size.height*100+'%';char.hidden=false;
  $('sprite').src=spriteUrl(position.dir,frame);
  $('location').textContent=`現在地：横道${1+position.r/2}、縦道${1+position.c/2}。${['北','東','南','西'][position.dir]}向き。`;
 }
 function cancelAction(){
  ++confirmationEpoch;preparingConfirmation=false;
  ++actionEpoch;if(motionFrame!==null)cancelAnimationFrame(motionFrame);motionFrame=null;clearInterval(walkTimer);walkTimer=null;busy=false;stopSounds();
  void speech?.cancel();if(position)draw();
 }
 function refreshSelection(){
  document.querySelectorAll('[data-start]').forEach(button=>{const active=button.dataset.start===startLetter;button.classList.toggle('active',active);if(button.tagName==='BUTTON')button.setAttribute('aria-pressed',String(active));});
  document.querySelectorAll('[data-goal]').forEach(button=>{const selected=button.dataset.goal===goalId;button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected));});
  const goal=M.facilities.find(f=>f.id===goalId);
  $('selectedGoal').textContent=goal?`${goal.english} ／ ${goal.japanese}`:'地図か一覧で施設を選ぼう。';$('selectedGoal').classList.toggle('chosen',!!goal);
 }
 function setupMessage(){
  if(!position)feedback('まずは A〜N からスタートを選んでね。');
  else if(!goalId)feedback('地図か一覧で、目的地を選んでね。');
  else feedback('準備できたよ。自分で道案内してみよう。');
  if(!speech.supported)feedback('このブラウザーは音声入力に対応していません。Chromeで開いてください。','warn');
 }
 function place(letter){
  cancelAction();startLetter=letter;position={...M.starts[letter]};history=[];completed=false;
  clearIndication();clearHint();clearSentence();draw();refreshSelection();playSound('place');setupMessage();syncControls();
 }
 function setGoal(id){
  cancelAction();goalId=id;if(startLetter)position={...M.starts[startLetter]};history=[];completed=false;
  clearIndication();clearHint();clearSentence();draw();refreshSelection();setupMessage();syncControls();
 }
 async function ask(title,note,action){
  const token=++confirmationEpoch;preparingConfirmation=true;syncControls();await speech.cancel();
  if(token!==confirmationEpoch||document.hidden)return;
  preparingConfirmation=false;if($('confirmDialog').open){syncControls();return;}
  confirmAction=()=>{if(token===confirmationEpoch)action();};$('confirmTitle').textContent=title;$('confirmNote').textContent=note;$('confirmDialog').returnValue='cancel';$('confirmDialog').showModal();syncControls();
 }
 function chooseGoal(facility){void ask(`${facility.english} を目的地に設定しますか？`,`${facility.japanese}を目指して道案内します。${history.length?'変更すると、選んだスタートからやり直します。':''}`,()=>setGoal(facility.id));}
 function receiveTranscript(text,final){
  if(!isReady())return;
  $('recognized').textContent=text.trim()||'声を聞き取れませんでした。';$('recognized').className='recognized';
  if(!final){pending=null;feedback('聞いています…');syncControls();return;}
  pending=M.parseCommand(text);
  if(pending){hintAllowed=false;feedback('伝わったよ。「動かす」を押してね。','accepted');}
  else{hintAllowed=true;feedback('もう一度話せるよ。こまったら、ヒントも見られます。','warn');}
  syncControls();
 }
 speech=new window.TownSpeech({
  Recognition:window.SpeechRecognition||window.webkitSpeechRecognition,synth:window.speechSynthesis,Utterance:window.SpeechSynthesisUtterance,canListen:isReady,
  onState:()=>syncControls(),onTranscript:receiveTranscript,
  onError:text=>{pending=null;feedback(text,'warn');syncControls();}
 });
 function showSide(side){
  const toward=(position.dir+(side==='right'?1:3))%4,point=M.point(position),[dr,dc]=M.vectors[toward],arrow=$('sideArrow');
  arrow.style.left=(point.x+dc*44)/M.size.width*100+'%';arrow.style.top=(point.y+dr*44-30)/M.size.height*100+'%';
  arrow.style.transform=`translate(-50%,-50%) rotate(${toward*90-90}deg)`;arrow.hidden=false;
  for(const facility of M.seenFacilities(position,side))document.querySelector(`.facility-target[data-goal="${facility.id}"]`).classList.add('indicated');
 }
 function finishCommand(command){
  busy=false;if(command.kind==='forward')stopSounds();clearInterval(walkTimer);walkTimer=null;motionFrame=null;draw();
  if(command.kind==='arrival'){
   showSide(command.side);
   if(M.isArrival(position,goalId,command.side)){
    completed=true;const goal=M.facilities.find(f=>f.id===goalId);$('successText').textContent=goal.english+' に到着！';$('success').hidden=false;
    feedback('道案内できたね！「1つ戻る」でもう一度試せます。','accepted');
   }else feedback('その表現は伝わったよ。目的地の場所と、キャラクターから見た左右を確かめよう。');
  }else feedback('次の一文を、自分で話してみよう。');
  syncControls();
 }
 async function execute(){
  if(!pending||!isReady()||speechBusy())return;
  const command=pending,token=++actionEpoch;busy=true;pending=null;clearHint();clearIndication();syncControls();
  const stopped=await speech.cancel();if(token!==actionEpoch)return;
  if(!stopped){busy=false;feedback('マイクの停止を確認できませんでした。少し待って、もう一度話してください。','warn');syncControls();return;}
  const result=M.transition(position,command);
  if(!result.ok){busy=false;feedback('英文は伝わったよ。この先には道がないので、進めません。','warn');syncControls();return;}
  const previous={...position};
  if(command.kind!=='forward'){history.push(previous);position=result.state;if(command.kind==='turn')playSound('turn');finishCommand(command);return;}
  const from=M.point(position),to=M.point(result.state),started=performance.now();
  const duration=window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:450*command.steps;
  playSound('walk');let frame=0;walkTimer=setInterval(()=>{$('sprite').src=spriteUrl(position.dir,++frame%4);},150);
  function tick(now){
   if(token!==actionEpoch)return;
   const t=duration?Math.min(1,(now-started)/duration):1;
   $('char').style.left=(from.x+(to.x-from.x)*t)/M.size.width*100+'%';$('char').style.top=(from.y+(to.y-from.y)*t)/M.size.height*100+'%';
   if(t<1)motionFrame=requestAnimationFrame(tick);else{history.push(previous);position=result.state;finishCommand(command);}
  }
  motionFrame=requestAnimationFrame(tick);
 }
 for(const [letter,start] of Object.entries(M.starts)){
  const p=M.point(start),marker=document.createElement('div');marker.className='marker';marker.textContent=letter;marker.dataset.start=letter;marker.style.left=p.x/M.size.width*100+'%';marker.style.top=p.y/M.size.height*100+'%';$('markers').append(marker);
  const button=document.createElement('button');button.className='start';button.type='button';button.textContent=letter;button.dataset.start=letter;button.setAttribute('aria-label',`スタート ${letter}`);button.setAttribute('aria-pressed','false');button.onclick=()=>place(letter);$('starts').append(button);
 }
 for(const facility of M.facilities){
  const target=document.createElement('button');target.className='facility-target';target.type='button';target.dataset.goal=facility.id;
  target.setAttribute('aria-label',`${facility.english}（${facility.japanese}）を目的地にする`);target.setAttribute('aria-pressed','false');
  const [x,y,w,h]=facility.rect;target.style.left=x/M.size.width*100+'%';target.style.top=y/M.size.height*100+'%';target.style.width=w/M.size.width*100+'%';target.style.height=h/M.size.height*100+'%';target.onclick=()=>chooseGoal(facility);$('destinations').append(target);
  const button=document.createElement('button');button.type='button';button.className='facility-choice';button.dataset.goal=facility.id;button.setAttribute('aria-pressed','false');button.append(document.createTextNode(facility.english));
  const translation=document.createElement('span');translation.textContent=facility.japanese;button.append(translation);button.onclick=()=>chooseGoal(facility);$('facilityList').append(button);
 }
 $('record').onclick=()=>{
  if(speech.state==='listening'){speech.finish();return;}
  if(!isReady())return;
  pending=null;clearIndication();$('recognized').textContent='聞いています…';$('recognized').className='recognized placeholder';feedback('一文ずつ、タブレットに話しかけてね。');void speech.listen();syncControls();
 };
 $('execute').onclick=()=>void execute();
 $('undo').onclick=()=>{
  if(!history.length||busy||speechBusy())return;cancelAction();position=history.pop();completed=false;clearIndication();clearHint();clearSentence();draw();feedback('1つ前の位置と向きに戻ったよ。もう一度話してみよう。');syncControls();
 };
 $('showHint').onclick=()=>{
  if(!hintAllowed||!isReady()||speechBusy())return;
  hintSentence=M.nextHint(position,goalId)||'';if(!hintSentence){feedback('ヒントを表示できませんでした。先生に知らせてください。','warn');return;}
  $('hintSentence').textContent=hintSentence;$('hintSentence').className='';$('readHint').hidden=false;syncControls();
 };
 $('readHint').onclick=()=>{if(hintSentence&&!speechBusy()&&isReady()){pending=null;void speech.read(hintSentence);syncControls();}};
 $('reset').onclick=()=>void ask('はじめから、やり直しますか？','スタートと目的地を選ぶ画面に戻ります。',()=>{
  cancelAction();position=null;startLetter=null;goalId=null;pending=null;history=[];completed=false;clearIndication();clearHint();clearSentence();draw();refreshSelection();setupMessage();syncControls();
 });
 $('confirmDialog').addEventListener('close',()=>{const action=confirmAction;confirmAction=null;if($('confirmDialog').returnValue==='yes')action?.();syncControls();});
 function suspend(){const wasMoving=busy;cancelAction();pending=null;clearIndication();if(wasMoving)feedback('移動を止め、直前の位置に戻りました。');syncControls();}
 window.addEventListener('pagehide',suspend);document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend();else syncControls();});
 refreshSelection();setupMessage();syncControls();
})();
