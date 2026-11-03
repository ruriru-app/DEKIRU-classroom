const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function api(){const context={};vm.createContext(context);const path=__dirname+'/typing-sounds.js';if(fs.existsSync(path))vm.runInContext(fs.readFileSync(path,'utf8'),context);assert.ok(context.TypingSounds,'fixed sound-set feature exists');return context.TypingSounds;}
test('seven themes resolve to their own key and Enter assets',()=>{
 const S=api();assert.equal(S.sets.length,7);
 for(const set of S.sets){assert.equal(set.key,'typing-sounds/'+set.id+'-key.mp3');assert.equal(set.enter,'typing-sounds/'+set.id+'-enter.mp3');for(const file of [set.key,set.enter])assert.ok(fs.statSync(__dirname+'/'+file).size>1000);}
});
test('sound-set preferences persist together, support silence, and reject invalid values',()=>{
 const S=api(),saved=new Map(),storage={getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)};
 const sound=S.create({storage});sound.configure({set:'sword',volume:.2});
 assert.equal(S.create({storage}).settings().set,'sword');assert.equal(S.create({storage}).settings().volume,.2);
 sound.configure({set:'none',volume:0});assert.equal(sound.settings().set,'none');assert.equal(sound.play('enter'),false);
 sound.configure({set:'../bad',volume:NaN});assert.equal(sound.settings().set,'none');assert.equal(sound.settings().volume,0);
});
test('prepared key and Enter play their paired buffers without blocking each other',async()=>{
 const S=api(),requested=[],played=[];
 class AudioContext{
  constructor(){this.state='running';this.currentTime=10;this.destination={};}
  createGain(){return {gain:{value:1},connect(){}};}
  async decodeAudioData(data){return {name:data,duration:.3};}
  createBufferSource(){const source={connect(){},disconnect(){},stop(){},start(time){played.push({name:source.buffer.name,time});}};return source;}
 }
 const sound=S.create({AudioContext,fetch:async path=>{requested.push(path);return {ok:true,arrayBuffer:async()=>path};}});
 sound.configure({set:'sf',volume:.3});assert.equal(await sound.prepare(),true);
 sound.play('key');sound.play('enter');assert.deepEqual(played,[{name:'typing-sounds/sf-key.mp3',time:10},{name:'typing-sounds/sf-enter.mp3',time:10}]);
 assert.equal(await sound.preview(),true);assert.equal(played.at(-1).name,'typing-sounds/sf-enter.mp3');assert.equal(played.at(-1).time,10.45);
 assert.equal(requested.length,2);
});
test('unavailable audio files fail quietly without breaking typing',async()=>{
 const S=api();class AudioContext{constructor(){this.state='running';}createGain(){return {gain:{value:1},connect(){}};}}
 const sound=S.create({AudioContext,fetch:async()=>({ok:false})});assert.equal(await sound.prepare(),false);assert.equal(sound.play('key'),false);
});
