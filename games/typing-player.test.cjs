const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),C=require('./typing-core.js');
// Run the real player; only the browser DOM and speech engine are replaced.
function player(first='cat',autoStart=true,storage=new Map()){
 const nodes=new Map(),spoken=[],utterances=[],countdownJobs=new Map();let now=1000,job=0;
 const schedule=(fn,ms)=>{if(ms===1000){const id=++job;countdownJobs.set(id,fn);return id;}return setTimeout(fn,ms);};
 const cancel=id=>{if(countdownJobs.has(id))countdownJobs.delete(id);else clearTimeout(id);};
 const tick=()=>{const item=countdownJobs.entries().next().value;if(item){countdownJobs.delete(item[0]);item[1]();}};
 const countdown=()=>{for(let i=0;i<4&&countdownJobs.size;i++)tick();};
 const node=()=>({hidden:false,value:'',textContent:'',disabled:false,children:[],attrs:{},classList:{add(){},remove(){},toggle(){}},setAttribute(k,v){this.attrs[k]=v;},removeAttribute(){},replaceChildren(){this.children=[];},append(x){this.children.push(x);},focus(){}});
 const get=id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);};
 const synthesis={cancel(){},speak(u){if(u.volume!==0){spoken.push(u.text);utterances.push(u);}}};
 class Utterance{constructor(text){this.text=text;}}
 const mockMath=Object.create(Math);mockMath.random=()=>0;
 const context={Math:mockMath,localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},TypingCore:C,Date:{now:()=>now},setInterval:()=>1,clearInterval(){},setTimeout:schedule,clearTimeout:cancel,document:{getElementById:get,createElement:node,addEventListener(){},hidden:false},window:{speechSynthesis:synthesis,SpeechSynthesisUtterance:Utterance,addEventListener(){}},speechSynthesis:synthesis,SpeechSynthesisUtterance:Utterance,location:{hash:'#d=test',search:'?book=nh6&unit=6',origin:'https://example.test'},URL,URLSearchParams,ShareCodec:{decodeJson:()=>({version:1,type:'english-typing',title:'Test',entries:[{english:first,japanese:'ねこ'},{english:'dog'}]})}};
 vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('./typing-player.js'),'utf8'),context);
 if(autoStart&&get('start').onclick){get('start').onclick();countdown();}
 return {get,spoken,utterances,tick,countdown,advanceTime(ms){now+=ms;},submit(value){get('answer').value=value;get('answer-form').onsubmit({preventDefault(){}});}};
}
test('correct first answer immediately opens next problem without previous attempt',()=>{
 const p=player();p.submit('cat');
 assert.equal(p.get('progress').textContent,'2 / 2問');
 assert.equal(p.get('model').textContent,'dog');
 assert.equal(p.get('previous-attempt').hidden,true);
 assert.equal(p.get('answer').value,'');
 p.submit('dog');assert.equal(p.get('complete').hidden,false);
});
test('Easy shows pasted Japanese even without a picture dictionary card',()=>{
 const p=player();assert.equal(p.get('meaning').hidden,false);assert.equal(p.get('japanese').textContent,'ねこ');assert.equal(p.get('picture').hidden,true);
});
test('Easy prevents a wrong letter before insertion and marks the attempt as not first-pass',()=>{
 const p=player();p.get('answer').value='c';p.get('answer').selectionStart=p.get('answer').selectionEnd=1;
 let prevented=false;
 assert.equal(typeof p.get('answer').onbeforeinput,'function');
 p.get('answer').onbeforeinput({inputType:'insertText',data:'u',isComposing:false,preventDefault(){prevented=true;}});
 assert.equal(prevented,true);assert.equal(p.get('answer').value,'c');
 p.submit('cat');p.submit('dog');assert.match(p.get('result-stats').textContent,/1 \/ 2問/);
});
test('Easy allows the correct next letter and deletion; invalid paste is reverted',()=>{
 const p=player(),input=p.get('answer');input.value='c';input.oninput({isComposing:false});
 input.selectionStart=input.selectionEnd=1;let prevented=false;
 input.onbeforeinput({inputType:'insertText',data:'a',preventDefault(){prevented=true;}});
 assert.equal(prevented,false);
 input.value='cu';input.oninput({isComposing:false});assert.equal(input.value,'c');
 input.value='';input.oninput({isComposing:false});assert.equal(input.value,'');
});
test('Normal retains unrestricted typing',()=>{
 const p=player('cat',false);p.get('mode-normal').onclick();p.get('start').onclick();p.countdown();
 const input=p.get('answer');input.value='wrong';input.oninput({isComposing:false});assert.equal(input.value,'wrong');
});
test('setup audio controls are visible and selected language speed and word mode survive Start',()=>{
 const p=player('I like cats.',false);
 assert.equal(p.get('audio-settings').hidden,false);
 p.get('speech-language').value='ja-JP';p.get('speech-language').onchange();
 p.get('speech-rate').value='1.2';p.get('speech-rate').onchange();p.get('word-toggle').onclick();
 assert.deepEqual(p.spoken,[]);
 p.get('start').onclick();p.countdown();
 assert.equal(p.utterances.at(-1).lang,'ja-JP');assert.equal(p.utterances.at(-1).rate,1.2);
 assert.equal(p.get('word-toggle').attrs['aria-pressed'],'true');
});
test('muting on setup remains muted after Start',()=>{
 const p=player('cat',false);p.get('sound-toggle').onclick();p.get('start').onclick();p.countdown();
 assert.deepEqual(p.spoken,[]);assert.equal(p.get('sound-toggle').attrs['aria-pressed'],'false');
});
test('setup waits for start and Normal hides spelling; waiting time is not timed',()=>{
 const p=player('cat',false);assert.equal(p.get('practice').hidden,true);assert.deepEqual(p.spoken,[]);
 p.advanceTime(60000);p.get('mode-normal').onclick();p.get('start').onclick();p.countdown();
 assert.match(p.get('model').textContent,/綴りを隠しています/);
 p.advanceTime(2000);p.submit('cat');p.submit('dog');
 assert.match(p.get('result-stats').textContent,/0分02\.00秒/);
});
test('Hard is unavailable when Japanese is missing rather than silently using English',()=>{
 const p=player('cat',false);p.get('mode-hard').onclick();assert.equal(p.get('start').disabled,true);
});
test('best time persists per mode and skipped runs do not replace it',()=>{
 const storage=new Map(),p=player('cat',true,storage);p.advanceTime(10000);p.submit('cat');p.submit('dog');
 assert.equal(p.get('new-record').hidden,false);
 const q=player('cat',true,storage);q.advanceTime(12000);q.submit('cat');q.submit('dog');assert.equal(q.get('new-record').hidden,true);
 const v=player('cat',true,storage);v.advanceTime(5000);v.submit('cat');v.submit('dog');assert.equal(v.get('new-record').hidden,false);
 const skip=player('cat',true,storage);skip.get('skip').onclick();skip.submit('dog');assert.equal(skip.get('new-record').hidden,true);
});
test('first pass count excludes corrected answers and shows elapsed time',()=>{
 const p=player();p.submit('cut');p.submit('cat');p.advanceTime(65000);p.submit('dog');
 assert.match(p.get('result-stats').textContent,/1 \/ 2問/);
 assert.match(p.get('result-stats').textContent,/1分05\.00秒/);
 p.get('restart').onclick();p.countdown();p.submit('cat');p.submit('dog');
 assert.match(p.get('result-stats').textContent,/2 \/ 2問/);
 assert.match(p.get('result-stats').textContent,/0分00\.00秒/);
});
test('countdown precedes timing and Normal now shows Japanese',()=>{
 const p=player('cat',false);p.get('mode-normal').onclick();p.get('start').onclick();
 assert.equal(p.get('countdown-value').textContent,'3');assert.equal(p.get('practice').hidden,true);
 p.advanceTime(3000);p.countdown();assert.equal(p.get('meaning').hidden,false);
 p.advanceTime(2000);p.submit('cat');p.submit('dog');assert.match(p.get('result-stats').textContent,/0分02\.00秒/);
});
test('random order changes the queue without losing questions',()=>{
 const p=player('cat',false);p.get('question-order').value='random';p.get('start').onclick();p.countdown();
 assert.equal(p.get('model').textContent,'dog');p.submit('dog');assert.equal(p.get('model').textContent,'cat');p.submit('cat');assert.equal(p.get('complete').hidden,false);
});
test('URL context is displayed without guessing grade and unit',()=>{
 const p=player();assert.equal(p.get('unit-label').textContent,'６年生Unit6');
});
test('Japanese speech and speed settings do not change English answer checking',async()=>{
 const p=player();p.get('speech-language').value='ja-JP';p.get('speech-language').onchange();
 assert.equal(p.utterances.at(-1).lang,'ja-JP');assert.equal(p.spoken.at(-1),'ねこ');
 p.get('speech-rate').value='1.2';p.get('speech-rate').onchange();assert.equal(p.utterances.at(-1).rate,1.2);
 p.submit('cat');assert.equal(p.get('progress').textContent,'2 / 2問');
 await new Promise(resolve=>setTimeout(resolve,680));
 assert.match(p.get('feedback').textContent,/日本語が登録されていません/);
});
test('word by word speech starts with the first word rather than the whole sentence',()=>{
 const p=player('I like cats.');p.get('word-toggle').onclick();
 assert.equal(p.spoken.at(-1),'I');
 assert.equal(p.get('word-toggle').attrs['aria-pressed'],'true');
});
test('wrong answer stays for comparison; corrected answer advances',()=>{
 const p=player();p.submit('cut');
 assert.equal(p.get('progress').textContent,'1 / 2問');
 assert.equal(p.get('previous-attempt').hidden,false);
 assert.equal(p.get('previous').children.find(x=>x.className==='error').textContent,'u');
 p.submit('cat');assert.equal(p.get('progress').textContent,'2 / 2問');
});
test('next problem speaks only after the correct chime gap',async()=>{
 const p=player();assert.deepEqual(p.spoken,['cat']);
 p.submit('cat');assert.deepEqual(p.spoken,['cat']);
 await new Promise(resolve=>setTimeout(resolve,680));
 assert.deepEqual(p.spoken,['cat','dog']);
});
test('muting during the correct chime gap cancels queued pronunciation',async()=>{
 const p=player();p.submit('cat');p.get('sound-toggle').onclick();
 await new Promise(resolve=>setTimeout(resolve,680));
 assert.deepEqual(p.spoken,['cat']);
});
test('speaker off silences automatic and manual speech; on reads current word',()=>{
 const p=player();
 assert.equal(typeof p.get('sound-toggle').onclick,'function');
 p.get('sound-toggle').onclick();p.get('listen').onclick();p.submit('cat');
 assert.deepEqual(p.spoken,['cat']);
 assert.equal(p.get('sound-toggle').attrs['aria-pressed'],'false');
 p.get('sound-toggle').onclick();assert.deepEqual(p.spoken,['cat','dog']);
});
test('extra letter is explained without inserting symbols into model spelling',()=>{
 const p=player('shrimp');p.submit('shrinmp');
 assert.equal(p.get('model').children.map(x=>x.textContent).join(''),'shrimp');
 assert.match(p.get('error-detail').textContent,/5文字目の「n」が余分です/);
});
test('hidden model feedback does not reveal missing correct letters',()=>{
 const p=player();p.submit('ct');assert.match(p.get('error-detail').textContent,/「a」/);p.get('toggle-model').onclick();
 assert.equal(p.get('error-detail').textContent.includes('「a」'),false);
});
