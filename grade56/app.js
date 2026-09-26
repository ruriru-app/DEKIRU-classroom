(() => {
  'use strict';
  const books = {
    nh5: {title:'NEW HORIZON Elementary 5', grade:'5年生', color:'pink', units:['Hello, friends!','Happy birthday!','Can you play dodgeball?','Who is this?','Let’s go to the zoo.','At a restaurant.','Welcome to Japan!','Who is your hero?']},
    nh6: {title:'NEW HORIZON Elementary 6', grade:'6年生', color:'blue', units:['This is me!','My Daily Schedule','My Weekend','Let’s see the world.','Where is it from?','Save the animals.','My Best Memory','My Future, My Dream']}
  };
  const app = document.getElementById('app');
  const unitCategories = {
    nh5:['directions','positions','town','impressions','animals'],
    nh6:['nature','sea_animals','living_things','animals','bugs']
  };
  let vocabulary = null;
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function renderUnit(key,book) {
    const data=window.DEKIRU_DATA;
    const groups=unitCategories[key].flatMap((category,index)=>['standard','plus'].map(level=>({
      id:category+':'+level, label:data.categoryLabels[category]+(level==='plus'?' Plus':''),
      initial:index<3&&level==='standard', cards:data.cards.filter(c=>c.category===category&&c.displayGroup===level)
    })));
    const storageKey='dekiru:nhe-vocabulary:'+key+':5';
    let selected=groups.filter(g=>g.initial).flatMap(g=>g.cards.map(c=>c.id));
    let storageError=false;
    try {const saved=JSON.parse(localStorage.getItem(storageKey));if(Array.isArray(saved))selected=saved;} catch {storageError=true;}
    const available=new Set(groups.flatMap(g=>g.cards.map(c=>c.id)));
    vocabulary={groups,storageKey,selected:new Set(selected.filter(id=>available.has(id)))};
    document.title='Unit 5 — '+book.units[4]+' | '+book.title;
    const tiles=window.InterviewLinks?.tiles(key,5)||'';
    app.innerHTML=`<div class="nhe-workspace"><aside class="nhe-sidebar">${heading(book.units[4],book.title+' Unit 5','#/book/'+key)}<h2>使用する単語を選ぶ <small data-nhe-count></small></h2>${groups.map(g=>`<details class="word-group"><summary><span class="group-check"><input type="checkbox" aria-label="${g.label}をまとめて選択" data-nhe-group="${g.id}" ${g.cards.length?'':'disabled'}><span data-nhe-group-label>${g.label}</span><span>（${g.cards.length}）</span></span></summary><div class="word-group-items">${g.cards.map(c=>`<button class="word-chip" data-nhe-word="${escape(c.id)}" aria-pressed="false">${escape(c.english)}</button>`).join('')||'<p>追加の単語はありません。</p>'}</div></details>`).join('')}<p class="nhe-save-status" role="status">${storageError?'保存状態を読み込めませんでした。':''}</p></aside><section class="nhe-content">${heading(book.units[4],book.title+' Unit 5','#/book/'+key)}<div class="nhe-sections">${['Words and Phrases','Small Talk','Make Sentences','Activities'].map(name=>`<details><summary>${name}</summary><div class="nhe-section-body">${name==='Activities'&&tiles?'<div class="feature-grid">'+tiles+'</div>':'<p>準備中です。教材・活動はこれから追加します。</p>'}</div></details>`).join('')}</div></section></div>`;
    updateVocabulary(false);
    window.NheSavedSets.mount(app.querySelector('.nhe-sidebar'),{
      unit:key+':5',groups,getSelected:()=>vocabulary.selected,
      apply:ids=>{vocabulary.selected=new Set(ids.filter(id=>available.has(id)));updateVocabulary();}
    });
  }
  function updateVocabulary(save=true) {
    if(!vocabulary)return;
    const {groups,selected,storageKey}=vocabulary;
    app.querySelectorAll('[data-nhe-group]').forEach(input=>{
      const group=groups.find(g=>g.id===input.dataset.nheGroup);
      const count=group.cards.filter(c=>selected.has(c.id)).length;
      input.checked=count>0&&count===group.cards.length;
      input.indeterminate=count>0&&count<group.cards.length;
    });
    app.querySelectorAll('[data-nhe-word]').forEach(button=>{
      const active=selected.has(button.dataset.nheWord);
      button.setAttribute('aria-pressed',String(active));button.classList.toggle('off',!active);
    });
    app.querySelector('[data-nhe-count]').textContent='使用 '+selected.size+'語';
    if(save)try{localStorage.setItem(storageKey,JSON.stringify([...selected]));app.querySelector('.nhe-save-status').textContent='';}catch{app.querySelector('.nhe-save-status').textContent='このブラウザーに選択を保存できません。';}
  }
  function heading(title, subtitle, back) {
    return `<section class="page-heading"><button class="back-button" data-route="${back}" aria-label="戻る"><img src="../grade34/assets/ui/originals/戻る.svg" alt=""></button><div><p class="eyebrow">${subtitle}</p><h1>${title}</h1></div></section>`;
  }
  function render() {
    vocabulary=null;
    const [page,key,number] = location.hash.replace(/^#\/?/,'').split('/');
    const book=books[key];
    if(page==='phonics' && key==='nh5') {location.replace('../grade34/phonics.html?from=nh5');return;}
    document.title='DEKIRU Classroom for Grade 5 & 6';
    if(page==='book' && book) {
      document.title=book.title+' | DEKIRU Classroom';
      app.innerHTML=heading(book.title,book.grade,'#/')+`<section class="unit-grid">${book.units.map((title,i)=>`<button class="unit-tile ${book.color}" data-route="#/unit/${key}/${i+1}"><span>Unit ${i+1}</span><strong>${title}</strong></button>`).join('')}<button class="unit-tile activities" data-route="#/phonics/${key}"><span>${key==='nh5'?'一文字一音':'準備中'}</span><strong>Phonics</strong></button></section>`;
    } else if(book && page==='unit' && number==='5') {
      renderUnit(key,book);
    } else if(book && (page==='phonics' || (page==='unit' && /^[1-8]$/.test(number)))) {
      const title=page==='phonics'?'Phonics':`Unit ${number} — ${book.units[Number(number)-1]}`;
      document.title=title+' | '+book.title;
      app.innerHTML=heading(title,book.title,'#/book/'+key)+`<section class="hero"><h2>準備中</h2><p>${page==='phonics'?'カードの収録・表示方法は、これから追加します。':'このUnitの教材は、これから追加します。'}</p></section>`;
      const interviewTiles=page==='unit'?(window.InterviewLinks?.tiles(key,Number(number))||''):'';
      if(interviewTiles)app.insertAdjacentHTML('beforeend','<section class="hero"><h2>Activities</h2><div class="feature-grid">'+interviewTiles+'</div></section>');
    } else {
      app.innerHTML=`<section class="hero"><p class="eyebrow">授業をもっと楽しく、準備はもっと手軽に</p><h1>DEKIRU Classroom<br><span>for Grade 5 &amp; 6</span></h1><p>教科書を選んでください。</p></section><section class="top-grid" aria-label="教科書">${Object.entries(books).map(([key,book])=>`<button class="entry-tile ${book.color}" data-route="#/book/${key}"><span class="entry-kicker">${book.grade}</span><strong>${book.title}</strong><span>Unit一覧へ</span></button>`).join('')}</section>`;
    }
    window.scrollTo(0,0);
  }
  app.addEventListener('click',event=>{
    const word=event.target.closest('[data-nhe-word]');
    if(word&&vocabulary){const id=word.dataset.nheWord;vocabulary.selected.has(id)?vocabulary.selected.delete(id):vocabulary.selected.add(id);updateVocabulary();return;}
    const target=event.target.closest('[data-route]');
    if(target) location.hash=target.dataset.route;
  });
  app.addEventListener('change',event=>{
    const input=event.target.closest('[data-nhe-group]');
    if(!input||!vocabulary)return;
    vocabulary.groups.find(g=>g.id===input.dataset.nheGroup).cards.forEach(c=>input.checked?vocabulary.selected.add(c.id):vocabulary.selected.delete(c.id));
    updateVocabulary();
  });
  window.addEventListener('hashchange',render);
  render();
})();
