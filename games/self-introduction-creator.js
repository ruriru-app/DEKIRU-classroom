/* Author-only Games UI. The standalone pupil page never loads this file. */
(()=>{
 'use strict';
 const Model=window.SelfIntroductionModel,root=document.querySelector('#createSelfIntroduction');
 const cards=window.InterviewBingoCards.available(),validIds=new Set(cards.map(c=>c.id));
 const store=()=>window.SelfIntroductionStore.create(localStorage,{validCardIds:validIds});
 const make=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
 const button=(text,fn)=>{const b=make('button','',text);b.type='button';b.onclick=fn;return b;};
 let editing=null,selected=new Set(),previewPage='compose',latestPreview=null,previewObserver=null;
 const status=message=>{const e=root.querySelector('[data-intro-author-status]');if(e)e.textContent=message;};
 function preset(){const now=new Date().toISOString();return Model.validatePreset({version:1,type:'self-introduction',id:editing?.id||Model.newId(),name:root.querySelector('#introSaveName').value,title:root.querySelector('#introTitle').value,studentInstructions:root.querySelector('#introInstructions').value,cardIds:[...selected],maxCards:Number(root.querySelector('#introMaxCards').value),createdAt:editing?.createdAt||now,updatedAt:now},validIds);}
 function field(title,id,max,value,multiline=false){const label=make('label','intro-author-field',title),input=make(multiline?'textarea':'input');input.id=id;input.maxLength=max;input.value=value;label.append(input);return label;}
 function updatePreview(){
  const frame=root.querySelector('#introPreview'),note=root.querySelector('#introPreviewStatus');
  try{const p=preset();latestPreview={type:'self-introduction-preview',delivery:Model.snapshot(p),page:previewPage};frame.hidden=false;note.textContent='プレビューの入力は保存されません。児童の名前や選択は配布先の端末内だけに保存されます。';frame.contentWindow?.postMessage(latestPreview,location.origin);}catch(e){latestPreview=null;frame.hidden=true;note.textContent=e.message;}
 }
 function selectionChanged(){
  root.querySelector('#introCardCount').textContent=selected.size+' / 100枚を候補に選択中';
  root.querySelectorAll('[data-intro-card]').forEach(b=>b.setAttribute('aria-pressed',String(selected.has(b.dataset.introCard))));
  root.querySelectorAll('[data-intro-group-toggle]').forEach(b=>{const ids=JSON.parse(b.dataset.introGroupToggle),count=ids.filter(id=>selected.has(id)).length;b.setAttribute('aria-pressed',count===ids.length?'true':count?'mixed':'false');});
  updatePreview();
 }
 function setSelection(ids){try{if(ids.size>100)throw Error('候補カードは100枚まで選択できます。');selected=ids;status('');selectionChanged();}catch(e){status(e.message);}}
 function picker(){
  const picker=make('div');picker.id='introCardPicker';const categories=[...new Set(cards.map(c=>c.category))];
  for(const category of categories){const group=make('details'),summary=make('summary','',window.GAMES_DATA.categoryLabels[category]||category);group.append(summary);
   for(const tier of ['standard','plus','lets-try']){const items=cards.filter(c=>c.category===category&&c.displayGroup===tier);if(!items.length)continue;
    const block=make('section','intro-author-tier'),ids=items.map(c=>c.id),toggle=button(({standard:'スタンダード',plus:'プラス','lets-try':'追加語'})[tier]+'（'+ids.length+'枚）をまとめて選ぶ',()=>{const next=new Set(selected),all=ids.every(id=>next.has(id));ids.forEach(id=>all?next.delete(id):next.add(id));setSelection(next);});toggle.dataset.introGroupToggle=JSON.stringify(ids);block.append(toggle);
    const chips=make('div','intro-author-chips');items.forEach(card=>{const b=button(card.english,()=>{const next=new Set(selected);next.has(card.id)?next.delete(card.id):next.add(card.id);setSelection(next);});b.dataset.introCard=card.id;chips.append(b);});block.append(chips);group.append(block);
   }picker.append(group);
  }return picker;
 }
 function open(id){
  try{editing=id?store().listPresets().find(p=>p.id===id):null;if(id&&!editing)throw Error('保存したシートが見つかりません。');}catch(e){renderLibrary(e.message);show('createActivities');return;}
  previewObserver?.disconnect();previewPage='compose';latestPreview=null;selected=new Set(editing?.cardIds||[]);root.replaceChildren();
  const heading=make('div','head activity-compact-heading'),back=button('戻る',()=>{renderLibrary();show('createActivities');});back.className='back';back.dataset.back='createActivities';heading.append(back,make('h1','','自己紹介シートを作る'),make('p','create-games-note','このブラウザに保存 ／ 読み上げはありません。児童には別ページを配布します。'));
  const layout=make('div','interview-editor-layout intro-editor-layout'),form=make('div','intro-author-form');
  form.append(field('保存名','introSaveName',80,editing?.name||'自己紹介シート'),field('活動タイトル','introTitle',80,editing?.title||'じこしょうかい'),field('児童への説明','introInstructions',500,editing?.studentInstructions||'なまえをつくって、好きなものをえらぼう！',true));
  const limit=make('label','intro-author-field','児童が選べる最大枚数'),select=make('select');select.id='introMaxCards';select.setAttribute('aria-label','児童が選べる最大枚数');for(let i=1;i<=5;i++){const o=make('option','',i+'枚');o.value=i;select.append(o);}select.value=editing?.maxCards||5;limit.append(select);form.append(limit,make('h2','','Picture Cards'));
  const count=make('p');count.id='introCardCount';form.append(count,picker(),button('シートを保存',()=>{try{store().savePreset(preset());renderLibrary('保存しました。');show('createActivities');}catch(e){status(e.message);}}));
  const notice=make('p');notice.dataset.introAuthorStatus='';notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');form.append(notice);
  const preview=make('section','interview-preview-panel'),toolbar=make('div','interview-preview-toolbar');toolbar.append(make('strong','','プレビュー'));
  for(const [page,label] of [['compose','児童：つくる'],['presentation','児童：みせる']]){const b=button(label,()=>{previewPage=page;toolbar.querySelectorAll('[data-intro-preview-page]').forEach(v=>v.setAttribute('aria-pressed',String(v.dataset.introPreviewPage===page)));updatePreview();});b.dataset.introPreviewPage=page;b.setAttribute('aria-pressed',String(page===previewPage));toolbar.append(b);}
  const note=make('small');note.id='introPreviewStatus';toolbar.append(note);const viewport=make('div','interview-preview-viewport'),device=make('div','interview-preview-device'),frame=make('iframe');frame.id='introPreview';frame.title='自己紹介の児童用プレビュー';frame.onload=()=>{if(latestPreview)frame.contentWindow.postMessage(latestPreview,location.origin);};frame.src='self-introduction-receive.html?authorPreview=1';device.append(frame);viewport.append(device);preview.append(toolbar,viewport);layout.append(form,preview);root.append(heading,layout);
  form.addEventListener('input',updatePreview);form.addEventListener('change',updatePreview);show('createSelfIntroduction');
  const resize=()=>{const scale=Math.min(viewport.clientWidth/1366,viewport.clientHeight/768);device.style.width='1366px';device.style.height='768px';device.style.transform='scale('+scale+')';device.style.left=Math.max(0,(viewport.clientWidth-1366*scale)/2)+'px';device.style.top=Math.max(0,(viewport.clientHeight-768*scale)/2)+'px';};previewObserver=new ResizeObserver(resize);previewObserver.observe(viewport);resize();selectionChanged();
 }
 function download(p){const blob=new Blob([JSON.stringify(p,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=make('a');a.href=url;a.download='self-introduction-'+p.id+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 function renderLibrary(message=''){
  const library=document.querySelector('#introLibrary'),notice=document.querySelector('#introLibraryStatus');library.replaceChildren();notice.textContent=message;
  let presets;try{presets=store().listPresets();}catch(e){notice.textContent=e.message;return;}
  if(!presets.length){library.append(make('p','','保存した自己紹介シートはありません。'));return;}
  for(const p of presets){const tile=make('article','created-game-card activity-blue-tile intro-saved-card');tile.dataset.introPreset=p.id;
   const info=make('div','intro-saved-info');info.append(make('strong','',p.name),make('span','',p.title),make('small','','候補'+p.cardIds.length+'枚 ／ 児童が選べる最大'+p.maxCards+'枚'));
   const actions=make('div','intro-saved-actions'),run=fn=>{try{fn();}catch(e){notice.textContent=e.message;}};
   actions.append(button('編集',()=>open(p.id)),button('複製',()=>run(()=>{const now=new Date().toISOString();store().savePreset({...p,id:Model.newId(),name:(p.name+'（コピー）').slice(0,80),createdAt:now,updatedAt:now});renderLibrary('複製しました。');})),button('削除',()=>{if(confirm('「'+p.name+'」を削除しますか？'))run(()=>{store().deletePreset(p.id);renderLibrary('削除しました。');});}),button('設定ファイルDL',()=>download(p)),button('児童用URLコピー',async()=>{
    try{const url=await window.SelfIntroductionShare.buildShortUrl(Model.snapshot(p),new URL('self-introduction-receive.html',location.href).href);const box=document.querySelector('#introShareUrl');box.value=url;box.hidden=false;try{await navigator.clipboard.writeText(url);notice.textContent='児童用URLをコピーしました。';}catch{notice.textContent='下のURLを選択してコピーしてください。';box.focus();box.select();}}catch(e){notice.textContent=e.message;}
   }));tile.append(info,actions);library.append(tile);
  }
 }
 document.querySelector('#openSelfIntroductionCreator').onclick=()=>open();
 document.querySelector('#introImport').onchange=async event=>{const input=event.target,file=input.files[0],notice=document.querySelector('#introLibraryStatus');if(!file)return;try{if(file.size>160000)throw Error('ファイルは160KB以内にしてください。');const p=Model.validatePreset(JSON.parse(await file.text()),validIds),now=new Date().toISOString();store().savePreset({...p,id:Model.newId(),createdAt:now,updatedAt:now});renderLibrary('新しいセットとして読み込みました。');}catch(e){notice.textContent='設定ファイルを読み込めませんでした。 '+e.message;}finally{input.value='';}};
 window.SelfIntroductionCreator={open,renderLibrary};renderLibrary();
})();
