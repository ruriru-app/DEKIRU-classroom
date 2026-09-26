/* Forms used when expressing general preferences. Never mutate dictionary cards.
 * Explicit IDs avoid changing color orange or guessing plurals for new vocabulary.
 * Food used as a substance (milk, cabbage, cake, etc.) retains its dictionary form.
 */
window.SentenceForms=(()=>{
 const preferencePlurals={
  fruit_vegetable_001:'apples',fruit_vegetable_002:'bananas',fruit_vegetable_003:'beans',
  fruit_vegetable_006:'carrots',fruit_vegetable_007:'cherries',fruit_vegetable_009:'cucumbers',
  fruit_vegetable_010:'eggplants',fruit_vegetable_012:'green peppers',fruit_vegetable_013:'kiwi fruits',
  fruit_vegetable_014:'lemons',fruit_vegetable_016:'melons',fruit_vegetable_017:'mushrooms',
  fruit_vegetable_018:'nuts',fruit_vegetable_019:'onions',fruit_vegetable_020:'oranges',
  fruit_vegetable_021:'peaches',fruit_vegetable_022:'pineapples',fruit_vegetable_023:'potatoes',
  fruit_vegetable_025:'strawberries',fruit_vegetable_026:'tomatoes',fruit_vegetable_027:'watermelons',
  dessert_002:'donuts',dessert_003:'parfaits',dessert_008:'cream puffs',
  food_002:'rice balls',food_007:'sandwiches',food_008:'pancakes',
  food_010:'hamburgers',food_011:'hot dogs',food_014:'sausages',food_016:'omelets',food_029:'fried eggs',lets_try_expr_036:'noodles',
  fruit_vegetable_029:'mangoes',fruit_vegetable_030:'olives',fruit_vegetable_031:'pears',fruit_vegetable_032:'persimmons',fruit_vegetable_034:'radishes',
  animal_001:'bears',animal_002:'elephants',animal_003:'tigers',animal_004:'lions',animal_005:'horses',animal_006:'zebras',animal_007:'camels',animal_008:'giraffes',animal_009:'gorillas',animal_010:'monkeys',animal_011:'orangutans',animal_012:'pandas',animal_013:'koalas',animal_014:'dogs',animal_015:'cats',animal_016:'foxes',animal_017:'rabbits',animal_018:'mice',animal_019:'crocodiles',animal_020:'snakes',animal_021:'frogs',animal_022:'birds',animal_023:'polar bears',animal_024:'hippos',animal_025:'cows',animal_026:'pigs',animal_027:'wild boars',animal_028:'kangaroos',animal_029:'deer',animal_030:'goats',animal_031:'sheep',animal_032:'hamsters',animal_033:'wolves',animal_034:'bats',animal_035:'chickens',animal_036:'chicks',animal_037:'hawks',animal_038:'snails',animal_039:'iguanas',animal_040:'dinosaurs',animal_041:'dragons',animal_042:'phoenixes',animal_043:'unicorns'
 };
 function preference(card){
  const plural=Object.hasOwn(preferencePlurals,card.id)?preferencePlurals[card.id]:null;
  return {english:plural||card.english,speech:plural||card.speech||card.english};
 }
 function possession(card,count=1,color=''){
  const n=Math.min(10,Math.max(1,Math.trunc(Number(count))||1));
  const prefix=color?color+' ':'';
  let word=prefix+card.english,plural=word+(card.english==='brush'?'es':'s'),article=/^[aeiou]/i.test(word)?'an':'a';
  if(card.english==='scissors'){word='pair of '+word;plural='pairs of '+prefix+'scissors';article='a';}
  else if(['glue','ink'].includes(card.english)){plural='bottles of '+word;word='bottle of '+word;article='a';}
  const english=n===1?article+' '+word:n+' '+plural;
  const quantity=n===1?article:String(n);
  const measure=card.english==='scissors'?(n===1?'pair of':'pairs of'):['glue','ink'].includes(card.english)?(n===1?'bottle of':'bottles of'):'';
  const noun=measure?card.english:n===1?card.english:card.english+(card.english==='brush'?'es':'s');
  return {english,speech:english,quantity,measure,color,noun,count:n};
 }
 return {preference,possession};
})();
