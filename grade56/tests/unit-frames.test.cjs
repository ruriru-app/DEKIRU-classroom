const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function render(unit){
 const app={innerHTML:'',insertAdjacentHTML(position,html){this.innerHTML+=html;},addEventListener(){},querySelectorAll:()=>[],querySelector:()=>({textContent:''})};
 const context={window:{DEKIRU_DATA:{cards:[],categoryLabels:{directions:'道案内',positions:'位置',town:'町',impressions:'感想・様子',animals:'動物'}},NheMigration:{isComplete:()=>true},NheSavedSets:{mount(){}},NhePractice:{mount:()=>({refresh(){}})},addEventListener(){},scrollTo(){}},document:{getElementById:()=>app},location:{hash:'#/unit/nh5/'+unit},localStorage:{getItem:()=>null},sessionStorage:{getItem:()=>null},navigator:{}};
 vm.createContext(context);
 vm.runInContext(fs.readFileSync(require.resolve('../unit-config.js'),'utf8'),context);
 vm.runInContext(fs.readFileSync(require.resolve('../app.js'),'utf8'),context);
 return {html:app.innerHTML,units:context.window.NheUnits};
}
test('all grade 5 Units show the same four-section frame and sidebar',()=>{
 for(let unit=1;unit<=8;unit++){
  const {html}=render(unit);
  assert.ok(html.includes('nhe-sidebar'),'missing sidebar in Unit '+unit);
  for(const title of ['Words and Phrases','Small Talk','Make Sentences','Activities'])assert.ok(html.includes('<summary>'+title+'</summary>'),'missing '+title+' in Unit '+unit);
 }
});
test('Unit 6 retains its existing restaurant activity inside the new frame',()=>{
 const {html}=render(6);
 assert.ok(html.includes('RuRiRu RESTAURANT'));
 assert.ok(html.includes('../games/ruriru-restaurant.html'));
 assert.ok(html.includes('<summary>Activities</summary>'));
 assert.ok(html.indexOf('RuRiRu RESTAURANT')>html.indexOf('<summary>Activities</summary>'));
});
test('Unit 5 retains its vocabulary configuration and town activities',()=>{
 const {html,units}=render(5);
 assert.deepEqual(Array.from(units.get('nh5',5).main),['directions','positions','town']);
 assert.deepEqual(Array.from(units.get('nh5',5).sub),['impressions','animals']);
 assert.ok(html.includes('ruriru-town.html'));assert.ok(html.includes('ruriru-town-level3.html'));
});
