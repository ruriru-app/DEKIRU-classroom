document.querySelectorAll('.nav').forEach(b=>b.addEventListener('click',()=>show(b.dataset.to)));
document.querySelectorAll('[data-back]').forEach(b=>b.addEventListener('click',()=>show(b.dataset.back||'home')));
document.getElementById('homeBtn').addEventListener('click',()=>{history.replaceState(null,'','#/');show('home');});
document.querySelector('[data-launch-alphabet]').addEventListener('click',()=>openAlphabetTouch({returnPage:'home'}));
document.getElementById('alphabetDistribute').addEventListener('click',openAlphabetShare);
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(alphabetPhase==='play')setAlphabetPhase('setup');stopRouletteGame();}});
loadCreatedGames();renderCreatedGames();setCreatorForm(null);
if(!openSharedGameFromHash()){
  if(location.hash==='#/alphabetTouch')openAlphabetTouch({returnPage:'home'});
  else if(location.hash==='#/createInterview')window.InterviewCreator.open();
  else if(location.hash==='#/createInterviewBingo')window.InterviewBingoCreator.open();
  else if(location.hash==='#/createSelfIntroduction')window.SelfIntroductionCreator.open();
  else show(['#/createGames','#/createActivities'].includes(location.hash)?location.hash.slice(2):'home');
}
// Keep direct links and browser hash navigation in sync with the visible page.
window.addEventListener('hashchange',()=>{
  if(location.hash==='#/createInterview')window.InterviewCreator.open();
  else if(location.hash==='#/createInterviewBingo')window.InterviewBingoCreator.open();
  else if(location.hash==='#/createSelfIntroduction')window.SelfIntroductionCreator.open();
  else if(['#/createGames','#/createActivities','#/'].includes(location.hash))show(location.hash.slice(2)||'home');
});
