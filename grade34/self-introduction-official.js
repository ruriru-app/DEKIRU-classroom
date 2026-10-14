(function(root){
 'use strict';
 const preset={
  version:1,
  type:'self-introduction',
  id:'intro-55a40625-1d05-41a6-93a0-fa377586dbf8',
  name:'自己紹介シート',
  title:'じこしょうかい',
  studentInstructions:'すきな色で名前を作って、自分の好きなものを伝えよう！',
  cardIds:[
   'color_001','color_002','color_003','color_004','color_005','color_006','color_007','color_008','color_009','color_010','color_011','color_012','color_013','color_014',
   'sport_001','sport_002','sport_004','sport_005','sport_006','sport_007','sport_009','sport_016',
   'drink_004','dessert_004','dessert_005','fruit_vegetable_001','fruit_vegetable_009','fruit_vegetable_012','fruit_vegetable_026','fruit_vegetable_025','fruit_vegetable_019'
  ],
  maxCards:5,
  nameSize:'large',
  createdAt:'2026-10-14T21:25:24.913Z',
  updatedAt:'2026-10-14T21:25:24.913Z'
 };
 const categoryOrder=['colors','sports','drinks','desserts','fruits_vegetables'];
 const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
 const base64Url=bytes=>btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
 function pupilUrl(){
  const deliveryId='official-'+preset.id;
  const wire=[1,deliveryId,preset.updatedAt,preset.title,preset.studentInstructions,preset.cardIds,preset.maxCards,preset.nameSize];
  const url=new URL('../games/self-introduction-receive.html',location.href);
  url.hash='intro=s1j.'+base64Url(new TextEncoder().encode(JSON.stringify(wire)));
  return url.href;
 }
 function wordGroups(){
  const byId=new Map((root.DEKIRU_DATA?.cards||[]).map(card=>[card.id,card]));
  const cards=preset.cardIds.map(id=>byId.get(id)).filter(Boolean);
  return categoryOrder.map(category=>({
   category:root.DEKIRU_DATA?.categoryLabels?.[category]||category,
   words:cards.filter(card=>card.category===category).map(card=>card.english)
  })).filter(group=>group.words.length);
 }
 function render(){
  const url=pupilUrl(),groups=wordGroups();
  return `<article class="self-introduction-official-tile" data-official-self-introduction="${esc(preset.id)}" aria-label="${esc(preset.name)}">
   <div class="self-introduction-official-heading"><span class="tile-mark">Official Activity</span><strong>${esc(preset.title)}</strong></div>
   <p>${esc(preset.studentInstructions)}</p>
   <p class="self-introduction-official-expression">I like (P).</p>
   <div class="self-introduction-official-actions">
    <button type="button" data-roulette-words="${esc(JSON.stringify(groups))}" aria-label="含まれる単語を見る" aria-haspopup="dialog">含まれる単語</button>
    <button type="button" data-interview-sentence="like" data-interview-cards="${esc(JSON.stringify(preset.cardIds))}" data-preset-practice-key="${esc(preset.id)}" aria-label="I like (P).を練習" aria-haspopup="dialog">I like (P). 練習</button>
    <a href="${esc(url)}" target="_blank" rel="noopener" aria-label="ひらく">ひらく</a>
    <button type="button" data-game-share="${esc(url)}" data-game-name="${esc(preset.name)}" aria-label="配布">配布</button>
   </div>
  </article>`;
 }
 function tiles(bookKey,unit){return bookKey==='lt1'&&Number(unit)===4?render():'';}
 root.SelfIntroductionOfficial={preset,tiles,pupilUrl,wordGroups};
})(window);
