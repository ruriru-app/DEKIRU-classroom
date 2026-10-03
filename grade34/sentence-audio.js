/* Instance-owned speech playback shared by sentence practice and speech building. */
window.SentenceAudio=(()=>{
 'use strict';
 function create({root=document,getRate=()=>.55,getEnabled=()=>true,resolveAudio=()=>null,onError=()=>{}}={}){
  let generation=0,timer=null,recording=null,disposed=false;
  const highlighted=new Set();
  const clear=()=>{highlighted.forEach(el=>el?.classList.remove('speaking'));highlighted.clear();};
  const mark=el=>{if(el){el.classList.add('speaking');highlighted.add(el);}};
  function stop(){generation++;clearTimeout(timer);timer=null;if(recording){recording.onended=recording.onerror=null;recording.pause();recording=null;}window.speechSynthesis?.cancel();clear();}
  function play(text,id,done){
   if(disposed||id!==generation)return;
   const fail=()=>{if(id!==generation)return;clear();onError('音声を再生できません。端末の音声設定を確認してください。');};
   const url=resolveAudio(String(text));
   if(url){
    try{recording=new Audio(url);recording.playbackRate=Number(getRate())||.55;recording.onended=()=>{if(id===generation){recording=null;done();}};recording.onerror=fail;recording.play().catch(fail);}catch{fail();}
    return;
   }
   if(!window.speechSynthesis||!window.SpeechSynthesisUtterance){fail();return;}
   const u=new SpeechSynthesisUtterance(text),voices=window.speechSynthesis.getVoices();
   u.lang='en-US';u.rate=Number(getRate())||.55;
   u.voice=voices.find(v=>v.lang==='en-US'&&v.localService&&!/natural|online/i.test(v.name))||voices.find(v=>v.lang==='en-US'&&v.localService)||voices.find(v=>v.lang==='en-US')||voices.find(v=>v.lang?.startsWith('en')&&v.localService)||voices.find(v=>v.lang?.startsWith('en'))||null;
   u.onend=()=>{if(id===generation)done();};u.onerror=fail;
   try{window.speechSynthesis.speak(u);}catch{fail();}
  }
  function sequence(items){
   stop();if(disposed||!getEnabled())return;
   const id=generation,queue=items.filter(item=>item?.text);
   function next(index){
    if(id!==generation||disposed)return;
    clear();if(index>=queue.length)return;
    const item=queue[index];mark(item.element);
    if(!item.segmented){play(item.text,id,()=>next(index+1));return;}
    const parts=(item.parts?.length?item.parts:[item.text]).map(x=>String(x).trim()).filter(Boolean);
    const end=String(item.text).trim().match(/[?!.]$/)?.[0]||'';
    if(parts.length&&end&&!/[?!.]$/.test(parts.at(-1)))parts[parts.length-1]+=end;
    const slots=[...(item.element?.closest('.talk-sentence-row')?.querySelectorAll('[data-talk-token-slot]')||[])];
    function part(i){
     if(id!==generation||disposed)return;
     clear();if(i>=parts.length){next(index+1);return;}
     mark(item.element);slots[i]?.querySelectorAll('.talk-card').forEach(mark);
     play(parts[i],id,()=>{clear();timer=setTimeout(()=>part(i+1),360);});
    }
    part(0);
   }
   next(0);
  }
  function speak(text,element){sequence([{text,element}]);}
  function sentence(text,parts,element,segmented=false){sequence([{text,parts,element,segmented}]);}
  function dispose(){stop();disposed=true;}
  return {speak,sentence,sequence,stop,dispose};
 }
 return {create};
})();
