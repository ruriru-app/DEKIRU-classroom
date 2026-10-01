/* Ephemeral student state only: no storage, roster lookup or preset mutation. */
(function(root){
  'use strict';
  const sizes=[3,4,5],empty=()=>({cardId:null,studentId:null});
  const unique=ids=>[...new Set(ids.filter(id=>typeof id==='string'&&id))];
  function createState({size=3,cardIds=[],studentIds=[]}){
    if(!sizes.includes(size))throw Error('BINGOサイズは3・4・5から選んでください');
    return {size,cardIds:unique(cardIds),studentIds:unique(studentIds),cells:Array.from({length:size*size},empty),selectedIndex:null,page:'compose'};
  }
  function getProgress(s){const filled=s.cells.filter(c=>c.cardId).length;return {filled,required:s.size*s.size,missing:s.cells.length-filled,complete:filled===s.cells.length,usedStudentIds:s.cells.filter(c=>c.studentId).map(c=>c.studentId)};}
  function getLines(s){
    const n=s.size,marked=i=>!!(s.cells[i].cardId&&s.cells[i].studentId),range=Array.from({length:n},(_,i)=>i);
    const rows=range.map(r=>range.every(c=>marked(r*n+c))),columns=range.map(c=>range.every(r=>marked(r*n+c)));
    const diagonals=[range.every(i=>marked(i*(n+1))),range.every(i=>marked((i+1)*(n-1)))];
    return {rows,columns,diagonals,count:[...rows,...columns,...diagonals].filter(Boolean).length};
  }
  function transition(s,a,{random=Math.random}={}){
    const validIndex=i=>Number.isInteger(i)&&i>=0&&i<s.cells.length;
    const changeCell=(i,cell)=>({...s,cells:s.cells.map((c,j)=>j===i?cell:c)});
    switch(a.type){
      case 'place':{if(s.page!=='compose'||!s.cardIds.includes(a.cardId)||s.cells.filter(c=>c.cardId===a.cardId).length>=2)return s;const i=s.cells.findIndex(c=>!c.cardId);return i<0?s:changeCell(i,{cardId:a.cardId,studentId:null});}
      case 'removeCard':return s.page==='compose'&&validIndex(a.index)?{...changeCell(a.index,empty()),selectedIndex:s.selectedIndex===a.index?null:s.selectedIndex}:s;
      case 'resize':return sizes.includes(a.size)&&a.size!==s.size?createState({size:a.size,cardIds:s.cardIds,studentIds:s.studentIds}):s;
      case 'random':{
        if(s.page!=='compose'||s.cardIds.length*2<s.cells.length)return s;
        const shuffle=list=>{const pool=[...list];for(let i=pool.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}return pool;};
        const pool=shuffle(s.cardIds).slice(0,s.cells.length),missing=s.cells.length-pool.length;
        if(missing)pool.push(...shuffle(s.cardIds).slice(0,missing));
        return {...s,cells:shuffle(pool).map(cardId=>({cardId,studentId:null})),selectedIndex:null};
      }
      case 'select':return s.page==='interview'&&validIndex(a.index)&&s.cells[a.index].cardId?{...s,selectedIndex:a.index}:s;
      case 'assignName':{
        if(s.page!=='interview'||!getProgress(s).complete||!validIndex(s.selectedIndex)||!s.studentIds.includes(a.studentId)||s.cells.some(c=>c.studentId===a.studentId)||s.cells[s.selectedIndex].studentId)return s;
        return changeCell(s.selectedIndex,{...s.cells[s.selectedIndex],studentId:a.studentId});
      }
      case 'removeName':return s.page==='interview'&&getProgress(s).complete&&validIndex(s.selectedIndex)?changeCell(s.selectedIndex,{...s.cells[s.selectedIndex],studentId:null}):s;
      case 'setPage':return ['compose','interview'].includes(a.page)?{...s,page:a.page}:s;
      case 'syncCandidates':{
        const cardIds=unique(a.cardIds),cells=s.cells.map(c=>cardIds.includes(c.cardId)?c:empty());
        return {...s,cardIds,cells,selectedIndex:validIndex(s.selectedIndex)&&cells[s.selectedIndex].cardId?s.selectedIndex:null};
      }
      default:return s;
    }
  }
  const api={createState,transition,getProgress,getLines};root.InterviewBingoSession=api;if(typeof module==='object')module.exports=api;
})(typeof window==='object'?window:globalThis);
