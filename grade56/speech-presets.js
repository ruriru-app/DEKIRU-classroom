/* Lesson content only; factories are lazy so Unit menus can use list() alone. */
window.SpeechPresets=(()=>{
 'use strict';
 const c=(id,label,insertText=label,category='')=>({id,label,insertText,category});
 const selection=choice=>({kind:'choice',...choice});
 function unit5(catalog){
  const pairs={clothes_006:'pair of pants',clothes_007:'pair of jeans',clothes_010:'pair of gloves',clothes_011:'pair of socks',clothes_012:'pair of shoes',clothes_018:'pair of boots',clothes_019:'pair of glasses',stationery_009:'pair of scissors',item_005:'pair of soccer shoes'};
  const groups=[['clothes',20,'衣類'],['stationery',16,'文房具'],['item',61,'身の回りのもの']];
  const belongings=groups.flatMap(([prefix,count,label])=>Array.from({length:count},(_,i)=>{
   const id=prefix+'_'+String(i+1).padStart(3,'0');return catalog.card(id,{category:label,...(pairs[id]?{insertText:pairs[id]}:{})});
  })).filter(Boolean);
  const regions=[['asia','アジア','Asia'],['europe','ヨーロッパ','Europe'],['africa','アフリカ','Africa'],['north-america','北アメリカ','North America'],['south-america','南アメリカ','South America'],['oceania','オセアニア','Oceania'],['antarctica','南極','Antarctica']].map(([id,ja,en])=>c(id,ja+' / '+en,en));
  const favoriteAspect=[catalog.card('color_000',{id:'color',label:'color',insertText:'color'}),catalog.card('shape_000',{id:'shape',label:'shape',insertText:'shape',imageUrl:catalog.imageUrl('../grade34/assets/cards/shapes/shape_000.png')}),...['design','size','texture','material'].map(id=>({...c(id,id),imageUrl:catalog.artwork(id)}))];
  const givers=[
   ['mother','family_005'],['father','family_004'],['friend','person_013'],['brother','family_009'],['sister','family_011'],
   ['grandfather','family_001'],['grandmother','family_002'],['aunt','family_008'],['uncle','family_007'],['cousin','family_012'],['parents','family_006'],['grandparents','family_003']
  ].map(([id,ref])=>catalog.card(ref,{id,label:id,insertText:'My '+id}));
  const places=[catalog.card('town_037',{id:'mall',label:'at a shopping mall',insertText:'at a shopping mall'}),c('kyoto','in Kyoto'),c('online','online')];
  const actions=[['eat','action5_021'],['see','action5_018'],['visit','action6_012'],['buy','action5_022']].map(([id,ref])=>catalog.card(ref,{id,label:id,insertText:id}));
  const countries=catalog.allCountries(),targets=[c('sushi','sushi')];
  const choiceSets={belongings,regions,favoriteAspect,givers,places,actions,countries,targets};
  const slot=(id,ownerStepId,inputType,choiceSetId,initial,allowMyWords,hint)=>({id,ownerStepId,inputType,choiceSetId,defaultValue:selection(choiceSets[choiceSetId].find(c=>c.id===initial)),allowMyWords,myWordsGroupId:id,hint});
  const slots=[
   slot('belonging','belonging','picture-card','belongings','clothes_002',true,'自分の持ち物を英語で入力しよう。'),
   slot('originCountry','origin','country-search','countries','JPN',false,'日本語や英語で国名を検索しよう。'),
   slot('region','region','list','regions','asia',true,'エリア名を英語で入力しよう。'),
   slot('nearbyCountry','nearby','country-search','countries','CHN',false,'近くの国を日本語や英語で検索しよう。'),
   slot('purchasePlace','acquisition','picture-card','places','mall',true,'場所を表す語句を入力しよう。必要なら at / in なども含めよう。'),
   slot('giver','acquisition','picture-card','givers','mother',true,'人を表す語句を入力しよう。例：My grandmother'),
   slot('favoriteAspect','favorite','picture-card','favoriteAspect','color',true,'名詞を1語で入力しよう。'),
   slot('action','do-there','picture-card','actions','eat',false,'したいことを選ぼう。'),
   slot('target','do-there','my-words','targets','sushi',true,'何を？・どこを？を英語で入力しよう。例：koalas / the Eiffel Tower / a T-shirt')
  ];
  const fixedPictures={I:'person_001',like:'action5_002',want:'action5_004',go:'action5_016',bought:'action5_022',in:'position_002'};
  const w=(word,role)=>({word,role,cardRef:fixedPictures[word]||'',...(word==='bought'?{imageTone:'sepia'}:{})}),s=(slotId,role,editable=true)=>({slotId,role,editable});
  const sentence=(stepId,tokens)=>({id:stepId+'.main',tokens,punctuation:'.'});
  const step=(id,label,required,tokens)=>({id,label,required,sentences:[sentence(id,tokens)]});
  const steps=[
   step('belonging','持ち物',true,[w('This','subject'),w('is','verb'),w('my','object'),s('belonging','object')]),
   step('origin','生産国',true,[w("It's",'subject'),w('from','place'),s('originCountry','place')]),
   step('region','生産国が入っているエリア名',true,[s('originCountry','subject',false),w('is','verb'),w('in','place'),s('region','place')]),
   step('nearby','生産国はどの国の近くか',true,[w("It's",'subject'),w('close','adjective'),w('to','place'),s('nearbyCountry','place')]),
   {id:'acquisition',label:'どうやって手に入れたか',required:false,sentences:[],defaultVariantId:'self',variants:[
    {id:'self',label:'自分で買った',sentences:[sentence('acquisition',[w('I','subject','expr_i'),w('bought','verb'),w('it','object'),s('purchasePlace','place')])]},
    {id:'bought-for',label:'買ってもらった',sentences:[sentence('acquisition',[s('giver','subject'),w('bought','verb'),w('it','object'),s('purchasePlace','place')])]},
    {id:'gift',label:'もらった',sentences:[sentence('acquisition',[s('giver','subject'),w('gave','verb'),w('it','object'),w('to','object'),w('me','object')])]}
   ]},
   step('favorite','持ち物のどこが気に入っているか',false,[w('I','subject','expr_i'),w('like','verb'),w('its','object'),s('favoriteAspect','object')]),
   step('visit-origin','その国に行ってみたい',false,[w('I','subject','expr_i'),w('want','verb'),w('to','verb'),w('go','verb'),w('to','place'),s('originCountry','place',false)]),
   step('do-there','その国で～したい',false,[w('I','subject','expr_i'),w('want','verb'),w('to','verb'),s('action','verb'),s('target','object'),w('there','place')])
  ];
  return {schemaVersion:1,unitId:'nh6:5',book:'nh6',unit:5,title:'Where is it from?',steps,slots,choiceSets,contractions:{"it's":['It','is'],"don't":['do','not']}};
 }
 function unit6(catalog){
  // Reuse the dictionary's explicit plural forms, including mice, deer and wolves.
  // Real animals only; mythical creatures remain in the general Picture Card library.
  const animals=Array.from({length:39},(_,i)=>catalog.pluralCard('animal_'+String(i+1).padStart(3,'0'),{category:'動物'})).filter(Boolean);
  const habitats=[['nature_001','deserts'],['nature_002','forests'],['nature_003','rainforests'],['nature_004','lakes'],['nature_005','mountains'],['nature_006','rivers'],['nature_007','savannas'],['nature_008','sea'],['nature_009','beaches'],['nature_011','islands'],['nature_012','ocean'],['nature_013','mudflats'],['nature_014','wetlands'],['nature_016','ponds']].map(([id,form])=>catalog.card(id,{category:'生息場所',insertText:form,speechText:form})).filter(Boolean);
  const problems=['living_001','living_003','living_005','living_011','living_012','living_013','living_016','living_017','living_018','living_019'].map(id=>catalog.card(id,{category:Number(id.slice(-3))>=11?'問題 Plus':'問題'})).filter(Boolean);
  const actions=['living_002','living_004','living_006','living_007','living_008','living_009','living_010','living_020','living_021','living_022','living_023','living_024','living_025'].map(id=>catalog.card(id,{category:Number(id.slice(-3))>=20?'できること Plus':'できること'})).filter(Boolean);
  const features=['impression_010','impression_008','impression_009','personality_008','state_001','state_002'].map(id=>catalog.card(id,{category:'特徴'})).filter(Boolean);
  const questionVerbs=[catalog.card('action5_002',{id:'like',category:'質問する動詞'}),c('know','know','know','質問する動詞')];
  const actionTargets=[['living_005','plastic'],['item_042','garbage'],['item_040','plastic bags'],['item_001','bags'],['item_028','boxes'],['clothes_000','clothes'],['living_026','glass bottles']].map(([id,word])=>catalog.card(id,{label:word,insertText:word,speechText:word,category:id==='living_026'?'何を？ Plus':'何を？'})).filter(Boolean);
  const choiceSets={animals,habitats,problems,actions,features,questionVerbs,actionTargets};
  const slot=(id,ownerStepId,choiceSetId,initial,allowMyWords,hint)=>({id,ownerStepId,inputType:'picture-card',choiceSetId,defaultValue:selection(choiceSets[choiceSetId].find(c=>c.id===initial)),allowMyWords,myWordsGroupId:id,hint});
  const slots=[
   slot('animal','save','animals','animal_011',true,'動物名を複数形で入力しよう。例：sea otters / turtles。ここで選んだ動物は、ほかの文にも共通して使います。'),
   slot('habitat','habitat','habitats','nature_003',true,'the の後に続く生息場所を入力しよう。例：forests / sea。冠詞 the は自動で付きます。'),
   slot('problem','problem','problems','living_001',true,'問題を表す名詞・語句を入力しよう。is に続くので、単数形や数えられない名詞を使います。例：water pollution'),
   slot('action','action','actions','living_002',true,'できることを動詞から入力しよう。例：support conservation groups。can の後なので動詞は原形です。'),
   slot('problem2','problem-too','problems','living_005',true,'もう1つの問題を表す、単数形や数えられない名詞を入力しよう。'),
   slot('action2','action-too','actions','living_006',true,'もう1つのできることを、動詞の原形から入力しよう。'),
   slot('feature','features','features','impression_010',true,'動物の特徴を表す言葉を入力しよう。例：cute / beautiful'),
   slot('questionVerb','question','questionVerbs','like',false,'like または know を選ぼう。')
  ];
  for(const [id,ownerStepId,parentId]of [['actionTarget','action','action'],['actionTarget2','action-too','action2']])slots.push({id,ownerStepId,inputType:'picture-card',choiceSetId:'actionTargets',defaultValue:null,optional:true,allowMyWords:true,myWordsGroupId:id,hint:'何を減らす・再使用する・リサイクルするかを入力しよう。例：bags / boxes / glass bottles。追加は任意です。',choiceIdsByParent:{slotId:parentId,ids:{living_008:['living_005','item_042','item_040'],living_009:['item_001','item_028','clothes_000'],living_010:['living_005','item_028','living_026']}}});
  const fixedPictures={I:'person_001',We:'person_005',They:'person_006',you:'person_002',save:'action6_016',live:'action6_002',like:'action5_002',in:'position_002'};
  const w=(word,role)=>({word,role,cardRef:fixedPictures[word]||''}),s=(slotId,role,editable=true)=>({slotId,role,editable});
  const step=(id,label,required,tokens,punctuation='.')=>({id,label,required,sentences:[{id:id+'.main',tokens,punctuation}]});
  const steps=[
   step('save','守りたい動物',true,[w("Let's",'subject'),w('save','verb'),w('the','object'),s('animal','object')]),
   step('habitat','どこに住んでいるか',true,[s('animal','subject',false),w('live','verb'),w('in','place'),w('the','place'),s('habitat','place')]),
   step('problem','大きな問題',true,[s('problem','subject'),w('is','verb'),w('a','adjective'),w('big','adjective'),w('problem','object')]),
   step('action','私たちにできること',true,[w('We','subject'),w('can','verb'),s('action','verb'),s('actionTarget','object')]),
   step('problem-too','もう1つの問題',false,[s('problem2','subject'),w('is','verb'),w('a','adjective'),w('big','adjective'),w('problem,','object'),w('too','adverb')]),
   step('action-too','もう1つのできること',false,[w('We','subject'),w('can','verb'),s('action2','verb'),s('actionTarget2','object')]),
   step('like','その動物が好き',false,[w('I','subject'),w('like','verb'),s('animal','object',false)]),
   step('features','動物の特徴',false,[w('They','subject'),w('are','verb'),s('feature','adjective')]),
   step('question','聞いている人への質問',false,[w('Do','neutral'),w('you','subject'),s('questionVerb','verb'),s('animal','object',false)],'?')
  ];
  return {schemaVersion:1,unitId:'nh6:6',book:'nh6',unit:6,title:'Save the animals.',steps,slots,choiceSets,contractions:{"let's":['Let','us']}};
 }
 const registry=[{book:'nh6',unit:5,title:'Where is it from?',factory:unit5},{book:'nh6',unit:6,title:'Save the animals.',factory:unit6}];
 return {get(book,unit,catalog){return registry.find(r=>r.book===book&&String(r.unit)===String(unit))?.factory(catalog)||null;},list(){return registry.map(({book,unit,title})=>({book,unit,title}));}};
})();
