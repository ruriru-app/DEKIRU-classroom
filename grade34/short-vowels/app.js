(() => {
  'use strict';
  const P=globalThis.Phonics;
  const $=id=>document.getElementById(id);
  const vowels=['a','e','i','o','u'];
  let state=P.start();
  let order=P.makeOrder();
  const from=new URLSearchParams(location.search).get('from')||'nh5';
  const upper=from==='nh5';
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
  const imagePath=word=>'assets/'+word+'.png';
  function letters(word,count=word.length){
    return [...word].map((char,i)=>'<span class="letter-slot'+(i===1?' vowel':'')+(i>=count?' empty':'')+'">'+(i<count?char:'')+'</span>').join('');
  }
  function pointerBlur(event){if(event.detail>0)event.currentTarget.blur();}
  P.words.forEach((word,index)=>{
    const vowel=vowels[Math.floor(index/5)];
    const card=document.createElement('button');card.type='button';card.className='word-card vowel-'+vowel;
    card.setAttribute('aria-label',word+' を表示');
    card.innerHTML='<img src="'+imagePath(word)+'" alt="" draggable="false"><span class="label" lang="en">'+word[0]+'<span class="vowel">'+word[1]+'</span>'+word[2]+'</span>';
    card.addEventListener('click',event=>{state=P.start('cards',index);render();pointerBlur(event);});
    $('word-grid').append(card);
    const button=document.createElement('button');button.type='button';button.className='vowel-'+vowel;button.textContent=word;button.lang='en';
    button.setAttribute('aria-label',word+' を選ぶ');
    button.addEventListener('click',event=>{state=P.start(state.mode,index);render();pointerBlur(event);});
    $('word-rail').append(button);
  });
  function render(){
    const overview=state.mode==='overview';
    $('mode-title').textContent={overview:'一覧表示',cards:'一語づつ読む',guess:'文字を読む',letters:'綴りを思い出す'}[state.mode];
    $('overview').hidden=!overview;$('lesson').hidden=overview;
    modes.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===state.mode)));
    if(overview)return;
    const word=P.words[state.index],vowel=vowels[Math.floor(state.index/5)],view=P.visible(state);
    $('lesson').className='vowel-'+vowel;
    $('lesson').dataset.mode=state.mode;
    $('lesson').classList.toggle('word-only',state.mode==='guess'&&!view.image);
    $('vowel-badge').textContent='short '+vowel;
    $('progress').textContent=String(order.indexOf(state.index)+1).padStart(2,'0')+' / 25';
    $('picture').src=imagePath(word);
    $('picture').hidden=!view.image;
    $('picture').alt=state.mode==='letters'?'単語を考えるためのイラスト':word+' のイラスト';
    $('picture-hidden').hidden=view.image;
    $('word').className='big-word'+(state.mode==='letters'?' spelling':'');
    $('word').innerHTML=letters(word,state.mode==='letters'?state.revealed:word.length);
    $('previous').disabled=order.indexOf(state.index)===0;$('next').disabled=order.indexOf(state.index)===24;
    const complete=(state.mode==='letters'&&state.revealed===word.length)||(state.mode==='guess'&&view.image);
    $('stage').className='stage'+(state.mode==='cards'?' static':'')+(complete?' answered':'');
    $('stage').setAttribute('aria-label',state.mode==='letters'?(view.text?view.text+'。':'')+(complete?'すべての文字を表示しました':'タップまたはEnterで次の1文字を表示'):state.mode==='guess'?word+'。'+(view.image?'イラストを表示しました':'タップまたはEnterでイラストを表示'):word);
    $('stage').setAttribute('aria-disabled',String(complete||state.mode==='cards'));
    $('instruction').textContent=state.mode==='cards'?'':complete?'次へ：次の語':state.mode==='letters'?'絵をタップ / Enter で、1文字ずつ表示':'タップ / Enter：イラストを表示';
    $('reset').hidden=state.mode==='cards';
    [...$('word-rail').children].forEach((b,i)=>{
      b.setAttribute('aria-current',String(i===state.index));
      b.textContent=state.mode==='letters'?String(i+1):P.words[i];
      b.setAttribute('aria-label',state.mode==='letters'?'単語 '+(i+1)+' を選ぶ':P.words[i]+' を選ぶ');
    });
  }
  function reveal(){if(state.mode==='letters'||state.mode==='guess'){state=P.advance(state);render();}}
  function navigate(delta){state=P.move(state,delta,order);render();}
  modes.forEach(button=>button.addEventListener('click',event=>{state=P.changeMode(state,button.dataset.mode);render();pointerBlur(event);}));
  function reorder(){order=P.makeOrder($('random-order').checked);state=P.start(state.mode,order[0]);$('reshuffle').hidden=!$('random-order').checked;render();}
  $('random-order').addEventListener('change',reorder);
  $('reshuffle').addEventListener('click',event=>{reorder();pointerBlur(event);});
  $('stage').addEventListener('click',reveal);
  $('previous').addEventListener('click',event=>{navigate(-1);pointerBlur(event);});
  $('next').addEventListener('click',event=>{navigate(1);pointerBlur(event);});
  $('reset').addEventListener('click',event=>{state=P.start(state.mode,state.index);render();pointerBlur(event);});
  document.addEventListener('keydown',event=>{
    if(event.altKey||event.ctrlKey||event.metaKey||event.isComposing)return;
    if(state.mode==='overview')return;
    if(event.repeat&&['Enter',' ','ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();return;}
    if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();navigate(event.key==='ArrowLeft'?-1:1);}
    if(event.key==='Enter'&&!event.target.closest('button,a,input,select,textarea')){event.preventDefault();reveal();}
  });
  const content=$('teaching-content');
  function syncFullscreen(){
    const expanded=document.fullscreenElement===content||content.classList.contains('expanded');
    document.body.classList.toggle('teaching-fullscreen',expanded);
    $('exit-fullscreen').hidden=!expanded;
    $('fullscreen').hidden=expanded;
  }
  async function exitFullscreen(){
    if(document.fullscreenElement===content)await document.exitFullscreen();
    content.classList.remove('expanded');syncFullscreen();
    $('fullscreen').focus();
  }
  $('fullscreen').addEventListener('click',async event=>{
    pointerBlur(event);
    try{await content.requestFullscreen();}catch{content.classList.add('expanded');}
    syncFullscreen();
  });
  $('exit-fullscreen').addEventListener('click',exitFullscreen);
  document.addEventListener('fullscreenchange',syncFullscreen);
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&content.classList.contains('expanded'))exitFullscreen();});
  render();
})();
