/* One anonymous print document is used by the preview and the print command. */
(()=>{
  'use strict';
  const scriptUrl=new URL(document.currentScript.src||document.baseURI),cssUrl=new URL('interview-bingo-print.css'+scriptUrl.search,scriptUrl).href;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function create({baseUrl=document.baseURI,onRegenerate=()=>{},canOutput=()=>true}={}){
    const element=document.createElement('section');element.dataset.bingoPrint='';element.className='bingo-print-preview';
    element.innerHTML=`<div class="bingo-print-toolbar"><h2>配布用カード 印刷プレビュー</h2><button type="button" data-print disabled>印刷</button><button type="button" data-regenerate>作り直す</button><button type="button" data-retry hidden>画像を再読み込み</button></div><label class="bingo-print-layout">A4１枚あたりのカード枚数<select data-print-layout aria-label="A4１枚あたりのカード枚数" disabled><option value="9">通常９枚（３列×３段・70×99mm）</option><option value="12">ラミネート用12枚（４列×３段・50×89mm）</option></select></label><p data-print-instructions></p><small>印刷はA4縦・倍率100％・余白なし・ヘッダーとフッターOFF。プリンター側の自動拡大を無効にしてください。フチなし非対応のプリンターでは外周に余白が残る場合があります。</small><p data-print-status role="status" aria-live="polite">教師用画面で「配布用カードを作る」を押してください。</p><div class="bingo-print-scroll"><div class="bingo-print-paper"><iframe data-my-card-frame title="配布用カードの印刷原稿"></iframe></div></div>`;
    const frame=element.querySelector('iframe'),paper=element.querySelector('.bingo-print-paper'),scroll=element.querySelector('.bingo-print-scroll'),status=element.querySelector('[data-print-status]'),button=element.querySelector('[data-print]'),retry=element.querySelector('[data-retry]');
    const layout=element.querySelector('[data-print-layout]'),instructions=element.querySelector('[data-print-instructions]');
    const save=document.createElement('button');save.type='button';save.dataset.savePrint='';save.textContent='印刷用原稿を保存';button.after(save);
    const saveNote=document.createElement('small');saveNote.textContent='印刷画面が開かない場合は原稿を保存し、通常のブラウザで開いて印刷できます。絵の表示にはネット接続（ローカル版ではサーバーの起動）が必要です。';instructions.after(saveNote);
    let html='',generation=0,valid=false,ready=false,destroyed=false,pages=0,perPage=9,source=null;
    function describeLayout(){instructions.textContent=perPage===12?'１枚50×89mmの縦長カードです。60×95mmのラミネートフィルム向けに、周囲の余白を切り落とします。切り替えてもカードの内容・番号は変わりません。':'１枚70×99mm、A4を９等分します。切り替えてもカードの内容・番号は変わりません。';}
    function readiness(value){ready=value;element.dataset.printReady=String(value);button.disabled=save.disabled=!value||!valid;}
    function fit(){const scale=Math.min(1,Math.max(.1,(scroll.clientWidth-12)/(210*96/25.4)));frame.style.transform=`scale(${scale})`;paper.style.width=210*96/25.4*scale+'px';paper.style.height=297*96/25.4*pages*scale+'px';}
    const observer=new ResizeObserver(fit);observer.observe(scroll);
    function load(){
      const token=++generation;readiness(false);retry.hidden=true;retry.textContent='画像を再読み込み';status.textContent='絵とフォントを読み込んでいます…';
      frame.onload=async()=>{
        const doc=frame.contentDocument;if(!doc?.querySelector('.my-card-sheet'))return;
        const imgs=[...doc.images];
        await Promise.all(imgs.map(img=>img.complete?Promise.resolve():new Promise(resolve=>{img.addEventListener('load',resolve,{once:true});img.addEventListener('error',resolve,{once:true});})));
        await doc.fonts.ready;
        if(destroyed||token!==generation||!valid)return;
        const sheet=doc.querySelector('.my-card-sheet'),style=frame.contentWindow.getComputedStyle(sheet);
        const slot=sheet.querySelector('.my-card-slot'),width=perPage===12?50:70,height=perPage===12?89:99;
        if(!doc.querySelector('link[rel=stylesheet]')?.sheet||style.display!=='grid'||Math.abs(sheet.offsetWidth-210*96/25.4)>1||Math.abs(sheet.offsetHeight-297*96/25.4)>1||Math.abs(slot.offsetWidth-width*96/25.4)>1||Math.abs(slot.offsetHeight-height*96/25.4)>1){
          status.textContent='印刷用レイアウトを読み込めません。原稿を再読み込みしてください。';retry.textContent='原稿を再読み込み';retry.hidden=false;return;
        }
        const failed=imgs.filter(img=>!img.naturalWidth).map(img=>img.alt);
        if(failed.length){status.textContent='絵を読み込めません：'+[...new Set(failed)].join('、')+'。画像を再読み込みしてください。';retry.hidden=false;return;}
        status.textContent=`${pages}ページの原稿を確認できます。`;readiness(true);fit();
      };
      frame.srcdoc=html;fit();
    }
    function update({batch,cards}){
      source={batch,cards};const map=new Map(cards.map(c=>[c.id,c]));pages=Math.ceil(batch.cards.length/perPage);
      const xs=perPage===12?[5,55,105,155,205]:[70,140],ys=perPage===12?[15,104,193,282]:[99,198];
      const cuts=xs.map(x=>`<i class="my-card-cut vertical" style="left:${x}mm"></i>`).join('')+ys.map(y=>`<i class="my-card-cut horizontal" style="top:${y}mm"></i>`).join('');
      const sheets=Array.from({length:pages},(_,page)=>`<section class="my-card-sheet" data-per-page="${perPage}">${Array.from({length:perPage},(_,slot)=>{
        const ids=batch.cards[page*perPage+slot];if(!ids)return '<div class="my-card-slot"></div>';
        const columns=ids.length===1?1:ids.length<=4?2:3,rows=Math.ceil(ids.length/columns);
        return `<article class="my-card-slot" data-my-card><div class="my-card-set-name" data-set-name>${esc(batch.config.setName||"")}</div><h1 data-card-number>No. ${page*perPage+slot+1}</h1><div class="my-card-pictures" style="--columns:${columns};--rows:${rows}">${ids.map(id=>{const card=map.get(id);if(!card)throw Error('印刷対象のカードが見つかりません。');return `<figure><img src="${esc(new URL(card.image,baseUrl).href)}" alt="${esc(card.english)}" loading="eager"><figcaption>${esc(card.english)}</figcaption></figure>`;}).join('')}</div></article>`;
      }).join('')}${cuts}</section>`).join('');
      html=`<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>配布用カード</title><base href="${esc(baseUrl)}"><link rel="stylesheet" href="${esc(cssUrl)}"></head><body>${sheets}</body></html>`;
      valid=true;layout.disabled=false;layout.value=String(perPage);describeLayout();frame.style.width=210*96/25.4+'px';frame.style.height=297*96/25.4*pages+'px';load();
    }
    function invalidate(message){generation++;valid=false;source=null;layout.disabled=true;readiness(false);retry.hidden=true;status.textContent=message;}
    function outputAllowed(){
      if(!valid||!ready||destroyed)return false;
      try{return canOutput()!==false&&valid&&ready&&!destroyed;}catch{invalidate('原稿の設定を確認できません。教師用画面から開き直してください。');return false;}
    }
    async function print(){if(!outputAllowed())return false;try{frame.contentWindow.focus();frame.contentWindow.print();return true;}catch{status.textContent='印刷画面を開けません。印刷用原稿を保存し、通常のブラウザから印刷してください。';return false;}}
    function download(){
      if(!outputAllowed())return false;
      const url=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download='interview-bingo-cards.html';
      try{element.append(link);link.click();return true;}finally{link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
    }
    button.onclick=print;save.onclick=download;element.querySelector('[data-regenerate]').onclick=onRegenerate;retry.onclick=()=>{if(valid&&html)load();};
    layout.onchange=()=>{if(!valid||!source||destroyed)return;const next=Number(layout.value);if(![9,12].includes(next))return;perPage=next;update(source);};
    describeLayout();readiness(false);
    return {element,update,invalidate,print,download,getDocument:()=>html,destroy(){generation++;destroyed=true;valid=false;observer.disconnect();frame.onload=null;element.remove();}};
  }
  window.InterviewBingoPrint={create};
})();
