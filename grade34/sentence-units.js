/* Unit-specific content. Add definitions here; keep the common player independent. */
window.SentenceUnits={
 'lt1-5':{
  activities:[
   {id:'like',title:'好きな色を伝える',example:'I like blue.'},
   {id:'question',title:'質問し、Yes / No で答える',example:"Do you like blue? / Yes, I do. / No, I don't."},
   {id:'what_color',title:'好きなものをたずねる・答える',example:'What color do you like? / I like blue.'}
  ],
  subjects:['person_001','person_002'],verbCategories:['actions_5'],verbIds:['action5_002'],objectCategories:['colors'],
  topics:[{id:'color',label:'色',category:'colors'},{id:'food',label:'食べ物',category:'foods'},{id:'sport',label:'スポーツ',category:'sports'},{id:'animal',label:'動物',category:'animals'},{id:'fruit',label:'果物',numbers:[1,2,7,11,13,14,16,20,21,22,25,27,29,31,32]},{id:'vegetable',label:'野菜',numbers:[3,4,5,6,8,9,10,12,15,17,19,23,24,26,28,30,33,34]}],
  topicChoices(cards,topic){const group=this.topics.find(t=>t.id===topic)||this.topics[0];return cards.filter(c=>c.displayGroup!=='category'&&(group.category?c.category===group.category:group.numbers.some(n=>c.id==='fruit_vegetable_'+String(n).padStart(3,'0'))));},
  defaults(){return {topic:'color',subject:'person_001',questionSubject:'person_002',responseSubject:'person_001',verb:'action5_002',object:'color_010',negativeObject:'color_010'};},
  target(){return 'object';},
  render(args){
   if(args.activity!=='what_color')return window.SentenceUnits['lt1-4'].render(args);
   const {cards,selected,token,row}=args;
   const pick=(key,role)=>{const c=cards.get(selected[key]);const form=role==='object'?window.SentenceForms.preference(c):c;return token(form.english,role,c.id,'',form.speech||form.english,key);};
   const topic=selected.topic||'color';
   const question=row([token('What','neutral','expr_033','','What'),token(topic,'neutral',topic==='color'?'color_000':'','',topic),token('do','neutral','','','do'),pick('questionSubject','subject'),pick('verb','verb')],'?','talk-question-row');
   const answer=row([pick('responseSubject','subject'),pick('verb','verb'),pick('object','object')],'.','talk-response-row');
   return '<div class="talk-question-layout"><div class="talk-question-prompts">'+question+'</div><div class="talk-responses">'+answer+'</div></div>';
  }
 },
 'lt2-5':{
  activities:[{id:'have',title:'持っているものを伝える',example:'I have a pen.'},{id:'dont',title:'持っていないものを伝える',example:"I don't have a pen."},{id:'have_dont',title:'持っているものと持っていないものを伝える',example:"I have a pen. / I don't have a ruler."},{id:'question',title:'質問し、Yes / No で答える',example:'Do you have a pen?'}],
  subjects:['person_001','person_002'],verbCategories:['actions_5'],verbIds:['action5_015'],objectCategories:['stationery'],quantities:true,
  defaults(activity){return {subject:'person_001',questionSubject:'person_002',responseSubject:'person_001',verb:'action5_015',object:'stationery_003',negativeObject:activity==='dont'?'stationery_003':'stationery_007',objectCount:1,negativeObjectCount:1};},
  target(activity){return activity==='dont'?'negativeObject':'object';},
  render({cards,selected,activity,token,row}){
   const pick=(key,role)=>{const source=cards.get(selected[key]);return token(source.english,role,source.id,'',source.speech||source.english,key);};
   const objectTokens=key=>{
    const source=cards.get(selected[key]),form=window.SentenceForms.possession(source,selected[key+'Count'],selected[key+'Color']);
    const result=[token(form.quantity,'adjective','number_'+String(form.count).padStart(3,'0'),'',form.quantity,key+'Count')];
    if(form.measure)result.push(token(form.measure,'neutral','','',form.measure));
    if(form.color){const colorCard=[...cards.values()].find(c=>c.category==='colors'&&c.english===form.color);result.push(token(form.color,'adjective',colorCard?.id||'','',form.color,key+'Color'));}
    result.push(token(form.noun,'object',source.id,'',form.noun,key));return result;
   };
   const subject=pick('subject','subject'),verb=pick('verb','verb'),object=objectTokens('object'),negative=objectTokens('negativeObject');
   const have=()=>row([subject,verb,...object],'.','talk-statement-row',activity==='have_dont'?[1]:[]);
   const dont=()=>row([subject,token("don't",'negative','','×',"don't"),verb,...negative],'.','talk-statement-row');
   if(activity==='dont')return dont();
   if(activity==='have_dont')return '<div class="talk-sequence-layout talk-possession-sequence">'+have()+dont()+'</div>';
   if(activity==='question')return '<div class="talk-question-layout"><div class="talk-question-prompts">'+row([token('Do','neutral','','?','Do'),pick('questionSubject','subject'),verb,...object],'?','talk-question-row')+'</div><div class="talk-responses">'+row([token('Yes,','neutral','','〇','Yes'),pick('responseSubject','subject'),token('do','verb','','〇','do')],'.','talk-response-row')+row([token('No,','neutral','','×','No'),pick('responseSubject','subject'),token("don't",'negative','','×',"don't")],'.','talk-response-row')+'</div></div>';
   return have();
  }
 },
 'lt1-4':{
  activities:[{"id":"like","title":"好きな色を伝える","example":"I like red."},{"id":"dont","title":"好きではない色を伝える","example":"I don't like red."},{"id":"like_dont","title":"好きな色と好きではない色を伝える","example":"I like red. / I don't like black."},{"id":"question","title":"質問し、Yes / No で答える","example":"Do you like red?"},{"id":"like_question","title":"自分の好みを伝えてから質問する","example":"I like red. / Do you like red?"},{"id":"dont_question","title":"好きではない色を伝えてから質問する","example":"I don't like black. / Do you like black?"}],
  subjects:['person_001','person_002'],
  verbCategories:['actions_5'],
  objectCategories:['colors','sports','desserts','drinks','fruits_vegetables'],
  defaults(activity){return {subject:'person_001',questionSubject:'person_002',responseSubject:'person_001',verb:'action5_002',object:activity==='dont_question'?'color_009':'color_002',negativeObject:activity==='dont'?'color_002':'color_009'};},
  target(activity){return ['dont','dont_question'].includes(activity)?'negativeObject':'object';},
  render({cards,selected,activity,token,row}){
  const selectableToken=(selectionKey,role,fallbackId,fallbackWord)=>{
    const source=cards.get(selected[selectionKey])||cards.get(fallbackId);
    const form=source&&role==='object'?window.SentenceForms.preference(source):source;
    return token(form?.english||fallbackWord,role,source?.id||fallbackId,'',form?.speech||form?.english||fallbackWord,selectionKey);
  };
  const subjectToken=selectableToken('subject','subject','person_001','I');
  const questionSubjectToken=selectableToken('questionSubject','subject','person_002','you');
  const responseSubjectToken=selectableToken('responseSubject','subject','person_001','I');
  const verbToken=selectableToken('verb','verb','action5_002','like');
  const objectToken=selectableToken('object','object','color_002','red');
  const negativeObjectToken=selectableToken('negativeObject','object','color_009','black');
  const likeRow=(leadingCardSpacer=false)=>row([subjectToken,verbToken,objectToken],'.','talk-statement-row',leadingCardSpacer);
  const dontRow=(spacerPositions=[])=>row([subjectToken,token("don't",'negative','','×',"don't"),verbToken,negativeObjectToken],'.','talk-statement-row',spacerPositions);
  const questionBlock=(questionObject,leadRow='',questionSpacerPositions=[])=>{
    const question=row([token('Do','neutral','','?','Do'),questionSubjectToken,verbToken,questionObject],'?','talk-question-row',questionSpacerPositions);
    const yes=row([token('Yes,','neutral','','〇','Yes'),responseSubjectToken,token('do','verb','','〇','do')],'.','talk-response-row');
    const no=row([token('No,','neutral','','×','No'),responseSubjectToken,token("don't",'negative','','×',"don't")],'.','talk-response-row');
    return '<div class="talk-question-layout"><div class="talk-question-prompts">'+leadRow+question+'</div><div class="talk-responses">'+yes+no+'</div></div>';
  };
  if(activity==='dont')return dontRow();
  else if(activity==='like_dont')return '<div class="talk-sequence-layout">'+likeRow([1])+dontRow()+'</div>';
  else if(activity==='question')return questionBlock(objectToken);
  else if(activity==='like_question')return questionBlock(objectToken,likeRow(true));
  else if(activity==='dont_question')return questionBlock(negativeObjectToken,dontRow([0]),[2]);
  else return likeRow();

  }
 }
};
