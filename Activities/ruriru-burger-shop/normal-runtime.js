(() => {
  'use strict';
  const requested=Number(new URLSearchParams(window.location.search).get('level')||1);
  const level=Number.isInteger(requested)&&requested>=1&&requested<=4?requested:1;
  if(!globalThis.RuRiRuProgress.isUnlocked(level)) { window.location.replace('./index.html'); return; }
  const themes={1:'屋台',2:'フードコート',3:'独立店舗',4:'リゾート'};
  const products=globalThis.RuRiRuLevelMenus.getProducts(level);
  const profiles=globalThis.RuRiRuCustomers.getCustomers(level);
  globalThis.RuRiRuNormalRuntime=Object.freeze({level,products,profiles});
  document.body.dataset.level=String(level);
  document.title=`RuRiRu BURGER SHOP — LEVEL ${level} NORMAL`;
  document.querySelector('.level-pill strong').textContent=String(level);
  document.querySelector('.game-shell').setAttribute('aria-label',`RuRiRu BURGER SHOP LEVEL ${level}`);
  document.getElementById('shop-info-tile').setAttribute('aria-label',`RuRiRu BURGER SHOP LEVEL ${level} NORMAL 接客チャレンジ`);
  document.querySelector('.fullscreen-level').textContent=`LEVEL ${level} · NORMAL`;
  document.getElementById('customer-progress').textContent=`1 / ${level} 人`;
  document.getElementById('service-window').setAttribute('aria-label',`${themes[level]}の接客カウンター`);
  document.querySelector('.store-background-art').src=`./assets/level${level}-background.png`;
  document.querySelector('.counter-art-layer').src=`./assets/level${level}-counter-foreground.png`;
  document.getElementById('prototype-note').hidden=true;
  document.getElementById('result-context').textContent=`LEVEL ${level} NORMAL · ${level}人`;
})();
