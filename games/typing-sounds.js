/* Paired typing operation sounds. Files are local assets, never source-site hotlinks. */
(function(root){
'use strict';
const sets=Object.freeze([['normal','ノーマル'],['cute','かわいい'],['sf','SF'],['japanese','和楽器'],['taiko','和太鼓'],['pistol','拳銃'],['sword','剣']].map(([id,label])=>Object.freeze({id,label,key:'typing-sounds/'+id+'-key.mp3',enter:'typing-sounds/'+id+'-enter.mp3'})));
const storageKey='dekiru-typing-sounds-v1';
function create(options={}){
 let storage=options.storage;try{if(!storage)storage=root.localStorage;}catch{}
 let settings={set:'normal',volume:.4},context=null,gain=null,generation=0;
 const buffers=new Map(),pending=new Map(),sources=[];
 try{const saved=JSON.parse(storage?.getItem(storageKey)||'null');if(saved)settings=valid(saved);}catch{}
 function valid(value){return {set:value.set==='none'||sets.some(x=>x.id===value.set)?value.set:settings.set,volume:Number.isFinite(value.volume)?Math.max(0,Math.min(1,value.volume)):settings.volume};}
 function configure(value){stop();settings=valid(value);if(gain)gain.gain.value=settings.volume;try{storage?.setItem(storageKey,JSON.stringify(settings));}catch{}return {...settings};}
 function engine(){
  if(context)return context;
  const Audio=options.AudioContext||root.AudioContext||root.webkitAudioContext;if(!Audio)return null;
  context=new Audio();gain=context.createGain();gain.gain.value=settings.volume;gain.connect(context.destination);return context;
 }
 async function buffer(path){
  if(buffers.has(path))return buffers.get(path);
  if(!pending.has(path))pending.set(path,(async()=>{
   try{const response=await (options.fetch||root.fetch.bind(root))(path);if(!response.ok)throw Error('audio load');const value=await context.decodeAudioData(await response.arrayBuffer());buffers.set(path,value);return value;}
   catch{return null;}finally{pending.delete(path);}
  })());
  return pending.get(path);
 }
 async function prepare(){
  try{
   if(!engine())return false;
   if(context.state==='suspended')await context.resume();
   const set=sets.find(x=>x.id===settings.set);if(!set)return true;
   const values=await Promise.all([buffer(set.key),buffer(set.enter)]);return values.every(Boolean);
  }catch{return false;}
 }
 function play(kind,when=0){
  const set=sets.find(x=>x.id===settings.set);if(!set||settings.volume===0||!context||context.state!=='running')return false;
  const value=buffers.get(kind==='enter'?set.enter:set.key);if(!value)return false;
  try{
   // Limit overlapping tails so fast typing never builds up excessive volume.
   while(sources.length>=4){const oldest=sources.shift();try{oldest.stop();}catch{}}
   const source=context.createBufferSource();source.buffer=value;source.connect(gain);sources.push(source);
   source.onended=()=>{const index=sources.indexOf(source);if(index>=0)sources.splice(index,1);source.disconnect();};
   source.start(context.currentTime+when);return true;
  }catch{return false;}
 }
 function stop(){generation++;for(const source of sources.splice(0)){try{source.stop();source.disconnect();}catch{}}}
 async function preview(){
  stop();const id=generation;if(!await prepare()||id!==generation)return false;
  const set=sets.find(x=>x.id===settings.set);if(!set)return true;
  const duration=buffers.get(set.key)?.duration||0;
  play('key');play('enter',duration+.15);return true;
 }
 return {settings:()=>({...settings}),configure,prepare,play,preview,stop};
}
root.TypingSounds=Object.freeze({sets,create});
})(typeof window==='undefined'?globalThis:window);
