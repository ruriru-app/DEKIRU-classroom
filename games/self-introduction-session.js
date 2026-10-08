(function(root){
 'use strict';
 const Model=root.SelfIntroductionModel||(typeof require==='function'?require('./self-introduction-model.js'):null);
 const COLORS=['#8CCBC2','#A8D08D','#FFB463','#F48BA8','#B59AD9','#8BB7E8','#7A6E65','#FFFFFF'];
 const check=Model.check;
 function create(delivery){return {version:1,deliveryId:delivery.deliveryId,letters:[],selectedCardIds:[],page:'compose'};}
 function validate(delivery,value){
  check(value?.version===1&&value.deliveryId===delivery.deliveryId,'このシートの保存データではありません。');
  check(Array.isArray(value.letters)&&value.letters.length<=120,'名前は120文字以内にしてください。');
  const letters=value.letters.map(l=>{check(l&&/^[A-Z ]$/.test(l.char)&&COLORS.includes(l.color),'名前の文字や色を確認してください。');return {char:l.char,color:l.color};});
  check(Array.isArray(value.selectedCardIds)&&value.selectedCardIds.length<=delivery.activity.maxCards,'選んだカードの枚数を確認してください。');
  const selectedCardIds=[...value.selectedCardIds];check(new Set(selectedCardIds).size===selectedCardIds.length&&selectedCardIds.every(id=>delivery.activity.cardIds.includes(id)),'選んだカードを確認してください。');
  check(['compose','presentation'].includes(value.page)&&!(value.page==='presentation'&&!selectedCardIds.length),'カードを1枚以上えらんでください。');
  return {version:1,deliveryId:delivery.deliveryId,letters,selectedCardIds,page:value.page};
 }
 function change(d,s,fn){const next=validate(d,s);fn(next);return validate(d,next);}
 const addLetter=(d,s,char)=>change(d,s,n=>n.letters.push({char,color:COLORS[0]}));
 const removeLetter=(d,s,index)=>change(d,s,n=>{check(Number.isInteger(index)&&index>=0&&index<n.letters.length,'消す文字をえらんでください。');n.letters.splice(index,1);});
 const colorLetter=(d,s,index,color)=>change(d,s,n=>{check(Number.isInteger(index)&&index>=0&&index<n.letters.length,'文字をえらんでください。');n.letters[index].color=color;});
 const chooseCard=(d,s,id)=>change(d,s,n=>{check(!n.selectedCardIds.includes(id),'このカードは選択済みです。');n.selectedCardIds.push(id);});
 const removeCard=(d,s,index)=>change(d,s,n=>{check(Number.isInteger(index)&&index>=0&&index<n.selectedCardIds.length,'外すカードをえらんでください。');n.selectedCardIds.splice(index,1);if(!n.selectedCardIds.length)n.page='compose';});
 const setPage=(d,s,page)=>change(d,s,n=>n.page=page);
 const api={COLORS,create,validate,addLetter,removeLetter,colorLetter,chooseCard,removeCard,setPage};root.SelfIntroductionSession=api;if(typeof module==='object')module.exports=api;
})(typeof window==='object'?window:globalThis);
