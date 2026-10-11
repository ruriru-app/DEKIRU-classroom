// Catch missing conditional object slots, stale objects leaking into speech, and unsafe restores.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{fileURLToPath}=require('node:url');
const {unitPreset}=require('./support.cjs');
function lesson(){const {w,catalog}=unitPreset();return {w,catalog,p:w.SpeechPresets.get('nh6',6,catalog)};}
function act(w,p,s,a){const r=w.SpeechModel.reduce(p,s,a);assert.equal(r.ok,true,r.error);return r.state;}
function select(w,p,s,slotId,id){return act(w,p,s,{type:'select',slotId,selection:{kind:'choice',id}});}
const line=(w,p,s,step='action')=>w.SpeechModel.stepSentences(p,s,step)[0].text;
test('3R shows an optional object only for the selected verb and composes concrete sentences',()=>{
 const {w,p}=lesson();let s=act(w,p,w.SpeechModel.initialState(p),{type:'ui',patch:{stepId:'action'}});
 assert.deepEqual(Array.from(w.SpeechModel.editableSlots(p,s,'action'),x=>x.id),['action']);
 s=select(w,p,s,'action','living_008');
 assert.deepEqual(Array.from(w.SpeechModel.editableSlots(p,s,'action'),x=>x.id),['action','actionTarget']);
 assert.equal(line(w,p,s),'We can reduce.');
 const empty=w.SpeechModel.stepSentences(p,s,'action',{includeEmptySlots:true})[0];
 assert.equal(empty.tokens.at(-1).placeholder,true);assert.equal(empty.text,'We can reduce.');assert.deepEqual(Array.from(empty.parts),['We','can','reduce']);
 assert.equal(w.SpeechModel.choicesFor(p,s,'actionTarget').some(x=>x.id==='living_026'),false);
 s=select(w,p,s,'actionTarget','living_005');assert.equal(line(w,p,s),'We can reduce plastic.');
 s=select(w,p,s,'action','living_009');assert.equal(line(w,p,s),'We can reuse.');
 s=select(w,p,s,'actionTarget','item_001');assert.equal(line(w,p,s),'We can reuse bags.');
 s=select(w,p,s,'action','living_010');assert.equal(line(w,p,s),'We can recycle.');
 s=select(w,p,s,'actionTarget','living_026');assert.equal(line(w,p,s),'We can recycle glass bottles.');
 assert.equal(w.SpeechModel.stepSentences(p,s,'action')[0].tokens.at(-1).cardId,'living_026');
 s=act(w,p,s,{type:'clear-slot',slotId:'actionTarget'});assert.equal(line(w,p,s),'We can recycle.');
 s=select(w,p,s,'actionTarget','item_028');assert.equal(line(w,p,s),'We can recycle boxes.');
 s=select(w,p,s,'action','living_020');assert.equal(line(w,p,s),'We can support conservation groups.');
 assert.deepEqual(Array.from(w.SpeechModel.editableSlots(p,s,'action'),x=>x.id),['action']);
 assert.equal(w.SpeechModel.reduce(p,s,{type:'select',slotId:'actionTarget',selection:{kind:'choice',id:'living_026'}}).ok,false);
 assert.equal(w.SpeechModel.reduce(p,s,{type:'clear-slot',slotId:'action'}).ok,false,'Required verb cannot be cleared');
});
test('independent 3R sentences restore custom objects, edits and empty optional slots without losing old data',()=>{
 const {w,p}=lesson();let s=act(w,p,w.SpeechModel.initialState(p),{type:'ui',patch:{stepId:'action'}});
 s=select(w,p,s,'action','living_010');s=select(w,p,s,'actionTarget','living_026');
 s=act(w,p,s,{type:'optional',stepId:'action-too',enabled:true});s=act(w,p,s,{type:'ui',patch:{stepId:'action-too'}});
 s=select(w,p,s,'action2','living_009');s=act(w,p,s,{type:'add-word',slotId:'actionTarget2',id:'my-jars',text:'jarss'});
 s=act(w,p,s,{type:'edit-word',slotId:'actionTarget2',id:'my-jars',text:'jars'});
 assert.equal(line(w,p,s),'We can recycle glass bottles.');assert.equal(line(w,p,s,'action-too'),'We can reuse jars.');
 const restored=w.SpeechModel.reconcile(p,JSON.parse(JSON.stringify(s)));assert.deepEqual(Array.from(restored.warnings),[]);
 assert.equal(line(w,p,restored.state),'We can recycle glass bottles.');assert.equal(line(w,p,restored.state,'action-too'),'We can reuse jars.');
 s=select(w,p,s,'action2','living_008');assert.equal(line(w,p,s,'action-too'),'We can reduce.');
 const blank=w.SpeechModel.reconcile(p,JSON.parse(JSON.stringify(s)));assert.deepEqual(Array.from(blank.warnings),[]);
 const old=JSON.parse(JSON.stringify(s));delete old.slotValues.actionTarget;delete old.slotValues.actionTarget2;
 assert.deepEqual(Array.from(w.SpeechModel.reconcile(p,old).warnings),[],'Old saved speeches survive new optional slots');
 s=act(w,p,s,{type:'reset-step',stepId:'action-too'});assert.equal(line(w,p,s,'action-too'),'We can use eco-friendly bags.');assert.equal(line(w,p,s),'We can recycle glass bottles.');
});
test('glass bottles is a real Plus picture and incompatible objects cannot be selected',()=>{
 const {w,p,catalog}=lesson(),card=w.DEKIRU_DATA.cards.find(x=>x.id==='living_026');
 assert.ok(card,'The new Plus card must exist');assert.equal(card.english,'glass bottles');assert.equal(card.displayGroup,'plus');
 const picture=catalog.card('living_026');assert.ok(fs.existsSync(fileURLToPath(picture.imageUrl)),'Glass bottles must resolve to a local real image');
 assert.ok(fs.existsSync(fileURLToPath(catalog.card('clothes_000').imageUrl)),'The reuse clothes category must resolve to a real image too');
 let s=act(w,p,w.SpeechModel.initialState(p),{type:'ui',patch:{stepId:'action'}});s=select(w,p,s,'action','living_008');
 assert.equal(w.SpeechModel.reduce(p,s,{type:'select',slotId:'actionTarget',selection:{kind:'choice',id:'living_026'}}).ok,false);
});
