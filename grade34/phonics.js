(() => {
  'use strict';
  const $=id=>document.getElementById(id),M=PhonicsModel,model=M.create(),practice=CardPractice.create();
  let active=false;
  const from=new URLSearchParams(location.search).get('from');
  const returns={lt1:'index.html#/book/lt1',lt2:'index.html#/book/lt2',nh5:'../grade56/index.html#/book/nh5'};
  $('back').href='phonics.html'+(from?'?from='+encodeURIComponent(from):'');
  $('selection').innerHTML=M.groups.map(g=>`<details open><summary><label><input type="checkbox" data-group="${g.id}" checked>${g.name}（${M.cards.filter(c=>c.group===g.id).length}）</label></summary><div class="letter-options">${M.cards.filter(c=>c.group===g.id).map(c=>`<label><input type="checkbox" data-letter="${c.letter}" checked>${c.letter}${c.letter.toLowerCase()}</label>`).join('')}</div></details>`).join('');
  $('practice-settings').innerHTML=practice.settings();
  function card(c){
    const vertical=['3','5'].includes(practice.layout);
    // Each illustration has a different boundary; do not cut all cards at the midpoint.
    const crops={A:850,B:736,C:708,D:780,E:850,F:696,G:772,H:760,I:660,J:574,K:854,L:692,M:822,N:792,O:764,P:744,Q:816,R:804,S:780,T:714,U:768,V:744,W:874,X:768,Y:734,Z:736};
    const verticalBounds={A:[220,768],B:[176,828],C:[200,804],D:[200,796],E:[160,856],F:[272,732],G:[120,888],H:[256,768],I:[176,812],J:[216,772],K:[56,964],L:[144,864],M:[188,812],N:[248,784],O:[160,832],P:[232,788],Q:[48,960],R:[80,908],S:[144,864],T:[196,812],U:[64,924],V:[52,916],W:[80,904],X:[192,804],Y:[108,860],Z:[128,852]};
    const x=crops[c.letter],width=1536-x,[top,bottom]=verticalBounds[c.letter];
    const content=vertical?`<div class="practice-art"><svg viewBox="${x} ${top} ${width} ${bottom-top}" role="img" aria-label="${c.word}"><defs><clipPath id="art-${c.letter}"><rect x="${x}" y="${top}" width="${width}" height="${bottom-top}"/></clipPath></defs><image clip-path="url(#art-${c.letter})" href="${c.image}" x="0" y="0" width="1536" height="1024"/></svg></div><div class="practice-label ${c.group}">${c.letter}${c.letter.toLowerCase()}</div>`:`<img src="${c.image}" alt="${c.letter}${c.letter.toLowerCase()} ${c.word}" loading="lazy">`;
    return `<div class="practice-card ${vertical?'phonics-portrait':''}" data-card="${c.letter}">${content}</div>`;
  }
  function render(){
    $('practice-settings').hidden=!active;$('practice-heading').hidden=!active;
    const items=practice.arrange(model.items());
    const overview=active&&practice.layout==='list';
    $('stage').classList.toggle('overview',overview);
    let content=`<div class="practice-grid" data-layout="${practice.layout}">${items.map(card).join('')}</div>`;
    if(overview&&items.length){const sizes=items.length===26?[7,7,6,6]:Array.from({length:Math.ceil(items.length/7)},(_,i)=>Math.min(7,items.length-i*7));let offset=0;content=`<div class="phonics-overview" style="--rows:${sizes.length}">${sizes.map(n=>{const row=items.slice(offset,offset+n);offset+=n;return `<div class="phonics-list-row" style="--count:${n}">${row.map(card).join('')}</div>`;}).join('')}</div>`;}
    $('stage').innerHTML=!active?'<button id="open-practice" class="feature-tile"><div class="feature-tile-heading"><span class="tile-mark">Words</span><strong>発音練習</strong></div><span class="feature-tile-description">選んだフォニックスカードで音を練習する</span></button>':!items.length?'<p>左のメニューからカードを選んでください。</p>':content;
    $('count').textContent=`使用 ${items.length}枚`;
    document.querySelectorAll('[data-group]').forEach(box=>{const cards=M.cards.filter(c=>c.group===box.dataset.group),n=cards.filter(c=>model.selected.has(c.letter)).length;box.checked=n===cards.length;box.indeterminate=n>0&&n<cards.length;});
    document.querySelectorAll('[data-letter]').forEach(box=>box.checked=model.selected.has(box.dataset.letter));
  }
  $('selection').addEventListener('change',e=>{const el=e.target;if(el.dataset.group)model.selectGroup(el.dataset.group,el.checked);else if(el.dataset.letter)model.select(el.dataset.letter,el.checked);render();});
  $('practice-settings').addEventListener('change',e=>{if(e.target.dataset.practiceSetting){practice.configure(e.target.dataset.practiceSetting,e.target.value);render();$('stage').scrollTop=0;}});
  $('stage').addEventListener('click',e=>{if(e.target.closest('#open-practice')){active=true;render();}});
  $('close-practice').addEventListener('click',async()=>{if(document.fullscreenElement){await document.exitFullscreen();return;}if($('viewer').classList.contains('expanded')){$('viewer').classList.remove('expanded');$('notice').textContent='';return;}active=false;render();});
  $('fullscreen').addEventListener('click',async()=>{const viewer=$('viewer');if(document.fullscreenElement){await document.exitFullscreen();return;}if(viewer.classList.contains('expanded')){viewer.classList.remove('expanded');return;}try{await viewer.requestFullscreen();}catch{viewer.classList.add('expanded');$('notice').textContent='画面いっぱいに表示しています。Escで戻れます。';}});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){$('viewer').classList.remove('expanded');$('notice').textContent='';}});
  render();
})();
