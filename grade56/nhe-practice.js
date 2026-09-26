/* Uses the same card layout and ordering controls as Let's Try. */
window.NhePractice=(()=>{
 'use strict';
 const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function mount(app,items){
  const practice=CardPractice.create(),display={image:true,english:true,japanese:false};
  const section=app.querySelector('.nhe-content'),menu=section.querySelector('.nhe-sections'),heading=section.querySelector('.page-heading');
  const entry=document.createElement('button');entry.className='feature-tile';entry.textContent='発音練習';
  const body=menu.querySelector('.nhe-section-body');body.replaceChildren(entry);
  const settings=document.createElement('section');settings.className='nhe-practice-settings';settings.hidden=true;
  settings.innerHTML='<h2>表示設定</h2>'+Object.entries({image:'絵',english:'英語',japanese:'日本語'}).map(([key,label])=>`<label><input type="checkbox" data-nhe-display="${key}" ${display[key]?'checked':''}> ${label}</label>`).join(' ')+practice.settings(true);
  app.querySelector('.nhe-sidebar').append(settings);
  const panel=document.createElement('section');panel.className='content-panel nhe-practice';panel.dataset.nhePractice='';panel.hidden=true;section.append(panel);
  let active=false;
  function refresh(){
   if(!active)return;
   const chosen=practice.arrange(items());
   panel.innerHTML=`<div class="feature-heading"><button class="back-button" aria-label="Unitメニューへ戻る" data-practice-back>◀</button><div><p>${escape(heading.querySelector('.eyebrow').textContent)}</p><h1>発音練習</h1></div><div class="feature-toolbar">使用 ${chosen.length}語 <button class="fullscreen-button" aria-label="全画面表示" data-practice-fullscreen>⛶</button></div></div><div class="feature-view"><div class="practice-scroll">${chosen.length?`<div class="practice-grid" data-layout="${practice.layout}">${chosen.map(c=>{
    const source=CardSet.source(c);
    return `<button class="practice-card ${display.image?'':'no-picture'}" data-speak="${escape(c.speech||c.english)}" aria-label="${escape(c.english)}を発音">${display.image?`<div class="practice-art">${source?`<img src="${escape(source)}" alt="">`:'<span>No image</span>'}</div>`:''}<div class="practice-label">${display.english?`<strong>${escape(c.english)}</strong>`:''}${display.japanese?`<small>${escape(c.japanese)}</small>`:''}</div></button>`;
   }).join('')}</div>`:'<p>左側のメニューで練習する単語を選んでください。</p>'}</div></div>`;
  }
  function close(){
   if(document.fullscreenElement===panel)document.exitFullscreen().catch(()=>{});
   window.speechSynthesis?.cancel();active=false;panel.classList.remove('fullscreen-content');panel.hidden=true;panel.replaceChildren();settings.hidden=true;menu.hidden=false;heading.hidden=false;
  }
  entry.addEventListener('click',()=>{active=true;menu.hidden=true;heading.hidden=true;settings.hidden=false;panel.hidden=false;refresh();panel.querySelector('[data-practice-back]').focus();});
  settings.addEventListener('change',event=>{
   const el=event.target;
   if(el.dataset.practiceSetting)practice.configure(el.dataset.practiceSetting,el.value);
   if(el.dataset.nheDisplay){display[el.dataset.nheDisplay]=el.checked;if(!Object.values(display).some(Boolean)){display[el.dataset.nheDisplay]=true;el.checked=true;}}
   refresh();
  });
  panel.addEventListener('click',async event=>{
   if(event.target.closest('[data-practice-back]')){close();entry.focus();return;}
   if(event.target.closest('[data-practice-fullscreen]')){
    if(panel.classList.contains('fullscreen-content'))panel.classList.remove('fullscreen-content');
    else try{if(document.fullscreenElement===panel)await document.exitFullscreen();else await panel.requestFullscreen();}catch{panel.classList.add('fullscreen-content');}
    return;
   }
   const card=event.target.closest('[data-speak]');
   if(card&&window.speechSynthesis){speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(card.dataset.speak);utterance.lang='en-US';utterance.rate=0.78;speechSynthesis.speak(utterance);}
  });
  panel.addEventListener('keydown',event=>{if(event.key==='Escape'&&panel.classList.contains('fullscreen-content'))panel.classList.remove('fullscreen-content');});
  return {refresh,close};
 }
 return {mount};
})();
