(function(root){
 'use strict';
 const Model=root.SelfIntroductionModel||(typeof require==='function'?require('./self-introduction-model.js'):null);
 const COLOR_OPTIONS=[
  {english:'white',value:'#FFFFFF'},{english:'red',value:'#EA5454'},{english:'orange',value:'#FFB463'},
  {english:'yellow',value:'#F6D64B'},{english:'green',value:'#64B574'},{english:'pink',value:'#F48BA8'},
  {english:'purple',value:'#B59AD9'},{english:'brown',value:'#855D43'},{english:'black',value:'#333333'},
  {english:'blue',value:'#8BB7E8'},{english:'light blue',value:'#98DCEB'},{english:'yellow green',value:'#ADD74D'}
 ];
 const COLORS=COLOR_OPTIONS.map(c=>c.value),DEFAULT_COLOR='#333333';
 // Old progress remains readable, but only the twelve lesson colors appear in the picker.
 const acceptedColors=new Set([...COLORS,'#8CCBC2','#A8D08D','#7A6E65']);
 const check=Model.check;
 function create(delivery){return {version:1,deliveryId:delivery.deliveryId,letters:[],selectedCardIds:[],page:'compose'};}
 function validate(delivery,value){
  check(value?.version===1&&value.deliveryId===delivery.deliveryId,'このシートの保存データではありません。');
  check(Array.isArray(value.letters)&&value.letters.length<=120,'名前は120文字以内にしてください。');
  const letters=value.letters.map(l=>{check(l&&/^[A-Z ]$/.test(l.char)&&acceptedColors.has(l.color),'名前の文字や色を確認してください。');return {char:l.char,color:l.color};});
  check(Array.isArray(value.selectedCardIds)&&value.selectedCardIds.length<=delivery.activity.maxCards,'選んだカードの枚数を確認してください。');
  const selectedCardIds=[...value.selectedCardIds];check(new Set(selectedCardIds).size===selectedCardIds.length&&selectedCardIds.every(id=>delivery.activity.cardIds.includes(id)),'選んだカードを確認してください。');
  check(['compose','presentation'].includes(value.page)&&!(value.page==='presentation'&&!selectedCardIds.length),'カードを1枚以上えらんでください。');
  return {version:1,deliveryId:delivery.deliveryId,letters,selectedCardIds,page:value.page};
 }
 function change(d,s,fn){const next=validate(d,s);fn(next);return validate(d,next);}
 const addLetter=(d,s,char)=>change(d,s,n=>n.letters.push({char,color:DEFAULT_COLOR}));
 const removeLetter=(d,s,index)=>change(d,s,n=>{check(Number.isInteger(index)&&index>=0&&index<n.letters.length,'消す文字をえらんでください。');n.letters.splice(index,1);});
 const colorLetter=(d,s,index,color)=>change(d,s,n=>{check(Number.isInteger(index)&&index>=0&&index<n.letters.length,'文字をえらんでください。');n.letters[index].color=color;});
 const chooseCard=(d,s,id)=>change(d,s,n=>{check(!n.selectedCardIds.includes(id),'このカードは選択済みです。');n.selectedCardIds.push(id);});
 const removeCard=(d,s,index)=>change(d,s,n=>{check(Number.isInteger(index)&&index>=0&&index<n.selectedCardIds.length,'外すカードをえらんでください。');n.selectedCardIds.splice(index,1);if(!n.selectedCardIds.length)n.page='compose';});
 const setPage=(d,s,page)=>change(d,s,n=>n.page=page);
 const api={COLORS,COLOR_OPTIONS,DEFAULT_COLOR,create,validate,addLetter,removeLetter,colorLetter,chooseCard,removeCard,setPage};root.SelfIntroductionSession=api;if(typeof module==='object')module.exports=api;
})(typeof window==='object'?window:globalThis);
