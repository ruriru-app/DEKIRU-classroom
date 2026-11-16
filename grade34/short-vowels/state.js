(function(root){
  const words='cat hat bag cap map bed pen red leg ten pig pin big six sit dog mom mop top hot sun cup bus bug run'.split(' ');
  const start=(mode='overview',index=0)=>({mode,index,revealed:0});
  const visible=s=>({text:s.mode==='letters'?words[s.index].slice(0,s.revealed):words[s.index],image:s.mode!=='guess'||s.revealed>0});
  const advance=s=>({...s,revealed:Math.min(s.mode==='letters'?words[s.index].length:1,s.revealed+1)});
  const move=(s,delta)=>start(s.mode,Math.max(0,Math.min(words.length-1,s.index+delta)));
  const changeMode=(s,mode)=>start(mode,s.index);
  root.Phonics={words,start,visible,advance,move,changeMode};
})(globalThis);
