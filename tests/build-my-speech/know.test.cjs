// Catch text-only know cards and older saved questions losing their new picture.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{fileURLToPath}=require('node:url');
const {unitPreset}=require('./support.cjs');
test('know is a pictured Plus choice and old text-only questions restore the picture',()=>{
 const {w,catalog}=unitPreset(),p=w.SpeechPresets.get('nh6',6,catalog);
 const option=p.choiceSets.questionVerbs.find(c=>c.id==='know');
 assert.ok(option?.imageUrl,'Know must have a real picture, not just a word');
 assert.equal(option.cardRef,'action6_052');
 assert.ok(fs.existsSync(fileURLToPath(option.imageUrl)),'The knowledge illustration must resolve locally');
 const card=w.DEKIRU_DATA.cards.find(c=>c.id==='action6_052');
 assert.equal(card.english,'know');assert.equal(card.displayGroup,'plus');
 let saved=w.SpeechModel.initialState(p);
 saved.optionalEnabled.question=true;saved.ui.stepId='question';saved.ui.slotId='questionVerb';
 // This is the actual shape of a question saved before know had an image.
 saved.slotValues.questionVerb={kind:'choice',id:'know',label:'know',insertText:'know',category:'質問する動詞'};
 const restored=w.SpeechModel.reconcile(p,JSON.parse(JSON.stringify(saved)));
 assert.deepEqual(Array.from(restored.warnings),[]);
 const question=w.SpeechModel.stepSentences(p,restored.state,'question')[0];
 assert.equal(question.text,'Do you know orangutans?');
 assert.deepEqual(Array.from(question.parts),['Do','you','know','orangutans']);
 assert.equal(question.tokens[2].cardId,'action6_052');
 assert.equal(question.tokens[2].imageUrl,option.imageUrl);
 const like=w.SpeechModel.reduce(p,restored.state,{type:'select',slotId:'questionVerb',selection:{kind:'choice',id:'like'}});
 assert.equal(like.ok,true);assert.equal(w.SpeechModel.stepSentences(p,like.state,'question')[0].text,'Do you like orangutans?');
 assert.equal(w.SpeechModel.stepSentences(p,like.state,'question')[0].tokens[2].cardId,'action5_002');
});
test('ordinary dictionary consumers can load know without the speech-only image override',()=>{
 const path=require('node:path'),{pathToFileURL}=require('node:url');
 const {w}=unitPreset(),card=w.DEKIRU_DATA.cards.find(c=>c.id==='action6_052');
 const ordinary={...card};delete ordinary.pictureUrl;
 const image=new URL(w.CardSet.source(ordinary),pathToFileURL(path.resolve(__dirname,'../../grade56')+'/'));
 assert.ok(fs.existsSync(fileURLToPath(image)),'The normal pronunciation and card library path must load the new image too');
 const bytes=fs.readFileSync(fileURLToPath(image));assert.equal(bytes.readUInt32BE(0),0x89504e47);
});
