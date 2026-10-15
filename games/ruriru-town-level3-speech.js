(function(root){
 'use strict';
 class TownSpeech{
  constructor(options={}){
   this.Recognition=options.Recognition;this.synth=options.synth;this.Utterance=options.Utterance;
   this.onState=options.onState||(()=>{});this.onTranscript=options.onTranscript||(()=>{});this.onError=options.onError||(()=>{});
   this.canListen=options.canListen||(()=>true);this.cooldownMs=options.cooldownMs??700;
   this.stopTimeoutMs=options.stopTimeoutMs??1600;this.playbackTimeoutMs=options.playbackTimeoutMs??20000;
   this.state='idle';this.epoch=0;this.active=null;this.playback=false;this.readResolve=null;this.cooldownResolve=null;
  }
  get supported(){return typeof this.Recognition==='function';}
  get canRead(){return !!this.synth&&typeof this.Utterance==='function';}
  setState(value){this.state=value;this.onState(value);}
  async abortCapture(){
   const slot=this.active;if(!slot)return true;
   slot.ignore=true;try{slot.rec.abort();}catch{}
   let timer;const ended=await Promise.race([slot.ended.then(()=>true),new Promise(resolve=>{timer=setTimeout(()=>resolve(false),this.stopTimeoutMs);})]);
   clearTimeout(timer);return ended;
  }
  async listen(){
   if(!this.supported){this.onError('このブラウザーは音声入力に対応していません。Chromeで開いてください。');return false;}
   if(!this.canListen()||this.playback)return false;
   const token=++this.epoch;
   if(!await this.abortCapture()){
    if(token===this.epoch){this.setState('error');this.onError('マイクの停止を確認できませんでした。少し待ってから、もう一度押してください。');}return false;
   }
   if(token!==this.epoch||!this.canListen()||this.playback)return false;
   const rec=new this.Recognition(),slot={rec,token,ignore:false,delivered:false};
   slot.ended=new Promise(resolve=>{slot.resolveEnd=resolve;});this.active=slot;
   rec.lang='en-US';rec.continuous=false;rec.interimResults=true;rec.maxAlternatives=1;
   rec.onresult=event=>{
    if(slot.ignore||slot.token!==this.epoch||this.playback||slot.delivered||!this.canListen())return;
    let interim='';
    for(let i=0;i<event.results.length;i++){
     const result=event.results[i];
     if(result.isFinal){
      slot.delivered=true;this.setState('processing');this.onTranscript(result[0].transcript,true);
      try{rec.stop();}catch{}return;
     }
     interim+=result[0].transcript;
    }
    if(interim)this.onTranscript(interim,false);
   };
   rec.onend=()=>{
    slot.resolveEnd();if(this.active===slot)this.active=null;
    if(!slot.ignore&&slot.token===this.epoch&&!this.playback)this.setState('idle');
   };
   rec.onerror=event=>{
    if(slot.ignore||slot.token!==this.epoch||this.playback)return;
    const messages={
     'not-allowed':'マイクが許可されていません。ブラウザーのマイク設定を確認してください。',
     'service-not-allowed':'この端末では音声認識の利用が制限されています。先生に知らせてください。',
     'audio-capture':'マイクを使えません。接続や端末の設定を確認してください。',
     'network':'音声認識に接続できません。通信を確認して、もう一度話してください。',
     'no-speech':'声を聞き取れませんでした。もう一度話してみよう。',
     'aborted':'音声入力を止めました。もう一度、話せます。'
    };
    this.setState('error');this.onError(messages[event.error]||'音声を聞き取れませんでした。もう一度試してみよう。');
   };
   this.setState('listening');
   try{rec.start();return true;}catch{
    slot.ignore=true;slot.resolveEnd();if(this.active===slot)this.active=null;
    this.setState('error');this.onError('音声入力を開始できませんでした。少し待ってから、もう一度押してください。');return false;
   }
  }
  finish(){if(this.active&&!this.active.ignore){this.setState('processing');try{this.active.rec.stop();}catch{}}}
  async cancel(){
   ++this.epoch;this.playback=false;
   if(this.readResolve)this.readResolve(false);
   if(this.cooldownResolve)this.cooldownResolve();
   try{this.synth?.cancel();}catch{}
   this.setState('idle');return this.abortCapture();
  }
  async read(text){
   if(!this.canRead){this.onError('この端末ではお手本を読み上げられません。表示された英文を使ってください。');return false;}
   if(this.playback)return false;
   const token=++this.epoch;this.playback=true;this.setState('speaking');
   if(!await this.abortCapture()){
    if(token===this.epoch){this.playback=false;this.setState('error');this.onError('マイクの停止を確認できなかったため、読み上げを止めました。もう一度押してください。');}return false;
   }
   if(token!==this.epoch)return false;
   try{this.synth.cancel();}catch{}
   const utterance=new this.Utterance(text);utterance.lang='en-US';utterance.rate=.88;
   const voices=this.synth.getVoices?.()||[],voice=voices.find(v=>/^en-US$/i.test(v.lang))||voices.find(v=>/^en[-_]/i.test(v.lang));
   if(voice)utterance.voice=voice;
   const success=await new Promise(resolve=>{
    let done=false,timer;
    const finish=ok=>{if(done)return;done=true;clearTimeout(timer);this.readResolve=null;resolve(ok);};
    this.readResolve=finish;utterance.onend=()=>finish(true);utterance.onerror=()=>finish(false);
    timer=setTimeout(()=>{try{this.synth.cancel();}catch{}finish(false);},this.playbackTimeoutMs);
    try{this.synth.speak(utterance);}catch{finish(false);}
   });
   if(token!==this.epoch)return false;
   if(!success){this.playback=false;this.setState('error');this.onError('お手本を再生できませんでした。「🔊」でもう一度試せます。');return false;}
   this.setState('cooldown');
   await new Promise(resolve=>{
    const timer=setTimeout(()=>{this.cooldownResolve=null;resolve();},this.cooldownMs);
    this.cooldownResolve=()=>{clearTimeout(timer);this.cooldownResolve=null;resolve();};
   });
   if(token!==this.epoch)return false;
   this.playback=false;this.setState('idle');
   if(this.canListen())await this.listen();return true;
  }
 }
 if(typeof module==='object')module.exports=TownSpeech;else root.TownSpeech=TownSpeech;
})(typeof window==='object'?window:globalThis);
