const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{pathToFileURL,fileURLToPath}=require('node:url');
const {unitPreset}=require('./support.cjs');

// The ordinary pronunciation page does not load the speech picture overrides.
for(let n=16;n<=26;n++)test('ordinary dictionary image loads for living_'+String(n).padStart(3,'0'),()=>{
 const root=path.resolve(__dirname,'../..'),w={};w.window=w;vm.createContext(w);
 for(const file of ['grade34/data/app-data.js','grade34/card-set.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),w);
 const id='living_'+String(n).padStart(3,'0'),card=w.DEKIRU_DATA.cards.find(c=>c.id===id);
 const image=new URL(w.CardSet.source(card),pathToFileURL(path.join(root,'grade56')+'/'));
 assert.ok(fs.existsSync(fileURLToPath(image)),'Missing ordinary dictionary image: '+image.href);
 const bytes=fs.readFileSync(fileURLToPath(image));assert.equal(bytes.readUInt32BE(0),0x89504e47);
 assert.deepEqual(bytes,fs.readFileSync(path.join(root,'grade34/assets/cards/living_things',id+'.png')),'Speech and pronunciation must use the same approved artwork');
});

test('refuse to buy is used in both actions and older saved choices keep their picture',()=>{
 const {w,catalog}=unitPreset(),p=w.SpeechPresets.get('nh6',6,catalog);
 let saved=w.SpeechModel.initialState(p);saved.optionalEnabled['action-too']=true;
 // Actual pre-change saved choices, identified by the unchanged dictionary ID.
 for(const id of ['action','action2'])saved.slotValues[id]={kind:'choice',id:'living_022',label:'avoid buying wildlife products',insertText:'avoid buying wildlife products',cardRef:'living_022'};
 const {state,warnings}=w.SpeechModel.reconcile(p,JSON.parse(JSON.stringify(saved)));
 assert.deepEqual(Array.from(warnings),[]);
 for(const step of ['action','action-too']){
  const sentence=w.SpeechModel.stepSentences(p,state,step)[0];
  assert.equal(sentence.text,'We can refuse to buy wildlife products.');
  assert.deepEqual(Array.from(sentence.parts),['We','can','refuse to buy wildlife products']);
  assert.equal(sentence.tokens[2].cardId,'living_022');
  assert.ok(fs.existsSync(fileURLToPath(sentence.tokens[2].imageUrl)));
 }
 const card=w.DEKIRU_DATA.cards.find(c=>c.id==='living_022');
 assert.equal(card.english,'refuse to buy wildlife products');assert.equal(card.speech,'refuse to buy wildlife products');
});
