/* Same authorable picture-card universe and ordering as Games. */
(()=>{
  'use strict';
  function available(data=window.GAMES_DATA){
    const completed=new Set(data.completedPictureCardIds||[]),ready=c=>completed.has(c.id)&&c.image;
    return data.cards.filter(c=>ready(c)&&['standard','plus'].includes(c.displayGroup)).concat(data.cards.filter(c=>ready(c)&&c.displayGroup==='lets-try'));
  }
  window.InterviewBingoCards={available};
})();
