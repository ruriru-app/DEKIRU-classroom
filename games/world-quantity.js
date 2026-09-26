(function(root){
 'use strict';
 const counters={clothes_001:'着',clothes_003:'着',clothes_009:'個',clothes_010:'組',clothes_011:'足',clothes_012:'足'};
 const valid=n=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=0;
 function summarize(rows,cardId){
  if(!rows.length)return {status:'unavailable'};
  // A unit must cover every HS row. Never add the two quantity columns together.
  const units=counters[cardId]?['NO','DZ','PR','KG','MT']:['KG','MT'];
  for(const unit of units){
   const measures=rows.map(r=>(r.quantities||[]).filter(q=>q.unit===unit));
   if(!measures.every(q=>q.length===1&&valid(q[0].value)))continue;
   const value=measures.reduce((sum,q)=>sum+q[0].value,0);
   if(valid(value))return {status:value===0?'below-unit':'available',unit,value,...(value===0&&rows.length>1?{rows:rows.length}:{})};
  }
  return {status:'unavailable'};
 }
 const number=n=>n.toLocaleString('ja-JP',{maximumFractionDigits:3});
 function describe(q,cardId){
  const missing={short:'数量未収録',detail:'この分類の数量は確認できていません。'};
  if(!q||!['available','below-unit'].includes(q.status)||!valid(q.value))return missing;
  let value=q.value,unit=q.unit,step=1,detail='';
  if(unit==='KG'){unit='kg';detail=number(value)+'kg';}
  else if(unit==='MT'){unit='トン';detail=number(value)+'トン';}
  else if(['NO','DZ','PR'].includes(unit)&&counters[cardId]){
   unit=counters[cardId];
   if(q.unit==='DZ'){value*=12;step=12;detail=number(q.value)+'ダース（1ダース＝12'+unit+'）';}
   else detail=number(value)+unit;
  }else return missing;
  if(q.status==='below-unit'){
   const rows=valid(q.rows)&&q.rows>0?q.rows:1;
   return {short:number(step*rows)+unit+'未満',detail:rows===1?'原表の数量は0（統計の単位未満）です。':'原表の'+rows+'項目はそれぞれ数量0（統計の単位未満）です。表示は合計の上限です。'};
  }
  if(unit==='kg'&&value>=1000){value/=1000;unit='トン';}
  const scale=value>=1e8?1e8:value>=1e4?1e4:1;
  const label=scale===1e8?'億':scale===1e4?'万':'';
  return {short:'約'+number(Number((value/scale).toPrecision(3)))+label+unit,detail:'原表の数量合計：'+detail};
 }
 const api={summarize,describe};
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.WorldQuantity=api;
})(typeof window==='object'?window:globalThis);
