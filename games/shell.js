const APP_DATA=window.GAMES_DATA;
const cardById=new Map(APP_DATA.cards.map(c=>[c.id,c]));
const expressionById=new Map(APP_DATA.expressions.map(c=>[c.id,c]));
const pages=[...document.querySelectorAll('.page')];
let currentUnit=1;
function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function categoryLabel(key){return APP_DATA.categoryLabels[key]||key;}
function shuffled(items){const result=[...items];for(let i=result.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;}
function speakText(text){if(!text||!window.speechSynthesis)return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='en-US';u.rate=.86;window.speechSynthesis.speak(u);}
async function handleGameBack(isFullscreen,exit,leave){if(isFullscreen())await exit();else leave();}
function show(id){
  if(id==='lt1unit')id='home';
  if(id!=='alphabetTouch'){stopAlphabetTimer();stopAlphabetMotion();cancelAlphabetSpeech();}
  if(id!=='rouletteRace')stopRouletteGame();
  pages.forEach(page=>page.classList.toggle('active',page.id===id));
  document.body.classList.toggle('roulette-player-mode',id==='rouletteRace');
  document.body.classList.toggle('shared-roulette-mode',id==='rouletteRace'&&rouletteSharedMode);
  document.body.classList.toggle('alphabet-player-mode',id==='alphabetTouch');
  document.body.classList.toggle('shared-alphabet-mode',id==='alphabetTouch'&&alphabetSharedMode);
  document.body.classList.toggle('create-games-page-mode',['createGames','createActivities','createRouletteGame','createInterview','createInterviewBingo','createSelfIntroduction'].includes(id));
  if(!location.hash.startsWith('#play=')&&!location.hash.startsWith('#alphabet='))history.replaceState(null,'','#/'+(id==='home'?'':id));
  window.scrollTo(0,0);
}
