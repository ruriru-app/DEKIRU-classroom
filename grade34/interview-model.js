(function(root){
  'use strict';
  const books={lt1:9,lt2:9,nh5:8,nh6:8};
  function check(ok,message){if(!ok)throw new Error(message);}
  function text(value,label,max,empty=false){check(typeof value==='string',label+'が不正です');const s=value.trim();check((empty||s.length>0)&&s.length<=max,label+'を'+max+'文字以内で入力してください');return s;}
  function id(value){const s=text(value,'ID',100);check(/^[A-Za-z0-9_-]+$/.test(s),'IDが不正です');return s;}
  function date(value){check(typeof value==='string'&&value.length<=40&&Number.isFinite(Date.parse(value)),'日時が不正です');return value;}
  function array(value,max,label,min=0){check(Array.isArray(value)&&value.length>=min&&value.length<=max,label+'の件数が不正です');return value;}
  function unique(values,label){check(new Set(values).size===values.length,label+'が重複しています');}
  function newId(prefix='interview'){return prefix+'-'+(root.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2));}
  function knownCards(){const data=root.DEKIRU_DATA||root.GAMES_DATA;return data?new Set(data.cards.map(c=>c.id)):undefined;}
  function validatePreset(v,validCardIds=knownCards()){
    check([1,2].includes(v?.version)&&v.type==='interview','未対応のInterviewプリセットです');
    const cardIds=array(v.cardIds,100,'カード').map(id);unique(cardIds,'カード');
    if(validCardIds)check(cardIds.every(c=>validCardIds.has(c)),'使用できないカードが含まれています');
    const assignedUnits=array(v.assignedUnits,34,'Unit').map(u=>{check(u&&Object.hasOwn(books,u.bookId)&&Number.isInteger(u.unit)&&u.unit>=1&&u.unit<=books[u.bookId],'Unitが不正です');return {bookId:u.bookId,unit:u.unit};});
    unique(assignedUnits.map(u=>u.bookId+':'+u.unit),'Unit');
    const template=text(v.question?.template,'質問文',200);
    const slots=array(v.question?.slots,v.version===2?9:1,'差し替え部分').map(s=>{
      check((v.version===2?/^P[1-9]?$/.test(s?.id):s?.id==='P')&&s.type==='picture-card','未対応の差し替え部分です');
      const ids=array(s.cardIds,100,'差し替えカード',1).map(id);unique(ids,'差し替えカード');
      check(ids.length===cardIds.length&&ids.every(c=>cardIds.includes(c)),'差し替えカードが一致しません');
      return {id:s.id,type:'picture-card',cardIds:ids};
    });
    const markers=template.match(/\([A-Z][A-Z0-9_]*\)/g)||[];
    unique(slots.map(s=>s.id),'差し替え部分');
    check(v.version===2?markers.every(m=>slots.some(s=>'('+s.id+')'===m))&&slots.every(s=>markers.includes('('+s.id+')')):slots.length?markers.length===1&&markers[0]==='(P)':markers.length===0,'差し替えは (P)、または (P1)〜(P9) で指定してください');
    const answerAreas=array(v.answerAreas,12,'回答エリア',1).map(a=>{check(Number.isInteger(a?.order)&&a.order>=0&&a.order<12,'回答の順序が不正です');return {id:id(a.id),label:text(a.label,'回答名',40),order:a.order,...(a.speechText!==undefined?{speechText:text(a.speechText,'読み上げ文',200,true)}:{})};});
    unique(answerAreas.map(a=>a.id),'回答ID');unique(answerAreas.map(a=>a.order),'回答の順序');answerAreas.sort((a,b)=>a.order-b.order);
    return {version:v.version,type:'interview',id:id(v.id),name:text(v.name,'プリセット名',80),title:text(v.title,'タイトル',80),description:text(v.description??'','説明',500,true),...(v.studentInstructions!==undefined?{studentInstructions:text(v.studentInstructions,'児童への説明',500,true)}:{}),assignedUnits,question:{template,slots},cardIds,answerAreas,createdAt:date(v.createdAt),updatedAt:date(v.updatedAt)};
  }
  function slotIds(template){return [...new Set((template.match(/\(P[1-9]?\)/g)||[]).map(m=>m.slice(1,-1)))];}
  // Explicit line breaks are authoritative. Legacy single-field questions can contain two sentences.
  function sentenceTemplates(template){const lines=template.split(/\r?\n/);if(lines.length>1)return lines.map(s=>s.trim()).filter(Boolean);return template.replace(/([.!?])\s+(?=[A-Z])/g,(match,mark,offset)=>mark==='.'&&/\b(?:Mr|Mrs|Ms|Dr|St|a\.m|p\.m|e\.g|i\.e)$/i.test(template.slice(0,offset))?match:mark+'\n').split('\n').map(s=>s.trim()).filter(Boolean);}
  function cardForm(template,card,offset=template.length){
    const clause=template.slice(0,offset).split(/[.!?\n]/).pop(),forms=root.SentenceForms||(typeof require==='function'?require('./sentence-forms.js'):null);
    return /\blike\b/i.test(clause)&&forms?forms.preference(card):{english:card.english,speech:card.speech||card.english};
  }
  function completeQuestion(p,selection,useForms=true){if(!p.question.slots.length)return p.question.template;const selected=selection?.id?{[p.question.slots[0].id]:selection}:selection;for(const slot of p.question.slots)check(selected?.[slot.id]&&slot.cardIds.includes(selected[slot.id].id),'カードを選んでください');return p.question.template.replace(/\(P[1-9]?\)/g,(marker,offset)=>{const card=selected[marker.slice(1,-1)];return text(useForms?cardForm(p.question.template,card,offset).english:card.english,'カードの英語',200);});}
  function validateRoster(v){
    check(v?.version===1,'未対応の名簿です');
    const students=array(v.students,100,'名簿',1).map(s=>{const name=text(s.name,'名前',161,true),number=s.number!==undefined&&s.number!==''?text(String(s.number),'番号',12):'';check(name||(/^\d{1,12}$/.test(number)&&Number(number)>0),'名前または出席番号を入力してください');return {id:id(s.id),name,...(number?{number}:{})};});
    unique(students.map(s=>s.id),'児童ID');
    return {version:1,id:id(v.id),className:text(v.className,'クラス名',80),students,createdAt:date(v.createdAt),updatedAt:date(v.updatedAt)};
  }
  function parseRoster(input,previousStudents=[]){
    check(typeof input==='string'&&input.length<=20000,'名簿の入力が長すぎます');
    const rows=input.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);array(rows,100,'名簿',1);
    const warnings=[],key=s=>JSON.stringify([s.number||'',s.name]);
    const students=rows.map(row=>{const m=row.match(/^(\d{1,12})[\t　]+(.+)$/);return {id:newId('student'),name:text(m?m[2]:row,'名前',80),...(m?{number:m[1]}:{})};});
    for(const s of students){const prior=previousStudents.filter(p=>key(p)===key(s));const count=students.filter(p=>key(p)===key(s)).length;if(prior.length===1&&count===1)s.id=prior[0].id;else if(prior.length)warnings.push('同名・同番号の行は区別のため新しいIDにしました。');}
    warnings.push(...rosterWarnings(students));
    return {students,warnings:[...new Set(warnings)]};
  }
  function rosterWarnings(students){const nums=students.map(s=>String(s.number??'').trim()).filter(Boolean);return new Set(nums).size!==nums.length?['番号が重複しています。名簿をご確認ください。']:[];}
  function validateDelivery(v,validCardIds=knownCards()){
    check((v?.version===1||v?.version===2)&&v.type==='interview-delivery','未対応の配信データです');
    const preset=validatePreset(v.preset,validCardIds);check(v.presetId===preset.id,'プリセットIDが一致しません');
    const issuedAt=date(v.issuedAt);
    let expiry={};
    if(v.version===2){const expiresAt=date(v.expiresAt);check([1,4,12,24].includes((Date.parse(expiresAt)-Date.parse(issuedAt))/3600000),'有効期間が不正です');expiry={expiresAt};}
    else check(v.expiresAt===undefined,'期限付き配信の形式が不正です');
    return {version:v.version,type:'interview-delivery',deliveryId:id(v.deliveryId),issuedAt,...expiry,presetId:preset.id,preset,roster:validateRoster(v.roster)};
  }
  const api={validatePreset,completeQuestion,cardForm,slotIds,sentenceTemplates,validateRoster,parseRoster,rosterWarnings,validateDelivery,newId,knownCards,check,text,id,date,array,unique};
  root.InterviewModel=api;if(typeof module==='object')module.exports=api;
})(typeof window==='object'?window:globalThis);
