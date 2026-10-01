/* Separate authoring UI with Games-only student trials and anonymous paper cards.
   No distribution or Classroom registration here. */
(()=>{
  'use strict';
  const M=window.InterviewModel,B=window.InterviewBingoModel;
  const store=()=>window.InterviewBingoStore.create(localStorage),esc=escapeHtml;
  const root=document.getElementById('createInterviewBingo');
  const bookNames={lt1:"Let's Try! 1",lt2:"Let's Try! 2",nh5:'New Horizon Elementary 5',nh6:'New Horizon Elementary 6'};
  let editing=null,resizeObserver=null,rosterPreview=null,studentPreview=null,printPreview=null;
  function units(){
    const rows=[...document.querySelectorAll('[name=creatorAssignedUnit]')].map(e=>({value:e.value,label:e.parentElement.textContent}));
    const senior={nh5:['Hello, friends!','Happy birthday!','Can you play dodgeball?','Who is this?','Let’s go to the zoo.','At a restaurant.','Welcome to Japan!','Who is your hero?'],nh6:['This is me!','My Daily Schedule','My Weekend','Let’s see the world.','Where is it from?','Save the animals.','My Best Memory','My Future, My Dream']};
    for(const [book,titles] of Object.entries(senior))titles.forEach((title,i)=>rows.push({value:book+':'+(i+1),label:bookNames[book]+' Unit '+(i+1)+' — '+title}));
    return rows;
  }
  const field=(label,id,max,value='',multiline=false)=>`<label class="interview-field"><span id="${id}Label">${label}</span>${multiline?`<textarea id="${id}" aria-labelledby="${id}Label" maxlength="${max}" rows="2">${esc(value)}</textarea>`:`<input id="${id}" aria-labelledby="${id}Label" maxlength="${max}" value="${esc(value)}">`}</label>`;
  const status=message=>{root.querySelector('.interview-form [role=status]').textContent=message;};
  function open(id,{previewOnly=false}={}){
    try{
      editing=id?store().listPresets().find(p=>p.id===id):null;
      if((id||previewOnly)&&!editing)throw Error('プリセットが見つかりません');
      resizeObserver?.disconnect();
      studentPreview?.destroy();
      printPreview?.destroy();
      root.classList.toggle('bingo-preview-only',previewOnly);
      const recommendations=editing?.recommendations||B.defaultRecommendations(),allUnits=units();
      root.innerHTML=`<div class="head activity-compact-heading"><button type="button" id="bingoBack" aria-label="戻る">戻る</button><h1>${previewOnly?'Interview Bingoを試す':'Interview Bingoを作る'}</h1><p>${previewOnly?'保存した設定で試せます ／ 試した内容は保存されません':'このブラウザに保存 ／ 児童画面はGames内の試作プレビューです'}</p></div>
        <div class="interview-editor-layout">
          ${previewOnly?'':`<div class="interview-form">
            ${field('活動タイトル','bingoTitle',80,editing?.title||'INTERVIEW BINGO')}
            ${field('児童への説明','bingoInstructions',500,editing?.studentInstructions||'',true)}
            ${field('教師用メモ','bingoMemo',500,editing?.teacherMemo||'',true)}
            <small>教師用メモは児童には表示しません。</small>
            <section><h2>活動で使う表現</h2><div id="bingoExpressions"></div><button type="button" id="bingoAddExpression" aria-label="文を追加">＋</button><small>質問と答えを1文ずつ入力します。全体で200文字以内です。同じ (P) は同じカードに置き換わります。別々に選ぶ場合は (P1)～(P9) を使えます（最大9枠）。</small></section>
            <section><h2>Picture Cards</h2><p id="bingoCardCount"></p><small>児童が使うカードの候補を選びます（最大100枚）。</small><div id="bingoCards"></div></section>
            <section><h2>おすすめ設定</h2><p>BINGO候補カード数</p><div class="bingo-recommendations">
              ${[3,4,5].map(size=>`<div class="bingo-range"><strong>${size}×${size}</strong><label>推奨最小数<input type="number" min="1" max="100" step="1" data-size="${size}" data-bound="min" aria-label="${size}×${size} 推奨最小数" value="${recommendations.candidateCounts[size].min}"></label><span>～</span><label>推奨最大数<input type="number" min="1" max="100" step="1" data-size="${size}" data-bound="max" aria-label="${size}×${size} 推奨最大数" value="${recommendations.candidateCounts[size].max}"></label><span>枚</span></div>`).join('')}
            </div><label class="bingo-my-card">配布用カード おすすめ：<input id="bingoMyCardCount" aria-label="配布用カード おすすめ語数" type="number" min="1" max="100" step="1" value="${recommendations.myCardWordCount}">語</label><small>推奨値のみ保存します。実際のBINGOサイズ・語数は教師用で試せます。配布用カードは紙で配布します。</small></section>
            <section><h2>割り当てるUnit</h2><small>保存すると、同じブラウザのClassroomの割り当てたUnitから教師用の準備画面を開けます。</small><div class="interview-units">${Object.entries(bookNames).map(([book,title])=>`<details data-unit-book="${book}"><summary>${title}</summary>${allUnits.filter(u=>u.value.startsWith(book+':')).map(u=>`<label><input type="checkbox" name="bingoUnit" value="${u.value}">${esc(u.label.replace(/^.*?Unit\s*(\d+)\s*(?:—\s*)?/,'Unit $1　'))}</label>`).join('')}</details>`).join('')}</div></section>
            <button type="button" id="bingoSave">プリセットを保存</button><small>この端末のブラウザ内に保存します。公開・端末間の同期は行いません。</small><p role="status" aria-live="polite"></p>
          </div>`}
          <section class="interview-preview-panel" aria-label="Interview Bingoのプレビュー">
            <div class="interview-preview-toolbar"><strong>プレビュー</strong><div role="group" aria-label="プレビュー画面">${[['teacher','教師用'],['compose','児童：シート作り'],['interview','児童：インタビュー'],['my-card','配布用カード']].map(([key,label])=>`<button type="button" data-bingo-tab="${key}" aria-pressed="${key==='teacher'}">${label}</button>`).join('')}</div><small>児童画面は設定した人数の仮名で試せます。配置・名前は保存しません。配布用カードは匿名で印刷できます。児童への配信は未実装です。</small></div>
            <div id="bingoPreviewContent"></div>
          </section>
        </div>`;
      const cards=rouletteAvailableCards(),cardMap=new Map(cards.map(c=>[c.id,c])),selected=new Set(editing?.cardIds||[]),groups=new Map();
      for(const card of cards){if(!groups.has(card.category))groups.set(card.category,[]);groups.get(card.category).push(card);}
      let setNameFromTitle=true,tab='teacher';const previewSelections={},Q=window.InterviewBingoSetup;
      let sourceIds=[...selected],trialDraft=Q.initial({cardIds:sourceIds,recommendedMyCardWordCount:recommendations.myCardWordCount,setName:editing?.title||'INTERVIEW BINGO'}),applied=null,batch=null,teacherView=null;
      const box=root.querySelector('#bingoPreviewContent'),teacherPane=document.createElement('div');box.append(teacherPane);
      rosterPreview=window.InterviewBingoRosterPreview.create({onCountChange(){if(teacherView)updateSettings();}});
      studentPreview=window.InterviewBingoStudent.create({onPageChange:setTab});
      printPreview=window.InterviewBingoPrint.create({onRegenerate:()=>generateCards(true)});
      box.append(studentPreview.element,printPreview.element);
      teacherView=window.InterviewBingoTeacher.create({onChange:changeConfig,onTry:()=>setTab('compose'),onGenerate:()=>generateCards(false),onUseRosterCount(){const count=rosterPreview.getSelectedCount();if(count!==null)changeConfig({...trialDraft,participantCount:count});}});
      function invalidatePrint(){batch=null;printPreview.invalidate('設定が変更されました。教師用画面から配布用カードを作り直してください。');}
      function changeConfig(config){if(config.setName!==trialDraft.setName)setNameFromTitle=false;if(Q.printKey(config)!==Q.printKey(trialDraft))invalidatePrint();trialDraft=config;updateSettings();}
      function updateSettings(){
        const value=draft(),validation=Q.validate(trialDraft,value.cardIds);
        const distribution=batch?Object.fromEntries(batch.config.candidateIds.map(id=>[id,0])):null;
        if(batch)for(const card of batch.cards.slice(0,trialDraft.participantCount))for(const id of card)distribution[id]++;
        teacherView.update({config:trialDraft,cards:value.cardIds.map(id=>cardMap.get(id)),recommendations:value.recommendations,dirty:!applied||Q.boardKey(applied)!==Q.boardKey(trialDraft)||Q.printKey(applied)!==Q.printKey(trialDraft),...validation,rosterCount:rosterPreview.getSelectedCount(),distribution});
      }
      function applyConfig(){
        const value=draft();if(Q.validate(trialDraft,value.cardIds).errors.length)return false;
        const reset=!applied||Q.boardKey(applied)!==Q.boardKey(trialDraft);
        if(reset&&studentPreview.getProgress().filled&&!confirm('設定を変更すると、BINGOの配置と名前がリセットされます。変更しますか？'))return false;
        studentPreview.update({activity:{title:value.title,studentInstructions:value.studentInstructions,expressions:value.expressions},cards:trialDraft.candidateIds.map(id=>cardMap.get(id)),config:trialDraft,reset});
        applied={...trialDraft,candidateIds:[...trialDraft.candidateIds]};return true;
      }
      function setTab(page){
        if(page!=='teacher'&&!applyConfig())page='teacher';
        tab=page;root.querySelectorAll('[data-bingo-tab]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.bingoTab===page)));updatePreview();
      }
      function generateCards(force){
        if(!applyConfig()){setTab('teacher');return;}
        if(force||!batch){batch=window.InterviewBingoMyCard.generate(applied);printPreview.update({batch,cards:applied.candidateIds.map(id=>cardMap.get(id))});}
        setTab('my-card');
      }
      const readExpressions=()=>[...root.querySelectorAll('[data-bingo-expression]')].map(input=>input.value);
      function renderExpressions(values){
        const box=root.querySelector('#bingoExpressions');box.replaceChildren();
        values.forEach((value,index)=>{
          const row=document.createElement('div');row.className='interview-row';
          row.innerHTML=`<label class="interview-field">${index+1}文目<input data-bingo-expression maxlength="200" value="${esc(value)}"></label><button type="button" aria-label="${index+1}文目を削除" ${values.length===1?'disabled':''}>−</button>`;
          row.querySelector('button').onclick=()=>{renderExpressions(readExpressions().filter((_,i)=>i!==index));updatePreview();};box.append(row);
        });
      }
      if(!previewOnly){
      renderExpressions(M.sentenceTemplates(editing?.expressions.template||'Do you have (P)?'));
      root.querySelector('#bingoAddExpression').onclick=()=>{renderExpressions([...readExpressions(),'']);[...root.querySelectorAll('[data-bingo-expression]')].at(-1).focus();updatePreview();};
      // Same category / tier / individual selection behavior as Interview Creator.
      root.querySelector('#bingoCards').innerHTML=[...groups].map(([category,list])=>`<details data-card-category="${esc(category)}"><summary><input type="checkbox" data-category-toggle="${esc(category)}" aria-label="${esc(categoryLabel(category))}をまとめて選択・解除"><span>${esc(categoryLabel(category))}（${list.length}）</span></summary><div class="interview-options">${['standard','plus','lets-try'].map(tier=>{
        const rows=list.filter(c=>c.displayGroup===tier);if(!rows.length)return '';
        const label=tier==='standard'?'スタンダード':tier==='plus'?'プラス':'Let’s Try! 追加語';
        return `<div class="interview-tier" data-card-tier="${tier}"><label><input type="checkbox" data-tier-toggle aria-label="${esc(categoryLabel(category))} ${label}を一括選択">${label}（${rows.length}）</label><div class="interview-tier-chips">${rows.map(c=>`<button type="button" class="interview-chip" data-card-id="${esc(c.id)}" aria-pressed="false">${esc(c.english)}</button>`).join('')}</div></div>`;
      }).join('')}</div></details>`).join('');
      function syncSelection(){
        root.querySelector('#bingoCardCount').textContent=selected.size+'枚を選択中';
        root.querySelectorAll('#bingoCards [data-card-id]').forEach(button=>button.setAttribute('aria-pressed',String(selected.has(button.dataset.cardId))));
        root.querySelectorAll('[data-category-toggle],[data-tier-toggle]').forEach(input=>{
          const ids=input.hasAttribute('data-category-toggle')?groups.get(input.dataset.categoryToggle).map(c=>c.id):[...input.closest('[data-card-tier]').querySelectorAll('[data-card-id]')].map(b=>b.dataset.cardId);
          const n=ids.filter(id=>selected.has(id)).length;input.checked=n===ids.length;input.indeterminate=n>0&&n<ids.length;
        });
      }
      root.querySelectorAll('[data-card-id]').forEach(button=>button.onclick=()=>{const id=button.dataset.cardId;selected.has(id)?selected.delete(id):selected.add(id);syncSelection();updatePreview();});
      root.querySelectorAll('[data-category-toggle],[data-tier-toggle]').forEach(input=>{
        input.onclick=event=>event.stopPropagation();
        input.onchange=()=>{
          const ids=input.hasAttribute('data-category-toggle')?groups.get(input.dataset.categoryToggle).map(c=>c.id):[...input.closest('[data-card-tier]').querySelectorAll('[data-card-id]')].map(b=>b.dataset.cardId);
          ids.forEach(id=>input.checked?selected.add(id):selected.delete(id));syncSelection();updatePreview();
        };
      });
      syncSelection();
      root.querySelectorAll('[name=bingoUnit]').forEach(input=>{input.checked=!!editing?.assignedUnits.some(u=>input.value===u.bookId+':'+u.unit);});
      }
      function draft(){
        // Trials use the saved snapshot; they never build or save an author draft.
        if(previewOnly)return editing;
        const now=new Date().toISOString(),cardIds=cards.filter(c=>selected.has(c.id)).map(c=>c.id),template=readExpressions().flatMap(M.sentenceTemplates).join('\n'),candidateCounts={};
        for(const size of [3,4,5])candidateCounts[size]=Object.fromEntries(['min','max'].map(bound=>[bound,Number(root.querySelector(`[data-size="${size}"][data-bound="${bound}"]`).value)]));
        return {version:1,type:'interview-bingo',id:editing?.id||M.newId('interview-bingo'),title:root.querySelector('#bingoTitle').value,studentInstructions:root.querySelector('#bingoInstructions').value,teacherMemo:root.querySelector('#bingoMemo').value,expressions:{template,slots:M.slotIds(template).map(id=>({id,type:'picture-card',cardIds}))},cardIds,recommendations:{candidateCounts,myCardWordCount:Number(root.querySelector('#bingoMyCardCount').value)},assignedUnits:[...root.querySelectorAll('[name=bingoUnit]:checked')].map(e=>{const [bookId,unit]=e.value.split(':');return {bookId,unit:Number(unit)};}),createdAt:editing?.createdAt||now,updatedAt:now};
      }
      function updatePreview(){
        const value=draft(),box=root.querySelector('#bingoPreviewContent'),scroll=box.scrollTop;
        if(setNameFromTitle&&trialDraft.setName!==value.title){trialDraft={...trialDraft,setName:value.title};invalidatePrint();}
        if(JSON.stringify(sourceIds)!==JSON.stringify(value.cardIds)){
          trialDraft=Q.reconcileCandidates(trialDraft,sourceIds,value.cardIds);if(applied)applied=Q.reconcileCandidates(applied,sourceIds,value.cardIds);
          sourceIds=[...value.cardIds];invalidatePrint();
        }
        const studentTab=tab==='compose'||tab==='interview';
        studentPreview.update({activity:{title:value.title,studentInstructions:value.studentInstructions,expressions:value.expressions},cards:(applied?.candidateIds||[]).map(id=>cardMap.get(id)),page:studentTab?tab:undefined});
        box.classList.toggle('bingo-student-active',studentTab);
        teacherPane.hidden=tab!=='teacher';studentPreview.element.hidden=!studentTab;printPreview.element.hidden=tab!=='my-card';updateSettings();
        if(studentTab){
          // The same element may be in its modal dialog; never move it back mid-trial.
          if(!studentPreview.element.closest('dialog')&&studentPreview.element.parentNode!==box)box.append(studentPreview.element);
          return;
        }
        if(tab==='my-card')return;
        let validation='';try{B.validatePreset(value,new Set(cardMap.keys()));}catch(e){validation=e.message;}
        const choices=value.cardIds.map(id=>cardMap.get(id));
        for(const slot of value.expressions.slots)if(!selected.has(previewSelections[slot.id]))previewSelections[slot.id]=choices[0]?.id;
        let completed='カードを選ぶと、(P) を置き換えた表現を確認できます。';
        try{completed=B.completeExpressions(value,Object.fromEntries(value.expressions.slots.map(s=>[s.id,cardMap.get(previewSelections[s.id])])));}catch{/* Incomplete drafts remain visible. */}
        // Keep the roster panel instance (and its choices) when author fields change.
        teacherPane.innerHTML=`<h2 class="bingo-teacher-heading">Interview Bingoの準備</h2><div class="bingo-teacher-layout">
          <article class="bingo-preview-summary"><h2>${esc(value.title||'活動タイトルを入力してください')}</h2>
            ${value.studentInstructions?`<p><strong>児童への説明</strong><br>${esc(value.studentInstructions)}</p>`:''}
            ${tab==='teacher'&&value.teacherMemo?`<p class="bingo-preview-memo"><strong>教師用メモ</strong><br>${esc(value.teacherMemo)}</p>`:''}
            <h3>活動で使う表現</h3><p class="bingo-expression-text">${esc(value.expressions.template||'表現を入力してください')}</p>
            <div class="bingo-preview-selectors">${value.expressions.slots.map(slot=>`<label>(${slot.id}) の確認<input type="hidden" value="${slot.id}"><select data-preview-slot="${slot.id}" aria-label="(${slot.id}) の確認" ${choices.length?'':'disabled'}>${choices.length?choices.map(c=>`<option value="${esc(c.id)}" ${previewSelections[slot.id]===c.id?'selected':''}>${esc(c.english)}</option>`).join(''):'<option>カード未選択</option>'}</select></label>`).join('')}</div>
            <p id="bingoCompletedExpressions" class="bingo-expression-text">${esc(completed)}</p>
            ${validation?`<p class="bingo-preview-notice">保存前の確認：${esc(validation)}</p>`:''}
          </article><div class="bingo-teacher-right"></div></div>`;
        teacherPane.querySelector('article').append(teacherView.candidatesElement);teacherPane.querySelector('.bingo-teacher-right').append(teacherView.element,rosterPreview.element);
        box.scrollTop=scroll;
        box.querySelectorAll('[data-preview-slot]').forEach(select=>select.onchange=event=>{event.stopPropagation();previewSelections[select.dataset.previewSlot]=select.value;updatePreview();});
      }
      root.querySelectorAll('[data-bingo-tab]').forEach(button=>button.onclick=()=>setTab(button.dataset.bingoTab));
      if(!previewOnly){
      root.querySelector('.interview-form').oninput=()=>{status('');updatePreview();};
      root.querySelector('.interview-form').onchange=updatePreview;
      root.querySelector('#bingoSave').onclick=()=>{
        try{
          const clean=B.validatePreset(draft(),new Set(cardMap.keys()));store().savePreset(clean);studentPreview.destroy();printPreview.destroy();renderLibrary();show('createActivities');
        }catch(e){status(e.message);}
      };
      }
      root.querySelector('#bingoBack').onclick=()=>{
        studentPreview.destroy();printPreview.destroy();renderLibrary();show('createActivities');
        if(previewOnly)[...document.querySelectorAll('#bingoLibrary [data-preview]')].find(button=>button.dataset.preview===id)?.focus();
      };
      const layout=root.querySelector('.interview-editor-layout');
      function resize(){if(root.classList.contains('active'))layout.style.height=innerWidth>900?Math.max(350,innerHeight-layout.getBoundingClientRect().top-16)+'px':'auto';}
      resizeObserver=new ResizeObserver(resize);resizeObserver.observe(document.documentElement);
      show('createInterviewBingo');updatePreview();resize();
      if(previewOnly)root.querySelector('[data-bingo-tab=teacher]').focus();
    }catch(e){document.getElementById('bingoLibrary').textContent=e.message;show('createActivities');}
  }
  function renderLibrary(){
    const library=document.getElementById('bingoLibrary');library.replaceChildren();
    try{
      const all=store().listPresets();if(!all.length){library.textContent='保存したInterview Bingoはありません。';return;}
      all.forEach(preset=>{
        const article=document.createElement('article');article.className='created-game-card interview-saved-card activity-blue-tile';
        article.innerHTML=`<div class="interview-saved-heading"><strong>${esc(preset.assignedUnits.map(u=>bookNames[u.bookId]+' Unit '+u.unit).join(' / ')||'Unit未指定')}</strong><span>${esc(preset.title)}</span></div><div class="interview-saved-info"><small>INTERVIEW BINGO</small><p>${esc(preset.expressions.template)}</p><small>候補${preset.cardIds.length}枚 ／ 配布用カードおすすめ${preset.recommendations.myCardWordCount}語</small></div><div class="interview-saved-actions"><button type="button" data-edit>編集</button><button type="button" data-delete>削除</button><button type="button" data-preview="${esc(preset.id)}">教師用画面で試す</button><button type="button" data-download>設定ファイルDL</button></div>`;
        article.querySelector('[data-edit]').onclick=()=>open(preset.id);
        article.querySelector('[data-preview]').onclick=()=>open(preset.id,{previewOnly:true});
        article.querySelector('[data-delete]').onclick=()=>{if(!confirm('このInterview Bingoプリセットを削除しますか？'))return;try{store().deletePreset(preset.id);renderLibrary();}catch(e){const error=document.createElement('p');error.setAttribute('role','status');error.textContent=e.message;article.append(error);}};
        article.querySelector('[data-download]').onclick=()=>{
          const clean=B.validatePreset(preset),url=URL.createObjectURL(new Blob([JSON.stringify(clean,null,2)],{type:'application/json'})),link=document.createElement('a');
          link.href=url;link.download=preset.id+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
        };
        library.append(article);
      });
    }catch(e){library.textContent=e.message;}
  }
  document.getElementById('openInterviewBingoCreator').onclick=()=>open();
  function refreshRoster(){if(root.classList.contains('active'))rosterPreview?.refresh();}
  window.addEventListener('focus',refreshRoster);
  window.addEventListener('storage',event=>{if(event.key===null||event.key==='dekiru-class-rosters-v1')refreshRoster();});
  window.InterviewBingoCreator={open,renderLibrary};renderLibrary();
})();
