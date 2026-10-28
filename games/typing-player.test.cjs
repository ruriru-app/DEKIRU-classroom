const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),C=require('./typing-core.js');
// Run the real player; only the browser DOM and speech engine are replaced.
function player(first='cat'){
 const nodes=new Map(),spoken=[];
 const node=()=>({hidden:false,value:'',textContent:'',disabled:false,children:[],attrs:{},classList:{add(){},remove(){},toggle(){}},setAttribute(k,v){this.attrs[k]=v;},removeAttribute(){},replaceChildren(){this.children=[];},append(x){this.children.push(x);},focus(){}});
 const get=id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);};
 const synthesis={cancel(){},speak(u){spoken.push(u.text);}};
 class Utterance{constructor(text){this.text=text;}}
 const context={TypingCore:C,document:{getElementById:get,createElement:node,addEventListener(){},hidden:false},window:{speechSynthesis:synthesis,SpeechSynthesisUtterance:Utterance,addEventListener(){}},speechSynthesis:synthesis,SpeechSynthesisUtterance:Utterance,location:{hash:'#d=test',origin:'https://example.test'},URL,URLSearchParams,ShareCodec:{decodeJson:()=>({version:1,type:'english-typing',title:'Test',entries:[{english:first},{english:'dog'}]})}};
 vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('./typing-player.js'),'utf8'),context);
 return {get,spoken,submit(value){get('answer').value=value;get('answer-form').onsubmit({preventDefault(){}});}};
}
test('correct first answer immediately opens next problem without previous attempt',()=>{
 const p=player();p.submit('cat');
 assert.equal(p.get('progress').textContent,'2 / 2問');
 assert.equal(p.get('model').textContent,'dog');
 assert.equal(p.get('previous-attempt').hidden,true);
 assert.equal(p.get('answer').value,'');
 p.submit('dog');assert.equal(p.get('complete').hidden,false);
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
