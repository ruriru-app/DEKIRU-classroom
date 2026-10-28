const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),C=require('./typing-core.js');
// Run the real player; only the browser DOM and speech engine are replaced.
function player(first='cat',autoStart=true,storage=new Map()){
 const nodes=new Map(),spoken=[],utterances=[];let now=1000;
 const node=()=>({hidden:false,value:'',textContent:'',disabled:false,children:[],attrs:{},classList:{add(){},remove(){},toggle(){}},setAttribute(k,v){this.attrs[k]=v;},removeAttribute(){},replaceChildren(){this.children=[];},append(x){this.children.push(x);},focus(){}});
 const get=id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);};
 const synthesis={cancel(){},speak(u){spoken.push(u.text);utterances.push(u);}};
 class Utterance{constructor(text){this.text=text;}}
 const context={localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},TypingCore:C,Date:{now:()=>now},setInterval:()=>1,clearInterval(){},setTimeout,clearTimeout,document:{getElementById:get,createElement:node,addEventListener(){},hidden:false},window:{speechSynthesis:synthesis,SpeechSynthesisUtterance:Utterance,addEventListener(){}},speechSynthesis:synthesis,SpeechSynthesisUtterance:Utterance,location:{hash:'#d=test',search:'?book=nh6&unit=6',origin:'https://example.test'},URL,URLSearchParams,ShareCodec:{decodeJson:()=>({version:1,type:'english-typing',title:'Test',entries:[{english:first,japanese:'ねこ'},{english:'dog'}]})}};
 vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('./typing-player.js'),'utf8'),context);
 if(autoStart&&get('start').onclick)get('start').onclick();
 return {get,spoken,utterances,advanceTime(ms){now+=ms;},submit(value){get('answer').value=value;get('answer-form').onsubmit({preventDefault(){}});}};
}
test('correct first answer immediately opens next problem without previous attempt',()=>{
 const p=player();p.submit('cat');
 assert.equal(p.get('progress').textContent,'2 / 2問');
 assert.equal(p.get('model').textContent,'dog');
 assert.equal(p.get('previous-attempt').hidden,true);
 assert.equal(p.get('answer').value,'');
 p.submit('dog');assert.equal(p.get('complete').hidden,false);
});
test('setup waits for start and Normal hides spelling; waiting time is not timed',()=>{
 const p=player('cat',false);assert.equal(p.get('practice').hidden,true);assert.deepEqual(p.spoken,[]);
 p.advanceTime(60000);p.get('mode-normal').onclick();p.get('start').onclick();
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
 p.get('restart').onclick();p.submit('cat');p.submit('dog');
 assert.match(p.get('result-stats').textContent,/2 \/ 2問/);
 assert.match(p.get('result-stats').textContent,/0分00\.00秒/);
});
test('URL context is displayed without guessing grade and unit',()=>{
 const p=player();assert.equal(p.get('unit-label').textContent,'６年生Unit6');
});
test('Japanese speech and speed settings do not change English answer checking',()=>{
 const p=player();p.get('speech-language').value='ja-JP';p.get('speech-language').onchange();
 assert.equal(p.utterances.at(-1).lang,'ja-JP');assert.equal(p.spoken.at(-1),'ねこ');
 p.get('speech-rate').value='1.2';p.get('speech-rate').onchange();assert.equal(p.utterances.at(-1).rate,1.2);
 p.submit('cat');assert.equal(p.get('progress').textContent,'2 / 2問');
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
test('each new problem speaks automatically',()=>{
 const p=player();assert.deepEqual(p.spoken,['cat']);
 p.submit('cat');assert.deepEqual(p.spoken,['cat','dog']);
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
