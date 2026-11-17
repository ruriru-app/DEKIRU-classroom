(() => {
  'use strict';
  const P=globalThis.Phonics;
  const $=id=>document.getElementById(id);
  const lessonConfig=globalThis.PhonicsLesson;
  const silentE=lessonConfig?.silentE===true;
  const vowelIndex=word=>silentE?word.length-3:1;
  const vowelOf=word=>word[vowelIndex(word)];
  const digraphOf=word=>lessonConfig?.digraphs?.[word];
  function accentClass(word){
    const digraph=digraphOf(word);
    return digraph?'digraph-'+digraph.group:'vowel-'+vowelOf(word);
  }
  function focusLabel(word){
    const digraph=digraphOf(word);
    if(digraph)return `${digraph.spelling} ${digraph.sound}`;
    const vowel=vowelOf(word);
    return silentE?vowel+'_e':'short '+vowel;
  }
  let state=P.start();
  let order=P.makeOrder();
  let projectionButton=null;
  // The projection follows the fixed order of short-vowels-writing-random.pdf.
  const randomWorksheetWords=lessonConfig?.randomWorksheetWords??'bug red mop bag map pig six bed cap pin run sit mom bus hot cup top leg hat dog sun ten pen cat big'.split(' ');
  const titles={
    overview:'一覧表示',cards:'一語づつ読む',guess:'文字を読む',letters:'綴りを思い出す',
    worksheets:'ワークシート',projection:"Let's Write!",typing:'タイピング'
  };
  const from=new URLSearchParams(location.search).get('from')||'nh5';
  const upper=from==='nh5'||from==='nh6';
  const home=upper?'../../grade56/index.html#/':'../index.html#/';
  $('brand-home').href=home;$('home').href=home;
  $('classroom-logo').src='../assets/ui/branding/logo-grade'+(upper?'56':'34')+'.svg';
  $('classroom-logo').alt='DEKIRU Classroom for Grade '+(upper?'5 & 6':'3 & 4');
  $('back').href='../phonics.html?from='+encodeURIComponent(from);
  $('settings-button').addEventListener('click',()=>{
    const settings=new URL('../class-settings.html',location.href);
    settings.searchParams.set('returnTo',new URL(home,location.href).href);
    location.href=settings.href;
  });
  const modes=[...document.querySelectorAll('[data-mode]')];
  const imageExtension=lessonConfig?.imageExtension??'png';
  const imagePath=word=>`assets/${word.toLowerCase()}.${imageExtension}`;
  function letterClass(word,index){
    const digraph=digraphOf(word);
    if(digraph)return index>=digraph.start&&index<digraph.start+digraph.spelling.length?'digraph-letter':'';
    if(index===vowelIndex(word))return 'vowel';
    return silentE&&index===word.length-1?'silent-ending':'';
  }
  function displayWord(word){
    const digraph=digraphOf(word);
    if(digraph){
      const end=digraph.start+digraph.spelling.length;
      return `${word.slice(0,digraph.start)}<span class="digraph-letter">${digraph.spelling}</span>${word.slice(end)}`;
    }
    return [...word].map((char,index)=>{
      const color=letterClass(word,index);
      return color?`<span class="${color}">${char}</span>`:char;
    }).join('');
  }
  function renderWord(word,spelling){
    const area=$('word');
    area.classList.toggle('spelling',spelling);
    area.style.setProperty('--letter-count',word.length);
    area.lang=spelling?'ja':'en';
    if(!spelling){
      area.innerHTML=displayWord(word);
      return;
    }
    if(area.children.length!==word.length||!area.firstElementChild?.matches('button')){
      area.replaceChildren(...[...word].map((_,index)=>{
        const slot=document.createElement('button');
        slot.type='button';
        slot.dataset.letterIndex=index;
        return slot;
      }));
    }
    [...area.children].forEach((slot,index)=>{
      const shown=state.letterIndices.includes(index);
      const char=word[index];
      slot.className=`letter-slot ${letterClass(word,index)}${shown?'':' empty'}`;
      slot.textContent=shown?char:'';
      slot.setAttribute('aria-label',`${index+1}文字目${shown?'、'+char:'を表示'}`);
    });
  }
  function pointerBlur(event){if(event.detail>0)event.currentTarget.blur();}
  function wordCard(word){
    const card=document.createElement('button');
    card.className='word-card '+accentClass(word);
    card.innerHTML=`<img src="${imagePath(word)}" alt="" draggable="false"><span class="label" lang="en">${displayWord(word)}</span>`;
    return card;
  }
  function projectionCard(word,index){
    const card=document.createElement('div');
    card.className='projection-card';
    const picture=document.createElement('img');
    picture.src=imagePath(word);
    picture.alt=`問題 ${index+1} のイラスト`;
    picture.draggable=false;
    const writingSpace=document.createElement('span');
    writingSpace.className='projection-lines';
    writingSpace.setAttribute('aria-hidden','true');
    writingSpace.style.setProperty('--letter-count',word.length);
    writingSpace.innerHTML='<span></span>'.repeat(word.length);
    card.append(picture,writingSpace);
    return card;
  }
  P.words.forEach((word,index)=>{
    const card=wordCard(word);
    card.type='button';
    card.setAttribute('aria-label',word+' を表示');
    card.addEventListener('click',event=>{state=P.start('cards',index);render();pointerBlur(event);});
    $('word-grid').append(card);
    const button=document.createElement('button');button.type='button';button.className=accentClass(word);button.textContent=word;button.lang='en';
    button.setAttribute('aria-label',word+' を選ぶ');
    button.addEventListener('click',event=>{state=P.start(state.mode,index);render();pointerBlur(event);});
    $('word-rail').append(button);
  });
  function isPracticeMode(){
    return state.mode==='cards'||state.mode==='guess'||state.mode==='letters';
  }
  function canPresent(){
    return state.mode==='overview'||isPracticeMode();
  }
  function render(){
    const projection=state.mode==='projection';
    const lesson=isPracticeMode();
    $('mode-title').textContent=titles[state.mode];
    $('overview').hidden=state.mode!=='overview';
    $('lesson').hidden=!lesson;
    $('worksheets').hidden=state.mode!=='worksheets';
    $('worksheet-projection').hidden=!projection;
    $('typing').hidden=state.mode!=='typing';
    $('fullscreen').hidden=!canPresent()||document.body.classList.contains('teaching-fullscreen');
    const selected=projection?'worksheets':state.mode;
    modes.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===selected)));
    if(!lesson)return;
    const word=P.words[state.index],view=P.visible(state);
    $('lesson').className=accentClass(word);
    $('lesson').dataset.mode=state.mode;
    $('lesson').classList.toggle('word-only',state.mode==='guess'&&!view.image);
    $('vowel-badge').textContent=focusLabel(word);
    const position=order.indexOf(state.index);
    $('progress').textContent=String(position+1).padStart(2,'0')+' / '+P.words.length;
    if($('picture').getAttribute('src')!==imagePath(word))$('picture').src=imagePath(word);
    $('picture').hidden=!view.image;
    $('picture').alt=state.mode==='letters'?'単語を考えるためのイラスト':word+' のイラスト';
    $('picture-hidden').hidden=view.image;
    renderWord(word,state.mode==='letters');
    $('previous').disabled=position===0;$('next').disabled=position===order.length-1;
    const complete=(state.mode==='letters'&&state.revealed===word.length)||(state.mode==='guess'&&view.image);
    $('stage').classList.toggle('answered',complete);
    $('reveal-picture').hidden=state.mode!=='guess'||view.image;
    $('instruction').textContent=state.mode==='cards'?'':complete?'次へ：次の語':state.mode==='letters'?'文字の枠をタップ / Enterで左から表示':'タップ / Enter：イラストを表示';
    $('reset').hidden=state.mode==='cards';
    [...$('word-rail').children].forEach((b,i)=>{
      b.setAttribute('aria-current',String(i===state.index));
      b.textContent=state.mode==='letters'?String(i+1):P.words[i];
      b.setAttribute('aria-label',state.mode==='letters'?'単語 '+(i+1)+' を選ぶ':P.words[i]+' を選ぶ');
    });
  }
  function reveal(index){
    if(state.mode==='letters'||state.mode==='guess'){
      state=P.advance(state,index);
      render();
    }
  }
  function navigate(delta){state=P.move(state,delta,order);render();}
  modes.forEach(button=>button.addEventListener('click',event=>{state=P.changeMode(state,button.dataset.mode);render();pointerBlur(event);}));
  const typingLink=$('open-typing');
  $('copy-typing-url').addEventListener('click',async()=>{
    const status=$('typing-copy-status');
    const field=$('typing-share-url');
    try{
      await navigator.clipboard.writeText(typingLink.href);
      field.hidden=true;
      status.textContent='URLをコピーしました。';
    }catch{
      field.value=typingLink.href;
      field.hidden=false;
      field.focus();
      field.select();
      status.textContent='選択したURLをコピーしてください。';
    }
  });
  function reorder(){order=P.makeOrder($('random-order').checked);state=P.start(state.mode,order[0]);$('reshuffle').hidden=!$('random-order').checked;render();}
  $('random-order').addEventListener('change',reorder);
  $('reshuffle').addEventListener('click',event=>{reorder();pointerBlur(event);});
  $('reveal-picture').addEventListener('click',()=>reveal());
  $('word').addEventListener('click',event=>{
    const slot=event.target.closest('button[data-letter-index]');
    if(slot&&state.mode==='letters')reveal(Number(slot.dataset.letterIndex));
  });
  $('previous').addEventListener('click',event=>{navigate(-1);pointerBlur(event);});
  $('next').addEventListener('click',event=>{navigate(1);pointerBlur(event);});
  $('reset').addEventListener('click',event=>{state=P.start(state.mode,state.index);render();pointerBlur(event);});
  document.addEventListener('keydown',event=>{
    if(event.altKey||event.ctrlKey||event.metaKey||event.isComposing)return;
    if(!isPracticeMode())return;
    if(event.repeat&&['Enter',' ','ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();return;}
    if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();navigate(event.key==='ArrowLeft'?-1:1);}
    if(event.key==='Enter'){
      const target=event.target;
      if(target.closest('button[data-letter-index]')||!target.closest('button,a,input,select,textarea')){
        event.preventDefault();
        reveal();
      }
    }
  });
  const content=$('teaching-content');
  function syncFullscreen(){
    const expanded=document.fullscreenElement===content||content.classList.contains('expanded');
    document.body.classList.toggle('teaching-fullscreen',expanded);
    $('exit-fullscreen').hidden=!expanded;
    if(!expanded&&state.mode==='projection'){
      state=P.changeMode(state,'worksheets');
      render();
      projectionButton?.focus();
      projectionButton=null;
    }
    $('fullscreen').hidden=expanded||!canPresent();
  }
  async function exitFullscreen(){
    if(document.fullscreenElement===content)await document.exitFullscreen();
    content.classList.remove('expanded');syncFullscreen();
    $('fullscreen').focus();
  }
  async function enterFullscreen(){
    try{await content.requestFullscreen();}catch{content.classList.add('expanded');}
    syncFullscreen();
  }
  $('fullscreen').addEventListener('click',event=>{
    pointerBlur(event);
    enterFullscreen();
  });
  document.querySelectorAll('[data-worksheet-projection]').forEach(button=>{
    button.addEventListener('click',()=>{
      projectionButton=button;
      const words=button.dataset.worksheetProjection==='random'?randomWorksheetWords:P.words;
      $('projection-grid').replaceChildren(...words.map(projectionCard));
      state=P.changeMode(state,'projection');
      render();
      enterFullscreen();
    });
  });
  $('exit-fullscreen').addEventListener('click',exitFullscreen);
  document.addEventListener('fullscreenchange',syncFullscreen);
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&content.classList.contains('expanded'))exitFullscreen();});
  render();
})();
