(function(root){
 'use strict';
 const base=typeof module==='object'?require('./ruriru-town-level2-model.js'):root.TownLevel2;
 const vectors=[[-1,0],[0,1],[1,0],[0,-1]];
 const numberWords=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty'];
 const tensWords=['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
 function numberValue(text){
  if(/^[0-9]+$/.test(text))return Number(text);
  const direct=numberWords.indexOf(text);if(direct>=0)return direct;
  const parts=text.replace(/-/g,' ').split(' '),tens=tensWords.indexOf(parts[0]);
  if(tens>=2&&(parts.length===1||parts.length===2&&numberWords.indexOf(parts[1])>0&&numberWords.indexOf(parts[1])<10))return tens*10+(parts.length===2?numberWords.indexOf(parts[1]):0);
  const hundred=text.match(/^(one|two|three|four|five|six|seven|eight|nine) hundred(?: (?:and )?(.+))?$/);
  if(hundred){const rest=hundred[2]?numberValue(hundred[2]):0;if(rest>=0&&rest<100)return numberWords.indexOf(hundred[1])*100+rest;}
  return NaN;
 }
 // Logical bounds use the same half-block grid as movement. The nearest
 // half-block square ahead-left/right identifies the visible facility.
 const facilities=[
  ['hospital','Hospital','病院',[82,162,272,140],[0,0,1,2]],
  ['church','Church','教会',[77,300,139,122],[1,0,2,1]],
  ['zoo','Zoo','動物園',[416,174,296,249],[0,2,2,4]],
  ['park','Park','公園',[769,170,266,133],[0,4,1,6]],
  ['police-station','Police Station','警察署',[751,305,150,119],[1,4,2,5]],
  ['junior-high-school','Junior High School','中学校',[1108,164,266,138],[0,6,1,8]],
  ['fire-station','Fire Station','消防署',[1102,305,151,120],[1,6,2,7]],
  ['station','Station','駅',[78,452,289,133],[2,0,3,2]],
  ['bus-stop','Bus Stop','バス停',[65,591,147,118],[3,0,4,1]],
  ['post-office','Post Office','郵便局',[235,591,126,118],[3,1,4,2]],
  ['castle','Castle','城',[418,456,291,253],[2,2,4,4]],
  ['supermarket','Supermarket','スーパー',[771,453,260,132],[2,4,3,6]],
  ['restaurant','Restaurant','レストラン',[751,591,148,118],[3,4,4,5]],
  ['aquarium','Aquarium','水族館',[1101,452,294,135],[2,6,3,8]],
  ['shrine','Shrine','神社',[1103,592,146,117],[3,6,4,7]],
  ['amusement-park','Amusement Park','遊園地',[64,745,305,238],[4,0,6,2]],
  ['elementary-school','Elementary School','小学校',[425,744,278,122],[4,2,5,4]],
  ['bookstore','Bookstore','本屋',[416,870,146,114],[5,2,6,3]],
  ['stadium','Stadium','スタジアム',[756,744,289,240],[4,4,6,6]],
  ['library','Library','図書館',[1110,744,278,125],[4,6,5,8]],
  ['convenience-store','Convenience Store','コンビニ',[1092,875,168,108],[5,6,6,7]],
  ['temple','Temple','寺',[1268,873,130,111],[5,7,6,8]]
 ].map(([id,english,japanese,rect,bounds])=>({id,english,japanese,rect,bounds,spots:[]}));
 const contains=(facility,r,c)=>r>facility.bounds[0]&&r<facility.bounds[2]&&c>facility.bounds[1]&&c<facility.bounds[3];
 for(const facility of facilities)for(let r=0;r<=6;r++)for(let c=0;c<=8;c++){
  if(base.point({r,c})&&[[-1,-1],[-1,1],[1,-1],[1,1]].some(([dr,dc])=>contains(facility,r+dr/2,c+dc/2)))facility.spots.push({r,c});
 }
 function validState(p){return !!base.point(p)&&Number.isInteger(p.dir)&&p.dir>=0&&p.dir<4;}
 function advance(p,dir,steps){
  if(!Number.isInteger(steps)||steps<1||steps>40)return null;
  let next={r:p.r,c:p.c};
  for(let i=0;i<steps;i++){next=base.advance(next,dir,1);if(!next)return null;}
  return next;
 }
 function parseCommand(text){
  if(typeof text!=='string')return null;
  const normalized=text.normalize('NFKC').trim().toLowerCase().replace(/[.!?。！？]+$/,'').trim().replace(/\s+/g,' ');
  if(normalized==='go straight for just a little bit')return {kind:'forward',steps:1};
  let match=normalized.match(/^go straight for ([a-z -]+|[0-9]+) (block|blocks)$/);
  if(match){
   const n=numberValue(match[1]);
   if(Number.isSafeInteger(n*2)&&n>=1&&match[2]===(n===1?'block':'blocks'))return {kind:'forward',steps:n*2};
   return null;
  }
  match=normalized.match(/^turn (right|left)$/);
  if(match)return {kind:'turn',delta:match[1]==='right'?1:-1};
  match=normalized.match(/^you can see it on your (right|left)$/);
  return match?{kind:'arrival',side:match[1]}:null;
 }
 function formatCommand(command){
  if(command.kind==='forward'){
   if(command.steps===1)return 'Go straight for just a little bit.';
   const n=command.steps/2;return `Go straight for ${numberWords[n]||n} block${n===1?'':'s'}.`;
  }
  if(command.kind==='turn')return `Turn ${command.delta===1?'right':'left'}.`;
  return `You can see it on your ${command.side}.`;
 }
 function transition(state,command){
  if(!validState(state)||!command)return {ok:false,state};
  if(command.kind==='turn'&&[1,-1].includes(command.delta))return {ok:true,state:{...state,dir:(state.dir+command.delta+4)%4}};
  if(command.kind==='arrival'&&['right','left'].includes(command.side))return {ok:true,state:{...state}};
  if(command.kind==='forward'){
   const next=advance(state,state.dir,command.steps);
   return next?{ok:true,state:{...state,...next}}:{ok:false,state,reason:'no-road'};
  }
  return {ok:false,state};
 }
 function seenFacilities(state,side){
  if(!validState(state)||!['left','right'].includes(side))return [];
  const [dr,dc]=indicationVector(state.dir,side);
  return facilities.filter(f=>contains(f,state.r+dr/2,state.c+dc/2));
 }
 function indicationVector(dir,side){
  if(!vectors[dir]||!['left','right'].includes(side))return null;
  const ahead=vectors[dir],lateral=vectors[(dir+(side==='right'?1:3))%4];
  return [ahead[0]+lateral[0],ahead[1]+lateral[1]];
 }
 function isArrival(state,goalId,side){return seenFacilities(state,side).some(f=>f.id===goalId);}
 const key=p=>`${p.r},${p.c},${p.dir}`;
 const compare=(a,b)=>a.distance-b.distance||a.turns-b.turns;
 function nextHint(state,goalId){
  if(!validState(state)||!facilities.some(f=>f.id===goalId))return null;
  // Lexicographic Dijkstra: shortest walking distance, then fewest turns.
  // Turning can happen anywhere but cannot allow a walk through a building.
  const first={state:{...state},distance:0,turns:0,path:[]},queue=[first],best=new Map([[key(state),first]]);
  while(queue.length){
   queue.sort(compare);const current=queue.shift();if(best.get(key(current.state))!==current)continue;
   for(const side of ['right','left'])if(isArrival(current.state,goalId,side)){
    if(!current.path.length)return formatCommand({kind:'arrival',side});
    if(current.path[0].kind!=='forward')return formatCommand(current.path[0]);
    let count=0;for(const command of current.path){if(command.kind!=='forward')break;count++;}
    return formatCommand({kind:'forward',steps:count>=2?count-count%2:1});
   }
   for(const command of [{kind:'forward',steps:1},{kind:'turn',delta:1},{kind:'turn',delta:-1}]){
    const next=transition(current.state,command);if(!next.ok)continue;
    const candidate={state:next.state,distance:current.distance+(command.kind==='forward'?1:0),turns:current.turns+(command.kind==='turn'?1:0),path:[...current.path,command]};
    const k=key(next.state),previous=best.get(k);
    if(!previous||compare(candidate,previous)<0){best.set(k,candidate);queue.push(candidate);}
   }
  }
  return null;
 }
 const api={size:base.size,starts:base.starts,point:base.point,facilities,vectors,advance,parseCommand,formatCommand,transition,indicationVector,seenFacilities,isArrival,nextHint};
 if(typeof module==='object')module.exports=api;else root.TownLevel3=api;
})(typeof window==='object'?window:globalThis);
