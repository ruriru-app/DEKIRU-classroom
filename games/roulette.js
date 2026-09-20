function stopRouletteGame(){
  rouletteRunId++;
  if(rouletteSpinTimer)clearTimeout(rouletteSpinTimer);
  rouletteSpinTimer=0;
  roulettePendingPlayer=0;
  rouletteSpinning=false;
  rouletteSelectedPlayer=0;
  roulettePhrasePlayerId=0;
  rouletteSelectedPhraseText='';
  roulettePhraseWord='～';
  roulettePhraseCardId='';
  window.speechSynthesis?.cancel();
}
function rouletteArtMarkup(asset,className,label){
  return '<img class="'+(className||'')+'" src="'+asset+'" alt="'+escapeHtml(label||'')+'">';
}
function roulettePieceMarkup(player,extraClass,attributes){
  return '<span class="roulette-piece-art '+(extraClass||'')+'" '+(attributes||'')+'>'+rouletteArtMarkup(player.pieceAsset,'roulette-piece-svg','Player '+player.id)+'</span>';
}
function rouletteButtonMarkup(player,extraClass,attributes,rotation){
  return '<button class="roulette-corner-button '+(extraClass||'')+'" type="button" '+(attributes||'')+' style="--corner-rotation:'+(rotation||0)+'deg">'+rouletteArtMarkup(player.buttonAsset,'roulette-button-svg','Player '+player.id+' 1マスすすむ')+'</button>';
}
function rouletteCornerById(id){
  return ROULETTE_CORNERS.find(corner=>corner.id===id)||ROULETTE_CORNERS[0];
}
function roulettePlayerAtCorner(cornerId,players){
  return (players||ROULETTE_PLAYERS.slice(0,roulettePlayerCount)).find(player=>roulettePlaced.get(player.id)?.corner===cornerId)||null;
}
function rouletteCornerBoardMarkup(players,mode){
  const activePlayers=players||ROULETTE_PLAYERS.slice(0,roulettePlayerCount);
  const baseLayers=ROULETTE_CORNERS.map(corner=>{
    const player=roulettePlayerAtCorner(corner.id,activePlayers);
    const asset=player?.cornerBoardDisabledAsset||'../assets/ui/roulette_corner_board_disabled.svg?v=0.0.46';
    return '<img class="roulette-corner-board-layer roulette-corner-board-base corner-'+corner.id+'" src="'+asset+'" alt="">';
  }).join('');
  const coloredLayers=activePlayers.filter(player=>roulettePlaced.has(player.id)).map(player=>{
    const corner=rouletteCornerById(roulettePlaced.get(player.id)?.corner);
    const inactive=mode==='play'&&(rouletteSpinning||rouletteSelectedPlayer!==player.id)?' inactive':'';
    return '<img class="roulette-corner-board-layer corner-'+corner.id+inactive+'" data-roulette-corner-color="'+player.id+'" src="'+player.cornerBoardAsset+'" alt="">';
  }).join('');
  const controls=ROULETTE_CORNERS.map(corner=>{
    const player=roulettePlayerAtCorner(corner.id,activePlayers);
    if(player){
      const attributes=mode==='play'?'data-roulette-move="'+player.id+'" aria-label="Player '+player.id+' 1マスすすむ" disabled':'data-roulette-placed-player="'+player.id+'"';
      return '<button class="roulette-corner-slot corner-'+corner.id+(mode==='play'?' roulette-corner-move':'')+'" type="button" '+attributes+' style="--corner-piece-rotation:'+corner.rotation+'deg">'+roulettePieceMarkup(player,'roulette-corner-piece','')+'</button>';
    }
    if(mode==='lobby')return '<button class="roulette-corner-slot corner-'+corner.id+' empty" type="button" data-roulette-corner="'+corner.id+'" aria-label="'+corner.label+'に置く"><span>＋</span></button>';
    return '';
  }).join('');
  return '<div class="roulette-corner-board">'+baseLayers+coloredLayers+controls+'</div>';
}
function rouletteRunnerOffset(playerId){
  return [{x:-18,y:-16},{x:18,y:-16},{x:-18,y:16},{x:18,y:16}][playerId-1]||{x:0,y:0};
}
function renderRouletteLobby(){
  const stage=document.getElementById('rouletteStage');
  if(!stage)return;
  if(!roulettePlayerCount){
    stage.innerHTML='<div class="roulette-lobby"><label class="roulette-course-count">コースのマス数 <select id="rouletteCourseCount">'+[4,6,8,12].map(count=>'<option value="'+count+'"'+(activeRouletteConfig.cardCount===count?' selected':'')+'>'+count+'マス</option>').join('')+'</select></label><h2>HOW MANY PLAYERS?</h2><div class="roulette-player-counts">'+[2,3,4].map(count=>'<button class="roulette-player-count" type="button" data-roulette-count="'+count+'">'+count+'</button>').join('')+'</div></div>';
    return;
  }
  const players=ROULETTE_PLAYERS.slice(0,roulettePlayerCount);
  const placed=players.filter(player=>roulettePlaced.has(player.id));
  const unplaced=players.filter(player=>!roulettePlaced.has(player.id));
  if(!roulettePlacementSelection||roulettePlaced.has(roulettePlacementSelection))roulettePlacementSelection=unplaced[0]?.id||0;
  const corners=rouletteCornerBoardMarkup(players,'lobby');
  stage.innerHTML='<div class="roulette-lobby"><h2>Take your button!</h2><p class="roulette-placement-note">自分のコマを選び、座っている場所に近い四隅をタップしてください。</p><div class="roulette-place-area" id="roulettePlaceArea"><div class="roulette-place-center">四隅から場所を選ぼう</div>'+corners+'<div class="roulette-token-bank">'+unplaced.map(player=>roulettePieceMarkup(player,'roulette-bank-piece'+(roulettePlacementSelection===player.id?' selected':''),'data-roulette-token="'+player.id+'" role="button" tabindex="0"')).join('')+'</div></div><button class="roulette-lobby-start" id="rouletteLobbyStart" type="button"'+(placed.length===roulettePlayerCount?'':' disabled')+'>START</button></div>';
  bindRoulettePlacement();
}
function placeRoulettePlayerAtCorner(id,cornerId){
  if(!id||roulettePlaced.has(id))return;
  const occupied=roulettePlayerAtCorner(cornerId);
  if(occupied)return;
  roulettePlaced.set(id,{corner:cornerId});
  const next=ROULETTE_PLAYERS.slice(0,roulettePlayerCount).find(player=>!roulettePlaced.has(player.id));
  roulettePlacementSelection=next?.id||0;
  renderRouletteLobby();
}
function bindRoulettePlacement(){
  const area=document.getElementById('roulettePlaceArea');
  if(!area)return;
  area.querySelectorAll('[data-roulette-token]').forEach(token=>{
    const select=()=>{roulettePlacementSelection=Number(token.dataset.rouletteToken);renderRouletteLobby()};
    token.addEventListener('click',select);
    token.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();select()}});
  });
  area.querySelectorAll('[data-roulette-corner]').forEach(target=>target.addEventListener('click',()=>placeRoulettePlayerAtCorner(roulettePlacementSelection,target.dataset.rouletteCorner)));
  area.querySelectorAll('[data-roulette-placed-player]').forEach(button=>button.addEventListener('click',()=>{
    const id=Number(button.dataset.roulettePlacedPlayer);
    roulettePlaced.delete(id);
    roulettePlacementSelection=id;
    renderRouletteLobby();
  }));
  document.getElementById('rouletteLobbyStart')?.addEventListener('click',startRouletteBoard);
}
function buildRouletteCourse(config){
  const pool=shuffled(config.selectedCardIds.map(id=>cardById.get(id)).filter(Boolean));
  const cards=[];
  while(cards.length<config.cardCount&&pool.length){
    const refill=shuffled(pool);
    refill.forEach(card=>{if(cards.length<config.cardCount)cards.push(card)});
  }
  return cards;
}
function rouletteCoursePosition(index,total){
  const angle=(-90+(360*index/total))*Math.PI/180;
  return {x:50+36*Math.cos(angle),y:50+38*Math.sin(angle)};
}
function rouletteDisplayClasses(){
  return (document.getElementById('rouletteShowPicture')?.checked===false?' hide-picture':'')+(document.getElementById('rouletteShowEnglish')?.checked===false?' hide-en':'')+(document.getElementById('rouletteShowJapanese')?.checked===true?' show-jp':'');
}
function rouletteCourseCardMarkup(card,index,total){
  const pos=rouletteCoursePosition(index,total);
  if(index===0)return '<button class="roulette-course-card start-space" type="button" style="left:'+pos.x+'%;top:'+pos.y+'%"><span>START</span></button>';
  const isGoal=index===total-1;
  const image=card?.image?'<img src="'+escapeHtml(card.image)+'" alt="">':'';
  return '<button class="roulette-course-card'+rouletteDisplayClasses()+(isGoal?' goal-space':'')+'" type="button" data-course-index="'+index+'" style="left:'+pos.x+'%;top:'+pos.y+'%"><span class="course-badge">'+(isGoal?'GOAL 🚩':index)+'</span><div class="card-picture">'+image+'</div><div class="card-label"><span class="en-text">'+escapeHtml(card?.english||'')+'</span><span class="jp-label">'+escapeHtml(card?.japanese||'')+'</span></div></button>';
}
function roulettePhrase(text,playerId,randomChoice=false){
  const player=roulettePlayers.find(item=>item.id===playerId);
  const currentCard=player&&player.position>0?rouletteCourse[player.position-1]:rouletteCourse[0];
  const rawWord=playerId===roulettePhrasePlayerId?roulettePhraseWord:(currentCard?.english||'～');
  const card=playerId===roulettePhrasePlayerId?rouletteCourse.find(c=>c.id===roulettePhraseCardId):currentCard;
  let phrase=String(text||'');
  if(randomChoice&&phrase.includes('/')){
    const choices=phrase.split('/').map(choice=>choice.trim()).filter(Boolean);
    phrase=choices[Math.floor(Math.random()*choices.length)]||phrase;
  }
  return phrase.replace(/\(\s*P\s*\)|[～~]/gi,(placeholder,offset,source)=>
    /\blike\s*$/i.test(source.slice(0,offset))&&card&&window.SentenceForms?window.SentenceForms.preference(card).english:rawWord);
}
function rouletteEligiblePlayers(){
  return roulettePlayers.filter(player=>player.position<rouletteCourse.length);
}
function rouletteWheelSegments(){
  const players=rouletteEligiblePlayers();
  return players.length?Array.from({length:12},(_,index)=>players[index%players.length]):[];
}
function rouletteWheelGradient(){
  const segments=rouletteWheelSegments();
  const size=100/segments.length;
  return segments.map((player,index)=>player.color+' '+(index*size)+'% '+((index+1)*size)+'%').join(',');
}
function renderRouletteBoard(){
  const stage=document.getElementById('rouletteStage');
  if(!stage)return;
  const total=rouletteCourse.length+1;
  stage.innerHTML='<div class="roulette-board" id="rouletteBoard">'
    +Array.from({length:total},(_,index)=>rouletteCourseCardMarkup(index===0?null:rouletteCourse[index-1],index,total)).join('')
    +'<div class="roulette-center"><div class="roulette-key-sentences"><button class="roulette-key-sentence" id="rouletteEverybodyPhrase" type="button"></button><button class="roulette-key-sentence" id="rouletteSelectedPhrase" type="button"></button></div><div class="roulette-wheel-wrap"><div class="roulette-wheel-pointer"></div><div class="roulette-wheel" id="rouletteWheel" style="background:conic-gradient('+rouletteWheelGradient()+');--wheel-rotation:'+rouletteSpinRotation+'deg"></div><button class="roulette-wheel-button" id="rouletteSpin" type="button">SPIN</button></div><div class="roulette-wheel-legend">'+ROULETTE_PLAYERS.slice(0,roulettePlayerCount).map(player=>'<span data-roulette-legend="'+player.id+'">'+roulettePieceMarkup(player,'roulette-legend-piece','')+'<b>Player '+player.id+'</b></span>').join('')+'</div><div class="roulette-result" id="rouletteResult">ルーレットを回してください</div></div>'
    +rouletteCornerBoardMarkup(roulettePlayers,'play')
    +roulettePlayers.map(player=>{const pos=rouletteCoursePosition(player.position,total);const offset=rouletteRunnerOffset(player.id);return '<div class="roulette-runner" data-runner="'+player.id+'" style="left:calc('+pos.x+'% + '+offset.x+'px);top:calc('+pos.y+'% + '+offset.y+'px)">'+rouletteArtMarkup(player.pieceAsset,'roulette-runner-svg','Player '+player.id)+'</div>'}).join('')
    +'</div>';
  updateRoulettePhrases();
  document.getElementById('rouletteSpin')?.addEventListener('click',toggleRouletteSpin);
  stage.querySelectorAll('[data-roulette-move]').forEach(button=>button.addEventListener('click',()=>moveRoulettePlayer(Number(button.dataset.rouletteMove))));
  stage.querySelectorAll('[data-course-index]').forEach(button=>button.addEventListener('click',()=>{const card=rouletteCourse[Number(button.dataset.courseIndex)-1];if(card)speakText(card.speech||card.english,button)}));
  document.getElementById('rouletteEverybodyPhrase')?.addEventListener('click',event=>speakText(event.currentTarget.dataset.phrase||'',event.currentTarget));
  document.getElementById('rouletteSelectedPhrase')?.addEventListener('click',event=>speakText(event.currentTarget.dataset.phrase||'',event.currentTarget));
}
function updateRoulettePhrases(){
  const everybody=document.getElementById('rouletteEverybodyPhrase');
  const selected=document.getElementById('rouletteSelectedPhrase');
  const phrasePlayer=roulettePhrasePlayerId||rouletteSelectedPlayer;
  const everybodyPhrase=roulettePhrase(activeRouletteConfig.everybodySentence,phrasePlayer);
  const selectedPhrase=rouletteSelectedPhraseText||roulettePhrase(activeRouletteConfig.selectedSentence,phrasePlayer);
  if(everybody){everybody.textContent=activeRouletteConfig.everybodySentence?'みんな：'+everybodyPhrase:'';everybody.dataset.phrase=everybodyPhrase}
  if(selected){selected.textContent=activeRouletteConfig.selectedSentence?(phrasePlayer?'PLAYER '+phrasePlayer:'選ばれた人')+'：'+selectedPhrase:'';selected.dataset.phrase=selectedPhrase}
}
function setRouletteSelected(playerId){
  if(rouletteSpinning||!rouletteEligiblePlayers().some(player=>player.id===playerId))return;
  rouletteSelectedPlayer=playerId;
  roulettePhrasePlayerId=playerId;
  const player=roulettePlayers.find(item=>item.id===playerId);
  roulettePhraseWord=rouletteCourse[Math.min(player?.position||0,Math.max(rouletteCourse.length-1,0))]?.english||'～';
  roulettePhraseCardId=rouletteCourse[Math.min(player?.position||0,Math.max(rouletteCourse.length-1,0))]?.id||'';
  rouletteSelectedPhraseText=roulettePhrase(activeRouletteConfig.selectedSentence,playerId,true);
  document.querySelectorAll('#rouletteStage [data-roulette-move]').forEach(button=>{
    const selected=Number(button.dataset.rouletteMove)===playerId;
    button.classList.toggle('selected',selected);
    button.disabled=!selected;
  });
  document.querySelectorAll('#rouletteStage [data-roulette-corner-color]').forEach(layer=>{
    layer.classList.toggle('inactive',Number(layer.dataset.rouletteCornerColor)!==playerId);
  });
  const result=document.getElementById('rouletteResult');
  if(result)result.textContent='PLAYER '+playerId+'！ 1マス進めます';
  updateRoulettePhrases();
}
function rouletteCurrentAngle(wheel){
  const transform=wheel?getComputedStyle(wheel).transform:'';
  const match=transform&&transform.match(/^matrix\(([^)]+)\)$/);
  if(!match)return ((rouletteSpinRotation%360)+360)%360;
  const values=match[1].split(',').map(Number);
  return ((Math.atan2(values[1],values[0])*180/Math.PI)%360+360)%360;
}
function toggleRouletteSpin(){
  if(rouletteSpinning){settleRouletteSpin();return}
  spinRoulette();
}
function spinRoulette(){
  if(rouletteSpinning||rouletteSelectedPlayer||!rouletteStarted)return;
  const eligible=rouletteEligiblePlayers();
  if(!eligible.length)return;
  rouletteSpinning=true;
  roulettePendingPlayer=eligible[Math.floor(Math.random()*eligible.length)].id;
  const spin=document.getElementById('rouletteSpin');
  const wheel=document.getElementById('rouletteWheel');
  if(spin){spin.disabled=false;spin.textContent='STOP';spin.classList.add('stop')}
  if(wheel)wheel.classList.add('free-spinning');
  const result=document.getElementById('rouletteResult');
  if(result)result.textContent='STOPを押してください';
  const runId=rouletteRunId;
  rouletteSpinTimer=setTimeout(()=>{if(runId===rouletteRunId)settleRouletteSpin()},5000);
}
function settleRouletteSpin(){
  if(!rouletteSpinning||!rouletteStarted)return;
  if(rouletteSpinTimer)clearTimeout(rouletteSpinTimer);
  rouletteSpinTimer=0;
  const playerId=roulettePendingPlayer;
  const wheel=document.getElementById('rouletteWheel');
  const spin=document.getElementById('rouletteSpin');
  const current=rouletteCurrentAngle(wheel);
  const occurrences=rouletteWheelSegments().map((player,index)=>player.id===playerId?index:-1).filter(index=>index>=0);
  const occurrence=occurrences[Math.floor(Math.random()*occurrences.length)];
  const segmentAngle=360/12;
  const center=(occurrence+.5)*segmentAngle;
  const desired=(360-center+360)%360;
  const delta=(desired-current+360)%360;
  rouletteSpinRotation=current+720+delta;
  if(wheel){
    wheel.classList.remove('free-spinning');
    wheel.style.setProperty('--wheel-duration','0s');
    wheel.style.setProperty('--wheel-rotation',current+'deg');
    void wheel.offsetWidth;
    wheel.style.setProperty('--wheel-duration','1.45s');
    wheel.style.setProperty('--wheel-rotation',rouletteSpinRotation+'deg');
  }
  if(spin)spin.disabled=true;
  const runId=rouletteRunId;
  setTimeout(()=>{
    if(runId!==rouletteRunId)return;
    rouletteSpinning=false;
    roulettePendingPlayer=0;
    if(spin){spin.textContent='SPIN';spin.classList.remove('stop')}
    setRouletteSelected(playerId);
  },1500);
}
function moveRoulettePlayer(playerId){
  if(playerId!==rouletteSelectedPlayer||rouletteSpinning)return;
  const player=roulettePlayers.find(item=>item.id===playerId);
  if(!player||!rouletteStarted||player.position>=rouletteCourse.length)return;
  player.position=Math.min(rouletteCourse.length,player.position+1);
  const total=rouletteCourse.length+1;
  const pos=rouletteCoursePosition(player.position,total);
  const offset=rouletteRunnerOffset(playerId);
  const runner=document.querySelector('#rouletteStage [data-runner="'+playerId+'"]');
  if(runner){runner.style.left='calc('+pos.x+'% + '+offset.x+'px)';runner.style.top='calc('+pos.y+'% + '+offset.y+'px)'}
  const card=rouletteCourse[player.position-1];
  roulettePhrasePlayerId=playerId;
  roulettePhraseWord=card?.english||roulettePhraseWord;
  roulettePhraseCardId=card?.id||roulettePhraseCardId;
  if(card)speakText(card.speech||card.english,document.querySelector('#rouletteStage [data-course-index="'+player.position+'"]'));
  document.querySelectorAll('#rouletteStage [data-roulette-move]').forEach(button=>button.disabled=true);
  rouletteSelectedPlayer=0;
  document.querySelectorAll('#rouletteStage [data-roulette-move]').forEach(button=>button.classList.remove('selected'));
  document.querySelectorAll('#rouletteStage [data-roulette-corner-color]').forEach(layer=>layer.classList.add('inactive'));
  updateRoulettePhrases();
  const eligible=rouletteEligiblePlayers();
  if(player.position>=rouletteCourse.length){
    const wheel=document.getElementById('rouletteWheel');
    rouletteSpinRotation=0;
    if(wheel){
      wheel.style.setProperty('--wheel-duration','0s');
      wheel.style.setProperty('--wheel-rotation','0deg');
      wheel.style.background=eligible.length?'conic-gradient('+rouletteWheelGradient()+')':'#ddd';
    }
    document.querySelectorAll('[data-roulette-legend]').forEach(item=>{
      const finished=!eligible.some(p=>p.id===Number(item.dataset.rouletteLegend));
      item.classList.toggle('finished',finished);
      item.querySelector('b').textContent='Player '+item.dataset.rouletteLegend+(finished?' GOAL!':'');
    });
  }
  if(!eligible.length){
    rouletteStarted=false;
    document.getElementById('rouletteSpin').disabled=true;
    const board=document.getElementById('rouletteBoard');
    if(board)board.insertAdjacentHTML('beforeend','<div class="roulette-winner">全員ゴール！<button type="button" id="rouletteAgain">もう一度遊ぶ</button></div>');
    document.getElementById('rouletteAgain')?.addEventListener('click',resetRouletteLobby);
    return;
  }
  const spin=document.getElementById('rouletteSpin');
  if(spin){spin.disabled=false;spin.textContent='SPIN';spin.classList.remove('stop')}
  const result=document.getElementById('rouletteResult');
  if(result)result.textContent=player.position>=rouletteCourse.length?'PLAYER '+playerId+' ゴール！ あと'+eligible.length+'人':'ルーレットを回してください';
}
function startRouletteBoard(){
  if(roulettePlaced.size!==roulettePlayerCount)return;
  rouletteStarted=true;
  rouletteCourse=buildRouletteCourse(activeRouletteConfig);
  roulettePlayers=ROULETTE_PLAYERS.slice(0,roulettePlayerCount).map(player=>({...player,position:0}));
  rouletteSelectedPlayer=0;
  roulettePhrasePlayerId=0;
  rouletteSelectedPhraseText='';
  roulettePhraseWord='～';
  roulettePhraseCardId='';
  renderRouletteBoard();
}
function resetRouletteLobby(){
  stopRouletteGame();
  roulettePlayerCount=0;
  roulettePlaced=new Map();
  roulettePlacementSelection=0;
  roulettePlayers=[];
  rouletteCourse=[];
  rouletteStarted=false;
  renderRouletteLobby();
}
function openRouletteRace(config,returnPage){
  activeRouletteConfig=normalizeRouletteConfig(config);
  if(![4,6,8,12].includes(activeRouletteConfig.cardCount))activeRouletteConfig.cardCount=6;
  rouletteReturnPage=returnPage||'createGames';
  rouletteSharedMode=rouletteReturnPage==='sharedGame';
  document.getElementById('rouletteContextCourse').textContent=rouletteReturnPage==='lt1unit'?"Let's Try 1 Unit "+currentUnit:rouletteSharedMode?'配布ゲーム':'Create Games';
  document.getElementById('rouletteContextTitle').textContent=activeRouletteConfig.name;
  document.querySelector('#rouletteWorkspace .game-toolbar h1').textContent=activeRouletteConfig.name;
  document.getElementById('rouletteSummaryCount').textContent=activeRouletteConfig.cardCount+'枚';
  document.getElementById('rouletteSummaryEverybody').textContent=activeRouletteConfig.everybodySentence||'設定なし';
  document.getElementById('rouletteSummarySelected').textContent=activeRouletteConfig.selectedSentence||'設定なし';
  document.getElementById('rouletteSummaryUnits').textContent=activeRouletteConfig.assignedUnits.length?activeRouletteConfig.assignedUnits.map(assignmentLabel).join('・'):'設定なし';
  document.getElementById('rouletteShowPicture').checked=activeRouletteConfig.display.picture;
  document.getElementById('rouletteShowEnglish').checked=activeRouletteConfig.display.english;
  document.getElementById('rouletteShowJapanese').checked=activeRouletteConfig.display.japanese;
  document.getElementById('rouletteDisplayAccordion').classList.add('closed');
  resetRouletteLobby();
  show('rouletteRace');
}
document.getElementById('rouletteStage')?.addEventListener('change',event=>{
  if(event.target.id!=='rouletteCourseCount'||rouletteStarted)return;
  const count=Number(event.target.value);
  if(![4,6,8,12].includes(count))return;
  activeRouletteConfig.cardCount=count;
  document.getElementById('rouletteSummaryCount').textContent=count+'枚';
});
document.getElementById('rouletteStage')?.addEventListener('click',event=>{
  const count=event.target.closest('[data-roulette-count]');
  if(!count)return;
  roulettePlayerCount=Number(count.dataset.rouletteCount);
  roulettePlaced=new Map();
  roulettePlacementSelection=0;
  renderRouletteLobby();
});
['rouletteShowPicture','rouletteShowEnglish','rouletteShowJapanese'].forEach(id=>document.getElementById(id)?.addEventListener('change',()=>{if(rouletteStarted)document.querySelectorAll('#rouletteStage [data-course-index]').forEach(card=>{card.classList.toggle('hide-picture',!document.getElementById('rouletteShowPicture').checked);card.classList.toggle('hide-en',!document.getElementById('rouletteShowEnglish').checked);card.classList.toggle('show-jp',document.getElementById('rouletteShowJapanese').checked)})}));
document.querySelector('#rouletteDisplayAccordion .menu-accordion-btn')?.addEventListener('click',event=>{
  const accordion=document.getElementById('rouletteDisplayAccordion');
  const closed=accordion.classList.toggle('closed');
  event.currentTarget.setAttribute('aria-expanded',String(!closed));
});
const rouletteWorkspace=document.getElementById('rouletteWorkspace');
const rouletteExpand=document.getElementById('rouletteExpand');
function updateRouletteFullscreenButton(){if(rouletteExpand)rouletteExpand.textContent=document.fullscreenElement===rouletteWorkspace?'↙ 元に戻す':'⛶ 全画面表示'}
document.getElementById('rouletteBack')?.addEventListener('click',async()=>{
  await handleGameBack(
    ()=>document.fullscreenElement===rouletteWorkspace,
    ()=>document.exitFullscreen().catch(()=>{}),
    ()=>{
      stopRouletteGame();
      if(rouletteSharedMode){
        rouletteSharedMode=false;
        history.replaceState(null,'',location.pathname+location.search);
        show('home');
      }else show(rouletteReturnPage);
    },
  );
});
rouletteExpand?.addEventListener('click',async()=>{
  try{if(document.fullscreenElement===rouletteWorkspace)await document.exitFullscreen();else await rouletteWorkspace.requestFullscreen()}catch(error){}
});
document.addEventListener('fullscreenchange',updateRouletteFullscreenButton);
