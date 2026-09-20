function renderCreatedGames(){
  const list=document.getElementById('createdGamesList');
  if(!list)return;
  if(!createdGames.length){list.innerHTML='<div class="created-game-empty">まだ保存したゲームはありません。<br>上の「ROULETTE RACE」から作れます。</div>';return}
  list.innerHTML=createdGames.map(game=>{
    const units=game.assignedUnits.length?game.assignedUnits.map(assignmentLabel).join('・'):'Unit未設定';
    return '<article class="created-game-card interview-saved-card activity-blue-tile" data-created-game-card="'+escapeHtml(game.id)+'"><div class="interview-saved-heading"><strong>'+escapeHtml(units)+'</strong><span>'+escapeHtml(game.name)+'</span></div><div class="interview-saved-info"><span>'+game.cardCount+'枚のコース／'+game.selectedCardIds.length+'語から選択</span><span class="placement">'+escapeHtml(audienceLabel(game.audiences))+'</span></div><div class="created-game-card-actions interview-saved-actions"><button class="edit" type="button" data-edit-roulette="'+escapeHtml(game.id)+'">編集</button><button class="delete" type="button" data-delete-roulette="'+escapeHtml(game.id)+'">削除</button><button class="play" type="button" data-play-roulette="'+escapeHtml(game.id)+'">試す</button><button class="share" type="button" data-share-roulette="'+escapeHtml(game.id)+'">配布</button></div></article>';
  }).join('');
}
function renderCreatorVocabulary(){
  const root=document.getElementById('creatorVocabulary');
  if(!root)return;
  const openCategories=new Set([...root.querySelectorAll('details[open][data-creator-category]')].map(detail=>detail.dataset.creatorCategory));
  const groups=new Map();
  rouletteAvailableCards().forEach(card=>{
    if(!groups.has(card.category))groups.set(card.category,[]);
    groups.get(card.category).push(card);
  });
  root.innerHTML=[...groups.entries()].map(([category,cards])=>{
    const selectedCount=cards.filter(card=>creatorSelectedCardIds.has(card.id)).length;
    const levels=[['standard','Picture Dictionary Standard'],['plus','Picture Dictionary Plus'],['lets-try','Let’s Try! 追加語']];
    return '<details class="creator-vocab-group" data-creator-category="'+escapeHtml(category)+'"'+(openCategories.has(category)?' open':'')+'><summary>'+escapeHtml(categoryLabel(category))+'（'+selectedCount+'/'+cards.length+'）</summary>'+levels.map(([level,label])=>{
      const levelCards=cards.filter(card=>card.displayGroup===level);
      if(!levelCards.length)return '';
      const levelSelected=levelCards.filter(card=>creatorSelectedCardIds.has(card.id)).length;
      return '<div class="creator-vocab-level"><label class="creator-level-toggle"><input type="checkbox" data-creator-level="'+escapeHtml(category+'::'+level)+'"'+(levelCards.length&&levelSelected===levelCards.length?' checked':'')+(levelCards.length?'':' disabled')+'><span>'+label+'</span><small>'+levelSelected+'/'+levelCards.length+'</small></label><div class="creator-vocab-cards">'+levelCards.map(card=>'<label class="creator-vocab-card"><input type="checkbox" data-creator-card="'+escapeHtml(card.id)+'"'+(creatorSelectedCardIds.has(card.id)?' checked':'')+'><span>'+escapeHtml(card.english)+'</span></label>').join('')+'</div></div>';
    }).join('')+'</details>';
  }).join('');
  root.querySelectorAll('[data-creator-level]').forEach(input=>{
    const [category,level]=input.dataset.creatorLevel.split('::');
    const cards=(groups.get(category)||[]).filter(card=>card.displayGroup===level);
    const count=cards.filter(card=>creatorSelectedCardIds.has(card.id)).length;
    input.indeterminate=count>0&&count<cards.length;
  });
  const counter=document.getElementById('creatorCardSelectionCount');
  if(counter)counter.textContent=creatorSelectedCardIds.size+'語を選択中';
  renderCreatorPreview();
}
function renderCreatorPreview(){
  const root=document.getElementById('creatorPreview');
  if(!root)return;
  const name=document.getElementById('creatorGameName')?.value.trim()||'ROULETTE RACE';
  const cardCount=Math.max(1,Number(document.getElementById('creatorCardCount')?.value)||12);
  const showPicture=document.getElementById('creatorShowPicture')?.checked!==false;
  const showEnglish=document.getElementById('creatorShowEnglish')?.checked!==false;
  const selected=[...creatorSelectedCardIds].map(id=>cardById.get(id)).filter(Boolean);
  const previewCount=Math.min(cardCount,12);
  const sample=Array.from({length:previewCount},(_,index)=>selected[index%Math.max(selected.length,1)]).filter(Boolean);
  const everybody=document.getElementById('creatorEverybodySentence')?.value.trim()||'みんなのキーフレーズ';
  const selectedSentence=document.getElementById('creatorSelectedSentence')?.value.trim()||'選ばれた人のキーフレーズ';
  root.innerHTML='<div class="creator-preview-title">'+escapeHtml(name)+'</div><div class="creator-preview-board">'+sample.map((card,index)=>{
    const angle=(-90+360*index/Math.max(sample.length,1))*Math.PI/180;
    const x=50+43*Math.cos(angle),y=50+42*Math.sin(angle);
    return '<div class="creator-preview-card" style="left:'+x+'%;top:'+y+'%">'+(showPicture?'<img src="'+escapeHtml(card.image)+'" alt="">':'<span></span>')+(showEnglish?'<span>'+escapeHtml(card.english)+'</span>':'')+'</div>';
  }).join('')+'<div class="creator-preview-center"><b>ROULETTE</b><span>'+escapeHtml(everybody)+'</span><span>'+escapeHtml(selectedSentence)+'</span><small>'+cardCount+'枚／'+selected.length+'語</small></div></div>';
}
function setCreatorForm(game){
  const config=game?normalizeRouletteConfig(game):normalizeRouletteConfig({selectedCardIds:[],audiences:['individual']});
  editingGameId=game?config.id:'';
  creatorSelectedCardIds=new Set(config.selectedCardIds);
  document.getElementById('creatorEditorTitle').textContent=game?'ゲームを編集':'新しいROULETTE RACE';
  document.getElementById('creatorGameName').value=config.name;
  document.getElementById('creatorCardCount').value=String(config.cardCount);
  document.getElementById('creatorEverybodySentence').value=config.everybodySentence;
  document.getElementById('creatorSelectedSentence').value=config.selectedSentence;
  document.getElementById('creatorShowPicture').checked=config.display.picture;
  document.getElementById('creatorShowEnglish').checked=config.display.english;
  document.getElementById('creatorShowJapanese').checked=config.display.japanese;
  document.querySelectorAll('input[name="creatorAssignedUnit"]').forEach(input=>input.checked=config.assignedUnits.includes(input.value));
  document.querySelectorAll('input[name="creatorAudience"]').forEach(input=>input.checked=config.audiences.includes(input.value));
  document.getElementById('creatorDeleteGame').hidden=!game;
  document.getElementById('creatorStatus').textContent='';
  renderCreatorVocabulary();
}
function readCreatorForm(){
  const now=new Date().toISOString();
  const previous=createdGames.find(game=>game.id===editingGameId);
  return normalizeRouletteConfig({
    id:editingGameId,
    name:document.getElementById('creatorGameName').value.trim()||'ROULETTE RACE',
    cardCount:Number(document.getElementById('creatorCardCount').value),
    everybodySentence:document.getElementById('creatorEverybodySentence').value.trim(),
    selectedSentence:document.getElementById('creatorSelectedSentence').value.trim(),
    assignedUnits:[...document.querySelectorAll('input[name="creatorAssignedUnit"]:checked')].map(input=>input.value),
    audiences:[...document.querySelectorAll('input[name="creatorAudience"]:checked')].map(input=>input.value),
    selectedCardIds:[...creatorSelectedCardIds],
    display:{picture:document.getElementById('creatorShowPicture').checked,english:document.getElementById('creatorShowEnglish').checked,japanese:document.getElementById('creatorShowJapanese').checked},
    createdAt:previous?.createdAt||now,
    updatedAt:now,
  });
}
function validateCreatorConfig(config){
  const status=document.getElementById('creatorStatus');
  if(!config.selectedCardIds.length){if(status)status.textContent='コースに使うカードを1語以上選んでください。';return false}
  return true;
}
function saveCreatorGame(){
  const config=readCreatorForm();
  if(!validateCreatorConfig(config))return null;
  if(!config.id)config.id='roulette-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);
  const index=createdGames.findIndex(game=>game.id===config.id);
  if(index>=0)createdGames[index]=config;else createdGames.unshift(config);
  editingGameId=config.id;
  persistCreatedGames();
  renderCreatedGames();
  renderAssignedRouletteGames();
  document.getElementById('creatorDeleteGame').hidden=false;
  document.getElementById('creatorEditorTitle').textContent='ゲームを編集';
  document.getElementById('creatorStatus').textContent='保存しました。';
  return config;
}
function openRouletteCreator(game){
  setCreatorForm(game||null);
  show('createRouletteGame');
}
function renderAssignedRouletteGames(){}
document.getElementById('openRouletteCreator')?.addEventListener('click',()=>openRouletteCreator(null));
document.getElementById('creatorNewGame')?.addEventListener('click',()=>setCreatorForm(null));
document.getElementById('creatorClearCards')?.addEventListener('click',()=>{creatorSelectedCardIds.clear();renderCreatorVocabulary()});
document.getElementById('creatorSaveGame')?.addEventListener('click',saveCreatorGame);
document.getElementById('creatorPlayGame')?.addEventListener('click',()=>{
  const config=readCreatorForm();
  if(validateCreatorConfig(config))openRouletteRace(config,'createRouletteGame');
});
document.getElementById('creatorDeleteGame')?.addEventListener('click',()=>{
  if(!editingGameId||!confirm('このゲーム設定を削除しますか？'))return;
  createdGames=createdGames.filter(game=>game.id!==editingGameId);
  persistCreatedGames();
  renderCreatedGames();
  renderAssignedRouletteGames();
  setCreatorForm(null);
});
document.getElementById('creatorVocabulary')?.addEventListener('change',event=>{
  const id=event.target?.dataset?.creatorCard;
  const levelKey=event.target?.dataset?.creatorLevel;
  if(id){
    if(event.target.checked)creatorSelectedCardIds.add(id);else creatorSelectedCardIds.delete(id);
  }else if(levelKey){
    const [category,level]=levelKey.split('::');
    rouletteAvailableCards().filter(card=>card.category===category&&card.displayGroup===level).forEach(card=>{
      if(event.target.checked)creatorSelectedCardIds.add(card.id);else creatorSelectedCardIds.delete(card.id);
    });
  }else return;
  renderCreatorVocabulary();
});
document.querySelectorAll('input[name="creatorAudience"]').forEach(input=>input.addEventListener('change',()=>{
  const options=[...document.querySelectorAll('input[name="creatorAudience"]')];
  if(options.some(option=>option.checked))return;
  const individual=options.find(option=>option.value==='individual');
  if(individual)individual.checked=true;
}));
['creatorGameName','creatorCardCount','creatorEverybodySentence','creatorSelectedSentence','creatorShowPicture','creatorShowEnglish','creatorShowJapanese'].forEach(id=>{
  const input=document.getElementById(id);
  input?.addEventListener(input.matches('input[type="text"]')?'input':'change',renderCreatorPreview);
});
document.getElementById('createdGamesList')?.addEventListener('click',event=>{
  const edit=event.target.closest('[data-edit-roulette]');
  const play=event.target.closest('[data-play-roulette]');
  const share=event.target.closest('[data-share-roulette]');
  const remove=event.target.closest('[data-delete-roulette]');
  if(edit){const game=createdGames.find(item=>item.id===edit.dataset.editRoulette);if(game)openRouletteCreator(game);return}
  if(play){const game=createdGames.find(item=>item.id===play.dataset.playRoulette);if(game)openRouletteRace(game,'createGames');return}
  if(share){const game=createdGames.find(item=>item.id===share.dataset.shareRoulette);if(game)openRouletteShare(game);return}
  if(remove){
    const game=createdGames.find(item=>item.id===remove.dataset.deleteRoulette);
    if(!game||!confirm('「'+game.name+'」を削除しますか？'))return;
    createdGames=createdGames.filter(item=>item.id!==game.id);
    persistCreatedGames();renderCreatedGames();renderAssignedRouletteGames();
    if(editingGameId===game.id)setCreatorForm(null);
  }
});
document.querySelectorAll('[data-close-roulette-share]').forEach(button=>button.addEventListener('click',closeRouletteShare));
document.getElementById('rouletteCopyUrl')?.addEventListener('click',copyRouletteShareUrl);
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!document.getElementById('rouletteShareModal')?.hidden)closeRouletteShare()});
window.addEventListener('hashchange',openSharedGameFromHash);
document.getElementById('lt1unit')?.addEventListener('click',event=>{
  const alphabetOpen=event.target.closest('[data-open-alphabet]');
  if(alphabetOpen){openAlphabetTouch({level:'easy',shared:false,returnPage:'lt1unit'});return}
  const alphabetShare=event.target.closest('[data-share-alphabet]');
  if(alphabetShare){alphabetLevel='easy';openAlphabetShare();return}
  const button=event.target.closest('[data-unit-roulette]');
  if(!button)return;
  const game=createdGames.find(item=>item.id===button.dataset.unitRoulette);
  if(game)openRouletteRace(game,'lt1unit');
});
