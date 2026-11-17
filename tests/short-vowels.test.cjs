const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const file=__dirname+'/../grade34/short-vowels/state.js';
const source=fs.readFileSync(file,'utf8');
function loadState(config) {
  const context={PhonicsLesson:config};
  vm.runInNewContext(source,context);
  return context.Phonics;
}
const ctx={Phonics:loadState()};
test('learning state is available',()=>assert.ok(ctx.Phonics));
test('letter mode reveals exactly one letter, stops after complete word',()=>{
 const p=ctx.Phonics;let s=p.start('letters',0);
 assert.equal(p.visible(s).text,'');
 for(const expected of ['c','ca','cat','cat']){s=p.advance(s);assert.equal(p.visible(s).text,expected);assert.equal(s.index,0);}
});
test('word-first mode hides then reveals image, never changes word',()=>{
 const p=ctx.Phonics;let s=p.start('guess',4);
 assert.equal(p.visible(s).text,'map');assert.equal(p.visible(s).image,false);
 s=p.advance(s);assert.equal(p.visible(s).image,true);
 s=p.advance(s);assert.equal(s.index,4);
});
test('navigation resets reveal and stops at list boundaries',()=>{
 const p=ctx.Phonics;let s=p.advance(p.start('letters',0));
 s=p.move(s,1);assert.equal(s.index,1);assert.equal(p.visible(s).text,'');
 assert.equal(p.move(p.start('cards',0),-1).index,0);
 assert.equal(p.move(p.start('cards',24),1).index,24);
});
test('switching modes resets hidden information',()=>{
 const p=ctx.Phonics;const s=p.changeMode(p.start('cards',3),'guess');
 assert.equal(s.index,3);assert.equal(p.visible(s).image,false);
 assert.equal(p.visible(p.changeMode(s,'letters')).text,'');
});
test('all 25 approved words occur exactly once',()=>{
 assert.equal(ctx.Phonics.words.join(','),'cat,hat,bag,cap,map,bed,pen,red,leg,ten,pig,pin,big,six,sit,dog,mom,mop,top,hot,sun,cup,bus,bug,run');
});
test('random order covers all words once and navigation follows that order',()=>{
 const p=ctx.Phonics,order=p.makeOrder(true,()=>0.25);
 assert.equal(new Set(order).size,25);assert.equal(order.length,25);
 assert.notEqual(order.join(','),p.makeOrder().join(','));
 let s=p.start('letters',order[0]);
 for(let i=0;i<25;i++){assert.equal(s.index,order[i]);s=p.move(p.advance(s),1,order);assert.equal(s.revealed,0);}
 assert.equal(s.index,order[24]);assert.equal(p.move(s,-1,order).index,order[23]);
 assert.equal(p.move(p.start('cards',order[0]),-1,order).index,order[0]);
});

test('explicit slot clicks reveal only the requested letter, and Enter finds the first hidden slot',()=>{
 const p=ctx.Phonics;
 const start=p.start('letters',0);
 assert.deepEqual(Array.from(start.letterIndices),[]);
 let s=p.advance(start,2);
 assert.equal(p.visible(s).text,'t');
 assert.deepEqual(Array.from(s.letterIndices),[2]);
 for(const repeatedOrInvalidSlot of [2,-1,3,1.5]) {
  s=p.advance(s,repeatedOrInvalidSlot);
  assert.equal(s.revealed,1);
  assert.equal(p.visible(s).text,'t');
 }
 s=p.advance(s);
 assert.deepEqual(Array.from(s.letterIndices),[0,2]);
 assert.equal(p.visible(s).text,'ct');
 s=p.advance(s);
 assert.deepEqual(Array.from(s.letterIndices),[0,1,2]);
 assert.equal(p.visible(s).text,'cat');
 assert.equal(p.advance(s).revealed,3);
 assert.deepEqual(Array.from(start.letterIndices),[]);
});

test('a configured Silent E lesson keeps uppercase and supports four and five slots',()=>{
 const p=loadState({words:['Pete','flute']});
 assert.deepEqual(Array.from(p.words),['Pete','flute']);
 const pete=p.advance(p.start('letters',0));
 assert.equal(p.visible(pete).text,'P');
 let flute=p.move(pete,1);
 assert.deepEqual(Array.from(flute.letterIndices),[]);
 flute=p.advance(flute,4);
 for(const expected of ['e','fe','fle','flue','flute']) {
  assert.equal(p.visible(flute).text,expected);
  flute=p.advance(flute);
 }
 assert.equal(flute.revealed,5);
 assert.deepEqual(Array.from(p.changeMode(flute,'guess').letterIndices),[]);
 assert.equal(p.visible(p.advance(p.start('guess',1))).image,true);
});
