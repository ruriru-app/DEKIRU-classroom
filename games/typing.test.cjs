const assert=require('node:assert/strict'),test=require('node:test'),vm=require('node:vm'),fs=require('node:fs');
const C=require('./typing-core.js'),S=require('./typing-store.js');
const sample={version:1,type:'english-typing',id:'typing-test',title:'練習',entries:[{japanese:'りんご',english:'apple'}],assignedUnits:['nh5:5','nh6:5']};
test('paste: two columns and alternating lines',()=>{
 assert.deepEqual(C.parsePaste('日本語\t英語\nりんご\tapple'),sample.entries);
 assert.deepEqual(C.parsePaste('りんご\napple'),sample.entries);
 assert.throws(()=>C.parsePaste('りんご'));
});
test('exact spelling, punctuation and case',()=>{
 assert.equal(C.compare('apple','apple').correct,true);
 assert.equal(C.compare('Apple.','apple').correct,false);
 assert.equal(C.compare("It’s red.","It's red.").correct,true);
});
test('replacement, missing and extra letters align',()=>{
 assert.deepEqual(C.compare('cat','cut').edits.filter(x=>x.kind!=='equal').map(x=>[x.kind,x.expected,x.actual]),[['replace','a','u']]);
 assert.deepEqual(C.compare('apple','aple').edits.filter(x=>x.kind!=='equal').map(x=>[x.kind,x.expected]),[['missing','p']]);
 assert.deepEqual(C.compare('cat','cart').edits.filter(x=>x.kind!=='equal').map(x=>[x.kind,x.actual]),[['extra','r']]);
});
test('sentence feedback preserves complete typed attempt',()=>{
 const d=C.compare('I like apples.','I lik apples.');
 assert.equal(d.edits.map(x=>x.actual).join(''),'I lik apples.');
 assert.equal(d.edits.filter(x=>x.kind==='missing')[0].expected,'e');
});
test('storage and assignments round trip; corrupt data is preserved',()=>{
 const values=new Map(),storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)},store=S.create(storage);
 store.save(sample);assert.deepEqual(store.list()[0].assignedUnits,['nh5:5','nh6:5']);
 values.set(S.KEY,'broken');assert.throws(()=>store.save(sample));assert.equal(values.get(S.KEY),'broken');
});
test('validation rejects empty, oversized and invalid units',()=>{
 assert.throws(()=>C.activity({...sample,entries:[]}));
 assert.throws(()=>C.preset({...sample,assignedUnits:['nh5:9']}));
 assert.throws(()=>C.entry({english:'a'.repeat(241)}));
});
test('distributed snapshot round trips without teacher storage',()=>{
 const context={window:{},TextEncoder,TextDecoder,Uint8Array,btoa,atob};vm.createContext(context);
 vm.runInContext(fs.readFileSync(require.resolve('../grade34/share-codec.js'),'utf8'),context);
 const codec=context.window.ShareCodec,activity=C.activity(sample);
 assert.deepEqual(JSON.parse(JSON.stringify(codec.decodeJson(codec.encodeJson(activity)))),activity);
 assert.equal('assignedUnits' in activity,false);
});
