(()=>{
 'use strict';
 const M=window.TownLevel2,$=id=>document.getElementById(id),names=['north','east','south','west'];
 const char=$('char'),sprite=$('sprite'),status=$('status'),sounds={place:$('placeSound'),turn:$('turnSound'),walk:$('walkSound')};
 let pos=null,dir=2,moving=false,anim=null,motionFrame=null,frame=0;
 const spriteUrl=(direction,f)=>`assets/ruriru-town/characters/${direction}-${f}.png`;
 // Preload all orientations so a turn or walk does not flash an empty character.
 const sprites=names.flatMap(direction=>Array.from({length:4},(_,i)=>{const image=new Image();image.src=spriteUrl(direction,i);return image;}));
 function setSprite(f=0){sprite.src=spriteUrl(names[dir],f%4);}
 function syncControls(){
  $('left').disabled=$('right').disabled=moving||!M.canTurn(pos);
  $('forward').disabled=$('little').disabled=!pos||moving;
  $('turnHint').textContent=pos&&!M.canTurn(pos)?'道路の途中です。交差点まで進むと曲がれます。':'曲がれるのは交差点だけです。';
 }
 function announceLocation(){
  if(!pos)return;
  const row=Math.floor(pos.r/2)+1,column=Math.floor(pos.c/2)+1;
  const place=M.canTurn(pos)?`横道${row}と縦道${column}の交差点`:pos.r%2?`縦道${column}の、横道${row}と横道${row+1}の中間`:`横道${row}の、縦道${column}と縦道${column+1}の中間`;
  $('location').textContent=`現在地：${place}。${['北','東','南','西'][dir]}向き。`;
 }
 function showAt(p){const point=M.point(p);char.style.left=point.x/M.size.width*100+'%';char.style.top=point.y/M.size.height*100+'%';char.hidden=false;setSprite();announceLocation();}
 function stopSounds(){for(const audio of Object.values(sounds)){audio.pause();try{audio.currentTime=0;}catch{}}}
 function playSound(kind){stopSounds();try{const pending=sounds[kind].play();if(pending)pending.catch(()=>{});}catch{}}
 function cancelMovement(){if(motionFrame!==null)cancelAnimationFrame(motionFrame);clearInterval(anim);motionFrame=anim=null;moving=false;frame=0;stopSounds();syncControls();}
 function place(letter){
  cancelMovement();const start=M.starts[letter];pos={r:start.r,c:start.c};dir=start.dir;showAt(pos);syncControls();playSound('place');
  document.querySelectorAll('.start').forEach(button=>{const active=button.textContent===letter;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
  status.textContent=`START ${letter} / facing ${names[dir]}`;
 }
 function turn(delta){if(moving||!M.canTurn(pos))return;dir=(dir+delta+4)%4;setSprite();playSound('turn');status.textContent=`Facing ${names[dir]}`;announceLocation();}
 function forward(steps){
  if(!pos||moving)return;const next=M.advance(pos,dir,steps);
  if(!next){status.textContent=steps===2&&M.advance(pos,dir,1)?'残りは半区画です。「Go straight for just a little bit.」で進めます。':'There is no road ahead.';return;}
  moving=true;frame=0;syncControls();
  const from=M.point(pos),to=M.point(next),duration=450*steps,start=performance.now();
  const instruction=steps===1?'Go straight for just a little bit.':'Go straight.';
  status.textContent=instruction;playSound('walk');anim=setInterval(()=>{frame=(frame+1)%4;setSprite(frame);},150);
  function tick(now){
   const t=Math.min(1,(now-start)/duration);
   char.style.left=(from.x+(to.x-from.x)*t)/M.size.width*100+'%';char.style.top=(from.y+(to.y-from.y)*t)/M.size.height*100+'%';
   if(t<1)motionFrame=requestAnimationFrame(tick);
   else{pos=next;cancelMovement();showAt(pos);status.textContent=instruction;}
  }
  motionFrame=requestAnimationFrame(tick);
 }
 for(const [letter,start] of Object.entries(M.starts)){
  const point=M.point(start),marker=document.createElement('div');marker.className='marker';marker.textContent=letter;marker.style.left=point.x/M.size.width*100+'%';marker.style.top=point.y/M.size.height*100+'%';$('markers').append(marker);
  const button=document.createElement('button');button.type='button';button.className='start';button.textContent=letter;button.setAttribute('aria-pressed','false');button.onclick=()=>place(letter);$('starts').append(button);
 }
 $('left').onclick=()=>turn(-1);$('right').onclick=()=>turn(1);$('forward').onclick=()=>forward(2);$('little').onclick=()=>forward(1);
 function suspend(){const wasMoving=moving;cancelMovement();if(pos)showAt(pos);if(wasMoving)status.textContent='移動を中止し、直前の停止位置に戻りました。';}
 window.addEventListener('pagehide',suspend);document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend();});syncControls();
})();
