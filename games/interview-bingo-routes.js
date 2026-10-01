/* Only known textbook/Unit routes; never accept an arbitrary return URL. */
(()=>{
  'use strict';
  const base=document.currentScript.src,books={lt1:9,lt2:9,nh5:8,nh6:8};
  function unitCheck(bookId,unit){if(!Object.hasOwn(books,bookId)||!Number.isInteger(unit)||unit<1||unit>books[bookId])throw Error('教材とUnitを確認してください。');}
  function idCheck(id){if(typeof id!=='string'||!/^[A-Za-z0-9_-]{1,100}$/.test(id))throw Error('プリセットの指定が不正です。');}
  function parse(search){
    const p=new URLSearchParams(search),keys=['preset','book','unit'];
    if([...p.keys()].some(k=>!keys.includes(k))||keys.some(k=>p.getAll(k).length!==1)||!/^\d$/.test(p.get('unit')))throw Error('準備画面のURLを確認してください。');
    const presetId=p.get('preset'),bookId=p.get('book'),unit=Number(p.get('unit'));idCheck(presetId);unitCheck(bookId,unit);return {presetId,bookId,unit};
  }
  function prepareHref(presetId,bookId,unit){idCheck(presetId);unitCheck(bookId,unit);const u=new URL('interview-bingo-prepare.html',base);u.search=new URLSearchParams({preset:presetId,book:bookId,unit:String(unit)});return u.href;}
  function unitHref(bookId,unit){unitCheck(bookId,unit);const u=new URL(bookId.startsWith('lt')?'../grade34/index.html':'../grade56/index.html',base);u.hash='/unit/'+bookId+'/'+unit;return u.href;}
  window.InterviewBingoRoutes={parse,prepareHref,unitHref};
})();
