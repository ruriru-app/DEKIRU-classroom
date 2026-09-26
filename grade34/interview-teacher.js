(()=>{
 'use strict';
 const M=InterviewModel,R=ClassRoster,$=id=>document.getElementById(id),params=new URLSearchParams(location.search),store=()=>InterviewStore.create(localStorage);
 let preset,roster=null,reviewed='',valid=false,sending=false,selected=params.get('classId')||'';
 function showPreset(){
  $('presetTitle').textContent=preset.title;$('presetName').hidden=true;$('presetDescription').textContent=preset.description;$('presetQuestion').textContent=preset.question.template;
  let instructions=$('presetStudentInstructions');if(!instructions){instructions=document.createElement('p');instructions.id='presetStudentInstructions';$('presetDescription').after(instructions);}instructions.textContent=preset.studentInstructions?'児童への説明：'+preset.studentInstructions:'';
  $('presetCards').replaceChildren();$('presetAreas').replaceChildren();
  const cards=new Map(window.DEKIRU_DATA.cards.map(c=>[c.id,c]));preset.cardIds.forEach(id=>{const card=cards.get(id),tile=document.createElement('div');tile.className='interview-picture';const img=document.createElement('img');img.alt='';img.src=card.pictureUrl||('../'+card.image);const label=document.createElement('span');label.textContent=card.english;tile.append(img,label);$('presetCards').append(tile);});
  preset.answerAreas.forEach(a=>{const e=document.createElement('span');e.textContent=a.label;$('presetAreas').append(e);});$('interviewTeacher').hidden=false;
 }
 if(params.get('authorPreview')==='1'&&parent!==window){
  document.querySelector('.app-header').hidden=true;document.querySelector('.app-header').style.display='none';document.querySelector('.interview-main').style.paddingTop='12px';
  document.querySelectorAll('a').forEach(a=>a.removeAttribute('href'));document.querySelectorAll('button,input,select').forEach(e=>e.disabled=true);
  $('rosterStatus').textContent='プレビュー用の仮の番号です。配信はできません。';$('rosterCount').textContent='35人';
  for(let n=1;n<=35;n++){const e=document.createElement('div');e.className='roster-name';e.textContent=n;$('rosterRows').append(e);}
  addEventListener('message',event=>{if(event.source!==parent||!(event.origin===location.origin||(location.protocol==='file:'&&event.origin==='null'))||event.data?.type!=='interview-author-preview')return;try{preset=M.validatePreset(event.data.preset);showPreset();$('interviewError').textContent='';}catch(e){$('interviewError').textContent=e.message;}});return;
 }
 const status=s=>$('rosterStatus').textContent=s;
 const options=()=>({script:$('rosterScript').value,scope:$('rosterScope').value});
 function gate(){$('interviewSend').disabled=sending||!(valid&&$('rosterConsent').checked);}
 function preview(){
  valid=false;$('rosterRows').replaceChildren();$('rosterWarnings').textContent='';$('rosterCount').textContent=roster?roster.students.length+'人':'';status('');
  $('rosterSettings').href=ClassSettingsLinks.url(location.href,selected);
  if(!roster){status('クラス設定で名簿を登録し、使うクラスを選んでください。');gate();return;}
  try{const delivery=R.toDeliveryRoster(roster,options());delivery.students.forEach(s=>{const tile=document.createElement('div');tile.className='roster-name';tile.textContent=s.number+' '+s.name;$('rosterRows').append(tile);});
   const names=delivery.students.map(s=>s.name).filter(Boolean);if(new Set(names).size<names.length)$('rosterWarnings').textContent='同じ名前があります。出席番号で区別します。';valid=true;
  }catch(e){status(e.message);}gate();
 }
 function configureScript(){
  const old=$('rosterScript').value;$('rosterScript').replaceChildren();
  const choices=roster?.version===1?[['legacy','登録済みの氏名（旧形式）']]:[['kanji','漢字'],['hiragana','ひらがな'],['english','英語']];
  choices.forEach(([v,n])=>$('rosterScript').add(new Option(n,v)));$('rosterScript').value=choices.some(c=>c[0]===old)?old:choices[0][0];
  $('rosterScope').disabled=false;
  $('rosterScope').querySelector('option[value="given"]').disabled=roster?.version===1;
  if(roster?.version===1&&$('rosterScope').value==='given')$('rosterScope').value='full';
  if(roster?.version===2&&roster.students.every(s=>Object.values(s.names).every(n=>!n.family&&!n.given)))$('rosterScope').value='number';
  $('rosterScript').disabled=$('rosterScope').value==='number';
 }
 function refresh(){
  try{const rows=store().listRosters(),next=rows.find(r=>r.id===selected)||null,changed=JSON.stringify(next)!==JSON.stringify(roster);
   $('rosterSelect').replaceChildren(new Option('クラスを選んでください',''));rows.forEach(r=>$('rosterSelect').add(new Option(r.className,r.id)));$('rosterSelect').value=next?selected:'';
   if(changed){roster=next;$('rosterConsent').checked=false;reviewed='';configureScript();}preview();
  }catch(e){roster=null;valid=false;$('rosterConsent').checked=false;$('rosterRows').replaceChildren();status(e.message);gate();}
 }
 $('interviewBack').onclick=async()=>{if(document.fullscreenElement){await document.exitFullscreen();return;}const book=params.get('book'),unit=Number(params.get('unit'));if(/^(nh5|nh6)$/.test(book)&&unit>=1&&unit<=8)location.href='../grade56/index.html#/unit/'+book+'/'+unit;else if(/^(lt1|lt2)$/.test(book)&&unit>=1&&unit<=9)location.href='index.html#/unit/'+book+'/'+unit;else location.href='index.html#/';};
 try{
  preset=InterviewLinks.get(params.get('preset'),params.get('source'));showPreset();
  $('interviewTeacher').hidden=false;refresh();
 }catch(e){$('interviewError').textContent=e.message;return;}
 $('rosterSelect').onchange=()=>{selected=$('rosterSelect').value;$('rosterConsent').checked=false;reviewed='';const u=new URL(location.href);if(selected)u.searchParams.set('classId',selected);else u.searchParams.delete('classId');history.replaceState(null,'',u);refresh();};
 for(const id of ['rosterScript','rosterScope'])$(id).onchange=()=>{$('rosterConsent').checked=false;reviewed='';$('rosterScript').disabled=$('rosterScope').value==='number';preview();};
 $('rosterConsent').onchange=()=>{refresh();reviewed=$('rosterConsent').checked&&valid?JSON.stringify(roster):'';gate();};
 addEventListener('storage',refresh);addEventListener('focus',refresh);
 $('interviewSend').onclick=async()=>{if(sending)return;sending=true;gate();try{
  M.check($('rosterConsent').checked&&valid,'名簿と共有の注意を確認してください');
  const latest=store().listRosters().find(r=>r.id===selected);
  if(!latest||JSON.stringify(latest)!==reviewed){refresh();$('rosterConsent').checked=false;gate();throw Error('名簿が変更されました。内容を確認してください。');}
  const settings=JSON.stringify([options(),$('linkDuration').value]),current=R.toDeliveryRoster(latest,options()),delivery=InterviewShare.snapshot(preset,current,Number($('linkDuration').value)),url=await InterviewShare.buildShortUrl(delivery,new URL('interview-receive.html',location.href));
  M.check($('rosterConsent').checked&&settings===JSON.stringify([options(),$('linkDuration').value])&&JSON.stringify(store().listRosters().find(r=>r.id===selected))===JSON.stringify(latest),'配信の設定が変わりました。確認してもう一度配信してください。');
  const deadline=new Date(delivery.expiresAt).toLocaleString('ja-JP',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'});
  $('deliveryDeadline').textContent='直前に作成したリンクの終了：'+deadline;$('deliveryDeadline').hidden=false;
  const lengthNotice=url.length>2024?' このリンクは2,024文字を超えるため、Google Classroomへのリンク添付ができない場合があります。出席番号のみの表示にすると短くできます。':'';
  CardShare.openUrl(url,preset.title,current.students.length+'人・終了：'+deadline+'。クラス内だけで共有してください。'+lengthNotice);
 }catch(e){status(e.message);}finally{sending=false;gate();}};
})();
