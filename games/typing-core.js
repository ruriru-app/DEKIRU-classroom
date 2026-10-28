(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.TypingCore=api;})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
const check=(value,message)=>{if(!value)throw Error(message);};
function text(value,max,label,empty=false){check(typeof value==='string'&&value.length<=max&&(empty||value.trim()),label+'を確認してください。');return value.trim();}
function entry(value){
 check(value&&typeof value==='object','問題の形式を確認してください。');
 const english=text(value.english,240,'英語');check(/[A-Za-z]/.test(english),'英語にはアルファベットを含めてください。');
 const result={japanese:text(value.japanese||'',240,'日本語',true),english};
 if(value.cardId){check(typeof value.cardId==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(value.cardId),'カードIDを確認してください。');result.cardId=value.cardId;}
 return result;
}
function activity(value){
 check(value&&value.version===1&&value.type==='english-typing','タイピング教材の形式を確認してください。');
 check(Array.isArray(value.entries)&&value.entries.length>=1&&value.entries.length<=100,'問題を1～100問にしてください。');
 return {version:1,type:'english-typing',title:text(value.title,80,'教材名'),instructions:text(value.instructions||'',500,'説明',true),entries:value.entries.map(entry)};
}
function preset(value){
 const a=activity(value);check(typeof value.id==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(value.id),'教材IDを確認してください。');
 check(Array.isArray(value.assignedUnits)&&value.assignedUnits.every(x=>/^nh[56]:[1-8]$/.test(x)),'配置先Unitを確認してください。');
 return {...a,id:value.id,assignedUnits:[...new Set(value.assignedUnits)]};
}
function parsePaste(value){
 const lines=String(value).replace(/\r\n?/g,'\n').split('\n').filter(line=>line.trim());
 check(lines.length,'日本語と英語を貼り付けてください。');
 let pairs=[];
 if(lines.some(line=>line.includes('\t'))){
  check(lines.every(line=>line.includes('\t')),'各行を「日本語 TAB 英語」の２列にしてください。');
  pairs=lines.map((line,i)=>{const columns=line.split('\t');check(columns.length===2,(i+1)+'行目を２列にしてください。');return {japanese:columns[0],english:columns[1]};});
  if(pairs[0].japanese.trim()==='日本語'&&['英語','English','english'].includes(pairs[0].english.trim()))pairs.shift();
 }else{
  check(lines.length%2===0,'日本語→英語の順で、２行ずつ貼り付けてください。');
  for(let i=0;i<lines.length;i+=2)pairs.push({japanese:lines[i],english:lines[i+1]});
 }
 check(pairs.length<=100,'問題は100問以内にしてください。');return pairs.map(entry);
}
function normalize(value){return String(value).normalize('NFKC').replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/[‐‑–—]/g,'-').trim();}
function compare(expectedValue,actualValue){
 const expected=Array.from(normalize(expectedValue)),actual=Array.from(normalize(actualValue)),n=expected.length,m=actual.length;
 check(n<=240&&m<=500,'入力が長すぎます。');
 const costs=Array.from({length:n+1},()=>new Array(m+1).fill(0));
 for(let i=0;i<=n;i++)costs[i][0]=i;for(let j=0;j<=m;j++)costs[0][j]=j;
 for(let i=1;i<=n;i++)for(let j=1;j<=m;j++)costs[i][j]=Math.min(costs[i-1][j-1]+(expected[i-1]===actual[j-1]?0:1),costs[i-1][j]+1,costs[i][j-1]+1);
 const edits=[];let i=n,j=m;
 while(i||j){
  if(i&&j&&costs[i][j]===costs[i-1][j-1]+(expected[i-1]===actual[j-1]?0:1)){
   edits.push({kind:expected[i-1]===actual[j-1]?'equal':'replace',expected:expected[i-1],actual:actual[j-1],index:i-1});i--;j--;
  }else if(i&&costs[i][j]===costs[i-1][j]+1){edits.push({kind:'missing',expected:expected[i-1],actual:'',index:i-1});i--;}
  else{edits.push({kind:'extra',expected:'',actual:actual[j-1],index:i});j--;}
 }
 edits.reverse();return {correct:costs[n][m]===0,edits};
}
return Object.freeze({entry,activity,preset,parsePaste,compare,normalize,newId:()=> 'typing-'+(globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2))});
});

