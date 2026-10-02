/* Ephemeral student state only: no storage, roster lookup or preset mutation. */
(function(root){
  'use strict';
  const sizes=[3,4,5],empty=()=>({cardId:null,studentId:null});
  const unique=ids=>[...new Set(ids.filter(id=>typeof id==='string'&&id))];
  function createState({size=3,cardIds=[],studentIds=[]}){
    if(!sizes.includes(size))throw Error('BINGOサイズは3・4・5から選んでください');
    return {size,cardIds:unique(cardIds),studentIds:unique(studentIds),cells:Array.from({length:size*size},empty),selectedIndex:null,page:'compose'};
  }
  function validateState(raw,{size,cardIds,studentIds}){
    const check=(condition,message)=>{if(!condition)throw Error(message);};
    const shape=(value,keys)=>check(value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key)),'保存したBINGO盤面の形式が不正です');
    const validIds=values=>Array.isArray(values)&&values.every(id=>typeof id==='string'&&id.length<=100&&/^[A-Za-z0-9_-]+$/.test(id))&&new Set(values).size===values.length;
    check(sizes.includes(size)&&validIds(cardIds)&&cardIds.length>0&&validIds(studentIds),'BINGO盤面の候補が不正です');
    shape(raw,['size','cardIds','studentIds','cells','selectedIndex','page']);
    check(raw.size===size&&Array.isArray(raw.cardIds)&&raw.cardIds.length===cardIds.length&&raw.cardIds.every((id,i)=>id===cardIds[i]),'保存した候補カードが配信と一致しません');
    check(Array.isArray(raw.studentIds)&&raw.studentIds.length===studentIds.length&&raw.studentIds.every((id,i)=>id===studentIds[i]),'保存した相手一覧が配信と一致しません');
    check(Array.isArray(raw.cells)&&raw.cells.length===size*size,'保存したマス数が不正です');
    check(raw.selectedIndex===null||(Number.isInteger(raw.selectedIndex)&&raw.selectedIndex>=0&&raw.selectedIndex<raw.cells.length),'保存した選択位置が不正です');
    check(raw.page==='compose'||raw.page==='interview','保存した画面が不正です');
    const cardCounts=new Map(),studentIdsUsed=new Set();
    const cells=raw.cells.map(cell=>{
      shape(cell,['cardId','studentId']);
      check(cell.cardId===null||cardIds.includes(cell.cardId),'保存したカードが候補にありません');
      check(cell.studentId===null||studentIds.includes(cell.studentId),'保存した相手が名簿にありません');
      check(cell.cardId!==null||cell.studentId===null,'カードのないマスに相手を保存できません');
      if(cell.cardId!==null){const count=(cardCounts.get(cell.cardId)||0)+1;check(count<=2,'同じカードは2回までです');cardCounts.set(cell.cardId,count);}
      if(cell.studentId!==null){check(!studentIdsUsed.has(cell.studentId),'同じ相手は1回までです');studentIdsUsed.add(cell.studentId);}
      return {cardId:cell.cardId,studentId:cell.studentId};
    });
    check(raw.page!=='interview'||cells.every(cell=>cell.cardId!==null),'未完成の盤面でインタビューを再開できません');
    return {size,cardIds:[...cardIds],studentIds:[...studentIds],cells,selectedIndex:raw.selectedIndex,page:raw.page};
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
  const api={createState,validateState,transition,getProgress,getLines};root.InterviewBingoSession=api;if(typeof module==='object')module.exports=api;
})(typeof window==='object'?window:globalThis);
