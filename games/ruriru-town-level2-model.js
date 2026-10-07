(function(root){
 'use strict';
 // Coordinates are measured on the supplied, unmodified 1448 x 1086 map.
 // Even row/column indices are intersections; odd indices are halfway along a road.
 const size={width:1448,height:1086},xs=[38,390,733,1069,1419],ys=[150,441,725,1001];
 const starts={A:{r:0,c:0,dir:2},B:{r:0,c:2,dir:2},C:{r:0,c:4,dir:2},D:{r:0,c:6,dir:2},E:{r:0,c:8,dir:2},F:{r:2,c:8,dir:3},G:{r:4,c:8,dir:3},H:{r:6,c:8,dir:3},I:{r:6,c:6,dir:0},J:{r:6,c:4,dir:0},K:{r:6,c:2,dir:0},L:{r:6,c:0,dir:1},M:{r:4,c:0,dir:1},N:{r:2,c:0,dir:1}};
 function onRoad(p){return !!p&&Number.isInteger(p.r)&&Number.isInteger(p.c)&&p.r>=0&&p.r<=6&&p.c>=0&&p.c<=8&&(p.r%2===0||p.c%2===0);}
 function canTurn(p){return onRoad(p)&&p.r%2===0&&p.c%2===0;}
 function coordinate(axis,i){return i%2===0?axis[i/2]:(axis[Math.floor(i/2)]+axis[Math.ceil(i/2)])/2;}
 function point(p){return onRoad(p)?{x:coordinate(xs,p.c),y:coordinate(ys,p.r)}:null;}
 function advance(p,dir,steps){
  if(!onRoad(p)||![0,1,2,3].includes(dir)||![1,2].includes(steps))return null;
  const [dr,dc]=[[-1,0],[0,1],[1,0],[0,-1]][dir];let next;
  for(let i=1;i<=steps;i++){next={r:p.r+dr*i,c:p.c+dc*i};if(!onRoad(next))return null;}
  return next;
 }
 const api={size,starts,point,canTurn,advance};
 if(typeof module==='object')module.exports=api;else root.TownLevel2=api;
})(typeof window==='object'?window:globalThis);
