(()=>{
 'use strict';
 const S=window.SelfIntroductionSession;
 function element(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
 function button(text,action,label=text){const b=element('button','',text);b.type='button';b.setAttribute('aria-label',label);b.onclick=action;return b;}
 function mount(root,{delivery,cards,state=S.create(delivery),onChange=()=>{}}){
  const byId=new Map(cards.map(c=>[c.id,c]));let current=S.validate(delivery,state),selectedLetter=-1,activeColor=S.COLORS[0],destroyed=false;
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
  function render(){
   if(destroyed)return;stage.replaceChildren();edit.hidden=current.page!=='presentation';
   if(current.page==='presentation'){
    const panel=element('div','intro-presentation'),name=element('div','intro-display-name');name.dataset.introDisplayName='';letterNodes(name,false);
    const board=element('div','intro-display-board');current.selectedCardIds.forEach(id=>{const tile=element('div','intro-display-card');tile.dataset.introDisplayCard=id;tile.append(picture(id));board.append(tile);});
    panel.append(name,board);stage.append(panel);requestAnimationFrame(fitPresentation);return;
   }
   const layout=element('div','intro-compose'),left=element('section','intro-name-panel'),right=element('section','intro-cards-panel');
   left.append(element('h2','','なまえをつくろう'));
   const name=element('div','intro-name-editor');name.setAttribute('aria-label','作った名前');letterNodes(name,true);if(!current.letters.length)name.append(element('span','intro-hint','下の文字をタップしよう'));
   const colors=element('div','intro-colors');S.COLORS.forEach((color,i)=>{const b=button('',()=>{activeColor=color;if(selectedLetter>=0&&selectedLetter<current.letters.length)dispatch(S.colorLetter,selectedLetter,color);else render();},'色 '+(i+1));b.dataset.introColor=color;b.style.background=color;b.setAttribute('aria-pressed',String(activeColor===color));colors.append(b);});
   const del=button('この文字を消す',()=>{const index=selectedLetter;selectedLetter=-1;dispatch(S.removeLetter,index);});del.disabled=selectedLetter<0||selectedLetter>=current.letters.length;
   const keyboard=element('div','intro-keyboard');'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(char=>{const b=button(char,()=>{if(current.letters.length>=120)return;current=S.addLetter(delivery,current,char);current=S.colorLetter(delivery,current,current.letters.length-1,activeColor);selectedLetter=current.letters.length-1;render();onChange(current);});b.disabled=current.letters.length>=120;keyboard.append(b);});
   const space=button('スペース',()=>{if(current.letters.length>=120)return;selectedLetter=current.letters.length;dispatch(S.addLetter,' ');});space.disabled=current.letters.length>=120;space.className='intro-space';keyboard.append(space);
   left.append(name,element('p','intro-hint','文字をえらんで、色を変えたり消したりできます。'),colors,del,keyboard);
   right.append(element('h2','','好きなものをえらぼう（'+current.selectedCardIds.length+' / '+delivery.activity.maxCards+'枚）'));
   const slots=element('div','intro-selected');for(let i=0;i<delivery.activity.maxCards;i++){const id=current.selectedCardIds[i];if(id){const b=button('',()=>dispatch(S.removeCard,i),'選んだ '+byId.get(id).english+' を外す');b.dataset.introSelected=id;b.append(picture(id));slots.append(b);}else slots.append(element('div','intro-empty',String(i+1)));}
   const choices=element('div','intro-choices');delivery.activity.cardIds.forEach(id=>{const card=byId.get(id),chosen=current.selectedCardIds.includes(id);const b=button('',()=>dispatch(S.chooseCard,id),card.english);b.dataset.introChoice=id;b.setAttribute('aria-pressed',String(chosen));b.disabled=chosen||current.selectedCardIds.length>=delivery.activity.maxCards;b.append(picture(id),element('span','',card.english));choices.append(b);});
   right.append(slots,choices);layout.append(left,right);const finish=button('できあがり！',()=>dispatch(S.setPage,'presentation'));finish.className='intro-primary';finish.disabled=!current.selectedCardIds.length;stage.append(layout,finish);
  }
  function fitPresentation(){
   if(destroyed||current.page!=='presentation')return;const name=stage.querySelector('.intro-display-name'),board=stage.querySelector('.intro-display-board');if(!name||!board)return;
   // Leave a small inset for font/subpixel rounding at very long names.
   name.style.fontSize='80px';const ratio=Math.min(1,Math.max(0,name.clientWidth-4)/Math.max(1,name.scrollWidth));name.style.fontSize=(80*ratio)+'px';
   const count=current.selectedCardIds.length,w=board.clientWidth,h=board.clientHeight,gap=12;let best={size:0,cols:1};
   for(let rows=1;rows<=count;rows++){const cols=Math.ceil(count/rows),size=Math.min((w-gap*(cols-1))/cols,(h-gap*(rows-1))/rows);if(size>best.size)best={size,cols};}
   board.style.setProperty('--intro-card-size',Math.max(0,Math.floor(best.size))+'px');board.style.gridTemplateColumns='repeat('+best.cols+', var(--intro-card-size))';
  }
  const observer=new ResizeObserver(fitPresentation);observer.observe(stage);render();document.fonts?.ready.then(fitPresentation);
  return {update(value){current=S.validate(delivery,value);selectedLetter=-1;render();},destroy(){destroyed=true;observer.disconnect();root.replaceChildren();}};
 }
 window.SelfIntroductionStudent={mount};
})();
