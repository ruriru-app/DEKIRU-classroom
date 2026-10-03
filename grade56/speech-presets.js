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
 const registry=[{book:'nh6',unit:5,title:'Where is it from?',factory:unit5}];
 return {get(book,unit,catalog){return registry.find(r=>r.book===book&&String(r.unit)===String(unit))?.factory(catalog)||null;},list(){return registry.map(({book,unit,title})=>({book,unit,title}));}};
})();
