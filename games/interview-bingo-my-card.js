/* Anonymous balanced paper-card allocation. No roster or persistence. */
(function(root){
  'use strict';
  const setup=typeof module==='object'?require('./interview-bingo-setup.js'):root.InterviewBingoSetup;
  function generate(config,{random=Math.random}={}){
    const {errors}=setup.validate(config,config.candidateIds||[]);if(errors.length)throw Error(errors.map(e=>e.message).join('\n'));
    const ids=[...config.candidateIds],counts=Object.fromEntries(ids.map(id=>[id,0])),cards=[];
    for(let person=0;person<config.participantCount;person++){
      const chosen=[];
      for(let word=0;word<config.myCardWordCount;word++){
        const available=ids.filter(id=>!chosen.includes(id)),minimum=Math.min(...available.map(id=>counts[id]));
        const ties=available.filter(id=>counts[id]===minimum),id=ties[Math.floor(random()*ties.length)];chosen.push(id);counts[id]++;
      }
      cards.push(chosen);
    }
    for(let i=cards.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]];}
    return {config:{...config,candidateIds:ids},cards,counts};
  }
  const api={generate};root.InterviewBingoMyCard=api;if(typeof module==='object')module.exports=api;
})(typeof window==='object'?window:globalThis);
