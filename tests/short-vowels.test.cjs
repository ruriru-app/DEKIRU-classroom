const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ctx={};
vm.createContext(ctx);
const file=__dirname+'/../grade34/short-vowels/state.js';
if(fs.existsSync(file))vm.runInContext(fs.readFileSync(file,'utf8'),ctx);
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
