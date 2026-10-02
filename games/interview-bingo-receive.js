(()=>{
 'use strict';
 const WARNING='この端末では途中保存できません。ページを閉じると記録が失われます';
 const node=(tag,className,text)=>{const element=document.createElement(tag);if(className)element.className=className;if(text!==undefined)element.textContent=text;return element;};
 const button=(label,attribute,value,primary=false)=>{const element=node('button',primary?'bingo-receive-primary':'',label);element.type='button';element.setAttribute(attribute,value);return element;};
 function mount({root,hash=location.hash}){
  if(!root)throw Error('受信画面の表示先がありません');
  const Cards=window.InterviewBingoCards,Delivery=window.InterviewBingoDelivery,Share=window.InterviewBingoShare,Progress=window.InterviewBingoProgress,Student=window.InterviewBingoStudent;
  let destroyed=false,generation=0,delivery=null,available=[],progress=null,selfId=null,readResult=null,component=null,browserHash=location.hash,warning='',stage='loading';
  const memory=new Map(),unsaved=new Set();
  const memoryKey=id=>JSON.stringify(delivery)+'\u0000'+id;
  const header=node('header','bingo-receive-header'),brand=node('strong','', 'INTERVIEW BINGO'),status=node('p');
  status.setAttribute('data-bingo-receive-status','');header.append(brand);
  const content=node('div','bingo-receive-content');root.replaceChildren(header,status,content);
  function disposeComponent(){if(component){const old=component;component=null;old.destroy();}}
  function show(message,view){root.classList.toggle('bingo-receive-playing',stage==='board');status.textContent=message;content.replaceChildren(view||node('div'));}
  function expired(){return !!delivery&&Date.now()>=Date.parse(delivery.expiresAt);}
  function expire(){
   if(stage==='expired')return;
   disposeComponent();stage='expired';selfId=null;readResult=null;
   show('この配信は期限切れです。先生に新しいリンクをもらってください。');
  }
  function checkActive(){
   if(destroyed)return false;
   if(location.hash!==browserHash){load(location.hash);return false;}
   if(expired()){expire();return false;}
   return stage!=='invalid'&&stage!=='expired';
  }
  function card(){const view=node('section','bingo-receive-card');return view;}
  function renderIdentity(){
   if(!checkActive())return;
   stage='identity';selfId=null;readResult=null;warning='';
   const view=card(),identity=node('div','bingo-receive-identity'),list=node('div','bingo-receive-self-list');
   identity.setAttribute('data-bingo-identity','');
   view.append(node('h1','',delivery.activity.title),node('p','',delivery.roster.className),node('h2','','自分の番号・名前を選ぶ'));
   for(const pupil of delivery.roster.students){list.append(button(`${pupil.number}　${pupil.name||'（番号のみ）'}`,'data-bingo-self',pupil.id));}
   identity.append(list);view.append(identity);show('自分を選んでから、確認して活動を始めてください。',view);
  }
  function readForSelf(id){
   delivery=Delivery.validate(delivery,new Set(available.map(card=>card.id)));
   if(!delivery.roster.students.some(pupil=>pupil.id===id))throw Error('本人を名簿から選んでください');
   const result=progress.read(delivery,id);
   return result;
  }
  function renderConfirm(){
   if(!checkActive()||!selfId)return;
   stage='confirm';const pupil=delivery.roster.students.find(item=>item.id===selfId),view=card(),actions=node('div','bingo-receive-actions');
   view.append(node('h1','',delivery.activity.title),node('p','',delivery.roster.className),node('h2','','本人の確認'),node('p','',`${pupil.number}　${pupil.name||'（番号のみ）'}`));
   if(readResult.status==='corrupt'){
    view.append(node('p','','この人の保存した記録を開けません。確認して最初からやり直してください。'));
    actions.append(button('最初からやり直す','data-bingo-restart',''));
    show('保存した記録を確認できません。明示的にやり直すまで保存内容を保持します。',view);
   }else{
    view.append(node('p','',readResult.status==='saved'?'保存した続きから再開します。':memory.has(memoryKey(selfId))?'このページで続けていた記録から再開します。':'新しいシートを作ります。'));
    actions.append(button(readResult.status==='saved'?'続きから始める':'活動を始める','data-bingo-enter','',true));
    show(warning||'番号と名前を確認してください。',view);
   }
   actions.append(button('自分を選び直す','data-bingo-change-self',''));view.append(actions);
  }
  function renderBoard(){
   if(!checkActive()||!selfId||readResult?.status==='corrupt')return;
   stage='board';const id=selfId,boardGeneration=generation,view=node('div','bingo-receive-board'),toolbar=node('div','bingo-receive-toolbar');
   toolbar.append(node('strong','',delivery.roster.students.find(pupil=>pupil.id===id)?.name||`${delivery.roster.students.find(pupil=>pupil.id===id)?.number}番`),button('自分を選び直す','data-bingo-change-self',''),button('最初からやり直す','data-bingo-restart',''));
   view.append(toolbar);show(warning,view);
   const people=delivery.roster.students.map(pupil=>({id:pupil.id,label:`${pupil.number} ${pupil.name}`.trim()}));
   let next;
   try{
    next=Student.create({mode:'delivery',people,selfId:id,canInteract:()=>boardGeneration===generation&&stage==='board'&&checkActive(),onStateChange:state=>{
     if(boardGeneration!==generation||stage!=='board'||!checkActive())return;
     memory.set(memoryKey(id),state);
     const saved=progress.save(delivery,id,state);
     if(!saved.ok){unsaved.add(memoryKey(id));warning=WARNING;status.textContent=WARNING;}
     else{
      unsaved.delete(memoryKey(id));
      if(warning===WARNING&&status.textContent===WARNING){warning='';status.textContent='';}
     }
    }});
    component=next;view.append(next.element);
    const cardsById=new Map(available.map(card=>[card.id,card]));
    next.update({activity:delivery.activity,cards:delivery.activity.cardIds.map(cardId=>cardsById.get(cardId)),config:{size:delivery.size},reset:true,page:'compose'});
    const remembered=memory.get(memoryKey(id)),saved=readResult.status==='saved'?readResult.state:null;
    if(remembered||saved)next.restoreState(remembered||saved);
   }catch(error){disposeComponent();stage='invalid';show('盤面を開けません。先生にリンクを確認してください。');}
  }
  function selectSelf(id){
   if(!checkActive()||stage!=='identity')return;
   try{
    const result=readForSelf(id);selfId=id;readResult=result;
    warning=result.status==='unavailable'||unsaved.has(memoryKey(id))?WARNING:'';
    renderConfirm();
   }catch{stage='invalid';show('配信データを確認できません。先生にリンクを確認してください。');}
  }
  function enter(){
   if(!checkActive()||stage!=='confirm'||readResult?.status==='corrupt')return;
   try{readResult=readForSelf(selfId);if(readResult.status==='corrupt'){renderConfirm();return;}if(readResult.status==='unavailable')warning=WARNING;renderBoard();}
   catch{stage='invalid';show('配信データを確認できません。先生にリンクを確認してください。');}
  }
  function restart(){
   if(!checkActive()||!selfId||!['board','confirm'].includes(stage))return;
   if(!window.confirm('この人の盤面と記録を消して、最初からやり直しますか？'))return;
   if(!checkActive())return;
   const result=progress.remove(delivery,selfId);
   if(!result.ok&&readResult?.status!=='unavailable'){
    status.textContent='保存した記録を削除できませんでした。端末の保存設定を確認してください。';return;
   }
   memory.delete(memoryKey(selfId));unsaved.delete(memoryKey(selfId));disposeComponent();readResult={status:readResult?.status==='unavailable'?'unavailable':'empty'};
   warning=readResult.status==='unavailable'?WARNING:'';
   renderConfirm();
  }
  function click(event){
   const target=event.target.closest('button');if(!target||!root.contains(target)||!checkActive())return;
   if(target.hasAttribute('data-bingo-self'))selectSelf(target.dataset.bingoSelf);
   else if(target.hasAttribute('data-bingo-enter'))enter();
   else if(target.hasAttribute('data-bingo-change-self')){disposeComponent();renderIdentity();}
   else if(target.hasAttribute('data-bingo-restart'))restart();
  }
  async function load(nextHash){
   const mine=++generation;browserHash=location.hash;disposeComponent();delivery=null;selfId=null;readResult=null;warning='';stage='loading';
   show('配信を読み込んでいます。');
   const match=/^#bingo=(b1[jz]\.[A-Za-z0-9_-]+)$/.exec(nextHash);
   if(!match||match[1].length>220000){stage='invalid';show('配信リンクの形式が不正です。先生に確認してください。');return;}
   try{
    available=Cards.available();
    const decoded=await Share.decodeShared(match[1]);
    if(destroyed||mine!==generation)return;
    delivery=Delivery.validate(decoded,new Set(available.map(card=>card.id)));
    if(expired()){expire();return;}
    let storage;try{storage=localStorage;}catch{storage={getItem(){throw Error('unavailable');},setItem(){throw Error('unavailable');},removeItem(){throw Error('unavailable');}};}
    progress=Progress.create(storage);renderIdentity();
   }catch(error){if(destroyed||mine!==generation)return;stage='invalid';show(`配信リンクを開けません。${error?.message||'先生に確認してください。'}`);}
  }
  function onHashChange(){load(location.hash);}
  function onReturn(){checkActive();}
  root.addEventListener('click',click);window.addEventListener('hashchange',onHashChange);window.addEventListener('focus',onReturn);window.addEventListener('pageshow',onReturn);document.addEventListener('visibilitychange',onReturn);
  const timer=setInterval(onReturn,30000);
  load(hash);
  return {destroy(){if(destroyed)return;destroyed=true;++generation;clearInterval(timer);root.removeEventListener('click',click);window.removeEventListener('hashchange',onHashChange);window.removeEventListener('focus',onReturn);window.removeEventListener('pageshow',onReturn);document.removeEventListener('visibilitychange',onReturn);disposeComponent();root.replaceChildren();}};
 }
 window.InterviewBingoReceive={mount};
})();
