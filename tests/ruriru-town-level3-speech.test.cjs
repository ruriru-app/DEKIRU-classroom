const test=require('node:test'),assert=require('node:assert/strict');
let Speech;try{Speech=require('../games/ruriru-town-level3-speech.js');}catch{}
const tick=()=>new Promise(r=>setImmediate(r));
function fixture(){
 const instances=[],transcripts=[],errors=[],states=[];let ready=true;
 class Recognition{
  constructor(){instances.push(this);}
  start(){this.started=true;}
  stop(){this.stopped=true;}
  abort(){this.aborted=true;}
  end(){this.onend?.();}
  final(text){this.onresult?.({resultIndex:0,results:[Object.assign([{transcript:text}],{isFinal:true})]});}
 }
 class Utterance{constructor(text){this.text=text;}}
 const synth={utterances:[],speak(u){this.utterances.push(u);},cancel(){},getVoices(){return[];}};
 assert.equal(typeof Speech,'function','speech controller exists');
 const speech=new Speech({Recognition,synth,Utterance,cooldownMs:5,stopTimeoutMs:25,playbackTimeoutMs:1000,canListen:()=>ready,onTranscript:(t,f)=>transcripts.push([t,f]),onState:s=>states.push(s),onError:e=>errors.push(e)});
 return {speech,instances,transcripts,errors,states,synth,setReady:v=>ready=v};
}
test('recognition results are displayed once and the microphone ends before playback starts',async()=>{
 const f=fixture();await f.speech.listen();const rec=f.instances[0];rec.final('hello');
 assert.deepEqual(f.transcripts,[['hello',true]]);
 const reading=f.speech.read('Turn right.');await tick();
 assert.ok(rec.aborted);assert.equal(f.synth.utterances.length,0,'must wait for recognizer end');
 rec.final('Turn left.');assert.equal(f.transcripts.length,1,'ignore aborted recognizer results');
 rec.end();await tick();assert.equal(f.synth.utterances.length,1);
 rec.final('Turn right.');assert.equal(f.transcripts.length,1,'do not recognize the model voice');
 f.synth.utterances[0].onend();await reading;
 assert.equal(f.instances.length,2,'resume only after playback and cooldown');await f.speech.cancel();f.instances[1].end();
});
test('cancel or changing setup during playback prevents automatic microphone restart',async()=>{
 const f=fixture(),reading=f.speech.read('Turn right.');await tick();
 const utterance=f.synth.utterances[0];f.setReady(false);await f.speech.cancel();utterance.onend?.();await reading;
 assert.equal(f.instances.length,0);assert.equal(f.speech.state,'idle');
});
test('missing recognizer end blocks playback and stale results rather than speaking into an active microphone',async()=>{
 const f=fixture();await f.speech.listen();const rec=f.instances[0];
 assert.equal(await f.speech.read('Turn left.'),false);
 assert.equal(f.synth.utterances.length,0);rec.final('Turn left.');assert.equal(f.transcripts.length,0);assert.ok(f.errors.length);
 rec.end();await f.speech.cancel();
});
test('unsupported recognition reports an actionable error without starting a session',async()=>{
 assert.equal(typeof Speech,'function');const errors=[];
 const speech=new Speech({Recognition:null,onError:e=>errors.push(e)});
 assert.equal(speech.supported,false);assert.equal(await speech.listen(),false);assert.equal(errors.length,1);
});
