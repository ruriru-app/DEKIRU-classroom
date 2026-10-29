(function(root){
'use strict';
const countable=new Set(['rice ball','sandwich','pancake','hamburger','hot dog','sausage','steak','omelet','pie','fried egg','tuna bowl','donut','parfait','cream puff','candy','cookie','crepe']);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function item(text){return countable.has(text)?(/^[aeiou]/i.test(text)?'an ':'a ')+text:text;}
function exchange(first,second,price){
 if(typeof first!=='string'||!first.trim()||typeof second!=='string')throw Error('商品を選んでください。');
 if(!Number.isInteger(Number(price))||Number(price)<1||Number(price)>99999)throw Error('値段を1～99999円の数字で入力してください。');
 return {orderQuestion:'What would you like?',orderAnswer:"I'd like "+item(first)+(second?' and '+item(second):'')+'.',priceQuestion:'How much is it?',priceAnswer:"It's "+Number(price)+' yen.'};
}
function mount({app,menu,heading,body,items}){
 const section=app.querySelector('.nhe-content'),entry=document.createElement('button');
 entry.className='feature-tile';entry.innerHTML='<strong>PHRASES</strong><p>文章の練習</p>';body.append(entry);
 const panel=document.createElement('section');panel.className='content-panel nhe-restaurant-phrases';panel.hidden=true;section.append(panel);
 let active=false,first='food_010',second='drink_004',price='940',utterance=null;
 const products=()=>items().filter(c=>['foods','drinks','desserts'].includes(c.category));
 function stop(){if(utterance){utterance.onend=utterance.onerror=null;utterance=null;}window.speechSynthesis?.cancel();}
 function close(){stop();active=false;panel.hidden=true;menu.hidden=false;heading.hidden=false;}
 function updateSentences(){
  stop();const byId=new Map(products().map(c=>[c.id,c]));
  try{
   const value=exchange(byId.get(first)?.english,byId.get(second)?.english||'',price);
   panel.querySelector('[data-phrase-status]').textContent='';
   for(const [key,text] of Object.entries(value)){const row=panel.querySelector('[data-phrase="'+key+'"]');row.querySelector('p').textContent=text;row.querySelector('button').dataset.say=text;}
  }catch(error){
   panel.querySelector('[data-phrase-status]').textContent=error.message;
   const row=panel.querySelector('[data-phrase="priceAnswer"]');row.querySelector('p').textContent='It’s … yen.';row.querySelector('button').dataset.say='';
  }
 }
 function refresh(){
  if(!active)return;const cards=products();
  if(!cards.some(c=>c.id===first))first=cards[0]?.id||'';
  if(!cards.some(c=>c.id===second))second='';
  const options=selected=>cards.map(c=>'<option value="'+esc(c.id)+'"'+(c.id===selected?' selected':'')+'>'+esc(c.english)+'（'+esc(c.japanese)+'）</option>').join('');
  panel.innerHTML='<div class="feature-heading"><button class="back-button" type="button" aria-label="Unitメニューへ戻る" data-phrases-back>◀</button><div><p>NEW HORIZON Elementary 5 Unit 6</p><h1>PHRASES 文章の練習</h1></div></div><div class="restaurant-phrase-controls"><label>商品①<select data-product="first">'+options(first)+'</select></label><label>商品②<select data-product="second"><option value="">追加しない</option>'+options(second)+'</select></label><label>値段（円）<input data-price type="text" inputmode="numeric" pattern="[0-9]*" maxlength="5" autocomplete="off" value="'+esc(price)+'"></label></div><p class="restaurant-help">商品は左の「使用する単語」から選んだ食べ物・飲み物・デザートです。値段はテンキーで入力できます。</p><h2>注文</h2>'+['orderQuestion','orderAnswer'].map(row).join('')+'<h2>値段</h2>'+['priceQuestion','priceAnswer'].map(row).join('')+'<p data-phrase-status role="status"></p>';
  if(!cards.length){panel.querySelector('[data-phrase-status]').textContent='左のメニューで商品に使う単語を選んでください。';return;}
  updateSentences();
 }
 function row(key){return '<div class="restaurant-phrase-row" data-phrase="'+key+'"><button type="button" data-say="" aria-label="この文の発音を聞く">🔊</button><p lang="en"></p></div>';}
 entry.onclick=()=>{active=true;menu.hidden=true;heading.hidden=true;panel.hidden=false;refresh();panel.querySelector('[data-phrases-back]').focus();};
 panel.onchange=event=>{const key=event.target.dataset.product;if(key){if(key==='first')first=event.target.value;else second=event.target.value;updateSentences();}};
 panel.oninput=event=>{if(event.target.matches('[data-price]')){price=event.target.value;updateSentences();}};
 panel.onclick=event=>{
  if(event.target.closest('[data-phrases-back]')){close();entry.focus();return;}
  const button=event.target.closest('[data-say]');if(!button||!button.dataset.say)return;
  stop();if(!window.speechSynthesis||!window.SpeechSynthesisUtterance){panel.querySelector('[data-phrase-status]').textContent='このブラウザでは音声を再生できません。';return;}
  utterance=new SpeechSynthesisUtterance(button.dataset.say);utterance.lang='en-US';utterance.rate=.65;
  utterance.onerror=()=>{panel.querySelector('[data-phrase-status]').textContent='音声を再生できませんでした。もう一度押してください。';};window.speechSynthesis.speak(utterance);
 };
 return {refresh,close};
}
const api={exchange,mount};root.NheRestaurantPhrases=api;if(typeof module==='object')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
