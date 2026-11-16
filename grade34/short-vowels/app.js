(() => {
  'use strict';
  const P=globalThis.Phonics;
  const $=id=>document.getElementById(id);
  const vowels=['a','e','i','o','u'];
  let state=P.start();
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
    $('overview').hidden=!overview;$('lesson').hidden=overview;
    modes.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===state.mode)));
    $('keyboard-hint').textContent=overview?'一覧から好きな語を選べます':'Enter：表示する　｜　← →：前・次の語';
    if(overview)return;
    const word=P.words[state.index],vowel=vowels[Math.floor(state.index/5)],view=P.visible(state);
    $('lesson').className='vowel-'+vowel;
    $('vowel-badge').textContent='short '+vowel;
    $('progress').textContent=String(state.index+1).padStart(2,'0')+' / 25';
    $('picture').src=imagePath(word);
    $('picture').hidden=!view.image;
    $('picture').alt=state.mode==='letters'?'単語を考えるためのイラスト':word+' のイラスト';
    $('picture-hidden').hidden=view.image;
    $('word').className='big-word'+(state.mode==='letters'?' spelling':'');
    $('word').innerHTML=letters(word,state.mode==='letters'?state.revealed:word.length);
    $('previous').disabled=state.index===0;$('next').disabled=state.index===24;
    const complete=(state.mode==='letters'&&state.revealed===word.length)||(state.mode==='guess'&&view.image);
    $('stage').className='stage'+(state.mode==='cards'?' static':'')+(complete?' answered':'');
    $('stage').setAttribute('aria-label',state.mode==='letters'?(view.text?view.text+'。':'')+(complete?'すべての文字を表示しました':'タップまたはEnterで次の1文字を表示'):state.mode==='guess'?word+'。'+(view.image?'イラストを表示しました':'タップまたはEnterでイラストを表示'):word);
    $('stage').setAttribute('aria-disabled',String(complete||state.mode==='cards'));
    $('instruction').textContent=state.mode==='cards'?'絵と単語を見て、声に出してみよう。':complete?'表示できました。「次へ」で次の語に進みます。':state.mode==='letters'?'絵をタップ / Enter で、1文字ずつ表示':'単語を読んだら、タップ / Enter で絵を表示';
    $('reset').hidden=state.mode==='cards';
    [...$('word-rail').children].forEach((b,i)=>{
      b.setAttribute('aria-current',String(i===state.index));
      b.textContent=state.mode==='letters'?String(i+1):P.words[i];
      b.setAttribute('aria-label',state.mode==='letters'?'単語 '+(i+1)+' を選ぶ':P.words[i]+' を選ぶ');
    });
  }
  function reveal(){if(state.mode==='letters'||state.mode==='guess'){state=P.advance(state);render();}}
  function navigate(delta){state=P.move(state,delta);render();}
  modes.forEach(button=>button.addEventListener('click',event=>{state=P.changeMode(state,button.dataset.mode);render();pointerBlur(event);}));
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
  $('fullscreen').addEventListener('click',async event=>{
    pointerBlur(event);
    try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{ $('fullscreen').textContent='全画面にできません'; }
  });
  document.addEventListener('fullscreenchange',()=>{$('fullscreen').setAttribute('aria-label',document.fullscreenElement?'全画面を終了':'全画面表示');$('fullscreen').innerHTML=document.fullscreenElement?'⛶ <span>全画面を終了</span>':'⛶ <span>全画面</span>';});
  render();
})();
