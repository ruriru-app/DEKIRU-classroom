const test=require('node:test'),assert=require('node:assert/strict'),C=require('./print-core.js');
const ids=Array.from({length:13},(_,i)=>'word'+i);
const side={rule:'pooled',total:5,groups:[{ids,count:5}]};
test('every distribution prefix stays balanced and each card has distinct pictures',()=>{
 const batch=C.generate({count:37,front:side,duplex:false});const counts=Object.fromEntries(ids.map(id=>[id,0]));
 for(const card of batch.cards){assert.equal(new Set(card.front).size,5);card.front.forEach(id=>counts[id]++);assert.ok(Math.max(...Object.values(counts))-Math.min(...Object.values(counts))<=1);}
});
test('category quotas on front and back, consecutive numbers and no duplicated pictures',()=>{
 const colors=['red','blue','green','white'],sports=['tennis','soccer','golf','baseball','swimming'];
 const front={rule:'category',groups:[{ids:colors,count:3}]},back={rule:'category',groups:[{ids:sports,count:4}]};
 const batch=C.generate({count:35,front,back,duplex:true});
 batch.cards.forEach((card,i)=>{assert.equal(card.number,i+1);assert.equal(card.front.length,3);assert.equal(new Set(card.front).size,3);assert.equal(card.back.length,4);});
});
test('back positions mirror front numbers including blank last-page slots',()=>{
 const batch=C.generate({count:14,front:side,back:side,duplex:true});
 for(const size of ['nine','business'])for(const flip of ['long','short']){
  const l=C.layout(size),pages=C.pages(batch.cards,size,true,flip);
  pages.front.forEach((front,index)=>front.slots.forEach((card,slot)=>{
   const row=Math.floor(slot/l.cols),col=slot%l.cols,target=flip==='long'?row*l.cols+l.cols-1-col:(l.rows-1-row)*l.cols+col;
   assert.equal(pages.back[index].slots[target]?.number,card?.number);
  }));
  assert.deepEqual(pages.interleaved.map(p=>p.side),['front','back','front','back']);
 }
});
test('uses exact Interview Bingo dimensions and picture-card copy counts',()=>{
 assert.deepEqual(C.layout('nine'),{cols:3,rows:3,w:70,h:99,x:0,y:0});assert.deepEqual(C.layout('business'),{cols:4,rows:3,w:50,h:89,x:5,y:15});
 assert.deepEqual(C.pictureCards(['a','b'],2).map(c=>c.front),[['a'],['a'],['b'],['b']]);
});
test('landscape keeps the same card counts with horizontal card dimensions',()=>{
 assert.deepEqual(C.layout('business','landscape'),{cols:3,rows:4,w:89,h:50,x:15,y:5});
 assert.deepEqual(C.layout('nine','landscape'),{cols:3,rows:3,w:99,h:70,x:0,y:0});
});
test('landscape duplex reflects along the selected physical binding edge',()=>{
 const cards=C.pictureCards(['a','b','c','d','e','f','g','h','i','j','k','l'],1);
 const long=C.pages(cards,'business',true,'long','landscape');
 assert.equal(long.back[0].slots[9].number,1);assert.equal(long.back[0].slots[11].number,3);
 const short=C.pages(cards,'business',true,'short','landscape');
 assert.equal(short.back[0].slots[2].number,1);
});
test('landscape PDF has landscape MediaBox and image placement',()=>{
 const bytes=C.pdf([new Uint8Array([255,216,255,217])],2806,1984,'landscape'),source=new TextDecoder().decode(bytes);
 assert.ok(source.includes('/MediaBox [0 0 841.88976 595.27559]'));
 assert.ok(source.includes('841.88976 0 0 595.27559 0 0 cm'));
});
test('rejects too few candidates and invalid requested quantities',()=>{
 assert.throws(()=>C.generate({count:36,front:{rule:'pooled',total:6,groups:[{ids:['a'],count:1}]}}));
 assert.throws(()=>C.generate({count:0,front:side}));assert.throws(()=>C.pictureCards([],1));
});

