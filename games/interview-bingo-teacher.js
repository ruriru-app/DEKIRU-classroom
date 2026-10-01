/* Presentation-only teacher controls. The Creator owns trial state. */
(()=>{
  'use strict';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function create({onChange,onTry,onGenerate,onUseRosterCount}){
    const element=document.createElement('section'),candidatesElement=document.createElement('section');element.className='bingo-teacher-settings';candidatesElement.className='bingo-teacher-candidates';
    element.innerHTML=`<h2>活動の設定</h2><label>BINGOサイズ<select data-teacher-field="size" aria-label="BINGOサイズ"><option value="3">3×3</option><option value="4">4×4</option><option value="5">5×5</option></select></label><label>参加人数<input data-teacher-field="participantCount" aria-label="参加人数" type="number" min="1" max="100" step="1"></label><button type="button" data-copy-count>このクラスの人数を使う</button><label>MY CARDの語数<input data-teacher-field="myCardWordCount" aria-label="MY CARDの語数" type="number" min="1" max="9" step="1"></label><small>参加人数分の匿名カードを作ります。1人1～9語、同じ語の重複なし。</small><div data-teacher-recommendations></div><p data-teacher-dirty></p><div data-teacher-errors role="status" aria-live="polite"></div><div data-teacher-warnings></div><div class="bingo-teacher-actions"><button type="button" data-teacher-try>この設定で試す</button><button type="button" data-teacher-generate>MY CARDを作る</button></div><div data-teacher-distribution></div>`;
    let value=null,signature='';
    element.querySelector('[data-teacher-try]').onclick=onTry;element.querySelector('[data-teacher-generate]').onclick=onGenerate;element.querySelector('[data-copy-count]').onclick=onUseRosterCount;
    element.querySelectorAll('[data-teacher-field]').forEach(input=>input.addEventListener(input.tagName==='SELECT'?'change':'input',()=>onChange({...value.config,[input.dataset.teacherField]:input.value===''?NaN:Number(input.value),candidateIds:[...value.config.candidateIds]})));
    candidatesElement.onchange=event=>{const input=event.target.closest('[data-teacher-card]');if(!input)return;const selected=new Set(value.config.candidateIds);input.checked?selected.add(input.dataset.teacherCard):selected.delete(input.dataset.teacherCard);onChange({...value.config,candidateIds:value.cards.filter(c=>selected.has(c.id)).map(c=>c.id)});};
    function update(next){
      value=next;const {config,cards,recommendations,dirty,errors=[],warnings=[],rosterCount,distribution}=next;
      for(const input of element.querySelectorAll('[data-teacher-field]')){const v=config[input.dataset.teacherField],text=Number.isFinite(v)?String(v):'';if(input.value!==text)input.value=text;}
      element.querySelector('[data-copy-count]').disabled=rosterCount===null||rosterCount===undefined;
      element.querySelector('[data-teacher-dirty]').textContent=dirty?'設定はまだ児童画面へ反映されていません。':'児童画面に反映済みの設定です。';
      element.querySelector('[data-teacher-errors]').textContent=errors.map(e=>e.message).join('\n');element.querySelector('[data-teacher-warnings]').textContent=warnings.map(e=>e.message).join('\n');
      element.querySelector('[data-teacher-recommendations]').innerHTML=`<h3>おすすめ設定</h3>${[3,4,5].map(n=>`<small>${n}×${n}：${esc(recommendations.candidateCounts[n].min)} ～ ${esc(recommendations.candidateCounts[n].max)}枚</small>`).join('')}<small>MY CARD おすすめ：${esc(recommendations.myCardWordCount)}語</small>`;
      const key=JSON.stringify(cards.map(c=>[c.id,c.english,c.image]));
      if(key!==signature){signature=key;candidatesElement.innerHTML=`<h3>Picture Cards <span data-teacher-selected></span></h3><p>使う候補のチェックを外して調整できます。プリセット自体は変更しません。</p><div class="bingo-teacher-card-grid">${cards.map(c=>`<label data-preview-card><input type="checkbox" data-teacher-card="${esc(c.id)}" aria-label="候補 ${esc(c.english)}"><img src="${esc(c.image)}" alt="" loading="lazy"><span>${esc(c.english)}</span></label>`).join('')}</div>`;}
      candidatesElement.querySelector('[data-teacher-selected]').textContent=`（${config.candidateIds.length}／${cards.length}語）`;
      candidatesElement.querySelectorAll('[data-teacher-card]').forEach(input=>input.checked=config.candidateIds.includes(input.dataset.teacherCard));
      const dist=element.querySelector('[data-teacher-distribution]');dist.replaceChildren();
      if(distribution){const heading=document.createElement('h3');heading.textContent='MY CARDの配布内容';dist.append(heading);for(const c of cards.filter(c=>Object.hasOwn(distribution,c.id))){const row=document.createElement('p');row.textContent=c.english+'：'+distribution[c.id]+'人分';dist.append(row);}const note=document.createElement('p');note.className='bingo-distribution-note';note.textContent=(Object.values(distribution).some(n=>n<=2)?'未配布、または持っている児童が2人以下の語があります。同じ語の2マスを埋められない場合があります。自分が持つ語は相手が1人少なくなります。 ':'')+'単語別の人数だけでは盤面全体の完成は保証しません。';dist.append(note);}
    }
    return {element,candidatesElement,update,destroy(){element.remove();candidatesElement.remove();}};
  }
  window.InterviewBingoTeacher={create};
})();
