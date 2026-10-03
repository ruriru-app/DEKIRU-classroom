(() => {
  'use strict';
  for(const selector of ['#loadingScreen','#menuScreen>header','.price-header','.rest-head']){
    const header=document.querySelector(selector);
    if(!header)continue;
    const back=document.createElement('a');
    back.className='restaurant-unit-back';
    back.href='../grade56/index.html#/unit/nh5/6';
    back.textContent='◀ Unit6へ戻る';
    back.setAttribute('aria-label','NHE5 Unit6のActivitiesへ戻る');
    back.addEventListener('click',event=>{
      if(document.querySelector('#menuScreen .slot.filled')&&!window.confirm('Unit6に戻りますか？この画面で選んだメニューと値段はリセットされます。')){
        event.preventDefault();return;
      }
      document.querySelectorAll('audio').forEach(audio=>audio.pause());
    });
    header.prepend(back);
  }
})();
