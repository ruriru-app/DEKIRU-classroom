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
 const entry=document.createElement('button');entry.className='feature-tile';entry.innerHTML='<strong>PHRASES</strong><p>文章の練習</p>';body.append(entry);
 const panel=document.createElement('section');panel.className='content-panel nhe-restaurant-phrases';panel.hidden=true;app.querySelector('.nhe-content').append(panel);
 let active=false,activity='',first='food_010',second='drink_004',price='940',target='first',sound=true,clarity=false,rate=.55;
 const all=root.DEKIRU_DATA.cards,products=()=>items().filter(c=>['foods','drinks','desserts'].includes(c.category));
 const image=c=>c?root.CardSet.source(c):'';
 const speech=root.SentenceAudio.create({root:panel,getRate:()=>rate,getEnabled:()=>sound});
 const cards=root.SentenceCards.create({root:panel,iconUrl:'../grade34/assets/ui/originals/読み上げボタン.svg',resolveImage:t=>image(all.find(c=>c.id===t.cardId)),audio:{speak:speech.speak,sentence:(text,parts,el)=>speech.sentence(text,parts,el,clarity)},contractions:{"i'd":['I','would'],"it's":['it','is']},onSelect:key=>{target=key;renderChoices();},onLayout:fit});
 function fit(){const stage=panel.querySelector('.talk-stage');if(stage)cards.fit(stage);}
 const observer=new ResizeObserver(fit);observer.observe(panel);
 function close(){speech.stop();active=false;activity='';panel.hidden=true;menu.hidden=false;heading.hidden=false;}
 function token(word,role='neutral',selectionKey='',symbol='•'){
  const source=all.find(c=>c.english.toLowerCase()===(word==="I'd"?'i':word.toLowerCase()));
  return {word,role,selectionKey,symbol,cardId:source?.id};
 }
 function renderStage(){
  speech.stop();const stage=panel.querySelector('.talk-stage');if(!stage)return;
  let question,answer;
  if(activity==='order'){
   question=[token('What','neutral','','?'),token('would','verb'),token('you','subject'),token('like','verb')];
   answer=[token("I'd",'subject','','I'),token('like','verb')];
   for(const [key,id] of [['first',first],['second',second]]){
    const product=products().find(c=>c.id===id);if(!product)continue;
    if(key==='second')answer.push(token('and'));
    if(countable.has(product.english))answer.push(token(/^[aeiou]/i.test(product.english)?'an':'a'));
    answer.push({...token(product.english,'object',key),cardId:product.id});
   }
  }else{
   question=[token('How','neutral','','?'),token('much','adjective','','¥'),token('is','verb'),token('it','subject')];
   const valid=Number.isInteger(Number(price))&&Number(price)>=1&&Number(price)<=99999;
   answer=[token("It's",'subject','','•'),token(valid?String(Number(price)):'…','object','','¥'),token('yen','object')];
   panel.querySelector('[data-status]').textContent=valid?'':'値段を1～99999円の数字で入力してください。';
  }
  stage.innerHTML='<div class="talk-sequence-layout">'+cards.row(question,'?')+cards.row(answer,'.')+'</div>';cards.bind(stage);requestAnimationFrame(fit);
 }
 function renderChoices(){
  const box=panel.querySelector('[data-choices]');if(!box)return;
  if(activity==='price'){box.innerHTML='<label>値段（円） <input data-price type="text" inputmode="numeric" pattern="[0-9]*" maxlength="5" value="'+esc(price)+'" autocomplete="off"></label><p data-status role="status"></p>';return;}
  box.innerHTML='<div class="talk-choice-head">'+['first','second'].map((key,i)=>'<button class="talk-role-tab role-object" data-target="'+key+'" aria-pressed="'+(target===key)+'">商品'+(i+1)+'</button>').join('')+'</div><div class="talk-choices">'+(target==='second'?'<button class="talk-choice role-object" data-product="">追加しない</button>':'')+products().map(c=>'<button class="talk-choice role-object '+(c.id===(target==='first'?first:second)?'active':'')+'" data-product="'+esc(c.id)+'"><span class="talk-choice-picture"><img src="'+esc(image(c))+'" alt=""></span><span class="talk-choice-word">'+esc(c.english)+'</span></button>').join('')+'</div>';
 }
 function refresh(){
  if(!active)return;
  if(!activity){panel.innerHTML='<div class="sentence-menu"><div class="sentence-menu-heading"><button class="back-button" data-back aria-label="Unitメニューへ戻る">◀</button><h1>PHRASES 文章の練習</h1></div><div class="talk-activity-list">'+[['order','注文',"What would you like? / I'd like a hamburger and juice."],['price','値段',"How much is it? / It's 940 yen."]].map(([id,title,example],i)=>'<button class="talk-activity-choice" data-activity="'+id+'"><span class="talk-activity-heading"><span class="activity-number">'+(i+1)+'</span>'+title+'</span><strong>'+esc(example)+'</strong></button>').join('')+'</div></div>';return;}
  if(!products().some(c=>c.id===first))first=products()[0]?.id||'';
  if(!products().some(c=>c.id===second))second='';
  const audioIcon='../grade34/assets/ui/originals/音声ONOFFと読み方.svg';
  panel.innerHTML='<div class="talk-shell"><div class="talk-topbar"><button class="talk-back" data-back aria-label="やり取りの一覧へ戻る">◀</button><div class="talk-rules">'+[['subject','だれが'],['negative','打ち消し'],['verb','何する'],['adjective','どんな'],['object','だれを・何を'],['place','どこ'],['time','いつ']].map(([role,label])=>'<div class="talk-rule role-'+role+'">'+label+'</div>').join('')+'</div><div class="talk-audio-controls"><div class="talk-icon-row">'+[['sound','音声オン・オフ',sound,''],['clarity','１語ずつ発音',clarity,' second']].map(([key,label,on,extra])=>'<button class="talk-icon-control" data-toggle="'+key+'" aria-label="'+label+'" aria-pressed="'+on+'"><span class="talk-svg-crop'+extra+'"><img src="'+audioIcon+'" alt=""></span></button>').join('')+'</div><label class="talk-speed-control">速さ<select data-rate>'+[[.55,'ゆっくり'],[.85,'ふつう'],[1.2,'はやめ']].map(([n,label])=>'<option value="'+n+'"'+(rate===n?' selected':'')+'>'+label+'</option>').join('')+'</select></label></div></div><div class="talk-stage-wrap"><div class="talk-stage" aria-label="'+(activity==='order'?'注文':'値段')+'のやり取り"></div></div><div class="talk-choice-panel" data-choices></div></div>';
  renderChoices();renderStage();
 }
 entry.onclick=()=>{active=true;activity='';menu.hidden=true;heading.hidden=true;panel.hidden=false;refresh();};
 panel.onclick=e=>{
  const button=e.target.closest('button');if(!button)return;
  if(button.hasAttribute('data-back')){speech.stop();if(activity){activity='';refresh();}else close();}
  if(button.dataset.activity){activity=button.dataset.activity;refresh();}
  if(button.dataset.target){target=button.dataset.target;renderChoices();}
  if(button.hasAttribute('data-product')){if(target==='first')first=button.dataset.product;else second=button.dataset.product;renderChoices();renderStage();}
  if(button.dataset.toggle){if(button.dataset.toggle==='sound'){sound=!sound;speech.stop();}else clarity=!clarity;button.setAttribute('aria-pressed',String(button.dataset.toggle==='sound'?sound:clarity));}
 };
 panel.oninput=e=>{if(e.target.hasAttribute('data-price')){price=e.target.value;renderStage();}};
 panel.onchange=e=>{if(e.target.hasAttribute('data-rate')){rate=Number(e.target.value);speech.stop();}};
 return {refresh,close};
}
const api={exchange,mount};root.NheRestaurantPhrases=api;if(typeof module==='object')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
