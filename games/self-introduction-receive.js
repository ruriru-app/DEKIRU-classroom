(()=>{
 'use strict';
 const root=document.querySelector('#introReceive'),Model=window.SelfIntroductionModel,S=window.SelfIntroductionSession;
 const cards=window.InterviewBingoCards.available(),validIds=new Set(cards.map(c=>c.id));let mounted=null;
 const error=message=>{mounted?.destroy();const p=document.createElement('p');p.className='intro-error';p.setAttribute('role','alert');p.textContent=message;root.replaceChildren(p);};
 const preview=new URLSearchParams(location.search).get('authorPreview')==='1'&&window.parent!==window;
 function open(value,page){
  const delivery=Model.validateDelivery(value,validIds);let state=S.create(delivery),warning='',key='dekiru-self-introduction-progress-v1:'+delivery.deliveryId;
  if(!preview){try{const raw=localStorage.getItem(key);if(raw){try{state=S.validate(delivery,JSON.parse(raw));}catch{warning='保存した内容を読み込めませんでした。この画面で作り直してください。';}}}catch{warning='この端末では保存できません。画面を閉じると入力が失われます。';}}
  if(preview&&page==='presentation'){state.selectedCardIds=delivery.activity.cardIds.slice(0,delivery.activity.maxCards);state.letters='DEKIRU'.split('').map((char,i)=>({char,color:S.COLORS[i%S.COLORS.length]}));state.page='presentation';}
  mounted?.destroy();mounted=window.SelfIntroductionStudent.mount(root,{delivery,cards,state,onChange(next){if(preview)return;try{localStorage.setItem(key,JSON.stringify(next));}catch{root.querySelector('[role=status]').textContent='この端末では保存できません。画面を閉じると入力が失われます。';}}});
  if(warning)root.querySelector('[role=status]').textContent=warning;
 }
 if(preview){
  error('教師が選んだカードをプレビューします。');window.addEventListener('message',event=>{if(event.source!==window.parent||event.origin!==location.origin||event.data?.type!=='self-introduction-preview')return;try{if(!['compose','presentation'].includes(event.data.page))throw Error('表示ページを確認してください。');open(event.data.delivery,event.data.page);}catch(e){error(e.message);}});
 }else{
  let sequence=0;
  async function load(){const attempt=++sequence;try{const token=new URLSearchParams(location.hash.slice(1)).get('intro');if(!token)throw Error('配布された自己紹介シートのURLを開いてください。');const delivery=await window.SelfIntroductionShare.decodeShared(token,validIds);if(attempt===sequence)open(delivery);}catch(e){if(attempt===sequence)error('シートを開けませんでした。\n'+e.message);}}
  window.addEventListener('hashchange',load);load();
 }
})();
