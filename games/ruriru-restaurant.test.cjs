const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const vm=require('node:vm');
const html=readFileSync(__dirname+'/ruriru-restaurant.html','utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
function browser(storage){
 const elements=new Map();
 const element=()=>({classList:{add(){},remove(){},toggle(){}},dataset:{},style:{},append(){},textContent:''});
 const context=vm.createContext({
  localStorage:{getItem:()=>storage.value??null,setItem:(_,value)=>{storage.value=value;}},
  document:{createElement:element,querySelectorAll:()=>[],querySelector:()=>element(),getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id);}},
  window:{scrollTo(){}},Image:class{},setTimeout(fn){fn();},
 });
 vm.runInContext(script,context);
 return code=>vm.runInContext(code,context);
}
test('reload resumes menu, price and checkout progress and keeps the menu for a new order',()=>{
 const storage={};
 let run=browser(storage);
 run("add(ITEMS[0])");
 run=browser(storage);
 assert.equal(run("selectedItems()[0].id"),'hamburger');
 run(`
  for(const cat of ['main','drink','side']) for(const item of ITEMS.filter(i=>i.cat===cat).slice(0,5)) if(!isSelected(item.id))add(item);
  document.getElementById('next').onclick();
  const rangeIds=RANGES.flatMap(r=>Array(r.limit).fill(r.id));
  selectedItems().forEach((item,index)=>assignRange(item.id,rangeIds[index]));
  document.getElementById('setRanges').onclick();
  prices.hamburger=50;saveProgress();
 `);
 run=browser(storage);
 assert.equal(run('screen'),'priceScreen');
 assert.equal(run('rangesLocked'),true);
 assert.equal(run('prices.hamburger'),50);
 run(`
  selectedItems().forEach(item=>{prices[item.id]??=RANGES.find(r=>r.id===assignments[item.id]).min;});
  document.getElementById('openRestaurant').onclick();
  restaurantMenuTap('hamburger');restaurantMenuTap('pizza');
  document.getElementById('finishOrdering').onclick();
  restaurantMenuTap('hamburger');placeCheckoutItem(2);
 `);
 run=browser(storage);
 assert.equal(run('screen'),'restaurantScreen');
 assert.equal(run('checkoutItems[2]'),'hamburger');
 assert.equal(run('document.getElementById("orderCount").textContent'),'CHECKOUT 1 / 2');
 run("restaurantMenuTap('pizza');placeCheckoutItem(0);document.getElementById('totalBtn').onclick()");
 run=browser(storage);
 assert.match(run('document.getElementById("totalResult").innerHTML'),/TOTAL ¥150/);
 run("document.getElementById('newOrder').onclick()");
 run=browser(storage);
 assert.equal(run('restaurantOrder.length'),0);
 assert.equal(run('prices.hamburger'),50);
});
test('invalid stored data falls back to menu setup',()=>{
 const run=browser({value:'not-json'});
 assert.equal(run('screen'),'menuScreen');
 assert.equal(run('selectedItems().length'),0);
});
