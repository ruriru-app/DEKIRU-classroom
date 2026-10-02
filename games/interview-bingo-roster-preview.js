/* Read-only class/name preview. Never part of the reusable Bingo preset. */
(()=>{
  'use strict';
  const settingsBase=new URL('../grade34/class-settings.html',document.currentScript.src);
  function create({context='preview',onCountChange=()=>{},onSelectionChange=()=>{}}={}){
    const element=document.createElement('section');element.className='bingo-roster-preview';
    element.setAttribute('aria-label','クラスと名前の表示設定');
    element.innerHTML=`<h2>クラスと名前の表示</h2>
      <p>クラス設定で登録した名簿を使います。出席番号のみの登録も可能です。</p>
      <label class="interview-field"><span id="bingoRosterSelectLabel">保存したクラス</span><select id="bingoRosterSelect" aria-labelledby="bingoRosterSelectLabel"><option value="">クラスを選んでください</option></select></label>
      <a data-roster-settings target="_blank" rel="noopener">クラスを登録・編集（別タブ）</a>
      <div class="bingo-roster-options">
        <label class="interview-field"><span id="bingoRosterScriptLabel">名前の表記</span><select data-roster-script aria-labelledby="bingoRosterScriptLabel"><option value="kanji">漢字</option><option value="hiragana">ひらがな</option><option value="english">英語</option></select></label>
        <label class="interview-field"><span id="bingoRosterScopeLabel">表示範囲</span><select data-roster-scope aria-labelledby="bingoRosterScopeLabel"><option value="full">苗字＋名前</option><option value="given">名前のみ</option><option value="number">出席番号のみ</option></select></label>
      </div>
      <p>「出席番号のみ」では名前を表示しません。名前を表示する場合も出席番号を付けます。</p>
      <p data-roster-count></p><p data-roster-warning aria-live="polite"></p>
      <div class="bingo-roster-names" aria-label="名簿の表示確認"></div>
      <p data-roster-status role="note" aria-live="polite"></p>
      <small>${context==='delivery'?'選んだ表示名だけを配信リンクに含めます。名簿の元データと教師用メモは含めません。':'名簿はこのプレビューでの確認用です。BINGOプリセットには保存しません。配信リンクはUnitから開く準備画面で作成します。'}</small>`;
    const select=element.querySelector('#bingoRosterSelect'),script=element.querySelector('[data-roster-script]'),scope=element.querySelector('[data-roster-scope]');
    const rows=element.querySelector('.bingo-roster-names'),count=element.querySelector('[data-roster-count]'),warning=element.querySelector('[data-roster-warning]'),status=element.querySelector('[data-roster-status]'),settings=element.querySelector('[data-roster-settings]');
    let selected='',roster=null,lastNotification='';
    const getSelectedCount=()=>roster?roster.students.length:null;
    function getSelection({fresh=false}={}){
      if(!selected)throw Error('配信するクラスを選んでください。');
      const source=fresh?window.InterviewStore.create(localStorage).listRosters().find(r=>r.id===selected):roster;
      if(!source)throw Error('選んだクラスが変更・削除されました。名簿を確認してください。');
      const chosenScript=script.value,chosenScope=scope.value;
      const delivery=window.ClassRoster.toDeliveryRoster(source,{script:chosenScript,scope:chosenScope});
      return {rosterId:selected,script:chosenScript,scope:chosenScope,roster:delivery,signature:JSON.stringify([selected,chosenScript,chosenScope,source])};
    }
    function notify(){
      const signature=JSON.stringify([selected,script.value,scope.value,roster]);
      if(signature!==lastNotification){lastNotification=signature;onSelectionChange();}
    }
    function link(){const url=new URL(settingsBase);if(selected)url.searchParams.set('classId',selected);settings.href=url.href;}
    function configure(){
      const old=script.value,choices=roster?.version===1?[['legacy','登録済みの氏名（旧形式）']]:[['kanji','漢字'],['hiragana','ひらがな'],['english','英語']];
      script.replaceChildren(...choices.map(([value,label])=>new Option(label,value)));
      script.value=choices.some(([value])=>value===old)?old:choices[0][0];
      scope.querySelector('option[value=given]').disabled=roster?.version===1;
      if(roster?.version===1&&scope.value==='given')scope.value='full';
      if(roster?.version===2&&roster.students.every(s=>Object.values(s.names).every(n=>!n.family&&!n.given)))scope.value='number';
      scope.disabled=!roster;script.disabled=!roster||scope.value==='number';
    }
    function render(){
      rows.replaceChildren();warning.textContent='';status.textContent='';count.textContent=roster?roster.students.length+'人':'';
      script.disabled=!roster||scope.value==='number';
      if(!roster){status.textContent='クラス設定で名簿を登録し、使うクラスを選んでください。';return;}
      try{
        // Use the same validation and number/name formatting as Interview's teacher screen.
        const display=window.ClassRoster.toDeliveryRoster(roster,{script:script.value,scope:scope.value});
        for(const student of display.students){const tile=document.createElement('div');tile.dataset.rosterName='';tile.textContent=student.number+(student.name?' '+student.name:'');rows.append(tile);}
        const names=display.students.map(s=>s.name).filter(Boolean);
        if(new Set(names).size<names.length)warning.textContent='同じ名前があります。出席番号で区別します。';
      }catch(e){status.textContent=e.message;}
    }
    function refresh(){
      try{
        const saved=window.InterviewStore.create(localStorage).listRosters();
        roster=saved.find(r=>r.id===selected)||null;if(!roster)selected='';
        select.replaceChildren(new Option('クラスを選んでください',''),...saved.map(r=>new Option(r.className,r.id)));
        select.value=selected;select.disabled=false;configure();link();render();
      }catch(e){
        roster=null;selected='';select.replaceChildren(new Option('名簿を読み込めません',''));select.disabled=true;
        rows.replaceChildren();count.textContent='';warning.textContent='';configure();link();status.textContent=e.message;
      }
      onCountChange(getSelectedCount());notify();
    }
    select.onchange=()=>{selected=select.value;refresh();};
    script.onchange=()=>{render();notify();};scope.onchange=()=>{render();notify();};
    refresh();return {element,refresh,getSelectedCount,getSelection};
  }
  window.InterviewBingoRosterPreview={create};
})();
