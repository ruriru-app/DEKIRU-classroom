/* Ephemeral teacher settings, deliberately separate from saved presets. */
(function(root){
  'use strict';
  const unique=ids=>[...new Set(ids)],sorted=c=>[...c.candidateIds].sort();
  function initial({cardIds,recommendedMyCardWordCount}){return {size:3,candidateIds:unique(cardIds),participantCount:35,myCardWordCount:recommendedMyCardWordCount};}
  function validate(c,availableCardIds){
    const errors=[],warnings=[],error=(field,message)=>errors.push({field,message});
    if(![3,4,5].includes(c.size))error('size','BINGOサイズは3×3・4×4・5×5から選んでください。');
    if(!Number.isInteger(c.participantCount)||c.participantCount<1||c.participantCount>100)error('participantCount','参加人数は1～100人の整数で入力してください。');
    const ids=c.candidateIds,valid=Array.isArray(ids)&&ids.length>0&&ids.length<=100&&new Set(ids).size===ids.length&&ids.every(id=>typeof id==='string'&&availableCardIds.includes(id));
    if(!valid)error('candidateIds','候補カードを1～100語の中から選んでください。');
    if(!Number.isInteger(c.myCardWordCount)||c.myCardWordCount<1||c.myCardWordCount>9||c.myCardWordCount>(ids?.length||0))error('myCardWordCount','MY CARDの語数を1～9語、かつ候補語数以下に変更してください。');
    if([3,4,5].includes(c.size)){
      if(valid&&ids.length*2<c.size*c.size)warnings.push({field:'candidateIds',message:'同じカードを2回ずつ使っても全マスを作れません。候補を増やすか、サイズを小さくしてください。'});
      if(Number.isInteger(c.participantCount)&&c.participantCount>0&&c.participantCount<=c.size*c.size)warnings.push({field:'participantCount',message:`自分を除く相手が足りないため全マスは埋められません（全マスには本人を含め${c.size*c.size+1}人必要です）。少ない本数のBINGOを目指す活動はできます。`});
    }
    return {errors,warnings};
  }
  function reconcileCandidates(c,previousIds,nextIds){return {...c,candidateIds:unique(nextIds).filter(id=>c.candidateIds.includes(id)||!previousIds.includes(id))};}
  const boardKey=c=>JSON.stringify([c.size,sorted(c),c.participantCount]);
  const printKey=c=>JSON.stringify([sorted(c),c.participantCount,c.myCardWordCount]);
  const api={initial,validate,reconcileCandidates,boardKey,printKey};root.InterviewBingoSetup=api;if(typeof module==='object')module.exports=api;
})(typeof window==='object'?window:globalThis);
