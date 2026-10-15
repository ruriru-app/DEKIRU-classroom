const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const test=require('node:test'),assert=require('node:assert/strict'),M=require('../games/ruriru-town-level3-model.js');
const tick=()=>new Promise(resolve=>setTimeout(resolve,5));
function fixture(){
 const nodes=new Map(),all=[],documentListeners={},windowListeners={};
 class Element{
  constructor(id=''){Object.assign(this,{id,tagName:'DIV',className:'',dataset:{},style:{},children:[],attrs:{},open:false,hidden:false,disabled:false,returnValue:'',textContent:'',listeners:{}});all.push(this);}
  get classList(){const e=this;return {toggle(c,on){const s=new Set(e.className.split(' ').filter(Boolean));on?s.add(c):s.delete(c);e.className=[...s].join(' ');},add(c){this.toggle(c,true);},remove(c){this.toggle(c,false);}};}
  setAttribute(k,v){this.attrs[k]=v;}append(...a){this.children.push(...a);}addEventListener(k,v){this.listeners[k]=v;}
  showModal(){this.open=true;}pause(){}play(){return Promise.resolve();}
 }
 for(const id of ['reset','placeSound','turnSound','walkSound','confirmDialog','feedback','record','recordLabel','execute','undo','showHint','readHint','voiceState','hintSentence','recognized','sideArrow','success','char','sprite','location','selectedGoal','confirmTitle','confirmNote','successText','markers','starts','destinations','facilityList'])nodes.set(id,new Element(id));
 const doc={hidden:false,getElementById:id=>nodes.get(id),createElement(tag){const e=new Element();e.tagName=tag.toUpperCase();return e;},createTextNode:text=>({textContent:text}),
  querySelectorAll(selector){
   if(selector==='[data-start]')return all.filter(e=>e.dataset.start);
   if(selector==='[data-goal]')return all.filter(e=>e.dataset.goal);
   if(selector==='.facility-target.indicated')return all.filter(e=>e.className.includes('facility-target')&&e.className.includes('indicated'));
   return [];
  },querySelector(selector){const id=selector.match(/data-goal="([^"]+)"/)[1];return all.find(e=>e.className.includes('facility-target')&&e.dataset.goal===id);},addEventListener:(event,fn)=>{documentListeners[event]=fn;}};
 let cancelWait=null,speech;
 class Speech{
  constructor(options){speech=this;this.options=options;this.state='idle';this.supported=true;this.canRead=true;this.reads=[];}
  cancel(){this.state='idle';this.options.onState();return cancelWait||Promise.resolve(true);}
  listen(){if(this.options.canListen()){this.state='listening';this.options.onState();}}
  final(text){this.state='processing';this.options.onTranscript(text,true);this.state='idle';this.options.onState();}
  read(text){this.reads.push(text);return Promise.resolve(true);}
 }
 const win={TownLevel3:M,TownSpeech:Speech,addEventListener:(event,fn)=>{windowListeners[event]=fn;},matchMedia:()=>({matches:true})};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../games/ruriru-town-level3.js'),'utf8'),{window:win,document:doc,Image:class{},setTimeout,clearTimeout,setInterval,clearInterval,cancelAnimationFrame:clearTimeout,requestAnimationFrame:fn=>setTimeout(()=>fn(performance.now()),0),performance});
 const button=(key,value,css)=>all.find(e=>e.tagName==='BUTTON'&&e.dataset[key]===value&&(!css||e.className.includes(css)));
 return {nodes,all,doc,speech,button,windowListeners,setCancel:p=>{cancelWait=p;},confirm(value='yes'){const d=nodes.get('confirmDialog');d.returnValue=value;d.open=false;d.listeners.close();}};
}
test('latest confirmation request wins when microphone shutdown is delayed',async()=>{
 const f=fixture();let end;f.setCancel(new Promise(resolve=>{end=resolve;}));
 f.button('goal','hospital','facility-choice').onclick();f.nodes.get('reset').onclick();end(true);await tick();
 assert.equal(f.nodes.get('confirmTitle').textContent,'はじめから、やり直しますか？');
});
test('page hide or a new start invalidates a pending facility confirmation',async()=>{
 for(const action of ['hide','start']){
  const f=fixture();let end;f.setCancel(new Promise(resolve=>{end=resolve;}));f.button('goal','hospital','facility-choice').onclick();
  if(action==='hide'){f.doc.hidden=true;f.windowListeners.pagehide();}else f.button('start','B').onclick();
  end(true);await tick();assert.equal(f.nodes.get('confirmDialog').open,false,action);
 }
});
test('setup requires both choices; rejected speech reveals no hint until the child asks',async()=>{
 const f=fixture();assert.equal(f.nodes.get('record').disabled,true);f.button('start','A').onclick();assert.equal(f.nodes.get('record').disabled,true);
 f.button('goal','zoo','facility-target').onclick();await tick();f.confirm();assert.equal(f.nodes.get('record').disabled,false);assert.equal(f.nodes.get('showHint').disabled,true);
 f.nodes.get('record').onclick();f.speech.final('hello');
 assert.equal(f.nodes.get('recognized').textContent,'hello');assert.equal(f.nodes.get('execute').disabled,true);assert.equal(f.nodes.get('showHint').disabled,false);assert.equal(f.nodes.get('hintSentence').textContent,'まずは自分で話してみよう。');
 f.nodes.get('showHint').onclick();assert.equal(f.nodes.get('hintSentence').textContent,M.nextHint(M.starts.A,'zoo'));
 f.nodes.get('readHint').onclick();assert.deepEqual(f.speech.reads,[M.nextHint(M.starts.A,'zoo')]);
});
test('valid detours require explicit execution; impossible movement does not become a language error',async()=>{
 const f=fixture();f.button('start','A').onclick();f.button('goal','zoo','facility-choice').onclick();await tick();f.confirm();
 const initialTop=f.nodes.get('char').style.top,initialSprite=f.nodes.get('sprite').src;
 f.speech.final('Turn right.');assert.equal(f.nodes.get('execute').disabled,false);assert.equal(f.nodes.get('sprite').src,initialSprite,'recognition alone never executes');
 f.nodes.get('execute').onclick();await tick();assert.ok(f.nodes.get('sprite').src.includes('west-0.png'));assert.equal(f.nodes.get('char').style.top,initialTop);
 f.speech.final('Go straight for one block.');assert.equal(f.nodes.get('execute').disabled,false);f.nodes.get('execute').onclick();await tick();
 assert.ok(f.nodes.get('feedback').textContent.includes('英文は伝わったよ'));assert.equal(f.nodes.get('showHint').disabled,true);
});
test('a full spoken route clears each hint, arrives by relative side and supports undo and reset',async()=>{
 const f=fixture();f.button('start','A').onclick();f.button('goal','zoo','facility-choice').onclick();await tick();f.confirm();
 let state={...M.starts.A};
 for(let i=0;i<20;i++){
  const text=M.nextHint(state,'zoo'),command=M.parseCommand(text);
  f.speech.final('hello');f.nodes.get('showHint').onclick();assert.equal(f.nodes.get('hintSentence').textContent,text);
  f.speech.final(text);assert.equal(f.nodes.get('execute').disabled,false);f.nodes.get('execute').onclick();await tick();
  assert.equal(f.nodes.get('hintSentence').textContent,'まずは自分で話してみよう。');state=M.transition(state,command).state;
  if(command.kind==='arrival')break;
 }
 assert.equal(f.nodes.get('success').hidden,false);assert.equal(f.nodes.get('record').disabled,true);
 f.nodes.get('undo').onclick();assert.equal(f.nodes.get('success').hidden,true);assert.equal(f.nodes.get('record').disabled,false);
 f.nodes.get('reset').onclick();await tick();f.confirm();assert.equal(f.nodes.get('record').disabled,true);assert.equal(f.nodes.get('char').hidden,true);
});
test('Restaurant route ends with a forward-left indication and explicit arrival message without rotating',async()=>{
 const f=fixture();f.button('start','A').onclick();f.button('goal','restaurant','facility-choice').onclick();await tick();f.confirm();
 for(const sentence of ['Go straight for 2 blocks.','Turn left.','Go straight for 2 blocks.']){
  f.speech.final(sentence);f.nodes.get('execute').onclick();await tick();
 }
 const before={left:f.nodes.get('char').style.left,top:f.nodes.get('char').style.top,sprite:f.nodes.get('sprite').src};
 f.speech.final('You can see it on your right.');f.nodes.get('execute').onclick();await tick();assert.equal(f.nodes.get('success').hidden,true,'wrong side cannot finish the selected goal');
 f.speech.final('You can see it on your left.');f.nodes.get('execute').onclick();await tick();
 assert.equal(f.nodes.get('success').hidden,false);assert.equal(f.nodes.get('successText').textContent,'無事に到着しました！');
 assert.ok(f.nodes.get('sideArrow').style.transform.includes('rotate(-45deg)'));
 assert.ok(f.button('goal','restaurant','facility-target').className.includes('indicated'));
 assert.deepEqual({left:f.nodes.get('char').style.left,top:f.nodes.get('char').style.top,sprite:f.nodes.get('sprite').src},before);
});
