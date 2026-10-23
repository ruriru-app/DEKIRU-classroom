(()=>{
'use strict';
const $=id=>document.getElementById(id),C=window.CardPrintCore,R=window.CardPrintRender,data=window.DEKIRU_DATA;
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fruitIds=new Set([1,2,7,11,13,14,16,20,21,22,25,27,29,31,32]);
const completed=new Set(data.completedPictureCardIds||[]);
const cards=data.cards.filter(c=>completed.has(c.id)&&c.image&&['standard','plus','lets-try'].includes(c.displayGroup)).map(card=>{
 let category=card.category;
 if(category==='fruits_vegetables'){const number=Number(card.id.split('_').pop());category=fruitIds.has(number)?'fruits':number===18?'nuts':'vegetables';}
 return {...card,category,src:new URL('../'+card.image,document.baseURI).href};
});
const catalog=new Map(cards.map(card=>[card.id,card]));
const labels={...data.categoryLabels,fruits:'フルーツ',vegetables:'野菜',nuts:'木の実'};
const priority=['seasons','sports','colors','fruits','vegetables'];
const categoryIds=[...new Set(cards.map(c=>c.category))].sort((a,b)=>{
 const ai=priority.indexOf(a),bi=priority.indexOf(b);return (ai<0?99:ai)-(bi<0?99:bi);
});
const sides={front:{rule:'category',total:5,selected:new Set(),counts:{}},back:{rule:'category',total:5,selected:new Set(),counts:{}}};
let documentState=null,previewIndex=0,busy=false;
function initial(side,categories){for(const [category,count] of Object.entries(categories)){sides[side].counts[category]=count;cards.filter(c=>c.category===category).forEach(c=>sides[side].selected.add(c.id));}}
initial('front',{seasons:1,sports:1,colors:1});initial('back',{colors:3,sports:4});
function renderSide(side){
 const state=sides[side],root=$(side+'-side');
 root.innerHTML='<h3>'+(side==='front'?'表面の絵':'裏面の絵')+'</h3><div class="side-tools"><label>絵の選び方<select data-rule><option value="category">カテゴリごとに入れる数を指定</option><option value="pooled">選んだ単語全体からランダムに選ぶ</option></select></label><label class="total-field">1枚の絵の数<input data-total type="number" min="1" max="12" value="5"></label></div><label class="select-search">絵を探す<input type="search" data-search placeholder="カテゴリ・英語・日本語で検索"></label><div class="category-list">'+categoryIds.map(category=>{
  const items=cards.filter(c=>c.category===category);
  return '<details class="category" data-category="'+esc(category)+'"><summary><label><input type="checkbox" data-category-toggle="'+esc(category)+'">'+esc(labels[category]||category)+'</label><small data-selected-count></small><label class="category-count-label">1枚に<input class="category-count" aria-label="'+esc((side==='front'?'表面':'裏面')+' '+(labels[category]||category)+'の絵の数')+'" type="number" min="1" max="12" data-category-count="'+esc(category)+'" value="'+(state.counts[category]||1)+'">個</label></summary><div class="category-actions"><button type="button" data-all="'+esc(category)+'">全部選ぶ</button><button type="button" data-none="'+esc(category)+'">全部外す</button></div><div class="word-grid">'+items.map(card=>'<label class="word" data-word="'+esc(card.id)+'"><input type="checkbox" data-card="'+esc(card.id)+'" aria-label="'+esc((side==='front'?'表面 ':'裏面 ')+card.english)+'"'+(state.selected.has(card.id)?' checked':'')+'><img src="'+esc(card.src)+'" loading="lazy" alt=""><span>'+esc(card.english)+'</span><small>'+esc(card.japanese||'')+'</small></label>').join('')+'</div></details>';
 }).join('')+'</div>';
 root.querySelector('[data-rule]').value=state.rule;
 root.querySelector('[data-rule]').onchange=event=>{state.rule=event.target.value;syncSide(side);invalidate();};
 root.querySelector('[data-total]').oninput=event=>{state.total=Number(event.target.value);invalidate();};
 root.querySelector('[data-search]').oninput=event=>{
  const query=event.target.value.trim().toLowerCase();
  root.querySelectorAll('[data-category]').forEach(detail=>{
   const category=detail.dataset.category,categoryMatch=(labels[category]||category).toLowerCase().includes(query);let visible=0;
   detail.querySelectorAll('[data-word]').forEach(label=>{
    const card=catalog.get(label.dataset.word),match=!query||categoryMatch||(card.english+' '+card.japanese).toLowerCase().includes(query);
    label.hidden=!match;if(match)visible++;
   });
   detail.hidden=!visible;if(query&&visible)detail.open=true;
  });
 };
 root.addEventListener('change',event=>{
  const target=event.target;
  if(target.hasAttribute('data-card')){if(target.checked)state.selected.add(target.dataset.card);else state.selected.delete(target.dataset.card);syncSide(side);invalidate();}
  if(target.hasAttribute('data-category-toggle')){setCategory(side,target.dataset.categoryToggle,target.checked);}
  if(target.hasAttribute('data-category-count')){state.counts[target.dataset.categoryCount]=Number(target.value);invalidate();}
 });
 root.addEventListener('click',event=>{
  const button=event.target.closest('[data-all],[data-none]');if(button)setCategory(side,button.dataset.all||button.dataset.none,button.hasAttribute('data-all'));
 });
 syncSide(side);
}
function setCategory(side,category,checked){
 const state=sides[side];
 cards.filter(c=>c.category===category).forEach(c=>checked?state.selected.add(c.id):state.selected.delete(c.id));
 $(side+'-side').querySelectorAll('[data-card]').forEach(input=>input.checked=state.selected.has(input.dataset.card));
 syncSide(side);invalidate();
}
function syncSide(side){
 const root=$(side+'-side'),state=sides[side],pictures=$('kind').value==='pictures';
 root.querySelector('.side-tools').hidden=pictures;
 root.querySelector('.total-field').hidden=pictures||state.rule!=='pooled';
 root.querySelectorAll('[data-category]').forEach(detail=>{
  const items=cards.filter(c=>c.category===detail.dataset.category),selected=items.filter(c=>state.selected.has(c.id)).length,toggle=detail.querySelector('[data-category-toggle]');
  toggle.checked=selected===items.length;toggle.indeterminate=selected>0&&selected<items.length;
  detail.querySelector('[data-selected-count]').textContent=selected+' / '+items.length+'語';
  detail.querySelector('.category-count-label').hidden=pictures||state.rule!=='category';
  detail.querySelector('[data-category-count]').disabled=busy||!selected;
 });
}
function invalidate(){
 documentState=null;
 $('download').disabled=$('front-pdf').disabled=$('back-pdf').disabled=true;
 $('prev-page').disabled=$('next-page').disabled=true;
 $('summary').textContent='';$('page-label').textContent='設定変更後はプレビューを作り直してください。';
 $('preview').replaceChildren();const note=document.createElement('p');note.textContent='現在の設定で「プレビューを作る」を押してください。';$('preview').append(note);
 $('frequency-panel').hidden=true;$('status').textContent='設定を変更しました。プレビューを作ってください。';
}
function updateMode(){
 const pictures=$('kind').value==='pictures',duplex=!pictures&&$('duplex').value==='duplex';
 $('count-field').hidden=pictures;$('copies-field').hidden=!pictures;$('duplex-field').hidden=pictures;$('flip-field').hidden=!duplex;$('back-side').hidden=!duplex;
 $('front-side').querySelector('h3').textContent=pictures?'印刷する絵':'表面の絵';
 $('size').innerHTML=pictures?'<option value="picture1">A4に１枚</option><option value="picture2">A4に２枚</option><option value="picture4">A4に４枚</option><option value="picture6">A4に６枚</option><option value="picture9">A4に９枚</option>':'<option value="nine">A4を９等分・70×99mm（９面）</option><option value="business">名刺用・50×89mm（12面／Interview Bingoと同じ）</option>';
 $('front-pdf').hidden=$('back-pdf').hidden=!duplex;
 $('download').textContent=duplex?'表裏交互のPDFを保存':'PDFを保存';
 $('output-note').textContent=duplex?'表１→裏１→表２→裏２…のPDF、または表用・裏用それぞれのPDFを保存できます。同じ番号が表裏で重なるよう裏の位置を調整しています。':'PDFには絵と文字が含まれます。保存後はPDFを開くだけで印刷できます。';
 syncSide('front');syncSide('back');invalidate();
}
function sideConfig(side){
 const state=sides[side];
 return {rule:state.rule,total:state.total,groups:categoryIds.map(category=>({ids:cards.filter(c=>c.category===category&&state.selected.has(c.id)).map(c=>c.id),count:state.counts[category]??1}))};
}
function lock(value){
 busy=value;
 document.querySelectorAll('.settings input,.settings select,.settings button').forEach(el=>el.disabled=value);
 $('download').disabled=$('front-pdf').disabled=$('back-pdf').disabled=value||!documentState;
 $('prev-page').disabled=value||!documentState||previewIndex===0;
 $('next-page').disabled=value||!documentState||previewIndex===(documentState?.pages.interleaved.length||0)-1;
 $('prefix').disabled=value;
 if(!value){syncSide('front');syncSide('back');}
}
function showPage(){
 if(!documentState)return;
 const state=documentState,page=state.pages.interleaved[previewIndex];
 $('preview').replaceChildren(R.draw(page,state.config,state.artwork,catalog));
 $('page-label').textContent=(previewIndex+1)+' / '+state.pages.interleaved.length+'ページ'+(state.config.duplex?'（'+page.sheet+'枚目・'+(page.side==='front'?'表':'裏')+'）':'');
 lock(false);
}
function frequencies(){
 if(!documentState)return;
 const n=Math.max(1,Math.min(documentState.cards.length,Number($('prefix').value)||1)),counts={};
 const eligible=documentState.usedIds;eligible.forEach(id=>counts[id]=0);
 documentState.cards.slice(0,n).forEach(card=>[...card.front,...card.back].forEach(id=>counts[id]++));
 $('frequencies').replaceChildren(...eligible.map(id=>{const span=document.createElement('span');span.textContent=catalog.get(id).english+'：'+counts[id]+'回';return span;}));
}
async function generate(){
 if(busy)return;
 invalidate();lock(true);
 try{
  const config={kind:$('kind').value,count:Number($('count').value),size:$('size').value,font:$('font').value,title:$('title').value.trim(),duplex:$('kind').value==='activity'&&$('duplex').value==='duplex',flip:$('flip').value,front:sideConfig('front'),back:sideConfig('back')};
  let batch,eligible;
  if(config.kind==='pictures'){eligible=[...sides.front.selected];batch=C.pictureCards(eligible,Number($('copies').value));}
  else{batch=C.generate(config).cards;eligible=[...new Set([...config.front.groups.flatMap(g=>g.ids),...(config.duplex?config.back.groups.flatMap(g=>g.ids):[])])];}
  if(!batch.length)throw Error('印刷する絵がありません。');
  $('status').textContent='絵とフォントを読み込んでいます…';
  const usedIds=[...new Set(batch.flatMap(card=>[...card.front,...card.back]))];
  const artwork=await R.prepare(usedIds.map(id=>catalog.get(id)),config.font);
  const pages=C.pages(batch,config.size,config.duplex,config.flip);
  documentState={cards:batch,config,artwork,pages,usedIds:eligible};previewIndex=0;
  $('summary').textContent=batch.length+'枚・A4 '+pages.interleaved.length+'ページ';
  $('prefix').max=String(batch.length);$('prefix').value=String(batch.length);$('frequency-panel').hidden=config.kind!=='activity';
  $('regenerate').hidden=config.kind!=='activity';
  showPage();frequencies();$('status').textContent='原稿ができました。ページを確認してPDFを保存してください。';
 }catch(error){$('status').textContent=error.message;documentState=null;}finally{lock(false);}
}
async function download(which){
 if(busy||!documentState)return;
 const state=documentState,pages=state.pages[which];lock(true);
 try{
  const jpegs=[];
  for(let i=0;i<pages.length;i++){
   $('status').textContent='PDFを作っています… '+(i+1)+' / '+pages.length+'ページ';
   await new Promise(resolve=>setTimeout(resolve,0));
   const canvas=R.draw(pages[i],state.config,state.artwork,catalog);
   jpegs.push(await R.jpeg(canvas));canvas.width=canvas.height=1;
  }
  const bytes=C.pdf(jpegs,R.width,R.height),blob=new Blob([bytes],{type:'application/pdf'}),url=URL.createObjectURL(blob);
  const link=document.createElement('a');link.href=url;link.download='dekiru-'+(state.config.kind==='activity'?'activity-cards':'picture-cards')+'-'+({front:'front',back:'back',interleaved:state.config.duplex?'front-back':'single'}[which])+'.pdf';
  document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
  $('status').textContent='PDFを保存しました。印刷時は「実際のサイズ（100％）」を選んでください。';
 }catch(error){$('status').textContent='PDFを保存できませんでした。'+error.message;}finally{lock(false);}
}
renderSide('front');renderSide('back');
$('kind').onchange=updateMode;
$('duplex').onchange=()=>{const value=$('size').value;updateMode();if([...$('size').options].some(o=>o.value===value))$('size').value=value;};
for(const id of ['count','copies','size','font','flip','title'])$(id).addEventListener(id==='title'?'input':'change',invalidate);
$('generate').onclick=$('regenerate').onclick=generate;
$('download').onclick=()=>download('interleaved');$('front-pdf').onclick=()=>download('front');$('back-pdf').onclick=()=>download('back');
$('prev-page').onclick=()=>{if(!busy&&documentState&&previewIndex>0){previewIndex--;showPage();}};
$('next-page').onclick=()=>{if(!busy&&documentState&&previewIndex<documentState.pages.interleaved.length-1){previewIndex++;showPage();}};
$('prefix').oninput=frequencies;
updateMode();
})();


