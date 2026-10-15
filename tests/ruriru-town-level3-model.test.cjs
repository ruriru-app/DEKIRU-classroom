const test=require('node:test'),assert=require('node:assert/strict');
let M;try{M=require('../games/ruriru-town-level3-model.js');}catch{M={};}
test('unit expressions accept English/digit numbers and punctuation but reject malformed or multiple instructions',()=>{
 assert.equal(typeof M.parseCommand,'function');
 for(const [text,kind,steps] of [['Go straight for one block.','forward',2],['GO STRAIGHT FOR 2 BLOCKS!','forward',4],['Go straight for three blocks','forward',6],['Go straight for just a little bit.','forward',1],['Turn right.','turn'],['Turn left','turn'],['You can see it on your right.','arrival'],['You can see it on your left','arrival']]){
  const command=M.parseCommand(text);assert.equal(command?.kind,kind,text);if(steps)assert.equal(command.steps,steps);
 }
 for(const text of ['Go straight.','Go straight two blocks.','Go straight for two block.','Go straight for one blocks.','Go straight for zero blocks.','Turn right then go straight for one block.','You can see it on my left.','Turn right. Turn left.','hello',''])assert.equal(M.parseCommand(text),null,text);
});
test('turns rotate anywhere; full blocks start at the current half-block position',()=>{
 const state={r:1,c:0,dir:2};
 assert.deepEqual(M.transition(state,M.parseCommand('Turn left.')).state,{r:1,c:0,dir:1});
 assert.deepEqual(M.transition(state,M.parseCommand('Go straight for one block.')).state,{r:3,c:0,dir:2});
 assert.deepEqual(state,{r:1,c:0,dir:2});
 assert.equal(M.transition({r:1,c:0,dir:1},M.parseCommand('Go straight for one block.')).ok,false,'cannot cross a block');
 assert.equal(M.transition({r:0,c:0,dir:0},M.parseCommand('Go straight for one block.')).ok,false,'cannot leave map');
 assert.ok(M.parseCommand('Go straight for nine blocks.'),'syntax remains valid even when distance cannot be travelled');
});
test('large positive block counts remain valid language and impossible travel is rejected separately',()=>{
 for(const text of ['Go straight for 21 blocks.','Go straight for 100 blocks.','Go straight for twenty-one blocks.','Go straight for one hundred blocks.']){
  const command=M.parseCommand(text);assert.ok(command,text);assert.equal(command.kind,'forward');
  assert.equal(M.transition({r:0,c:0,dir:1},command).ok,false,'valid language, impossible distance');
 }
});
test('arrival checks goal position and character-relative side without moving',()=>{
 const goal=M.facilities.find(f=>f.id==='zoo'),spot=goal.spots[0];
 const state={r:spot.r,c:spot.c,dir:(spot.toward+3)%4};
 assert.ok(M.isArrival(state,'zoo','right'));
 assert.equal(M.isArrival(state,'zoo','left'),false);
 assert.deepEqual(M.transition(state,M.parseCommand('You can see it on your right.')).state,state);
 assert.equal(M.isArrival({...state,r:6,c:0},'zoo','right'),false);
});
function oracleDistance(start,goal){
 const queue=[[start,0]],seen=new Set([`${start.r},${start.c}`]);
 for(let i=0;i<queue.length;i++){
  const [p,d]=queue[i];if(goal.spots.some(s=>s.r===p.r&&s.c===p.c))return d;
  for(let dir=0;dir<4;dir++){const next=M.advance(p,dir,1);if(next){const key=`${next.r},${next.c}`;if(!seen.has(key)){seen.add(key);queue.push([next,d+1]);}}}
 }
}
test('one-sentence hints complete all 14 x 22 routes at shortest physical distance',()=>{
 assert.equal(Object.keys(M.starts).length,14);assert.equal(M.facilities.length,22);
 for(const [letter,start] of Object.entries(M.starts))for(const goal of M.facilities){
  let state={...start},distance=0,arrived=false;
  for(let i=0;i<30;i++){
   const hint=M.nextHint(state,goal.id);assert.ok(hint,`${letter} → ${goal.id}`);
   const cmd=M.parseCommand(hint);assert.ok(cmd,hint);
   if(cmd.kind==='arrival'){assert.ok(M.isArrival(state,goal.id,cmd.side),`${letter} → ${goal.id}: ${hint}`);arrived=true;break;}
   const result=M.transition(state,cmd);assert.ok(result.ok,`${letter} → ${goal.id}: ${hint}`);state=result.state;if(cmd.kind==='forward')distance+=cmd.steps;
  }
  assert.ok(arrived,`${letter} → ${goal.id} must terminate`);
  assert.equal(distance,oracleDistance(start,goal),`${letter} → ${goal.id} must use shortest distance`);
 }
});
