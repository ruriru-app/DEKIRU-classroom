(()=>{
 'use strict';
 const $=id=>document.getElementById(id),M=InterviewModel,R=ClassRoster,store=()=>InterviewStore.create(localStorage),params=new URLSearchParams(location.search);
 let roster=null,students=[],dirty=false,pastePending=false;
 const addedStudentIds=new Set();
 const status=msg=>$('rosterStatus').textContent=msg;
 function update(){ $('rosterDirty').textContent=dirty?'未保存の変更があります。':'';$('rosterDelete').disabled=!roster;$('rosterCount').textContent=students.length+'人';$('rosterAdd').disabled=students.length>=100;
  const labels=students.map(s=>s.names.kanji.family+' '+s.names.kanji.given).filter(s=>s.trim());
  $('rosterWarnings').textContent=[M.rosterWarnings(students).join('\n'),new Set(labels).size<labels.length?'同じ氏名があります。出席番号で区別します。':''].filter(Boolean).join('\n');
 }
 function changed(){dirty=true;status('');update();}
 function list(selected=''){const rows=store().listRosters();$('rosterSelect').replaceChildren(new Option('新しい名簿',''));rows.forEach(r=>$('rosterSelect').add(new Option(r.className,r.id)));$('rosterSelect').value=selected;}
 function renderRows(){
  const body=$('rosterRows');body.replaceChildren();
  students.forEach((s,i)=>{
   const tr=document.createElement('tr');tr.classList.toggle('class-added-row',addedStudentIds.has(s.id));
   R.headers.forEach((heading,k)=>{
    const td=document.createElement('td'),input=document.createElement('input');
    input.setAttribute('aria-label',heading+' '+(i+1));input.maxLength=k?80:12;if(!k)input.inputMode='numeric';
    const script=['kanji','hiragana','english'][Math.floor((k-1)/2)],part=k%2?'family':'given';
    input.value=k?s.names[script][part]:s.number;
    input.oninput=()=>{if(k)s.names[script][part]=input.value;else s.number=input.value;changed();};td.append(input);
    if(!k&&addedStudentIds.has(s.id)){
     const cancel=document.createElement('button');cancel.type='button';cancel.className='class-cancel-add';cancel.textContent='追加を取り消す';
     cancel.setAttribute('aria-label','追加を取り消す '+(i+1)+'行目');
     cancel.onclick=()=>{students=students.filter(row=>row.id!==s.id);addedStudentIds.delete(s.id);changed();renderRows();status('追加した行を取り消しました。');$('rosterAdd').focus();};
     td.append(cancel);
    }
    if(k===1&&s.legacyName){const note=document.createElement('small');note.textContent='旧氏名：'+s.legacyName;td.append(note);}
    tr.append(td);
   });body.append(tr);
  });update();
 }
 function load(value){roster=value;const editable=value?(value.version===1?R.editLegacy(value):value):null;students=editable?JSON.parse(JSON.stringify(editable.students)):[];addedStudentIds.clear();$('rosterClass').value=value?.className||'';$('rosterPaste').value='';dirty=false;pastePending=false;renderRows();status(value?.version===1?'旧氏名を表示しています。苗字・名前は自動分割しません。必要な表記を入力してください。':'');}
 function discard(){return !dirty||confirm('未保存の名簿の変更を破棄しますか？');}
 function read(){const now=new Date().toISOString();M.check(!pastePending,'貼り付けた名簿を先に確認してください');return R.validate({version:2,id:roster?.id||M.newId('class'),className:$('rosterClass').value,students,createdAt:roster?.createdAt||now,updatedAt:now});}
 function backUrl(){const u=ClassSettingsLinks.safeReturn(params.get('returnTo'));if(u.pathname.endsWith('/interview.html')&&roster)u.searchParams.set('classId',roster.id);return u.href;}
 $('classSettingsBack').onclick=async()=>{if(document.fullscreenElement){await document.exitFullscreen();return;}if(discard()){dirty=false;location.href=backUrl();}};
 document.querySelectorAll('a').forEach(a=>a.addEventListener('click',e=>{if(!discard())e.preventDefault();else dirty=false;}));
 addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
 $('rosterClass').oninput=changed;$('rosterPaste').oninput=()=>{pastePending=!!$('rosterPaste').value.trim();changed();};
 $('rosterConfirm').onclick=()=>{try{
  // Do not reapply stale pasted text over subsequent table edits or added pupils.
  if(!pastePending&&students.length){status('表示中の名簿を確認してください。各欄を修正できます。');return;}
  const p=R.parse($('rosterPaste').value,students);students=p.students;
  for(const id of addedStudentIds)if(!students.some(s=>s.id===id))addedStudentIds.delete(id);
  pastePending=false;changed();renderRows();status(p.warnings.join('\n')||'名簿を確認してください。各欄を修正できます。');
 }catch(e){status(e.message);}};
 $('rosterAdd').onclick=()=>{try{
  M.check(!pastePending,'貼り付けた名簿を先に「名簿を確認」で確認してください。');
  M.check(students.length<100,'名簿は100人までです。');
  const numbers=students.map(s=>String(s.number).trim()).filter(n=>/^\d{1,12}$/.test(n)).map(Number);
  const next=Math.max(0,...numbers)+1;
  const student={id:M.newId('student'),number:next<=999999999999?String(next):'',names:Object.fromEntries(['kanji','hiragana','english'].map(script=>[script,{family:'',given:''}]))};
  students.push(student);addedStudentIds.add(student.id);changed();renderRows();
  status('児童を1人追加しました。出席番号・名前を確認し、「名簿を保存」を押してください。');
  const row=$('rosterRows').lastElementChild;row.scrollIntoView({block:'nearest'});row.querySelectorAll('input')[student.number?1:0].focus();
 }catch(e){status(e.message);}};
 $('rosterSelect').onchange=()=>{const id=$('rosterSelect').value;if(!discard()){$('rosterSelect').value=roster?.id||'';return;}try{load(id?store().listRosters().find(r=>r.id===id):null);}catch(e){status(e.message);}};
 $('rosterNew').onclick=()=>{if(discard()){load(null);$('rosterSelect').value='';}};
 $('rosterSave').onclick=()=>{try{const saved=store().saveRoster(read());roster=saved;students=JSON.parse(JSON.stringify(saved.students));addedStudentIds.clear();dirty=false;list(saved.id);renderRows();const u=new URL(location.href);u.searchParams.set('classId',saved.id);history.replaceState(null,'',u);status('名簿をこのブラウザに保存しました。');}catch(e){status(e.message);}};
 $('rosterDelete').onclick=()=>{if(!roster||!confirm(dirty?'未保存の変更を破棄し、保存した名簿を削除しますか？':'保存した名簿を削除しますか？'))return;try{store().deleteRoster(roster.id);load(null);list();status('保存した名簿を削除しました。');}catch(e){status(e.message);}};
 try{const selected=params.get('classId')||'';list(selected);load(selected?store().listRosters().find(r=>r.id===selected):null);}catch(e){status(e.message);}
})();
