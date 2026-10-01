/* One anonymous print document is used by the preview and the print command. */
(()=>{
  'use strict';
  const cssUrl=new URL('interview-bingo-print.css',document.currentScript.src||document.baseURI).href;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function create({baseUrl=document.baseURI,onRegenerate=()=>{}}={}){
    const element=document.createElement('section');element.dataset.bingoPrint='';element.className='bingo-print-preview';
    element.innerHTML=`<div class="bingo-print-toolbar"><h2>MY CARD 印刷プレビュー</h2><button type="button" data-print disabled>印刷</button><button type="button" data-regenerate>作り直す</button><button type="button" data-retry hidden>画像を再読み込み</button></div><p>A4縦・倍率100％・余白なし・ヘッダーとフッターOFF。1枚70×99mmで9等分します。</p><small>フチなし非対応のプリンターでは外周に余白が残る場合があります。プリンター側の自動拡大を無効にしてください。</small><p data-print-status role="status" aria-live="polite">教師用画面で「MY CARDを作る」を押してください。</p><div class="bingo-print-scroll"><div class="bingo-print-paper"><iframe data-my-card-frame title="匿名MY CARDの印刷原稿"></iframe></div></div>`;
    const frame=element.querySelector('iframe'),paper=element.querySelector('.bingo-print-paper'),scroll=element.querySelector('.bingo-print-scroll'),status=element.querySelector('[data-print-status]'),button=element.querySelector('[data-print]'),retry=element.querySelector('[data-retry]');
    let html='',generation=0,valid=false,ready=false,destroyed=false,pages=0;
    function readiness(value){ready=value;element.dataset.printReady=String(value);button.disabled=!value||!valid;}
    function fit(){const scale=Math.min(1,Math.max(.1,(scroll.clientWidth-12)/(210*96/25.4)));frame.style.transform=`scale(${scale})`;paper.style.width=210*96/25.4*scale+'px';paper.style.height=297*96/25.4*pages*scale+'px';}
    const observer=new ResizeObserver(fit);observer.observe(scroll);
    function load(){
      const token=++generation;readiness(false);retry.hidden=true;status.textContent='絵とフォントを読み込んでいます…';
      frame.onload=async()=>{
        const doc=frame.contentDocument;if(!doc?.querySelector('.my-card-sheet'))return;
        const imgs=[...doc.images];
        await Promise.all(imgs.map(img=>img.complete?Promise.resolve():new Promise(resolve=>{img.addEventListener('load',resolve,{once:true});img.addEventListener('error',resolve,{once:true});})));
        await doc.fonts.ready;
        if(destroyed||token!==generation||!valid)return;
        const failed=imgs.filter(img=>!img.naturalWidth).map(img=>img.alt);
        if(failed.length){status.textContent='絵を読み込めません：'+[...new Set(failed)].join('、')+'。画像を再読み込みしてください。';retry.hidden=false;return;}
        status.textContent=`${pages}ページの原稿を確認できます。`;readiness(true);fit();
      };
      frame.srcdoc=html;fit();
    }
    function update({batch,cards}){
      const map=new Map(cards.map(c=>[c.id,c]));pages=Math.ceil(batch.cards.length/9);
      const sheets=Array.from({length:pages},(_,page)=>`<section class="my-card-sheet">${Array.from({length:9},(_,slot)=>{
        const ids=batch.cards[page*9+slot];if(!ids)return '<div class="my-card-slot"></div>';
        const columns=ids.length===1?1:ids.length<=4?2:3,rows=Math.ceil(ids.length/columns);
        return `<article class="my-card-slot" data-my-card><h1>MY CARD</h1><div class="my-card-pictures" style="--columns:${columns};--rows:${rows}">${ids.map(id=>{const card=map.get(id);if(!card)throw Error('印刷対象のカードが見つかりません。');return `<figure><img src="${esc(new URL(card.image,baseUrl).href)}" alt="${esc(card.english)}" loading="eager"><figcaption>${esc(card.english)}</figcaption></figure>`;}).join('')}</div><div class="my-card-name">Name <span></span></div></article>`;
      }).join('')}<i class="my-card-cut vertical" style="left:70mm"></i><i class="my-card-cut vertical" style="left:140mm"></i><i class="my-card-cut horizontal" style="top:99mm"></i><i class="my-card-cut horizontal" style="top:198mm"></i></section>`).join('');
      html=`<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>MY CARD</title><base href="${esc(baseUrl)}"><link rel="stylesheet" href="${esc(cssUrl)}"></head><body>${sheets}</body></html>`;
      valid=true;frame.style.width=210*96/25.4+'px';frame.style.height=297*96/25.4*pages+'px';load();
    }
    function invalidate(message){generation++;valid=false;readiness(false);retry.hidden=true;status.textContent=message;}
    async function print(){if(!valid||!ready||destroyed)return false;frame.contentWindow.focus();frame.contentWindow.print();return true;}
    button.onclick=print;element.querySelector('[data-regenerate]').onclick=onRegenerate;retry.onclick=()=>{if(valid&&html)load();};
    readiness(false);
    return {element,update,invalidate,print,getDocument:()=>html,destroy(){generation++;destroyed=true;valid=false;observer.disconnect();frame.onload=null;element.remove();}};
  }
  window.InterviewBingoPrint={create};
})();
