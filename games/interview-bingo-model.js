/* Authoring preset only. Runtime sheet size, roster and printed 配布用カード assignments
   belong to a future activity configuration, not to this reusable preset. */
(function(root){
  'use strict';
  const M=root.InterviewModel||(typeof require==='function'?require('../grade34/interview-model.js'):null);
  const books={lt1:9,lt2:9,nh5:8,nh6:8};
  function defaultRecommendations(){
    return {candidateCounts:{3:{min:12,max:15},4:{min:20,max:24},5:{min:28,max:30}},myCardWordCount:4};
  }
  function count(value,label){
    M.check(Number.isInteger(value)&&value>=1&&value<=100,label+'は1～100の整数で入力してください');
    return value;
  }
  function validatePreset(value,validCardIds=M.knownCards()){
    M.check(value?.type==='interview-bingo'&&value.version===1,'未対応のInterview Bingoプリセットです');
    const cardIds=M.array(value.cardIds,100,'カード',1).map(M.id);M.unique(cardIds,'カード');
    if(validCardIds)M.check(cardIds.every(id=>validCardIds.has(id)),'使用できないカードが含まれています');
    const assignedUnits=M.array(value.assignedUnits,34,'Unit').map(unit=>{
      M.check(unit&&Object.hasOwn(books,unit.bookId)&&Number.isInteger(unit.unit)&&unit.unit>=1&&unit.unit<=books[unit.bookId],'Unitが不正です');
      return {bookId:unit.bookId,unit:unit.unit};
    });
    M.unique(assignedUnits.map(u=>u.bookId+':'+u.unit),'Unit');
    const template=M.text(value.expressions?.template,'活動で使う表現',200);
    const slots=M.array(value.expressions?.slots,9,'差し替え部分').map(slot=>{
      M.check(/^P[1-9]?$/.test(slot?.id)&&slot.type==='picture-card','未対応の差し替え部分です');
      const ids=M.array(slot.cardIds,100,'差し替えカード',1).map(M.id);M.unique(ids,'差し替えカード');
      M.check(ids.length===cardIds.length&&ids.every(id=>cardIds.includes(id)),'差し替えカードが一致しません');
      return {id:slot.id,type:'picture-card',cardIds:ids};
    });
    M.unique(slots.map(s=>s.id),'差し替え部分');
    const markers=template.match(/\([A-Z][A-Z0-9_]*\)/g)||[];
    M.check(markers.every(m=>slots.some(s=>'('+s.id+')'===m))&&slots.every(s=>markers.includes('('+s.id+')')),'差し替えは (P)、または (P1)〜(P9) で指定してください');
    const candidateCounts={};
    for(const size of [3,4,5]){
      const range=value.recommendations?.candidateCounts?.[size],label=size+'×'+size;
      const min=count(range?.min,label+' 推奨最小数'),max=count(range?.max,label+' 推奨最大数');
      M.check(min<=max,label+'の推奨最小数は最大数以下にしてください');
      candidateCounts[size]={min,max};
    }
    const myCardWordCount=count(value.recommendations?.myCardWordCount,'配布用カード おすすめ語数');
    return {version:1,type:'interview-bingo',id:M.id(value.id),title:M.text(value.title,'活動タイトル',80),studentInstructions:M.text(value.studentInstructions??'','児童への説明',500,true),teacherMemo:M.text(value.teacherMemo??'','教師用メモ',500,true),expressions:{template,slots},cardIds,recommendations:{candidateCounts,myCardWordCount},assignedUnits,createdAt:M.date(value.createdAt),updatedAt:M.date(value.updatedAt)};
  }
  // Reuse Interview's exact replacement rules, including repeated and independent slots.
  function completeExpressions(preset,selection){return M.completeQuestion({question:preset.expressions},selection);}
  const api={validatePreset,defaultRecommendations,completeExpressions};
  root.InterviewBingoModel=api;if(typeof module==='object')module.exports=api;
})(typeof window==='object'?window:globalThis);
