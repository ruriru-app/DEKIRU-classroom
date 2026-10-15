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
 const spot=(r,c,toward)=>({r,c,toward});
 const around=(r,c)=>[spot(r,c+1,2),spot(r+2,c+1,0),spot(r+1,c,1),spot(r+1,c+2,3)];
 // Arrival spots are on the existing half-block road grid. Quarter-size facilities
 // use their outer side street so neighbouring facilities have distinct stops.
 const facilities=[
  ['hospital','Hospital','病院',[82,162,272,140],[spot(0,1,2)]],
  ['church','Church','教会',[77,300,139,122],[spot(1,0,1)]],
  ['zoo','Zoo','動物園',[416,174,296,249],around(0,2)],
  ['park','Park','公園',[769,170,266,133],[spot(0,5,2)]],
  ['police-station','Police Station','警察署',[751,305,150,119],[spot(1,4,1)]],
  ['junior-high-school','Junior High School','中学校',[1108,164,266,138],[spot(0,7,2)]],
  ['fire-station','Fire Station','消防署',[1102,305,151,120],[spot(1,6,1)]],
  ['station','Station','駅',[78,452,289,133],[spot(2,1,2)]],
  ['bus-stop','Bus Stop','バス停',[65,591,147,118],[spot(3,0,1)]],
  ['post-office','Post Office','郵便局',[235,591,126,118],[spot(3,2,3)]],
  ['castle','Castle','城',[418,456,291,253],around(2,2)],
  ['supermarket','Supermarket','スーパー',[771,453,260,132],[spot(2,5,2)]],
  ['restaurant','Restaurant','レストラン',[751,591,148,118],[spot(3,4,1)]],
  ['aquarium','Aquarium','水族館',[1101,452,294,135],[spot(2,7,2)]],
  ['shrine','Shrine','神社',[1103,592,146,117],[spot(3,6,1)]],
  ['amusement-park','Amusement Park','遊園地',[64,745,305,238],around(4,0)],
  ['elementary-school','Elementary School','小学校',[425,744,278,122],[spot(4,3,2)]],
  ['bookstore','Bookstore','本屋',[416,870,146,114],[spot(5,2,1)]],
  ['stadium','Stadium','スタジアム',[756,744,289,240],around(4,4)],
  ['library','Library','図書館',[1110,744,278,125],[spot(4,7,2)]],
  ['convenience-store','Convenience Store','コンビニ',[1092,875,168,108],[spot(5,6,1)]],
  ['temple','Temple','寺',[1268,873,130,111],[spot(5,8,3)]]
 ].map(([id,english,japanese,rect,spots])=>({id,english,japanese,rect,spots}));
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
  const toward=(state.dir+(side==='right'?1:3))%4;
  return facilities.filter(f=>f.spots.some(s=>s.r===state.r&&s.c===state.c&&s.toward===toward));
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
 const api={size:base.size,starts:base.starts,point:base.point,facilities,vectors,advance,parseCommand,formatCommand,transition,seenFacilities,isArrival,nextHint};
 if(typeof module==='object')module.exports=api;else root.TownLevel3=api;
})(typeof window==='object'?window:globalThis);
