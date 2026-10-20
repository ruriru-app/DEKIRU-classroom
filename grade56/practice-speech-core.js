(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.PracticeSpeechCore=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  function words(text){
    return [...String(text).matchAll(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu)].map(m=>({text:m[0],start:m.index,end:m.index+m[0].length}));
  }
  function tokens(value,normalize){
    // Possessive its and contraction it's have the same spoken form.
    return normalize(String(value).replace(/\bits\b/gi,"it's"));
  }
  function nameRanges(sentence){
    const text=sentence.text||'', ranges=[];let cursor=0;
    for(const part of sentence.matchParts||[]){
      if(part.type!=='name')continue;
      const start=text.indexOf(part.label,cursor);
      if(start>=0){ranges.push({start,end:start+part.label.length});cursor=start+part.label.length;}
    }
    // A capitalized word inside a sentence can be a person's/place's name.
    // Sentence-initial capitals and the pronoun I do not imply a name.
    words(text).forEach((word,index)=>{
      if(index>0&&/^[A-Z][a-z]/.test(word.text)&&!ranges.some(r=>word.start>=r.start&&word.end<=r.end)){
        ranges.push({start:word.start,end:word.end});
      }
    });
    return ranges.sort((a,b)=>a.start-b.start);
  }
  function assess(text,transcript,normalize,ranges=[]){
    const displayed=words(text), expected=[];
    for(let owner=0;owner<displayed.length;){
      const word=displayed[owner],range=ranges.find(r=>word.start>=r.start&&word.end<=r.end);
      if(range){
        const owners=[owner];owner++;
        while(owner<displayed.length&&displayed[owner].end<=range.end){owners.push(owner++);}
        expected.push({name:true,owners});
      }else{
        tokens(word.text,normalize).forEach(token=>expected.push({token,owners:[owner]}));owner++;
      }
    }
    const actual=tokens(transcript,normalize),n=expected.length,m=actual.length;
    const cost=Array.from({length:n+1},()=>new Array(m+1).fill(Infinity));
    const back=Array.from({length:n+1},()=>new Array(m+1));
    cost[0][0]=0;
    function update(i,j,value,step){if(value<cost[i][j]){cost[i][j]=value;back[i][j]=step;}}
    for(let i=0;i<=n;i++)for(let j=0;j<=m;j++){
      if(!Number.isFinite(cost[i][j]))continue;
      if(i<n&&j<m){
        if(expected[i].name){
          for(let end=j+1;end<=m;end++)update(i+1,end,cost[i][j],{i,j,match:true});
        }else update(i+1,j+1,cost[i][j]+(expected[i].token===actual[j]?0:1),{i,j,match:expected[i].token===actual[j]});
      }
      if(i<n)update(i+1,j,cost[i][j]+1,{i,j,match:false});
      if(j<m)update(i,j+1,cost[i][j]+1,{i,j,match:false});
    }
    const matched=new Array(n).fill(false);let i=n,j=m;
    while(i||j){const step=back[i][j];if(i>step.i)matched[i-1]=step.match;i=step.i;j=step.j;}
    const flags=displayed.map((_,owner)=>expected.some(e=>e.owners.includes(owner))&&expected.every((e,k)=>!e.owners.includes(owner)||matched[k]));
    return {words:displayed,flags,complete:expected.length>0&&cost[n][m]===0,extra:flags.every(Boolean)&&cost[n][m]>0};
  }
  return Object.freeze({words,assess,nameRanges});
});


