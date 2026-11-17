(function(root){
  const defaultWords='cat hat bag cap map bed pen red leg ten pig pin big six sit dog mom mop top hot sun cup bus bug run'.split(' ');
  const lessonWords=root.PhonicsLesson?.words;
  const words=Array.isArray(lessonWords)?lessonWords.slice():defaultWords;
  const start=(mode='overview',index=0)=>({mode,index,revealed:0,letterIndices:[]});
  function visible(state) {
    const word=words[state.index];
    return {
      text:state.mode==='letters'?state.letterIndices.map(index=>word[index]).join(''):word,
      image:state.mode!=='guess'||state.revealed>0
    };
  }
  function advance(state,slot) {
    if(state.mode!=='letters')return {...state,revealed:1};

    const word=words[state.index];
    const open=state.letterIndices;
    const next=slot===undefined?[...word].findIndex((_,index)=>!open.includes(index)):slot;
    if(!Number.isInteger(next)||next<0||next>=word.length||open.includes(next))return state;

    const letterIndices=[...open,next].sort((left,right)=>left-right);
    return {...state,letterIndices,revealed:letterIndices.length};
  }
  const makeOrder=(random=false,rng=Math.random)=>{
    const order=words.map((_,i)=>i);
    if(random){for(let i=order.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[order[i],order[j]]=[order[j],order[i]];}}
    return order;
  };
  const move=(s,delta,order=makeOrder())=>start(s.mode,order[Math.max(0,Math.min(order.length-1,order.indexOf(s.index)+delta))]);
  const changeMode=(s,mode)=>start(mode,s.index);
  root.Phonics={words,start,visible,advance,move,changeMode,makeOrder};
})(globalThis);
