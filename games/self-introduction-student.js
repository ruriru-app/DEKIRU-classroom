(()=>{
 'use strict';
 const S=window.SelfIntroductionSession;
 function element(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
 function button(text,action,label=text){const b=element('button','',text);b.type='button';b.setAttribute('aria-label',label);b.onclick=action;return b;}
 function mount(root,{delivery,cards,state=S.create(delivery),onChange=()=>{}}){
  const byId=new Map(cards.map(c=>[c.id,c]));let current=S.validate(delivery,state),selectedLetter=-1,activeColor=S.DEFAULT_COLOR,destroyed=false;
  const shell=element('section','intro-student'),header=element('header','intro-top'),titleBlock=element('div','intro-title-block');
  titleBlock.append(element('h1','',delivery.activity.title),element('p','',delivery.activity.studentInstructions));
  const edit=button('',()=>dispatch(S.setPage, 'compose'),'編集する');edit.className='intro-back';
  const back=element('img');back.src='../grade34/assets/ui/originals/戻る.svg';back.alt='';edit.append(back);
  const full=button('⛶',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await shell.requestFullscreen();}catch{status.textContent='この端末では全画面表示を利用できません。';}},'全画面表示');full.className='intro-fullscreen';
  header.append(edit,titleBlock,full);const status=element('p','intro-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const stage=element('div','intro-stage');shell.append(header,status,stage);root.replaceChildren(shell);
  function dispatch(fn,...args){try{current=fn(delivery,current,...args);status.textContent='';render();onChange(current);}catch(e){status.textContent=e.message;}}
  function picture(id,cls){const card=byId.get(id),img=element('img',cls);img.src=card.image;img.alt=card.english;img.draggable=false;img.onerror=()=>{if(destroyed)return;const fallback=element('span','intro-image-fallback','画像を表示できません');img.replaceWith(fallback);};return img;}
  function letterNodes(container,interactive){current.letters.forEach((l,i)=>{const e=interactive?button(l.char,()=>{selectedLetter=i;activeColor=l.color;render();},'文字 '+(i+1)+' '+l.char):element('span','',l.char);e.style.color=l.color;if(interactive){e.dataset.introLetter=i;e.setAttribute('aria-pressed',String(i===selectedLetter));}container.append(e);});}
  function rememberEditor(){
   const focused=document.activeElement,focus=stage.contains(focused)?{...focused.dataset,label:focused.getAttribute('aria-label')}:null;
   return {choices:stage.querySelector('.intro-choices')?.scrollTop||0,name:stage.querySelector('.intro-name-editor')?.scrollTop||0,focus};
  }
  function restoreEditor(saved){
   stage.querySelector('.intro-choices').scrollTop=saved.choices;stage.querySelector('.intro-name-editor').scrollTop=saved.name;
   const f=saved.focus;if(!f)return;
   const find=(key,value)=>[...stage.querySelectorAll('button')].find(b=>b.dataset[key]===value);
   let target=null;
   if(f.introChoice!==undefined)target=find('introSelected',f.introChoice)||find('introChoice',f.introChoice);
   else if(f.introSelected!==undefined)target=find('introSelected',f.introSelected)||find('introChoice',f.introSelected);
   else if(f.introLetter!==undefined)target=find('introLetter',f.introLetter);
   else if(f.introColor!==undefined)target=find('introColor',f.introColor);
   else if(f.introKey!==undefined)target=find('introKey',f.introKey);
   else target=[...stage.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')===f.label);
   if(!target||target.disabled)target=stage.querySelector('[data-intro-letter]')||stage.querySelector('[data-intro-key]');
   target?.focus({preventScroll:true});
  }
  function render(){
   if(destroyed)return;const saved=rememberEditor();stage.replaceChildren();edit.hidden=current.page!=='presentation';
   if(current.page==='presentation'){
    const panel=element('div','intro-presentation'),name=element('div','intro-display-name');name.dataset.introDisplayName='';letterNodes(name,false);
    const board=element('div','intro-display-board');current.selectedCardIds.forEach(id=>{const tile=element('div','intro-display-card');tile.dataset.introDisplayCard=id;tile.append(picture(id));board.append(tile);});
    panel.append(name,board);stage.append(panel);if(saved.focus)edit.focus({preventScroll:true});requestAnimationFrame(fitPresentation);return;
   }
   const layout=element('div','intro-compose'),left=element('section','intro-name-panel'),right=element('section','intro-cards-panel');
   left.append(element('h2','','なまえをつくろう'));
   const name=element('div','intro-name-editor');name.setAttribute('aria-label','作った名前');letterNodes(name,true);if(!current.letters.length)name.append(element('span','intro-hint','下の文字をタップしよう'));
   const colors=element('div','intro-colors');S.COLOR_OPTIONS.forEach(({value:color,english})=>{const b=button('',()=>{activeColor=color;if(selectedLetter>=0&&selectedLetter<current.letters.length)dispatch(S.colorLetter,selectedLetter,color);else render();},'色 '+english);b.dataset.introColor=color;b.title=english;b.style.background=color;b.setAttribute('aria-pressed',String(activeColor===color));colors.append(b);});
   const del=button('この文字を消す',()=>{const index=selectedLetter;selectedLetter=-1;dispatch(S.removeLetter,index);});del.disabled=selectedLetter<0||selectedLetter>=current.letters.length;
   const keyboard=element('div','intro-keyboard');'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(char=>{const b=button(char,()=>{if(current.letters.length>=120)return;current=S.addLetter(delivery,current,char);current=S.colorLetter(delivery,current,current.letters.length-1,activeColor);selectedLetter=current.letters.length-1;render();onChange(current);});b.dataset.introKey=char;b.disabled=current.letters.length>=120;keyboard.append(b);});
   const space=button('スペース',()=>{if(current.letters.length>=120)return;selectedLetter=current.letters.length;dispatch(S.addLetter,' ');});space.dataset.introKey=' ';space.disabled=current.letters.length>=120;space.className='intro-space';keyboard.append(space);
   left.append(name,element('p','intro-hint','文字をえらんで、色を変えたり消したりできます。'),colors,del,keyboard);
   right.append(element('h2','','好きなものをえらぼう（'+current.selectedCardIds.length+' / '+delivery.activity.maxCards+'枚）'));
   const slots=element('div','intro-selected');for(let i=0;i<delivery.activity.maxCards;i++){const id=current.selectedCardIds[i];if(id){const b=button('',()=>dispatch(S.removeCard,i),'選んだ '+byId.get(id).english+' を外す');b.dataset.introSelected=id;b.append(picture(id));slots.append(b);}else slots.append(element('div','intro-empty',String(i+1)));}
   const choices=element('div','intro-choices');delivery.activity.cardIds.forEach(id=>{const card=byId.get(id),chosen=current.selectedCardIds.includes(id);const b=button('',()=>dispatch(S.chooseCard,id),card.english);b.dataset.introChoice=id;b.setAttribute('aria-pressed',String(chosen));b.disabled=chosen||current.selectedCardIds.length>=delivery.activity.maxCards;b.append(picture(id),element('span','',card.english));choices.append(b);});
   right.append(slots,choices);layout.append(left,right);const finish=button('できあがり！',()=>dispatch(S.setPage,'presentation'));finish.className='intro-primary';finish.disabled=!current.selectedCardIds.length;stage.append(layout,finish);restoreEditor(saved);
  }
  function fitPresentation(){
   if(destroyed||current.page!=='presentation')return;const name=stage.querySelector('.intro-display-name'),board=stage.querySelector('.intro-display-board');if(!name||!board)return;
   const panel=name.parentElement,fraction=({small:1/6,medium:1/4,large:1/3})[delivery.activity.nameSize||'large'];
   const nameHeight=name.textContent?Math.min(Math.floor(shell.clientHeight*fraction),Math.max(0,panel.clientHeight-40)):0;
   panel.style.gridTemplateRows=nameHeight?nameHeight+'px minmax(0,1fr)':'minmax(0,1fr)';
   // Measure the glyphs themselves: centered overflowing text has hidden space on both sides.
   const baseFont=nameHeight/1.1;name.style.fontSize=baseFont+'px';
   const textWidth=[...name.children].reduce((width,letter)=>width+letter.getBoundingClientRect().width,0);
   name.style.fontSize=(baseFont*Math.min(1,Math.max(0,name.clientWidth-8)/Math.max(1,textWidth)))+'px';
   const count=current.selectedCardIds.length,w=board.clientWidth,h=board.clientHeight,gap=12;
   const size=Math.max(0,Math.floor(Math.min((w-gap*(count-1))/count,h)));
   board.style.setProperty('--intro-card-size',size+'px');board.style.gridTemplateColumns='repeat('+count+', var(--intro-card-size))';
  }
  const observer=new ResizeObserver(fitPresentation);observer.observe(stage);render();document.fonts?.ready.then(fitPresentation);
  return {update(value){current=S.validate(delivery,value);selectedLetter=-1;render();},destroy(){destroyed=true;observer.disconnect();root.replaceChildren();}};
 }
 window.SelfIntroductionStudent={mount};
})();
