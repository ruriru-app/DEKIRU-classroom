(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.PracticeSpeechCore=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  function words(text){
    return [...String(text).matchAll(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu)].map(m=>({text:m[0],start:m.index,end:m.index+m[0].length}));
  }
  // Minimum edit alignment preserves words after a missing or substituted word.
  function assess(text,transcript,normalize){
    const displayed=words(text), expected=[], owners=[];
    displayed.forEach((word,index)=>normalize(word.text).forEach(token=>{expected.push(token);owners.push(index);}));
    const actual=normalize(transcript), n=expected.length,m=actual.length;
    const cost=Array.from({length:n+1},()=>new Array(m+1).fill(0));
    for(let i=0;i<=n;i++)cost[i][0]=i;
    for(let j=0;j<=m;j++)cost[0][j]=j;
    for(let i=1;i<=n;i++)for(let j=1;j<=m;j++)cost[i][j]=Math.min(cost[i-1][j-1]+(expected[i-1]===actual[j-1]?0:1),cost[i-1][j]+1,cost[i][j-1]+1);
    const matched=new Array(n).fill(false);let i=n,j=m;
    while(i||j){
      if(i&&j&&cost[i][j]===cost[i-1][j-1]+(expected[i-1]===actual[j-1]?0:1)){matched[i-1]=expected[i-1]===actual[j-1];i--;j--;}
      else if(i&&cost[i][j]===cost[i-1][j]+1)i--;
      else j--;
    }
    const flags=displayed.map((_,index)=>owners.some(owner=>owner===index)&&owners.every((owner,k)=>owner!==index||matched[k]));
    return {words:displayed,flags,complete:expected.length>0&&cost[n][m]===0,extra:flags.every(Boolean)&&cost[n][m]>0};
  }
  return Object.freeze({words,assess});
});


