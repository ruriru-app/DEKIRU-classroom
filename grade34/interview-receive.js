(()=>{
 'use strict';const $=id=>document.getElementById(id),S=InterviewSession,cards=window.DEKIRU_DATA.cards;
 const authorPreview=new URLSearchParams(location.search).get('authorPreview')==='1'&&parent!==window;
 let delivery=null,state=null,selectedStudent=null,timer=null,store=null,corrupt=false,saveError='',activeSlot=null,speakingButton=null,loadVersion=0;
 const audio=InterviewAudio.create({onUnavailable:()=>{$('studentStatus').textContent='この端末では読み上げを利用できません';},onSpeaking:on=>document.querySelectorAll('.student-speaker').forEach(e=>e.classList.toggle('speaking',on&&e===speakingButton))});
 const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
 const now=()=>new Date().toISOString();
 function stop(){clearTimeout(timer);timer=null;audio.stop();}
 function hide(message){stop();$('receiveContent').hidden=true;$('studentAudio').hidden=true;$('studentRestart').hidden=true;$('composeQuestion').replaceChildren();$('studentChoices').replaceChildren();$('questionCards').replaceChildren();$('answerAreas').replaceChildren();$('unassignedNames').replaceChildren();$('studentStatus').textContent='';$('receiveError').textContent=message;if($('restartDialog').open)$('restartDialog').close();}
 function checkExpiry(){clearTimeout(timer);if(!delivery)return false;if(InterviewShare.isExpired(delivery)){hide('活動時間が終了しました');return false;}if(delivery.expiresAt)timer=setTimeout(checkExpiry,Math.min(60000,Date.parse(delivery.expiresAt)-Date.now()));return true;}
 function image(card){const img=el('img');img.alt='';img.src=card.pictureUrl||('../'+card.image);img.onerror=()=>{img.hidden=true;};return img;}
 function question(target){
  target.replaceChildren();const map=S.selectedCards(delivery,state,cards),fixed={i:'person_001',you:'person_002',like:'action5_002',have:'action5_015'};
  InterviewModel.sentenceTemplates(delivery.preset.question.template).forEach((template,index)=>{
   const row=el('div',undefined,'student-sentence'),line=el('div',undefined,'student-sentence-cards'),speak=el('button',undefined,'student-speaker');speak.type='button';speak.setAttribute('aria-label',(index+1)+'文目を読み上げる');if(state.phase==='sheet'&&index===0)speak.id='questionSpeak';
   const icon=el('img');icon.alt='';icon.src='assets/ui/originals/読み上げボタン.svg';speak.append(icon);speak.disabled=InterviewModel.slotIds(template).some(id=>!map[id]);
   speak.onclick=()=>{if(!checkExpiry())return;const text=template.replace(/\(P[1-9]?\)/g,m=>map[m.slice(1,-1)].english);speakingButton=speak;audio.speak(text,text.split(/\s+/));};row.append(speak,line);target.append(row);
  for(const token of S.tokens(delivery,map,template)){
   const picking=token.kind==='picture'&&state.phase==='compose',e=el(picking?'button':'div',undefined,'student-token '+token.kind);
   const card=token.kind==='picture'?map[token.slotId]:cards.find(c=>c.id===fixed[token.text.toLowerCase()]);
   if(card)e.append(image(card));else if(token.kind==='picture')e.classList.add('waiting');
   if(picking){e.type='button';e.dataset.slotId=token.slotId;e.setAttribute('aria-label',token.slotId+' のカードを選ぶ');e.setAttribute('aria-pressed',String(activeSlot===token.slotId));e.onclick=()=>{activeSlot=token.slotId;const occurrence=[...target.querySelectorAll('[data-slot-id]')].indexOf(e);render();target.querySelectorAll('[data-slot-id]')[occurrence]?.focus({preventScroll:true});};if(delivery.preset.question.slots.length>1)e.append(el('small',token.slotId));}
   e.append(el('span',e.classList.contains('waiting')?'下のカードから\nえらんでね':token.text));line.append(e);
  }
  });
 }
 function persist(){const saved=store.save(delivery,state);saveError=saved.ok?'':saved.error;}
 function selection(){document.querySelectorAll('[data-student-id]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.studentId===selectedStudent)));status();}
 function status(){const kid=delivery?.roster.students.find(k=>k.id===selectedStudent);$('studentStatus').textContent=saveError||(kid?`${kid.number||''} ${kid.name}：回答先をタップ`:(state?.phase==='sheet'?'名前をタップ → 回答先をタップ':''));}
 function move(areaId){if(!checkExpiry()||!selectedStudent||corrupt)return;const movedId=selectedStudent;state=S.move(delivery,state,movedId,areaId,now());selectedStudent=null;persist();render();Array.from(document.querySelectorAll('[data-student-id]')).find(b=>b.dataset.studentId===movedId)?.focus({preventScroll:true});}
 function bindArea(area,id){area.onclick=()=>move(id);area.onkeydown=e=>{if(e.target===area&&['Enter',' '].includes(e.key)){e.preventDefault();move(id);}};}
 function names(target,areaId){for(const kid of delivery.roster.students.filter(k=>state.assignments[k.id]===areaId)){const b=el('button',(kid.number?kid.number+' ':'')+kid.name,'student-name');b.type='button';b.dataset.studentId=kid.id;b.classList.toggle('number-only',!kid.name);b.setAttribute('aria-pressed',String(selectedStudent===kid.id));b.onclick=e=>{e.stopPropagation();if(checkExpiry()){selectedStudent=selectedStudent===kid.id?null:kid.id;selection();}};target.append(b);}}
 function render(){
  let instructions=$('studentInstructions');if(!instructions){const block=el('div',undefined,'student-title-block');$('studentTitle').before(block);block.append($('studentTitle'));instructions=el('p');instructions.id='studentInstructions';block.append(instructions);}instructions.textContent=delivery?.preset.studentInstructions||'';instructions.hidden=!instructions.textContent;
  if(!checkExpiry()||!state)return;const sheet=state.phase==='sheet';$('receiveError').textContent='';$('receiveContent').hidden=false;$('studentTitle').textContent=delivery.preset.title;$('composeScreen').hidden=sheet;$('sheetScreen').hidden=!sheet;$('studentAudio').hidden=!sheet;$('studentRestart').hidden=false;status();
  if(!sheet){if(!delivery.preset.question.slots.some(s=>s.id===activeSlot))activeSlot=delivery.preset.question.slots[0]?.id;question($('composeQuestion'));$('studentChoices').replaceChildren();for(const id of delivery.preset.question.slots.length?delivery.preset.cardIds:[]){const card=cards.find(c=>c.id===id),b=el('button',undefined,'student-choice');b.type='button';b.dataset.pictureId=id;b.setAttribute('aria-pressed',String(state.selectedCardIds?.[activeSlot]===id));b.append(image(card),el('span',card.english));b.onclick=()=>{if(!checkExpiry())return;state=S.choose(delivery,state,card,now(),activeSlot);persist();render();[...$('studentChoices').children].find(c=>c.dataset.pictureId===id)?.focus({preventScroll:true});};$('studentChoices').append(b);}$('startInterview').disabled=!state.completedQuestion;return;}
  question($('questionCards'));$('answerAreas').replaceChildren();$('answerAreas').style.setProperty('--areas',Math.min(4,delivery.preset.answerAreas.length));$('answerAreas').classList.toggle('many',delivery.preset.answerAreas.length>4);
  for(const a of delivery.preset.answerAreas){const area=el('section',undefined,'student-area');area.dataset.areaId=a.id;area.tabIndex=0;area.setAttribute('role','group');area.setAttribute('aria-label',a.label+'へ移す');const h=el('h2');h.append(el('span',a.label+' '+Object.values(state.assignments).filter(v=>v===a.id).length+'人'),el('span','＋'));const list=el('div',undefined,'student-names');names(list,a.id);area.append(h,list);bindArea(area,a.id);$('answerAreas').append(area);}
  $('unassignedNames').replaceChildren();names($('unassignedNames'),null);$('unassignedTitle').textContent='未実施 '+Object.values(state.assignments).filter(v=>v===null).length+'人';bindArea($('unassignedArea'),null);
 }
 async function load(){const version=++loadVersion;stop();delivery=null;state=null;selectedStudent=null;saveError='';corrupt=false;hide('');try{const token=location.hash.match(/^#interview=([A-Za-z0-9_.-]+)$/)?.[1];if(!token)throw Error();const decoded=await InterviewShare.decodeShared(token);if(version!==loadVersion)return;delivery=decoded;if(!checkExpiry())return;
  try{store=InterviewProgress.create(localStorage);}catch{store=InterviewProgress.create({getItem(){throw Error()},setItem(){throw Error()},removeItem(){throw Error()}});}
  const saved=store.read(delivery,cards);if(saved.status==='corrupt'){corrupt=true;hide('保存した活動を再開できません。「はじめから」でやり直してください。');$('studentRestart').hidden=false;return;}
  state=saved.status==='saved'?saved.state:S.create(delivery,now());if(saved.status==='empty')persist();render();
 }catch{if(version!==loadVersion)return;delivery=null;hide('配信内容を読み込めませんでした。先生にもう一度配信してもらってください。');}}
 function requestReset(){if(!checkExpiry())return;audio.stop();$('restartDialog').showModal();}
 $('restartCancel').onclick=()=>$('restartDialog').close();$('restartConfirm').onclick=()=>{if(!checkExpiry())return;$('restartDialog').close();state=S.reset(delivery,now());selectedStudent=null;corrupt=false;persist();render();};
 $('studentRestart').onclick=requestReset;
 $('startInterview').onclick=()=>{if(checkExpiry()){state=S.start(delivery,state,now());persist();render();}};
 $('interviewReceiveBack').onclick=async()=>{audio.stop();if(document.fullscreenElement){await document.exitFullscreen();return;}if(state?.phase==='sheet'){if(Object.values(state.assignments).some(v=>v!==null)){requestReset();return;}state=S.reset(delivery,now());persist();render();}else location.href='index.html#/';};
 $('studentFullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('studentShell').requestFullscreen();}catch{$('studentStatus').textContent='この端末では全画面表示を利用できません';}};
 for(const [id,key] of [['soundToggle','enabled'],['wordToggle','wordByWord']])$(id).onclick=()=>{if(!checkExpiry())return;const value=!audio.getOptions()[key];audio.setOptions({[key]:value});$(id).setAttribute('aria-pressed',String(value));};
 $('speechRate').onchange=()=>{if(checkExpiry())audio.setOptions({rate:Number($('speechRate').value)});};
 window.addEventListener('hashchange',load);window.addEventListener('focus',checkExpiry);window.addEventListener('pageshow',checkExpiry);window.addEventListener('pagehide',stop);document.addEventListener('visibilitychange',()=>{if(document.hidden)audio.stop();checkExpiry();});
 if(authorPreview){
  $('interviewReceiveBack').disabled=true;$('studentFullscreen').disabled=true;
  addEventListener('message',event=>{if(event.source!==parent||!(event.origin===location.origin||(location.protocol==='file:'&&event.origin==='null'))||event.data?.type!=='interview-author-preview')return;try{
   stop();const preset=InterviewModel.validatePreset(event.data.preset),stamp=now();delivery=InterviewModel.validateDelivery({version:1,type:'interview-delivery',deliveryId:'author-preview',issuedAt:stamp,presetId:preset.id,preset,roster:{version:1,id:'preview-roster',className:'プレビュー',students:Array.from({length:35},(_,i)=>({id:'preview-student-'+(i+1),name:'',number:String(i+1)})),createdAt:stamp,updatedAt:stamp}});
   store={save:()=>({ok:true})};state=S.create(delivery,stamp);selectedStudent=null;saveError='';corrupt=false;
   if(event.data.phase==='sheet'){for(const slot of preset.question.slots){const card=cards.find(c=>c.id===slot.cardIds[0]);state=S.choose(delivery,state,card,stamp,slot.id);}state=S.start(delivery,state,stamp);}render();
  }catch(e){hide('プレビュー：'+e.message);}});
 }else load();
})();
