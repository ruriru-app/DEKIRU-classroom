/* Teacher-confirmed distribution. No roster or issued URL is saved here. */
(()=>{
 'use strict';
 function create({getContext,isFresh,receiverUrl}){
  const D=window.InterviewBingoDelivery,S=window.InterviewBingoShare;
  const element=document.createElement('section');element.id='bingoDistribution';element.className='bingo-distribution';
  element.setAttribute('aria-label','児童端末への配信');
  element.innerHTML=`<h2>児童端末への配信</h2>
    <p>選んだ名簿の表示名をリンクに含めます。クラス内だけで共有してください。</p>
    <p data-bingo-delivery-summary></p>
    <label class="interview-field"><span>有効期間</span><select data-bingo-delivery-hours><option value="1">1時間</option><option value="4">4時間</option><option value="12">12時間</option><option value="24">24時間</option></select></label>
    <small>有効期間は児童端末の時計で判定します。リンクの秘匿化や遠隔失効ではありません。</small>
    <label class="bingo-delivery-consent"><input type="checkbox" data-bingo-delivery-consent>表示名と配信内容を確認し、クラス内だけで共有します</label>
    <button type="button" data-bingo-delivery-create disabled>配信用リンクを作る</button>
    <p data-bingo-delivery-status role="status" aria-live="polite"></p>`;
  const hours=element.querySelector('[data-bingo-delivery-hours]'),consent=element.querySelector('[data-bingo-delivery-consent]'),button=element.querySelector('[data-bingo-delivery-create]'),summary=element.querySelector('[data-bingo-delivery-summary]'),status=element.querySelector('[data-bingo-delivery-status]');
  let signature=null,busy=false,version=0,destroyed=false,ready=false,ownedDialog=null;
  function closeOwnedDialog(){
   const dialog=ownedDialog;ownedDialog=null;
   if(dialog?.isConnected){if(dialog.open)dialog.close();dialog.remove();}
  }
  const currentHours=()=>Number(hours.value);
  const signatureFor=context=>JSON.stringify([context.preset,context.config.size,context.config.candidateIds,context.selection.signature,currentHours()]);
  function describe(context){
   const {selection,config}=context,scope=selection.scope,script=selection.script;
   const display=scope==='number'?'出席番号のみ':(scope==='given'?'名前のみ':'苗字＋名前')+'・'+({kanji:'漢字',hiragana:'ひらがな',english:'英語',legacy:'旧形式'}[script]||script);
   return `${selection.roster.className}：${selection.roster.students.length}人 ／ 候補${config.candidateIds.length}語 ／ ${config.size}×${config.size} ／ ${display} ／ 有効期間${currentHours()}時間`;
  }
  function gate(){button.disabled=destroyed||busy||!ready||!consent.checked;}
  function renderContext(context){
   const next=signatureFor(context);
   if(next!==signature){closeOwnedDialog();signature=next;version++;consent.checked=false;status.textContent='配信内容を確認して同意してください。';}
   summary.textContent=describe(context);
   const checks=D.validateConfig(context.config,context.preset.cardIds,context.selection.roster.students.length);
   ready=checks.errors.length===0&&context.preset.expressions.slots.length<=1;
   if(context.preset.expressions.slots.length>1)checks.errors.push({message:'複数の独立した差し替え枠は配信できません。'});
   if(checks.errors.length){consent.checked=false;status.textContent=checks.errors.map(e=>e.message).join(' ');}
   else if(checks.warnings.length)status.textContent=checks.warnings.map(w=>w.message).join(' ');
   gate();return ready;
  }
  function showError(error){
   closeOwnedDialog();version++;signature=null;ready=false;consent.checked=false;summary.textContent='';
   status.textContent=error?.message||'配信内容を読み込めません。名簿と設定を確認してください。';gate();
  }
  function invalidate(){
   if(destroyed)return;
   try{
    if(!isFresh())throw Error('プリセットが変更されました。準備画面を開き直してください。');
    renderContext(getContext());
   }catch(error){showError(error);}
  }
  hours.onchange=invalidate;consent.onchange=gate;
  button.onclick=async()=>{
   if(busy||destroyed)return;
   const consented=signature;
   try{
    if(!consent.checked||!ready||!isFresh())throw Error('配信内容を確認して同意してください。');
    const context=getContext(true);
    if(!renderContext(context)||!consent.checked||signature!==consented)return;
    busy=true;gate();const issuedVersion=version;
    const delivery=D.snapshot({preset:context.preset,config:context.config,roster:context.selection.roster,hours:currentHours()},new Set(context.preset.cardIds));
    const url=await S.buildShortUrl(delivery,receiverUrl);
    if(destroyed||version!==issuedVersion)return;
    if(!isFresh())throw Error('プリセットが変更されました。準備画面を開き直してください。');
    const latest=getContext(true);
    if(!renderContext(latest)||!consent.checked||signature!==consented||version!==issuedVersion)return;
    const long=url.length>2024;
    if(long&&!confirm('このリンクは2,024文字を超えます。Google Classroomへの添付ができない場合があります。URLを表示しますか？'))return;
    if(destroyed||version!==issuedVersion||!isFresh())return;
    const final=getContext(true);if(!renderContext(final)||!consent.checked||signature!==consented||version!==issuedVersion)return;
    const deadline=new Date(delivery.expiresAt).toLocaleString('ja-JP',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'});
    const parsed=new URL(url),local=parsed.protocol==='file:'||['localhost','127.0.0.1','::1','[::1]'].includes(parsed.hostname);
    const caution=local?' この端末だけの確認用リンクです。児童端末からは開けません。':'';
    ownedDialog=window.CardShare.openUrl(url,context.preset.title,`${context.selection.roster.students.length}人・終了：${deadline}。クラス内だけで共有してください。${long?' 長いURLは添付できない場合があります。':''}${caution}`);
    status.textContent=`直前に作成したリンクの終了：${deadline}。${local?'この端末だけの確認用リンクです。児童端末からは開けません。':''}`;
   }catch(error){showError(error);}finally{busy=false;gate();}
  };
  invalidate();
  return {element,invalidate,destroy(){destroyed=true;version++;closeOwnedDialog();button.disabled=true;}};
 }
 window.InterviewBingoDistribution={create};
})();
