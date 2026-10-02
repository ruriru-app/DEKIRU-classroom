/* Student board. Identity and persistence are supplied by its caller. */
(()=>{
  'use strict';
  const S=window.InterviewBingoSession;
  const names=['あおい','いちか','うた','えいた','おとは','かいと','きこ','くるみ','けんと','こはる','さくら','しゅん','すず','せな','そうた','たくみ','ちひろ','つむぎ','てつ','とうま','なな','にこ','のぞみ','はる','ひなた','ふうか','ほのか','まこと','みお','むつき','めい','もも','ゆい','りく','れん'];
  const makePeople=count=>Array.from({length:count},(_,i)=>({id:'bingo-demo-'+String(i+1).padStart(2,'0'),label:(i+1)+' '+(i===0?'自分':names[i]||'児童'+(i+1))}));
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const validPupilId=id=>typeof id==='string'&&id.length<=100&&/^[A-Za-z0-9_-]+$/.test(id);
  function create({onPageChange=()=>{},mode='preview',people:injectedPeople=null,selfId=null,onStateChange=()=>{},canInteract=()=>true}={}){
    if(mode!=='preview'&&mode!=='delivery')throw Error('児童画面のモードが不正です');
    const delivery=mode==='delivery';
    if(delivery&&(!Array.isArray(injectedPeople)||!injectedPeople.length||injectedPeople.some(p=>!p||!validPupilId(p.id)||typeof p.label!=='string')||injectedPeople.filter(p=>p.id===selfId).length!==1||new Set(injectedPeople.map(p=>p.id)).size!==injectedPeople.length))throw Error('本人を名簿から選んでください');
    const ownId=delivery?selfId:'bingo-demo-01';
    const element=document.createElement('section');element.className='bingo-student';element.dataset.bingoStudent='';element.setAttribute('aria-label',delivery?'児童用BINGO':'児童用BINGOプレビュー');
    let people=delivery?injectedPeople.map(p=>({id:p.id,label:p.label})):makePeople(35),state=S.createState({studentIds:people.filter(p=>p.id!==ownId).map(p=>p.id)}),activity={},cards=new Map(),dialog=null,anchor=null,frame=0,destroyed=false;
    const cloneState=()=>JSON.parse(JSON.stringify(state));
    const canAct=()=>!destroyed&&canInteract();
    const button=(action,label,disabled=false)=>`<button type="button" data-bingo-action="${action}" ${disabled?'disabled':''}>${label}</button>`;
    const picture=card=>`<span class="bingo-picture"><img src="${esc(card.image)}" alt="" draggable="false"></span><span class="bingo-card-word">${esc(card.english)}</span>`;
    function fitBoard(){
      const area=element.querySelector('.bingo-board-space'),board=element.querySelector('[data-bingo-board]');if(!area||!board)return;
      const size=Math.max(1,Math.floor(Math.min((area.clientWidth-48)/state.size,(area.clientHeight-24)/state.size)));
      board.style.setProperty('--bingo-cell-size',size+'px');
    }
    const observer=new ResizeObserver(fitBoard);observer.observe(element);
    function scheduleFit(){cancelAnimationFrame(frame);frame=requestAnimationFrame(fitBoard);}
    function collapse(){
      if(!dialog)return;const old=dialog;dialog=null;element.classList.remove('bingo-student-expanded');
      if(anchor?.parentNode)anchor.replaceWith(element);anchor=null;old.close();old.remove();render();element.querySelector('[data-bingo-action=expand]')?.focus();
    }
    function expand(){
      if(dialog){collapse();return;}
      anchor=document.createComment('student preview position');element.replaceWith(anchor);
      dialog=document.createElement('dialog');dialog.className='bingo-student-dialog';dialog.setAttribute('aria-label',delivery?'児童用BINGO拡大':'児童用プレビュー拡大');
      dialog.addEventListener('cancel',event=>{event.preventDefault();collapse();});
      document.body.append(dialog);dialog.append(element);element.classList.add('bingo-student-expanded');dialog.showModal();render();element.querySelector('[data-bingo-action=expand]').focus();
    }
    function render(){
      if(destroyed)return;
      const scroll=element.querySelector('[data-bingo-candidates],[data-bingo-names]')?.scrollTop||0;
      const focused=element.contains(document.activeElement)?document.activeElement:null;
      const focusKey=focused?['data-bingo-action','data-bingo-cell','data-bingo-person','data-bingo-candidate','data-bingo-size'].find(k=>focused.hasAttribute(k)):null;
      const focusValue=focusKey?focused.getAttribute(focusKey):null;
      const progress=S.getProgress(state),lines=S.getLines(state),compose=state.page==='compose',current=state.cells[state.selectedIndex];
      const selectedCard=current?.cardId?cards.get(current.cardId):null;
      const expression=window.InterviewBingoExpressions.render(activity.expressions,selectedCard,{completeExpressions:window.InterviewBingoModel.completeExpressions,forms:window.SentenceForms});
      const indicator=(id,label,complete,col,row,symbol)=>`<span data-bingo-line="${id}" data-complete="${complete}" aria-label="${label}：${complete?'BINGO成立':'未成立'}" style="grid-column:${col};grid-row:${row}">${symbol}</span>`;
      const missing=Math.max(0,progress.required-state.cardIds.length*2);
      element.innerHTML=`<header class="bingo-student-heading"><strong title="${esc(activity.title)}">${esc(activity.title||'INTERVIEW BINGO')}</strong>${button('expand',dialog?'縮小 ↙':'拡大 ⛶')}</header>
        <div class="bingo-student-columns"><section class="bingo-sheet-panel" aria-label="BINGO SHEET">
          <div class="bingo-sheet-heading"><strong>BINGO SHEET</strong><strong data-bingo-count aria-live="polite">BINGO × ${lines.count}</strong></div>
          <div class="bingo-sheet-controls"><span data-bingo-size>${state.size}×${state.size}</span>${compose?button('random','🎲 RANDOM',!!missing)+button('start','INTERVIEW START!',!!missing||!progress.complete):button('back','← シート作り')+button('remove-name','名前を外す',!progress.complete||!current?.studentId)}</div>
          <p class="bingo-sheet-help" role="status">${compose?(missing?`同じカードを2回ずつ使っても${missing}マス分不足しています。`:`${progress.filled} / ${progress.required} 枚　同じカードは2回まで。マスをタップすると戻せます。`):(!progress.complete?'シート作りに戻って、空いているマスを埋めましょう。':'① マスを選ぶ → ② インタビュー → ③ 相手の名前')}</p>
          <div class="bingo-board-space"><div data-bingo-board style="--bingo-size:${state.size}">
            ${indicator('diag-main','右下がりの斜め',lines.diagonals[0],1,1,'↘')}${indicator('diag-anti','左下がりの斜め',lines.diagonals[1],state.size+2,1,'↙')}
            ${lines.columns.map((v,i)=>indicator('column-'+i,(i+1)+'列目',v,i+2,1,'↓')).join('')}${lines.rows.map((v,i)=>indicator('row-'+i,(i+1)+'行目',v,1,i+2,'→')).join('')}
            ${state.cells.map((cell,i)=>{const card=cards.get(cell.cardId),person=people.find(p=>p.id===cell.studentId);return `<button type="button" data-bingo-cell="${i}" ${card?`data-card-id="${esc(card.id)}"`:''} aria-pressed="${!compose&&state.selectedIndex===i}" aria-label="${i+1}マス目 ${esc(card?.english||'空き')}${person?' '+esc(person.label):''}" style="grid-column:${i%state.size+2};grid-row:${Math.floor(i/state.size)+2}">${card?picture(card):`<span class="bingo-empty-cell">${i+1}</span>`}${person?`<span class="bingo-cell-name">${esc(person.label)}</span>`:''}</button>`;}).join('')}
          </div></div>
        </section><section class="bingo-student-right" aria-label="${compose?'Picture Cards':'インタビュー'}">
          ${compose?`<h3>Picture Cards <small>${cards.size}枚から選ぼう</small></h3><p class="bingo-student-instructions">${esc(activity.studentInstructions||'カードをタップすると、左の空いているマスに入ります。')}</p><div data-bingo-candidates>${[...cards.values()].map(card=>{const count=state.cells.filter(c=>c.cardId===card.id).length;return `<button type="button" data-bingo-candidate="${esc(card.id)}" aria-label="${esc(card.english)}" ${count>=2||progress.complete?'disabled':''}>${picture(card)}<small class="bingo-card-use">使用中 ${count}／2</small></button>`;}).join('')||'<p>教師用画面で候補カードを選んでください。</p>'}</div>`:
          `<div class="bingo-student-expression-area"><h3>活動で使う表現</h3><p data-bingo-expressions>${esc(expression.text)}</p>${expression.notice?`<p class="bingo-student-notice">${esc(expression.notice)}</p>`:''}</div><div class="bingo-names-heading"><h3>相手の名前 ${delivery?'':`<small>仮の名簿・${people.length}人（1番として試用）</small>`}</h3><p>使った名前は1回だけ。間違えたら「名前を外す」。</p></div><div data-bingo-names>${people.map(person=>`<button type="button" data-bingo-person="${esc(person.id)}" ${person.id===ownId||!progress.complete||!current?.cardId||current.studentId||progress.usedStudentIds.includes(person.id)?'disabled':''}>${esc(person.label)}</button>`).join('')}</div>`}
        </section></div>`;
      element.querySelectorAll('img').forEach(img=>{img.onerror=()=>{const fallback=document.createElement('span');fallback.dataset.bingoImageFallback='';fallback.textContent='絵なし';img.replaceWith(fallback);};});
      const list=element.querySelector('[data-bingo-candidates],[data-bingo-names]');if(list)list.scrollTop=scroll;
      if(focusKey){
        let target=[...element.querySelectorAll('['+focusKey+']')].find(e=>e.getAttribute(focusKey)===focusValue);
        // An action can remove or disable its own button. Keep keyboard users at
        // the next meaningful step rather than restarting at the page header.
        if(focusKey==='data-bingo-action'&&focusValue==='remove-name')target=element.querySelector(`[data-bingo-cell="${state.selectedIndex}"]`);
        if(!target||target.disabled){
          if(focusKey==='data-bingo-candidate'){
            const options=[...element.querySelectorAll('[data-bingo-candidate]')],index=options.findIndex(e=>e.dataset.bingoCandidate===focusValue);
            target=progress.complete?element.querySelector('[data-bingo-action=start]'):[...options.slice(index+1),...options.slice(0,index)].find(e=>!e.disabled);
          }else if(focusKey==='data-bingo-person'||focusValue==='start')target=element.querySelector(`[data-bingo-cell="${state.selectedIndex??0}"]`);
          else if(focusValue==='back')target=element.querySelector('[data-bingo-action=random]');
        }
        if(target&&!target.disabled){
          target.focus({preventScroll:true});
          if(target.hasAttribute('data-bingo-candidate')){const parent=target.parentElement,r=target.getBoundingClientRect(),b=parent.getBoundingClientRect();if(r.bottom>b.bottom)parent.scrollTop+=r.bottom-b.bottom;else if(r.top<b.top)parent.scrollTop-=b.top-r.top;}
        }
      }
      fitBoard();scheduleFit();
    }
    function dispatch(action){
      if(!canAct())return false;
      const next=S.transition(state,action);
      if(JSON.stringify(next)===JSON.stringify(state))return false;
      state=next;render();onStateChange(cloneState());return true;
    }
    function click(event){
      const target=event.target.closest('button');if(!target||!element.contains(target)||target.disabled)return;
      if(!canAct())return;
      if(target.hasAttribute('data-bingo-candidate'))dispatch({type:'place',cardId:target.dataset.bingoCandidate});
      else if(target.hasAttribute('data-bingo-cell'))dispatch({type:state.page==='compose'?'removeCard':'select',index:Number(target.dataset.bingoCell)});
      else if(target.hasAttribute('data-bingo-person'))dispatch({type:'assignName',studentId:target.dataset.bingoPerson});
      else switch(target.dataset.bingoAction){
        case 'expand':expand();break;
        case 'random':if(!S.getProgress(state).usedStudentIds.length||confirm('名前と配置を消して、もう一度RANDOMで作りますか？'))dispatch({type:'random'});break;
        case 'remove-name':dispatch({type:'removeName'});break;
        case 'back':if(dispatch({type:'setPage',page:'compose'}))onPageChange('compose');break;
        case 'start':if(S.getProgress(state).complete&&dispatch({type:'setPage',page:'interview'}))onPageChange('interview');break;
      }
    }
    element.addEventListener('click',click);
    function update(value){
      if(!canAct())return;
      const nextCards=new Map(value.cards.map(c=>[c.id,c]));
      let nextState=state;
      if(value.reset){
        const config=value.config;
        if(!config||![3,4,5].includes(config.size)||(!delivery&&(!Number.isInteger(config.participantCount)||config.participantCount<1||config.participantCount>100)))throw Error('教師用の設定を確認してください。');
        if(!delivery)people=makePeople(config.participantCount);
        nextState=S.createState({size:config.size,cardIds:[...nextCards.keys()],studentIds:people.filter(p=>p.id!==ownId).map(p=>p.id)});
      }
      nextState=S.transition(nextState,{type:'syncCandidates',cardIds:[...nextCards.keys()]});
      if(value.page)nextState=S.transition(nextState,{type:'setPage',page:value.page});
      if(delivery&&nextState.page==='interview'&&!S.getProgress(nextState).complete)throw Error('未完成の盤面でインタビューを開始できません');
      activity=value.activity;cards=nextCards;state=nextState;render();
    }
    function restoreState(value){
      if(!canAct())return;
      state=S.validateState(value,{size:state.size,cardIds:[...cards.keys()],studentIds:people.filter(p=>p.id!==ownId).map(p=>p.id)});
      render();
    }
    function destroy(){collapse();destroyed=true;cancelAnimationFrame(frame);observer.disconnect();element.removeEventListener('click',click);element.remove();}
    return {element,update,destroy,collapse,getProgress:()=>S.getProgress(state),getState:cloneState,restoreState};
  }
  window.InterviewBingoStudent={create};
})();
